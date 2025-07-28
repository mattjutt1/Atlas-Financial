import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Modular Monolith Providers
import { AuthProvider } from '@/modules/auth/AuthProvider';
import { FinancialEngineProvider } from '@/modules/financial/FinancialEngineProvider';
import { AIEngineProvider } from '@/modules/ai/AIEngineProvider';
import { ApolloProvider } from '@/lib/apollo-client';
import { CacheProvider } from '@/lib/cache/CacheProvider';

// Security and Monitoring
import { SecurityProvider } from '@/lib/security/SecurityProvider';
import { MetricsProvider } from '@/lib/monitoring/MetricsProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Atlas Financial - Personal Finance Platform',
  description: 'Bank-grade personal finance management with AI-powered insights',
  keywords: ['finance', 'personal finance', 'budgeting', 'investments', 'AI insights'],
  authors: [{ name: 'Atlas Financial Team' }],
  robots: 'noindex, nofollow', // Security: Prevent indexing
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1f2937',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Security headers via metadata
  other: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Security: Content Security Policy */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:*;" />
      </head>
      <body className={inter.className}>
        {/* Security Provider - Outermost layer */}
        <SecurityProvider>
          {/* Metrics and Monitoring */}
          <MetricsProvider>
            {/* Cache Layer */}
            <CacheProvider>
              {/* Authentication Layer */}
              <AuthProvider>
                {/* GraphQL API Layer */}
                <ApolloProvider>
                  {/* Financial Engine Integration */}
                  <FinancialEngineProvider>
                    {/* AI Engine Integration */}
                    <AIEngineProvider>
                      {/* Application Content */}
                      <div id="atlas-core-app" className="min-h-screen bg-gray-50">
                        {children}
                      </div>
                    </AIEngineProvider>
                  </FinancialEngineProvider>
                </ApolloProvider>
              </AuthProvider>
            </CacheProvider>
          </MetricsProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}