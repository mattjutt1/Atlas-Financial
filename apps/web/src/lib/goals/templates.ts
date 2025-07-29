import { GoalTemplate, GoalType } from '../../types/graphql'

export const GOAL_TEMPLATES: Record<GoalType, GoalTemplate> = {
  emergency_fund: {
    id: 'emergency_fund',
    goal_type: 'emergency_fund',
    name: 'Emergency Fund',
    description: 'Build a safety net to cover 6 months of living expenses for unexpected financial emergencies.',
    suggested_amount: '25000.00', // 6 months * ~$4,200 average monthly expenses
    suggested_timeframe_months: 18,
    icon: 'shield-check',
    color: '#10b981',
    tips: [
      'Start with a small goal of $1,000 for minor emergencies',
      'Automate transfers to make saving effortless',
      'Keep emergency funds in a high-yield savings account',
      'Only use for true emergencies like job loss or medical bills',
      'Aim for 3-6 months of expenses based on job stability'
    ],
    milestones: [
      {
        name: 'First $1,000',
        target_amount: '1000.00',
        target_date: undefined
      },
      {
        name: '1 Month Expenses',
        target_amount: '4200.00',
        target_date: undefined
      },
      {
        name: '3 Months Expenses',
        target_amount: '12600.00',
        target_date: undefined
      },
      {
        name: '6 Months Expenses',
        target_amount: '25200.00',
        target_date: undefined
      }
    ]
  },

  vacation: {
    id: 'vacation',
    goal_type: 'vacation',
    name: 'Dream Vacation',
    description: 'Save for your perfect getaway and create unforgettable memories without going into debt.',
    suggested_amount: '5000.00',
    suggested_timeframe_months: 12,
    icon: 'globe-alt',
    color: '#f59e0b',
    tips: [
      'Research destination costs thoroughly including flights, hotels, food, and activities',
      'Book flights and accommodations early for better deals',
      'Consider travel rewards credit cards for additional savings',
      'Factor in travel insurance and emergency funds',
      'Look for off-season deals to stretch your budget'
    ],
    milestones: [
      {
        name: 'Flight Funds',
        target_amount: '800.00',
        target_date: undefined
      },
      {
        name: 'Accommodation Budget',
        target_amount: '2000.00',
        target_date: undefined
      },
      {
        name: 'Activities & Experiences',
        target_amount: '3500.00',
        target_date: undefined
      },
      {
        name: 'Full Vacation Fund',
        target_amount: '5000.00',
        target_date: undefined
      }
    ]
  },

  house_down_payment: {
    id: 'house_down_payment',
    goal_type: 'house_down_payment',
    name: 'House Down Payment',
    description: 'Save for your dream home down payment and associated closing costs.',
    suggested_amount: '60000.00', // 20% of $300k home
    suggested_timeframe_months: 36,
    icon: 'home',
    color: '#3b82f6',
    tips: [
      'Research local home prices to set a realistic target',
      'Consider FHA loans which require as little as 3.5% down',
      'Factor in closing costs (2-5% of home price)',
      'Get pre-approved to understand your buying power',
      'Consider first-time homebuyer programs and incentives'
    ],
    milestones: [
      {
        name: '5% Down Payment',
        target_amount: '15000.00',
        target_date: undefined
      },
      {
        name: '10% Down Payment',
        target_amount: '30000.00',
        target_date: undefined
      },
      {
        name: '15% Down Payment',
        target_amount: '45000.00',
        target_date: undefined
      },
      {
        name: '20% Down Payment + Closing',
        target_amount: '60000.00',
        target_date: undefined
      }
    ]
  },

  debt_payoff: {
    id: 'debt_payoff',
    goal_type: 'debt_payoff',
    name: 'Debt Freedom',
    description: 'Eliminate high-interest debt and achieve financial freedom.',
    suggested_amount: '15000.00',
    suggested_timeframe_months: 24,
    icon: 'receipt-refund',
    color: '#ef4444',
    tips: [
      'List all debts with balances, minimum payments, and interest rates',
      'Consider debt avalanche (highest interest first) or snowball (smallest balance first)',
      'Stop using credit cards while paying off debt',
      'Look for additional income sources to accelerate payoff',
      'Consider debt consolidation if it lowers your interest rate'
    ],
    milestones: [
      {
        name: 'First $5,000 Paid',
        target_amount: '5000.00',
        target_date: undefined
      },
      {
        name: 'Halfway Point',
        target_amount: '7500.00',
        target_date: undefined
      },
      {
        name: 'Almost Debt-Free',
        target_amount: '12000.00',
        target_date: undefined
      },
      {
        name: 'Debt Freedom!',
        target_amount: '15000.00',
        target_date: undefined
      }
    ]
  },

  retirement: {
    id: 'retirement',
    goal_type: 'retirement',
    name: 'Retirement Savings',
    description: 'Build long-term wealth for a comfortable retirement.',
    suggested_amount: '100000.00',
    suggested_timeframe_months: 120, // 10 years
    icon: 'currency-dollar',
    color: '#8b5cf6',
    tips: [
      'Take advantage of employer 401(k) matching - it\'s free money',
      'Consider Roth IRA for tax-free retirement withdrawals',
      'Aim to save 10-15% of your income for retirement',
      'Start as early as possible to benefit from compound interest',
      'Diversify investments across stocks, bonds, and other assets'
    ],
    milestones: [
      {
        name: 'First $10K',
        target_amount: '10000.00',
        target_date: undefined
      },
      {
        name: '$25K Milestone',
        target_amount: '25000.00',
        target_date: undefined
      },
      {
        name: '$50K Halfway Point',
        target_amount: '50000.00',
        target_date: undefined
      },
      {
        name: '$100K Achievement',
        target_amount: '100000.00',
        target_date: undefined
      }
    ]
  },

  car_purchase: {
    id: 'car_purchase',
    goal_type: 'car_purchase',
    name: 'Car Purchase',
    description: 'Save for a reliable vehicle without taking on excessive debt.',
    suggested_amount: '25000.00',
    suggested_timeframe_months: 24,
    icon: 'truck',
    color: '#06b6d4',
    tips: [
      'Research reliable car models and their typical costs',
      'Consider certified pre-owned vehicles for better value',
      'Factor in sales tax, registration, and insurance costs',
      'Get pre-approved for financing to understand your options',
      'A larger down payment reduces monthly payments and interest'
    ],
    milestones: [
      {
        name: 'Initial Down Payment',
        target_amount: '5000.00',
        target_date: undefined
      },
      {
        name: 'Solid Down Payment',
        target_amount: '10000.00',
        target_date: undefined
      },
      {
        name: 'Substantial Down Payment',
        target_amount: '15000.00',
        target_date: undefined
      },
      {
        name: 'Cash Purchase Ready',
        target_amount: '25000.00',
        target_date: undefined
      }
    ]
  },

  education: {
    id: 'education',
    goal_type: 'education',
    name: 'Education Fund',
    description: 'Invest in education for yourself or your family\'s future.',
    suggested_amount: '20000.00',
    suggested_timeframe_months: 36,
    icon: 'academic-cap',
    color: '#84cc16',
    tips: [
      'Research tuition costs and trends at target schools',
      'Consider 529 education savings plans for tax advantages',
      'Look into scholarship and grant opportunities',
      'Community college can be a cost-effective starting point',
      'Factor in books, room and board, and living expenses'
    ],
    milestones: [
      {
        name: 'First Semester Covered',
        target_amount: '5000.00',
        target_date: undefined
      },
      {
        name: 'First Year Covered',
        target_amount: '10000.00',
        target_date: undefined
      },
      {
        name: 'Multiple Years Covered',
        target_amount: '15000.00',
        target_date: undefined
      },
      {
        name: 'Full Education Fund',
        target_amount: '20000.00',
        target_date: undefined
      }
    ]
  },

  wedding: {
    id: 'wedding',
    goal_type: 'wedding',
    name: 'Dream Wedding',
    description: 'Plan and save for your special day without starting married life in debt.',
    suggested_amount: '30000.00',
    suggested_timeframe_months: 18,
    icon: 'heart',
    color: '#ec4899',
    tips: [
      'Set priorities - decide what aspects are most important to you',
      'Consider off-peak dates and venues for significant savings',
      'DIY elements can add personal touches while saving money',
      'Book vendors early to lock in pricing',
      'Consider a wedding savings account to earn interest'
    ],
    milestones: [
      {
        name: 'Venue Deposit',
        target_amount: '5000.00',
        target_date: undefined
      },
      {
        name: 'Major Vendors Covered',
        target_amount: '15000.00',
        target_date: undefined
      },
      {
        name: 'Most Expenses Covered',
        target_amount: '25000.00',
        target_date: undefined
      },
      {
        name: 'Dream Wedding Fund',
        target_amount: '30000.00',
        target_date: undefined
      }
    ]
  },

  home_improvement: {
    id: 'home_improvement',
    goal_type: 'home_improvement',
    name: 'Home Improvement',
    description: 'Upgrade and enhance your living space to increase comfort and value.',
    suggested_amount: '15000.00',
    suggested_timeframe_months: 12,
    icon: 'wrench-screwdriver',
    color: '#f97316',
    tips: [
      'Get multiple quotes from contractors before starting',
      'Focus on improvements that add value to your home',
      'Consider DIY for simple projects to save on labor costs',
      'Plan for 10-20% cost overruns on major projects',
      'Prioritize safety and structural improvements first'
    ],
    milestones: [
      {
        name: 'Planning & Permits',
        target_amount: '2000.00',
        target_date: undefined
      },
      {
        name: 'Major Materials',
        target_amount: '8000.00',
        target_date: undefined
      },
      {
        name: 'Labor & Installation',
        target_amount: '12000.00',
        target_date: undefined
      },
      {
        name: 'Project Complete',
        target_amount: '15000.00',
        target_date: undefined
      }
    ]
  },

  custom: {
    id: 'custom',
    goal_type: 'custom',
    name: 'Custom Goal',
    description: 'Create your own personalized savings goal for any purpose.',
    suggested_amount: '10000.00',
    suggested_timeframe_months: 12,
    icon: 'star',
    color: '#6b7280',
    tips: [
      'Be specific about what you\'re saving for',
      'Research realistic costs and timeframes',
      'Break large goals into smaller milestones',
      'Automate your savings to stay consistent',
      'Celebrate milestones to stay motivated'
    ],
    milestones: [
      {
        name: '25% Progress',
        target_amount: '2500.00',
        target_date: undefined
      },
      {
        name: 'Halfway Point',
        target_amount: '5000.00',
        target_date: undefined
      },
      {
        name: '75% Progress',
        target_amount: '7500.00',
        target_date: undefined
      },
      {
        name: 'Goal Achieved!',
        target_amount: '10000.00',
        target_date: undefined
      }
    ]
  }
}

export const getGoalTemplate = (goalType: GoalType): GoalTemplate => {
  return GOAL_TEMPLATES[goalType]
}

export const getAllGoalTemplates = (): GoalTemplate[] => {
  return Object.values(GOAL_TEMPLATES)
}

export const getGoalIcon = (goalType: GoalType): string => {
  return GOAL_TEMPLATES[goalType].icon
}

export const getGoalColor = (goalType: GoalType): string => {
  return GOAL_TEMPLATES[goalType].color
}
