'use client'

import React, { useState, useMemo } from 'react'
import { Card, LoadingSpinner } from '@/components/common'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  TrendingDownIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ScaleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Props {
  portfolioId: string
  detailed?: boolean
}

interface RiskMetric {
  name: string
  value: number
  description: string
  level: 'low' | 'medium' | 'high'
  benchmark?: number
}

interface CorrelationData {
  asset1: string
  asset2: string
  correlation: number
}

interface VolatilityData {
  symbol: string
  name: string
  volatility: number
  weight: number
  contribution: number
}

export function RiskAnalysisPanel({ portfolioId, detailed = false }: Props) {
  const [timeFrame, setTimeFrame] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y')
  const [riskView, setRiskView] = useState<'overview' | 'detailed' | 'scenarios'>('overview')

  // Mock risk metrics (would come from Rust Financial Engine)
  const riskMetrics: RiskMetric[] = useMemo(() => [
    {
      name: 'Portfolio Beta',
      value: 1.15,
      description: 'Sensitivity to market movements',
      level: 'medium',
      benchmark: 1.0
    },
    {
      name: 'Volatility',
      value: 18.5,
      description: 'Annualized standard deviation',
      level: 'medium',
      benchmark: 15.0
    },
    {
      name: 'Sharpe Ratio',
      value: 0.85,
      description: 'Risk-adjusted return',
      level: 'medium',
      benchmark: 1.0
    },
    {
      name: 'Sortino Ratio',
      value: 1.12,
      description: 'Downside risk-adjusted return',
      level: 'medium',
      benchmark: 1.0
    },
    {
      name: 'Maximum Drawdown',
      value: 22.3,
      description: 'Largest peak-to-trough decline',
      level: 'high',
      benchmark: 15.0
    },
    {
      name: 'Value at Risk (95%)',
      value: 4.2,
      description: 'Potential daily loss with 95% confidence',
      level: 'medium',
      benchmark: 3.0
    }
  ], [])

  // Risk radar chart data
  const radarData = useMemo(() => [
    { subject: 'Market Risk', value: 75, fullMark: 100 },
    { subject: 'Credit Risk', value: 35, fullMark: 100 },
    { subject: 'Liquidity Risk', value: 20, fullMark: 100 },
    { subject: 'Concentration Risk', value: 60, fullMark: 100 },
    { subject: 'Currency Risk', value: 15, fullMark: 100 },
    { subject: 'Interest Rate Risk', value: 45, fullMark: 100 }
  ], [])

  // Volatility contribution data
  const volatilityData: VolatilityData[] = useMemo(() => [
    { symbol: 'AAPL', name: 'Apple Inc.', volatility: 24.5, weight: 15.2, contribution: 3.7 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', volatility: 22.1, weight: 12.8, contribution: 2.8 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', volatility: 28.3, weight: 10.5, contribution: 3.0 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', volatility: 31.2, weight: 8.7, contribution: 2.7 },
    { symbol: 'TSLA', name: 'Tesla Inc.', volatility: 45.6, weight: 5.3, contribution: 2.4 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', volatility: 16.8, weight: 20.0, contribution: 3.4 },
    { symbol: 'BND', name: 'Vanguard Total Bond', volatility: 4.2, weight: 15.0, contribution: 0.6 },
    { symbol: 'VTI', name: 'Vanguard Total Stock', volatility: 18.5, weight: 12.5, contribution: 2.3 }
  ], [])

  // Risk scenarios data
  const scenarioData = useMemo(() => [
    { scenario: 'Bull Market (+20%)', portfolioReturn: 24.5, probability: 25 },
    { scenario: 'Normal Market (+8%)', portfolioReturn: 9.2, probability: 40 },
    { scenario: 'Bear Market (-15%)', portfolioReturn: -18.7, probability: 20 },
    { scenario: 'Market Crash (-30%)', portfolioReturn: -35.2, probability: 10 },
    { scenario: 'Black Swan (-50%)', portfolioReturn: -58.1, probability: 5 }
  ], [])

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return ShieldCheckIcon
      case 'medium':
        return ExclamationTriangleIcon
      case 'high':
        return TrendingDownIcon
    }
  }

  const getRiskLevelText = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'Low Risk'
      case 'medium':
        return 'Medium Risk'
      case 'high':
        return 'High Risk'
    }
  }

  if (!detailed) {
    // Compact view for dashboard
    return (
      <Card className="p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Risk Analysis</h4>

        <div className="space-y-4">
          {/* Key Risk Metrics */}
          <div className="grid grid-cols-1 gap-3">
            {riskMetrics.slice(0, 3).map((metric, index) => {
              const RiskIcon = getRiskIcon(metric.level)

              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <RiskIcon className={`h-5 w-5 mr-2 ${
                      metric.level === 'low' ? 'text-green-500' :
                      metric.level === 'medium' ? 'text-amber-500' : 'text-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                      <p className="text-xs text-gray-500">{metric.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {metric.name.includes('Ratio') ? metric.value.toFixed(2) : formatPercentage(metric.value)}
                    </p>
                    {metric.benchmark && (
                      <p className="text-xs text-gray-500">
                        vs {metric.name.includes('Ratio') ? metric.benchmark.toFixed(2) : formatPercentage(metric.benchmark)} benchmark
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mini Risk Radar */}
          <div className="mt-6">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Profile</h5>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={false} />
                <Radar
                  name="Risk Level"
                  dataKey="value"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    )
  }

  // Detailed view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Risk Analysis</h3>
          <p className="text-sm text-gray-500">
            Comprehensive portfolio risk assessment and scenario analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value as any)}
            className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {['overview', 'detailed', 'scenarios'].map((view) => (
          <button
            key={view}
            onClick={() => setRiskView(view as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              riskView === view
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {riskView === 'overview' && (
        <>
          {/* Risk Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {riskMetrics.map((metric, index) => {
              const RiskIcon = getRiskIcon(metric.level)

              return (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <RiskIcon className={`h-6 w-6 mr-3 ${
                        metric.level === 'low' ? 'text-green-500' :
                        metric.level === 'medium' ? 'text-amber-500' : 'text-red-500'
                      }`} />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{metric.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(metric.level)}`}>
                      {getRiskLevelText(metric.level)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-gray-900">
                        {metric.name.includes('Ratio') ? metric.value.toFixed(2) : formatPercentage(metric.value)}
                      </span>
                      {metric.benchmark && (
                        <span className="text-sm text-gray-500">
                          Benchmark: {metric.name.includes('Ratio') ? metric.benchmark.toFixed(2) : formatPercentage(metric.benchmark)}
                        </span>
                      )}
                    </div>

                    {metric.benchmark && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>vs Benchmark</span>
                          <span className={
                            metric.value > metric.benchmark
                              ? (metric.name === 'Maximum Drawdown' || metric.name === 'Volatility' ? 'text-red-600' : 'text-green-600')
                              : (metric.name === 'Maximum Drawdown' || metric.name === 'Volatility' ? 'text-green-600' : 'text-red-600')
                          }>
                            {((metric.value - metric.benchmark) / metric.benchmark * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              metric.value > metric.benchmark
                                ? (metric.name === 'Maximum Drawdown' || metric.name === 'Volatility' ? 'bg-red-400' : 'bg-green-400')
                                : (metric.name === 'Maximum Drawdown' || metric.name === 'Volatility' ? 'bg-green-400' : 'bg-red-400')
                            }`}
                            style={{
                              width: `${Math.min(Math.abs((metric.value / metric.benchmark - 1) * 100), 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Risk Radar Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Risk Profile Breakdown</h4>
              <div className="flex items-center text-sm text-gray-500">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                <span>Higher values indicate higher risk</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis tick={{ fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Risk Level"
                  dataKey="value"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {riskView === 'detailed' && (
        <>
          {/* Volatility Contribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Volatility Contribution by Holding</h4>
              <div className="flex items-center text-sm text-gray-500">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                <span>Risk contribution analysis</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={volatilityData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="symbol"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(2)}%`,
                    name === 'volatility' ? 'Individual Volatility' : 'Risk Contribution'
                  ]}
                  labelFormatter={(label: string, payload: any) => {
                    const data = payload?.[0]?.payload
                    return data ? `${data.symbol} - ${data.name}` : label
                  }}
                />
                <Bar dataKey="volatility" fill="#3B82F6" name="volatility" />
                <Bar dataKey="contribution" fill="#EF4444" name="contribution" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Individual Volatility:</strong> Annualized volatility of each holding
              </p>
              <p>
                <strong>Risk Contribution:</strong> How much each holding contributes to overall portfolio risk
              </p>
            </div>
          </Card>

          {/* Detailed Risk Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Risk Decomposition</h4>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Systematic Risk</span>
                  <span className="text-sm font-semibold text-red-600">65.2%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Idiosyncratic Risk</span>
                  <span className="text-sm font-semibold text-blue-600">34.8%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Concentration Risk</span>
                  <span className="text-sm font-semibold text-amber-600">28.5%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Systematic Risk:</strong> Market-wide risk that cannot be diversified away<br/>
                  <strong>Idiosyncratic Risk:</strong> Company-specific risk that can be reduced through diversification<br/>
                  <strong>Concentration Risk:</strong> Risk from having too much invested in similar assets
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Time Horizon Analysis</h4>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">1 Month VaR (95%)</span>
                    <span className="text-sm font-semibold text-red-600">-4.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">1 Year VaR (95%)</span>
                    <span className="text-sm font-semibold text-red-600">-18.7%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Expected Shortfall</span>
                    <span className="text-sm font-semibold text-red-600">-7.3%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Value at Risk (VaR) represents the potential loss with 95% confidence.
                  Expected Shortfall is the average loss beyond the VaR threshold.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {riskView === 'scenarios' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-gray-900">Scenario Analysis</h4>
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>12-month projections</span>
            </div>
          </div>

          <div className="space-y-4">
            {scenarioData.map((scenario, index) => {
              const isPositive = scenario.portfolioReturn > 0
              const isNegative = scenario.portfolioReturn < 0

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h5 className="text-sm font-medium text-gray-900">
                          {scenario.scenario}
                        </h5>
                        <span className="text-xs text-gray-500">
                          {scenario.probability}% probability
                        </span>
                      </div>

                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gray-400"
                            style={{ width: `${scenario.probability}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-6">
                      <div className={`text-lg font-semibold ${
                        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {isPositive ? '+' : ''}{scenario.portfolioReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Portfolio Return
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scenario Summary */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-green-600">
                  +{scenarioData.filter(s => s.portfolioReturn > 0).reduce((sum, s) => sum + s.portfolioReturn * s.probability / 100, 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Expected Upside</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {scenarioData.reduce((sum, s) => sum + s.portfolioReturn * s.probability / 100, 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Expected Return</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600">
                  {scenarioData.filter(s => s.portfolioReturn < 0).reduce((sum, s) => sum + s.portfolioReturn * s.probability / 100, 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Expected Downside</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
