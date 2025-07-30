/**
 * WebSocket Connection Manager
 * Manages active connections, subscriptions, and connection state
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface ConnectionInfo {
  connectionId: string;
  subscriptions: string[];
  connectedAt: string;
  lastActivity?: string;
  metadata?: Record<string, any>;
}

export class ConnectionManager {
  private readonly CONNECTION_PREFIX = 'ws:conn:';
  private readonly USER_CONNECTIONS_PREFIX = 'ws:user:';
  private readonly SUBSCRIPTION_PREFIX = 'ws:sub:';
  
  constructor(private redis: Redis) {}

  /**
   * Register a new WebSocket connection
   */
  async registerConnection(userId: string, connectionInfo: ConnectionInfo): Promise<void> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}${connectionInfo.connectionId}`;
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}${userId}`;
      
      // Store connection details
      await this.redis.hset(connectionKey, {
        userId,
        connectedAt: connectionInfo.connectedAt,
        subscriptions: JSON.stringify(connectionInfo.subscriptions),
        lastActivity: new Date().toISOString(),
        ...(connectionInfo.metadata || {}),
      });
      
      // Add to user's active connections
      await this.redis.sadd(userConnectionsKey, connectionInfo.connectionId);
      
      // Set TTL for automatic cleanup (24 hours)
      await this.redis.expire(connectionKey, 86400);
      await this.redis.expire(userConnectionsKey, 86400);
      
      logger.debug(`Registered connection ${connectionInfo.connectionId} for user ${userId}`);
      
    } catch (error) {
      logger.error('Error registering connection:', error);
      throw error;
    }
  }

  /**
   * Remove a WebSocket connection
   */
  async removeConnection(userId: string, connectionId?: string): Promise<void> {
    try {
      if (connectionId) {
        // Remove specific connection
        const connectionKey = `${this.CONNECTION_PREFIX}${connectionId}`;
        const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}${userId}`;
        
        // Get subscriptions before deletion
        const subscriptions = await this.getConnectionSubscriptions(connectionId);
        
        // Remove from subscription sets
        for (const symbol of subscriptions) {
          await this.removeFromSubscription(symbol, userId);
        }
        
        // Remove connection record
        await this.redis.del(connectionKey);
        await this.redis.srem(userConnectionsKey, connectionId);
        
        logger.debug(`Removed connection ${connectionId} for user ${userId}`);
        
      } else {
        // Remove all connections for user
        const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}${userId}`;
        const connectionIds = await this.redis.smembers(userConnectionsKey);
        
        for (const connId of connectionIds) {
          await this.removeConnection(userId, connId);
        }
        
        await this.redis.del(userConnectionsKey);
        logger.debug(`Removed all connections for user ${userId}`);
      }
      
    } catch (error) {
      logger.error('Error removing connection:', error);
      throw error;
    }
  }

  /**
   * Update subscriptions for a connection
   */
  async updateSubscriptions(userId: string, subscriptions: string[]): Promise<void> {
    try {
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}${userId}`;
      const connectionIds = await this.redis.smembers(userConnectionsKey);
      
      // Update all active connections for this user
      for (const connectionId of connectionIds) {
        const connectionKey = `${this.CONNECTION_PREFIX}${connectionId}`;
        
        // Get current subscriptions
        const currentSubs = await this.getConnectionSubscriptions(connectionId);
        
        // Remove user from old subscriptions
        for (const symbol of currentSubs) {
          if (!subscriptions.includes(symbol)) {
            await this.removeFromSubscription(symbol, userId);
          }
        }
        
        // Add user to new subscriptions
        for (const symbol of subscriptions) {
          if (!currentSubs.includes(symbol)) {
            await this.addToSubscription(symbol, userId);
          }
        }
        
        // Update connection record
        await this.redis.hset(connectionKey, {
          subscriptions: JSON.stringify(subscriptions),
          lastActivity: new Date().toISOString(),
        });
      }
      
      logger.debug(`Updated subscriptions for user ${userId}: ${subscriptions.join(', ')}`);
      
    } catch (error) {
      logger.error('Error updating subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions for a specific connection
   */
  async getConnectionSubscriptions(connectionId: string): Promise<string[]> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}${connectionId}`;
      const subscriptionsStr = await this.redis.hget(connectionKey, 'subscriptions');
      
      return subscriptionsStr ? JSON.parse(subscriptionsStr) : [];
      
    } catch (error) {
      logger.error('Error getting connection subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all active connections for a user
   */
  async getUserConnections(userId: string): Promise<ConnectionInfo[]> {
    try {
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}${userId}`;
      const connectionIds = await this.redis.smembers(userConnectionsKey);
      
      const connections: ConnectionInfo[] = [];
      
      for (const connectionId of connectionIds) {
        const connectionKey = `${this.CONNECTION_PREFIX}${connectionId}`;
        const data = await this.redis.hgetall(connectionKey);
        
        if (data && Object.keys(data).length > 0) {
          connections.push({
            connectionId,
            subscriptions: JSON.parse(data.subscriptions || '[]'),
            connectedAt: data.connectedAt,
            lastActivity: data.lastActivity,
            metadata: {
              userId: data.userId,
              ...Object.fromEntries(
                Object.entries(data).filter(([key]) => 
                  !['userId', 'subscriptions', 'connectedAt', 'lastActivity'].includes(key)
                )
              ),
            },
          });
        }
      }
      
      return connections;
      
    } catch (error) {
      logger.error('Error getting user connections:', error);
      return [];
    }
  }

  /**
   * Add user to symbol subscription set
   */
  private async addToSubscription(symbol: string, userId: string): Promise<void> {
    const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${symbol}`;
    await this.redis.sadd(subscriptionKey, userId);
    await this.redis.expire(subscriptionKey, 86400); // 24 hour TTL
  }

  /**
   * Remove user from symbol subscription set
   */
  private async removeFromSubscription(symbol: string, userId: string): Promise<void> {
    const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${symbol}`;
    await this.redis.srem(subscriptionKey, userId);
  }

  /**
   * Get all subscribers for a symbol
   */
  async getSymbolSubscribers(symbol: string): Promise<string[]> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}${symbol}`;
      return await this.redis.smembers(subscriptionKey);
      
    } catch (error) {
      logger.error('Error getting symbol subscribers:', error);
      return [];
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    totalUsers: number;
    totalSubscriptions: number;
    topSymbols: Array<{ symbol: string; subscribers: number }>;
  }> {
    try {
      // Get all connection keys
      const connectionKeys = await this.redis.keys(`${this.CONNECTION_PREFIX}*`);
      const userKeys = await this.redis.keys(`${this.USER_CONNECTIONS_PREFIX}*`);
      const subscriptionKeys = await this.redis.keys(`${this.SUBSCRIPTION_PREFIX}*`);
      
      // Get top subscribed symbols
      const symbolStats = await Promise.all(
        subscriptionKeys.map(async (key) => {
          const symbol = key.replace(this.SUBSCRIPTION_PREFIX, '');
          const subscribers = await this.redis.scard(key);
          return { symbol, subscribers };
        })
      );
      
      const topSymbols = symbolStats
        .filter(stat => stat.subscribers > 0)
        .sort((a, b) => b.subscribers - a.subscribers)
        .slice(0, 10);
      
      return {
        totalConnections: connectionKeys.length,
        totalUsers: userKeys.length,
        totalSubscriptions: subscriptionKeys.length,
        topSymbols,
      };
      
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        totalUsers: 0,
        totalSubscriptions: 0,
        topSymbols: [],
      };
    }
  }

  /**
   * Clean up expired connections
   */
  async cleanupExpiredConnections(): Promise<number> {
    try {
      const connectionKeys = await this.redis.keys(`${this.CONNECTION_PREFIX}*`);
      let cleanedCount = 0;
      
      for (const key of connectionKeys) {
        const ttl = await this.redis.ttl(key);
        
        // If TTL is -1 (no expiry) or very old, clean it up
        if (ttl === -1 || ttl < 3600) { // Less than 1 hour remaining
          const data = await this.redis.hgetall(key);
          if (data && data.userId) {
            const connectionId = key.replace(this.CONNECTION_PREFIX, '');
            await this.removeConnection(data.userId, connectionId);
            cleanedCount++;
          }
        }
      }
      
      logger.info(`Cleaned up ${cleanedCount} expired connections`);
      return cleanedCount;
      
    } catch (error) {
      logger.error('Error cleaning up expired connections:', error);
      return 0;
    }
  }

  /**
   * Update connection activity timestamp
   */
  async updateConnectionActivity(connectionId: string): Promise<void> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}${connectionId}`;
      await this.redis.hset(connectionKey, 'lastActivity', new Date().toISOString());
      
    } catch (error) {
      logger.error('Error updating connection activity:', error);
    }
  }

  /**
   * Get inactive connections (for cleanup)
   */
  async getInactiveConnections(inactiveThresholdMs: number = 300000): Promise<string[]> {
    try {
      const connectionKeys = await this.redis.keys(`${this.CONNECTION_PREFIX}*`);
      const inactiveConnections: string[] = [];
      const now = Date.now();
      
      for (const key of connectionKeys) {
        const lastActivity = await this.redis.hget(key, 'lastActivity');
        
        if (lastActivity) {
          const lastActivityTime = new Date(lastActivity).getTime();
          if (now - lastActivityTime > inactiveThresholdMs) {
            inactiveConnections.push(key.replace(this.CONNECTION_PREFIX, ''));
          }
        }
      }
      
      return inactiveConnections;
      
    } catch (error) {
      logger.error('Error getting inactive connections:', error);
      return [];
    }
  }
}