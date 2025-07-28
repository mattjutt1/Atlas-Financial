/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enhanced image optimization for mobile
  images: {
    domains: ['localhost', 'atlas-financial.local'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Bundle optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@headlessui/react',
      'date-fns',
      'recharts'
    ],
  },
  // Webpack optimizations for mobile performance
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer (development only)
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          financial: {
            test: /[\\/]src[\\/](lib[\\/]financial|components[\\/]mobile)[\\/]/,
            name: 'financial',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
    }

    // Reduce bundle size
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter alternatives where possible
        'react-dom/server': false,
      }
    }

    return config
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    HASURA_URL: process.env.HASURA_URL || 'http://localhost:8081/v1/graphql',
    AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:8083',
  },
  // Comprehensive headers for mobile optimization and security
  async headers() {
    return [
      // PWA and caching headers
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // Service worker caching
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // Static assets optimization
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Image optimization
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes caching for financial data
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
      // Security and mobile optimization headers
      {
        source: '/(.*)',
        headers: [
          // Security headers
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Mobile optimization headers
          {
            key: 'X-UA-Compatible',
            value: 'IE=edge',
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Compression
          {
            key: 'Accept-Encoding',
            value: 'gzip, deflate, br',
          },
          // Critical resource hints for mobile
          {
            key: 'Link',
            value: '</fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous',
          },
        ],
      },
    ]
  },
  // Enable gzip compression
  compress: true,
  // Power-ups for mobile performance
  swcMinify: true,
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  // Progressive Web App optimizations
  async rewrites() {
    return [
      // API routes optimization
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ]
  },
  // Mobile-specific redirects
  async redirects() {
    return [
      // Redirect old routes to mobile-optimized versions if needed
    ]
  },
}

module.exports = nextConfig
