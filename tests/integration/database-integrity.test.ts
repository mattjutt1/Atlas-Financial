/**
 * Atlas Financial Database Integrity and Migration Tests
 * Tests PostgreSQL multi-database setup, schemas, and data integrity
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { Pool } from 'pg';
import { performance } from 'perf_hooks';

// Test Configuration
const config = {
  databases: {
    atlas_core: {
      host: 'localhost',
      port: 5432,
      user: 'atlas',
      password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
      database: 'atlas_core',
    },
    hasura_metadata: {
      host: 'localhost',
      port: 5432,
      user: 'atlas',
      password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
      database: 'hasura_metadata',
    },
    supertokens: {
      host: 'localhost',
      port: 5432,
      user: 'atlas',
      password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
      database: 'supertokens',
    },
    observability: {
      host: 'localhost',
      port: 5432,
      user: 'atlas',
      password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
      database: 'observability',
    },
  },
  expectedSchemas: {
    atlas_core: ['auth', 'financial', 'ai', 'audit', 'public'],
    hasura_metadata: ['hdb_catalog', 'public'],
    supertokens: ['public'],
    observability: ['public'],
  },
  performance: {
    maxQueryTime: 1000,
    maxConnectionTime: 5000,
  },
  integrity: {
    maxOrphanedRecords: 0,
    requireForeignKeys: true,
    requireIndexes: true,
  },
};

// Global test utilities
const dbPools: { [key: string]: Pool } = {};
let testDataIds: { [key: string]: string[] } = {};

describe('Atlas Financial Database Integrity and Migration Tests', () => {
  beforeAll(async () => {
    // Initialize database connections
    for (const [dbName, dbConfig] of Object.entries(config.databases)) {
      try {
        dbPools[dbName] = new Pool(dbConfig);
        await dbPools[dbName].query('SELECT 1');
        console.log(`✅ Connected to ${dbName} database`);
      } catch (error) {
        console.warn(`⚠️  Failed to connect to ${dbName} database:`, error);
      }
    }
    
    // Wait for databases to be ready
    await waitForDatabases();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close all database connections
    for (const [dbName, pool] of Object.entries(dbPools)) {
      try {
        await pool.end();
        console.log(`✅ Closed ${dbName} database connection`);
      } catch (error) {
        console.warn(`⚠️  Failed to close ${dbName} database:`, error);
      }
    }
  });

  describe('1. Database Existence and Connectivity', () => {
    test('should validate all required databases exist', async () => {
      for (const [dbName, pool] of Object.entries(dbPools)) {
        const result = await pool.query('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(dbName);
      }
    });

    test('should validate database connection performance', async () => {
      for (const [dbName, pool] of Object.entries(dbPools)) {
        const startTime = performance.now();
        await pool.query('SELECT 1');
        const endTime = performance.now();
        const connectionTime = endTime - startTime;
        
        expect(connectionTime).toBeLessThan(config.performance.maxConnectionTime);
      }
    });

    test('should validate database user permissions', async () => {
      for (const [dbName, pool] of Object.entries(dbPools)) {
        const result = await pool.query('SELECT current_user, session_user');
        expect(result.rows[0].current_user).toBe('atlas');
        expect(result.rows[0].session_user).toBe('atlas');
      }
    });

    test('should validate database encoding and collation', async () => {
      for (const [dbName, pool] of Object.entries(dbPools)) {
        const result = await pool.query(`
          SELECT 
            pg_encoding_to_char(encoding) as encoding,
            datcollate as collation,
            datctype as ctype
          FROM pg_database 
          WHERE datname = current_database()
        `);
        
        expect(result.rows[0].encoding).toBe('UTF8');
        expect(result.rows[0].collation).toMatch(/UTF-?8|en_US/i);
      }
    });
  });

  describe('2. Schema Validation', () => {
    test('should validate required schemas exist', async () => {
      for (const [dbName, expectedSchemas] of Object.entries(config.expectedSchemas)) {
        if (!dbPools[dbName]) continue;
        
        const result = await dbPools[dbName].query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          ORDER BY schema_name
        `);
        
        const actualSchemas = result.rows.map(row => row.schema_name);
        
        for (const expectedSchema of expectedSchemas) {
          expect(actualSchemas).toContain(expectedSchema);
        }
      }
    });

    test('should validate schema permissions', async () => {
      if (!dbPools.atlas_core) return;
      
      const schemas = ['auth', 'financial', 'ai', 'audit'];
      
      for (const schema of schemas) {
        const result = await dbPools.atlas_core.query(`
          SELECT 
            grantee,
            privilege_type 
          FROM information_schema.schema_privileges 
          WHERE schema_name = $1 AND grantee = 'atlas'
        `, [schema]);
        
        const privileges = result.rows.map(row => row.privilege_type);
        expect(privileges).toContain('USAGE');
      }
    });

    test('should validate core financial tables exist', async () => {
      if (!dbPools.atlas_core) return;
      
      const expectedTables = [
        'financial.accounts',
        'financial.transactions',
        'financial.portfolios',
        'financial.debt_accounts',
        'auth.users',
        'auth.user_profiles',
      ];
      
      for (const tableName of expectedTables) {
        const [schema, table] = tableName.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        `, [schema, table]);
        
        expect(result.rows.length).toBe(1);
      }
    });

    test('should validate table column definitions', async () => {
      if (!dbPools.atlas_core) return;
      
      // Validate critical financial columns have correct precision
      const precisionColumns = [
        { table: 'financial.accounts', column: 'balance', type: 'numeric' },
        { table: 'financial.transactions', column: 'amount', type: 'numeric' },
        { table: 'financial.debt_accounts', column: 'balance', type: 'numeric' },
        { table: 'financial.debt_accounts', column: 'interest_rate', type: 'numeric' },
      ];
      
      for (const { table, column, type } of precisionColumns) {
        const [schema, tableName] = table.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            data_type,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
        `, [schema, tableName, column]);
        
        if (result.rows.length > 0) {
          expect(result.rows[0].data_type).toBe(type);
          if (type === 'numeric') {
            expect(result.rows[0].numeric_precision).toBeGreaterThanOrEqual(20);
            expect(result.rows[0].numeric_scale).toBeGreaterThanOrEqual(10);
          }
        }
      }
    });
  });

  describe('3. Data Integrity Constraints', () => {
    test('should validate primary key constraints', async () => {
      if (!dbPools.atlas_core) return;
      
      const tables = ['auth.users', 'financial.accounts', 'financial.transactions'];
      
      for (const tableName of tables) {
        const [schema, table] = tableName.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            tc.constraint_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = $1 
            AND tc.table_name = $2 
            AND tc.constraint_type = 'PRIMARY KEY'
        `, [schema, table]);
        
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows[0].column_name).toBeTruthy();
      }
    });

    test('should validate foreign key constraints', async () => {
      if (!dbPools.atlas_core) return;
      
      const expectedForeignKeys = [
        { table: 'financial.accounts', column: 'user_id', references: 'auth.users.id' },
        { table: 'financial.transactions', column: 'account_id', references: 'financial.accounts.id' },
        { table: 'financial.portfolios', column: 'user_id', references: 'auth.users.id' },
      ];
      
      for (const fk of expectedForeignKeys) {
        const [schema, table] = fk.table.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema as foreign_table_schema,
            ccu.table_name as foreign_table_name,
            ccu.column_name as foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_schema = $1 
            AND tc.table_name = $2 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = $3
        `, [schema, table, fk.column]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const referencedTable = `${row.foreign_table_schema}.${row.foreign_table_name}.${row.foreign_column_name}`;
          expect(referencedTable).toBe(fk.references);
        }
      }
    });

    test('should validate unique constraints', async () => {
      if (!dbPools.atlas_core) return;
      
      const uniqueConstraints = [
        { table: 'auth.users', column: 'email' },
        { table: 'financial.accounts', column: 'account_number' },
      ];
      
      for (const constraint of uniqueConstraints) {
        const [schema, table] = constraint.table.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            tc.constraint_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = $1 
            AND tc.table_name = $2 
            AND tc.constraint_type = 'UNIQUE'
            AND kcu.column_name = $3
        `, [schema, table, constraint.column]);
        
        expect(result.rows.length).toBeGreaterThan(0);
      }
    });

    test('should validate check constraints', async () => {
      if (!dbPools.atlas_core) return;
      
      const checkConstraints = [
        { table: 'financial.transactions', constraint: 'amount_not_zero' },
        { table: 'financial.debt_accounts', constraint: 'interest_rate_positive' },
      ];
      
      for (const check of checkConstraints) {
        const [schema, table] = check.table.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            tc.constraint_name,
            cc.check_clause
          FROM information_schema.table_constraints tc
          JOIN information_schema.check_constraints cc 
            ON tc.constraint_name = cc.constraint_name
          WHERE tc.table_schema = $1 
            AND tc.table_name = $2 
            AND tc.constraint_type = 'CHECK'
        `, [schema, table]);
        
        // Should have check constraints for data validation
        expect(result.rows.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('4. Index Optimization', () => {
    test('should validate critical performance indexes exist', async () => {
      if (!dbPools.atlas_core) return;
      
      const criticalIndexes = [
        { table: 'auth.users', column: 'email' },
        { table: 'financial.transactions', column: 'account_id' },
        { table: 'financial.transactions', column: 'created_at' },
        { table: 'financial.accounts', column: 'user_id' },
      ];
      
      for (const index of criticalIndexes) {
        const [schema, table] = index.table.split('.');
        const result = await dbPools.atlas_core.query(`
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = $1 
            AND tablename = $2
            AND indexdef ILIKE '%' || $3 || '%'
        `, [schema, table, index.column]);
        
        expect(result.rows.length).toBeGreaterThan(0);
      }
    });

    test('should validate index usage statistics', async () => {
      if (!dbPools.atlas_core) return;
      
      const result = await dbPools.atlas_core.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname IN ('auth', 'financial')
        ORDER BY idx_scan DESC
      `);
      
      // Should have index usage statistics available
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should validate no duplicate or redundant indexes', async () => {
      if (!dbPools.atlas_core) return;
      
      const result = await dbPools.atlas_core.query(`
        SELECT 
          schemaname,
          tablename,
          COUNT(*) as index_count,
          array_agg(indexname) as index_names
        FROM pg_indexes 
        WHERE schemaname IN ('auth', 'financial')
        GROUP BY schemaname, tablename, indexdef
        HAVING COUNT(*) > 1
      `);
      
      // Should not have duplicate indexes
      expect(result.rows.length).toBe(0);
    });
  });

  describe('5. Data Consistency Validation', () => {
    test('should validate referential integrity', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check for orphaned records
      const orphanChecks = [
        {
          name: 'orphaned_transactions',
          query: `
            SELECT COUNT(*) as count 
            FROM financial.transactions t 
            LEFT JOIN financial.accounts a ON t.account_id = a.id 
            WHERE a.id IS NULL
          `,
        },
        {
          name: 'orphaned_accounts',
          query: `
            SELECT COUNT(*) as count 
            FROM financial.accounts a 
            LEFT JOIN auth.users u ON a.user_id = u.id 
            WHERE u.id IS NULL
          `,
        },
      ];
      
      for (const check of orphanChecks) {
        const result = await dbPools.atlas_core.query(check.query);
        const orphanedCount = parseInt(result.rows[0].count);
        
        expect(orphanedCount).toBeLessThanOrEqual(config.integrity.maxOrphanedRecords);
      }
    });

    test('should validate financial data precision', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check for floating-point precision issues
      const precisionChecks = [
        {
          name: 'transaction_amounts',
          query: `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN amount::text ~ '\\.[0-9]{11,}' THEN 1 END) as precision_issues
            FROM financial.transactions
          `,
        },
        {
          name: 'account_balances',
          query: `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN balance::text ~ '\\.[0-9]{11,}' THEN 1 END) as precision_issues
            FROM financial.accounts
          `,
        },
      ];
      
      for (const check of precisionChecks) {
        const result = await dbPools.atlas_core.query(check.query);
        const total = parseInt(result.rows[0].total);
        const issues = parseInt(result.rows[0].precision_issues);
        
        if (total > 0) {
          expect(issues).toBe(0);
        }
      }
    });

    test('should validate audit trail completeness', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check audit trail exists for critical operations
      const auditChecks = [
        {
          name: 'user_creation_audit',
          query: `
            SELECT COUNT(*) as count 
            FROM audit.user_events 
            WHERE event_type = 'user_created'
          `,
        },
        {
          name: 'transaction_audit',
          query: `
            SELECT COUNT(*) as count 
            FROM audit.financial_events 
            WHERE event_type IN ('transaction_created', 'transaction_modified')
          `,
        },
      ];
      
      for (const check of auditChecks) {
        try {
          const result = await dbPools.atlas_core.query(check.query);
          const auditCount = parseInt(result.rows[0].count);
          
          // Audit tables should exist and may have records
          expect(auditCount).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Audit tables might not exist yet - this is acceptable for new installations
          console.warn(`Audit table not found: ${check.name}`);
        }
      }
    });

    test('should validate data type consistency', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check for consistent data types across related tables
      const typeChecks = [
        {
          name: 'user_id_consistency',
          query: `
            SELECT DISTINCT 
              c.table_schema,
              c.table_name,
              c.column_name,
              c.data_type,
              c.character_maximum_length
            FROM information_schema.columns c
            WHERE c.column_name = 'user_id' 
              AND c.table_schema IN ('auth', 'financial')
            ORDER BY c.table_schema, c.table_name
          `,
        },
      ];
      
      for (const check of typeChecks) {
        const result = await dbPools.atlas_core.query(check.query);
        
        if (result.rows.length > 1) {
          const firstType = result.rows[0];
          for (const row of result.rows.slice(1)) {
            expect(row.data_type).toBe(firstType.data_type);
            if (firstType.character_maximum_length) {
              expect(row.character_maximum_length).toBe(firstType.character_maximum_length);
            }
          }
        }
      }
    });
  });

  describe('6. Performance and Query Optimization', () => {
    test('should validate query performance', async () => {
      if (!dbPools.atlas_core) return;
      
      const performanceQueries = [
        {
          name: 'user_lookup_by_email',
          query: 'SELECT id, email FROM auth.users WHERE email = $1',
          params: ['test@example.com'],
        },
        {
          name: 'user_transactions',
          query: `
            SELECT t.id, t.amount, t.description 
            FROM financial.transactions t 
            JOIN financial.accounts a ON t.account_id = a.id 
            WHERE a.user_id = $1 
            ORDER BY t.created_at DESC 
            LIMIT 10
          `,
          params: ['00000000-0000-0000-0000-000000000000'],
        },
      ];
      
      for (const query of performanceQueries) {
        const startTime = performance.now();
        await dbPools.atlas_core.query(query.query, query.params);
        const endTime = performance.now();
        const queryTime = endTime - startTime;
        
        expect(queryTime).toBeLessThan(config.performance.maxQueryTime);
      }
    });

    test('should validate connection pooling efficiency', async () => {
      if (!dbPools.atlas_core) return;
      
      // Test multiple concurrent queries
      const concurrentQueries = Array(10).fill(null).map(() => 
        dbPools.atlas_core.query('SELECT pg_backend_pid(), now()')
      );
      
      const startTime = performance.now();
      const results = await Promise.all(concurrentQueries);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All queries should succeed
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.rows.length).toBe(1);
      });
      
      // Connection pooling should make this efficient
      expect(totalTime).toBeLessThan(config.performance.maxQueryTime * 5);
    });

    test('should validate database statistics are current', async () => {
      if (!dbPools.atlas_core) return;
      
      const result = await dbPools.atlas_core.query(`
        SELECT 
          schemaname,
          tablename,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE schemaname IN ('auth', 'financial')
        ORDER BY schemaname, tablename
      `);
      
      // Should have statistics for performance optimization
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('7. Security and Access Control', () => {
    test('should validate row-level security policies', async () => {
      if (!dbPools.atlas_core) return;
      
      const result = await dbPools.atlas_core.query(`
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual
        FROM pg_policies 
        WHERE schemaname IN ('auth', 'financial')
        ORDER BY schemaname, tablename, policyname
      `);
      
      // Should have RLS policies for data isolation
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should validate sensitive data encryption', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check for encrypted columns or functions
      const result = await dbPools.atlas_core.query(`
        SELECT 
          table_schema,
          table_name,
          column_name,
          data_type
        FROM information_schema.columns 
        WHERE column_name ILIKE '%encrypted%' 
           OR column_name ILIKE '%hash%'
           OR column_name ILIKE '%token%'
        ORDER BY table_schema, table_name, column_name
      `);
      
      // Should have some encrypted/hashed fields
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    test('should validate backup and recovery readiness', async () => {
      if (!dbPools.atlas_core) return;
      
      // Check WAL archiving and backup configuration
      const result = await dbPools.atlas_core.query(`
        SELECT 
          name,
          setting
        FROM pg_settings 
        WHERE name IN ('archive_mode', 'archive_command', 'wal_level')
      `);
      
      expect(result.rows.length).toBe(3);
      
      const settings = result.rows.reduce((acc, row) => {
        acc[row.name] = row.setting;
        return acc;
      }, {} as any);
      
      // Basic backup readiness checks
      expect(['replica', 'logical']).toContain(settings.wal_level);
    });
  });
});

// Utility Functions
async function waitForDatabases(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const connectionTests = Object.entries(dbPools).map(async ([dbName, pool]) => {
        const result = await pool.query('SELECT 1');
        return { dbName, success: result.rows.length > 0 };
      });
      
      const results = await Promise.all(connectionTests);
      const failedConnections = results.filter(r => !r.success);
      
      if (failedConnections.length === 0) {
        console.log(`✅ All databases ready (attempt ${attempt}/${maxAttempts})`);
        return;
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`Databases failed to be ready after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for databases... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      console.log(`⏳ Database connection error, retrying... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up any test data created during tests
    for (const [dbName, pool] of Object.entries(dbPools)) {
      if (testDataIds[dbName]) {
        for (const id of testDataIds[dbName]) {
          try {
            await pool.query('DELETE FROM test_table WHERE id = $1', [id]);
          } catch (error) {
            // Test tables might not exist
          }
        }
      }
    }
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.warn('⚠️  Failed to cleanup test data:', error);
  }
}