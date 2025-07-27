export interface NetWorthData {
  date: string
  netWorth: number
  assets: number
  liabilities: number
}

export const mockNetWorthData: NetWorthData[] = [
  { date: '2024-01-01', netWorth: 25000, assets: 30000, liabilities: 5000 },
  { date: '2024-02-01', netWorth: 26200, assets: 31500, liabilities: 5300 },
  { date: '2024-03-01', netWorth: 24800, assets: 30200, liabilities: 5400 },
  { date: '2024-04-01', netWorth: 27100, assets: 32800, liabilities: 5700 },
  { date: '2024-05-01', netWorth: 28300, assets: 34200, liabilities: 5900 },
  { date: '2024-06-01', netWorth: 29415, assets: 35500, liabilities: 6085 },
]