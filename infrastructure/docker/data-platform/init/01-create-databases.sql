-- Atlas Financial Data Platform - Unified Database Schema
-- Consolidated database creation for modular monolith architecture

-- Create databases for the 4-service architecture
CREATE DATABASE IF NOT EXISTS atlas_core 
    WITH OWNER = atlas 
    ENCODING = 'UTF8' 
    LC_COLLATE = 'en_US.utf8' 
    LC_CTYPE = 'en_US.utf8'
    CONNECTION LIMIT = 100;

CREATE DATABASE IF NOT EXISTS hasura_metadata 
    WITH OWNER = atlas 
    ENCODING = 'UTF8' 
    LC_COLLATE = 'en_US.utf8' 
    LC_CTYPE = 'en_US.utf8'
    CONNECTION LIMIT = 50;

CREATE DATABASE IF NOT EXISTS supertokens 
    WITH OWNER = atlas 
    ENCODING = 'UTF8' 
    LC_COLLATE = 'en_US.utf8' 
    LC_CTYPE = 'en_US.utf8'
    CONNECTION LIMIT = 50;

CREATE DATABASE IF NOT EXISTS observability 
    WITH OWNER = atlas 
    ENCODING = 'UTF8' 
    LC_COLLATE = 'en_US.utf8' 
    LC_CTYPE = 'en_US.utf8'
    CONNECTION LIMIT = 30;

CREATE DATABASE IF NOT EXISTS cache_metadata 
    WITH OWNER = atlas 
    ENCODING = 'UTF8' 
    LC_COLLATE = 'en_US.utf8' 
    LC_CTYPE = 'en_US.utf8'
    CONNECTION LIMIT = 20;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE atlas_core TO atlas;
GRANT ALL PRIVILEGES ON DATABASE hasura_metadata TO atlas;
GRANT ALL PRIVILEGES ON DATABASE supertokens TO atlas;
GRANT ALL PRIVILEGES ON DATABASE observability TO atlas;
GRANT ALL PRIVILEGES ON DATABASE cache_metadata TO atlas;

-- Create extensions for each database
\c atlas_core;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

\c hasura_metadata;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c supertokens;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c observability;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

\c cache_metadata;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Return to atlas_financial (main database)
\c atlas_financial;