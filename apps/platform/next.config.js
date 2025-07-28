/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  // Core Configuration
  experimental: {
    // Enable for Rust FFI integration
    serverComponentsExternalPackages: ['rust-financial-engine'],
    // Enable for AI Python integration
    turbotrace: {
      logLevel: 'error',
    },
  },

  // Rust Engine Integration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Rust FFI Integration
    config.externals = config.externals || {};
    if (isServer) {
      config.externals['rust-financial-engine'] = 'commonjs rust-financial-engine';
    }

    // Python AI Engine Integration via WASM
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Custom loaders for financial modules
    config.module.rules.push({
      test: /\.rs$/,
      use: [
        {
          loader: '@wasm-tool/wasm-pack-loader',
          options: {
            crateDirectory: path.resolve(__dirname, 'rust-engine'),
          },
        },
      ],
    });

    return config;
  },

  // Security Configuration (Bank-Grade)
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*;",
        },
      ],
    },
    {
      // API Routes Security
      source: '/api/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    },
  ],

  // Environment Variables
  env: {
    // Build-time constants
    ATLAS_VERSION: '2.0.0',
    ATLAS_BUILD_TARGET: 'modular-monolith',
    RUST_ENGINE_VERSION: '1.0.0',
    AI_ENGINE_VERSION: '1.0.0',
  },

  // Server Configuration
  serverRuntimeConfig: {
    // Server-only secrets
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    supertokensApiKey: process.env.SUPERTOKENS_API_KEY,
  },

  // Public Runtime Configuration
  publicRuntimeConfig: {
    // Client-accessible config
    supertokensDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN,
    hasuraUrl: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },

  // Performance Optimization
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  // Asset Optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },

  // Redirects and Rewrites
  async redirects() {
    return [
      {
        source: '/auth',
        destination: '/auth/signin',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      // Rust Engine API Proxy
      {
        source: '/api/financial/:path*',
        destination: 'http://localhost:8080/:path*',
      },
      // AI Engine API Proxy
      {
        source: '/api/ai/:path*',
        destination: 'http://localhost:8083/:path*',
      },
      // Hasura GraphQL Proxy
      {
        source: '/api/graphql',
        destination: 'http://localhost:8081/v1/graphql',
      },
    ];
  },

  // Development Configuration
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: false,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
  }),

  // Production Configuration
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    generateEtags: false,
    httpAgentOptions: {
      keepAlive: true,
    },
  }),

  // Modular Monolith Configuration
  modularMonolith: {
    modules: {
      auth: {
        enabled: true,
        provider: 'supertokens',
        embedded: true,
      },
      financial: {
        enabled: true,
        engine: 'rust',
        mode: 'ffi',
      },
      ai: {
        enabled: true,
        engine: 'python',
        mode: 'embedded',
      },
      api: {
        enabled: true,
        gateway: 'hasura',
        proxy: true,
      },
    },
    performance: {
      caching: true,
      compression: true,
      bundleAnalyzer: process.env.ANALYZE === 'true',
    },
  },
};

module.exports = nextConfig;
