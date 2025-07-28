/**
 * Atlas Financial API Gateway - Firefly III Integration Adapter
 * Consolidates Firefly III integration into the unified API Gateway
 */

const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');

// Configuration
const FIREFLY_BASE_URL = process.env.FIREFLY_API_URL || 'http://atlas-core:3000/integrations/firefly';
const DATABASE_URL = process.env.HASURA_GRAPHQL_DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || 'redis://atlas-data:6379';
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize connections
const pool = new Pool({ connectionString: DATABASE_URL });
const redisClient = redis.createClient({ url: REDIS_URL });

class FireflyIntegrationAdapter {
  constructor() {
    this.fireflyClient = axios.create({
      baseURL: FIREFLY_BASE_URL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    this.cache = redisClient;
    this.db = pool;
  }

  /**
   * Authenticate and get Firefly access token
   */
  async authenticateFirefly(userId) {
    const cacheKey = `firefly:auth:${userId}`;

    // Check cache first
    let token = await this.cache.get(cacheKey);
    if (token) {
      return token;
    }

    try {
      // Get user's Firefly credentials from secure storage
      const result = await this.db.query(
        'SELECT firefly_token FROM integrations.connections WHERE user_id = $1 AND provider = $2',
        [userId, 'firefly']
      );

      if (!result.rows[0]) {
        throw new Error('Firefly III not connected for user');
      }

      token = result.rows[0].firefly_token;

      // Cache for 1 hour
      await this.cache.setex(cacheKey, 3600, token);

      return token;
    } catch (error) {
      console.error('Firefly authentication failed:', error);
      throw new Error('Failed to authenticate with Firefly III');
    }
  }

  /**
   * Sync accounts from Firefly III to Atlas
   */
  async syncAccounts(userId) {
    try {
      const token = await this.authenticateFirefly(userId);

      const response = await this.fireflyClient.get('/api/v1/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const fireflyAccounts = response.data.data;
      const atlasAccounts = [];

      for (const fireflyAccount of fireflyAccounts) {
        const atlasAccount = {
          external_id: fireflyAccount.id,
          name: fireflyAccount.attributes.name,
          account_type: this.mapFireflyAccountType(fireflyAccount.attributes.type),
          institution_name: 'Firefly III',
          current_balance: parseFloat(fireflyAccount.attributes.current_balance || 0),
          currency: fireflyAccount.attributes.currency_code || 'USD',
          is_active: fireflyAccount.attributes.active,
          metadata: {
            firefly_data: fireflyAccount.attributes,
            sync_source: 'firefly'
          }
        };

        // Insert or update account in Atlas database
        await this.db.query(
          `INSERT INTO financial.accounts (
            user_id, external_id, name, account_type, institution_name,
            current_balance, currency, is_active, metadata, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (user_id, external_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            current_balance = EXCLUDED.current_balance,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()`,
          [
            userId, atlasAccount.external_id, atlasAccount.name,
            atlasAccount.account_type, atlasAccount.institution_name,
            atlasAccount.current_balance, atlasAccount.currency,
            atlasAccount.is_active, JSON.stringify(atlasAccount.metadata)
          ]
        );

        atlasAccounts.push(atlasAccount);
      }

      console.log(`Synced ${atlasAccounts.length} accounts for user ${userId}`);
      return atlasAccounts;

    } catch (error) {
      console.error('Account sync failed:', error);
      throw new Error('Failed to sync accounts from Firefly III');
    }
  }

  /**
   * Sync transactions from Firefly III to Atlas
   */
  async syncTransactions(userId, accountId = null, startDate = null) {
    try {
      const token = await this.authenticateFirefly(userId);

      let url = '/api/v1/transactions';
      const params = new URLSearchParams();

      if (startDate) {
        params.append('start', startDate);
      }
      if (accountId) {
        params.append('accounts', accountId);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await this.fireflyClient.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const fireflyTransactions = response.data.data;
      const atlasTransactions = [];

      for (const fireflyTx of fireflyTransactions) {
        for (const transaction of fireflyTx.attributes.transactions) {
          const atlasTransaction = {
            external_id: transaction.transaction_journal_id,
            amount: parseFloat(transaction.amount),
            currency: transaction.currency_code || 'USD',
            description: transaction.description,
            transaction_date: transaction.date,
            category: transaction.category_name,
            merchant_name: transaction.destination_name || transaction.source_name,
            transaction_type: parseFloat(transaction.amount) >= 0 ? 'credit' : 'debit',
            metadata: {
              firefly_data: transaction,
              sync_source: 'firefly'
            }
          };

          // Get the Atlas account ID for this transaction
          const accountResult = await this.db.query(
            'SELECT id FROM financial.accounts WHERE user_id = $1 AND external_id = $2',
            [userId, transaction.source_id || transaction.destination_id]
          );

          if (accountResult.rows[0]) {
            atlasTransaction.account_id = accountResult.rows[0].id;

            // Insert transaction into Atlas database
            await this.db.query(
              `INSERT INTO financial.transactions (
                user_id, account_id, external_id, amount, currency, description,
                transaction_date, category, merchant_name, transaction_type,
                metadata, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
              ON CONFLICT (external_id) DO NOTHING`,
              [
                userId, atlasTransaction.account_id, atlasTransaction.external_id,
                atlasTransaction.amount, atlasTransaction.currency,
                atlasTransaction.description, atlasTransaction.transaction_date,
                atlasTransaction.category, atlasTransaction.merchant_name,
                atlasTransaction.transaction_type, JSON.stringify(atlasTransaction.metadata)
              ]
            );

            atlasTransactions.push(atlasTransaction);
          }
        }
      }

      console.log(`Synced ${atlasTransactions.length} transactions for user ${userId}`);
      return atlasTransactions;

    } catch (error) {
      console.error('Transaction sync failed:', error);
      throw new Error('Failed to sync transactions from Firefly III');
    }
  }

  /**
   * Create a transaction in Firefly III from Atlas
   */
  async createTransaction(userId, transactionData) {
    try {
      const token = await this.authenticateFirefly(userId);

      const fireflyTransaction = {
        error_if_duplicate_hash: false,
        apply_rules: true,
        fire_webhooks: true,
        transactions: [{
          type: transactionData.type || 'withdrawal',
          date: transactionData.date || new Date().toISOString().split('T')[0],
          amount: Math.abs(transactionData.amount).toString(),
          description: transactionData.description,
          source_id: transactionData.source_account_id,
          destination_id: transactionData.destination_account_id,
          category_name: transactionData.category,
          currency_code: transactionData.currency || 'USD',
          tags: transactionData.tags || []
        }]
      };

      const response = await this.fireflyClient.post('/api/v1/transactions', fireflyTransaction, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Sync the created transaction back to Atlas
      if (response.data.data) {
        await this.syncTransactions(userId, null, transactionData.date);
      }

      return response.data;

    } catch (error) {
      console.error('Transaction creation failed:', error);
      throw new Error('Failed to create transaction in Firefly III');
    }
  }

  /**
   * Map Firefly account types to Atlas account types
   */
  mapFireflyAccountType(fireflyType) {
    const typeMapping = {
      'asset': 'checking',
      'expense': 'expense',
      'revenue': 'income',
      'liabilities': 'credit_card',
      'initial-balance': 'savings',
      'reconciliation': 'checking'
    };

    return typeMapping[fireflyType] || 'checking';
  }

  /**
   * Get Firefly III connection status for a user
   */
  async getConnectionStatus(userId) {
    try {
      const result = await this.db.query(
        'SELECT connection_status, last_sync_at, error_message FROM integrations.connections WHERE user_id = $1 AND provider = $2',
        [userId, 'firefly']
      );

      if (!result.rows[0]) {
        return { connected: false, status: 'not_connected' };
      }

      const connection = result.rows[0];
      return {
        connected: connection.connection_status === 'active',
        status: connection.connection_status,
        lastSync: connection.last_sync_at,
        error: connection.error_message
      };

    } catch (error) {
      console.error('Failed to get connection status:', error);
      return { connected: false, status: 'error', error: error.message };
    }
  }

  /**
   * Disconnect Firefly III integration
   */
  async disconnect(userId) {
    try {
      await this.db.query(
        'UPDATE integrations.connections SET connection_status = $1, updated_at = NOW() WHERE user_id = $2 AND provider = $3',
        ['disconnected', userId, 'firefly']
      );

      // Clear cached data
      await this.cache.del(`firefly:auth:${userId}`);

      return { success: true, message: 'Firefly III integration disconnected' };

    } catch (error) {
      console.error('Failed to disconnect Firefly III:', error);
      throw new Error('Failed to disconnect Firefly III integration');
    }
  }
}

module.exports = FireflyIntegrationAdapter;
