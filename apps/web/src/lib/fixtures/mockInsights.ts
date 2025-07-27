export interface Insight {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  actionableSteps: string[]
  category: string
}

export const mockInsights: Insight[] = [
  {
    id: '1',
    title: 'Your credit card debt is growing faster than your savings',
    description: 'You\'ve accumulated $1,284 in credit card debt this month while only saving $240. At this rate, you\'ll be paying $156 annually in interest charges alone. This is preventing you from building wealth.',
    severity: 'high',
    actionableSteps: [
      'Pay more than the minimum payment on your credit card',
      'Create a debt payoff plan using the avalanche method',
      'Consider temporarily reducing your savings rate to eliminate high-interest debt first'
    ],
    category: 'debt'
  },
  {
    id: '2',
    title: 'You\'re spending 23% more on dining out than budgeted',
    description: 'Your restaurant and takeout expenses are $347 over budget this month. This "small" overspending amounts to $4,164 annually - enough for a solid emergency fund contribution.',
    severity: 'medium',
    actionableSteps: [
      'Set a strict weekly dining out limit',
      'Meal prep on Sundays to avoid impulsive food purchases',
      'Use a separate debit card with your dining budget loaded on it'
    ],
    category: 'spending'
  }
]