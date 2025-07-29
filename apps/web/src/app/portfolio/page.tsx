import { Metadata } from 'next'
import { InvestmentDashboard } from '@/components/investments'

export const metadata: Metadata = {
  title: 'Investment Portfolio - Atlas Financial',
  description: 'Professional investment portfolio dashboard with real-time performance tracking, asset allocation, and risk analysis.',
}

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvestmentDashboard />
      </div>
    </div>
  )
}
