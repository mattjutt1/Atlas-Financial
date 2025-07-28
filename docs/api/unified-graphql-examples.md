# Atlas Financial - Unified GraphQL API Examples

This document provides comprehensive examples of using the unified GraphQL API that combines Hasura's database operations with the Rust Financial Engine's calculations.

## Overview

The unified API surface combines:
- **Hasura GraphQL**: Database operations (accounts, transactions, users)
- **Rust Financial Engine**: Financial calculations (debt optimization, portfolio analysis, time value of money)

All operations are available through a single GraphQL endpoint at `http://localhost:8081/v1/graphql`.

## Authentication

All requests require authentication via JWT tokens from SuperTokens:

```bash
# Example with curl
curl -X POST http://localhost:8081/v1/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "..."}'
```

## Query Examples

### 1. Combined Account and Debt Analysis

```graphql
query AccountDebtAnalysis($userId: String!) {
  # Get user accounts from database
  accounts(where: {user_id: {_eq: $userId}}) {
    id
    name
    account_type
    balance
    currency
    created_at
    updated_at
  }

  # Get optimized debt strategy from Rust engine
  finance {
    get_optimizeDebts(input: {
      debts: [
        {
          name: "Credit Card 1"
          balance: { amount: "5000.00", currency: USD }
          interestRate: { percentage: { value: "18.99" }, period: ANNUAL }
          minimumPayment: { amount: "150.00", currency: USD }
          debtType: CREDIT_CARD
        },
        {
          name: "Student Loan"
          balance: { amount: "25000.00", currency: USD }
          interestRate: { percentage: { value: "4.5" }, period: ANNUAL }
          minimumPayment: { amount: "300.00", currency: USD }
          debtType: STUDENT_LOAN
        }
      ]
      strategy: AVALANCHE
      extraPayment: { amount: "500.00", currency: USD }
    }) {
      strategy
      totalInterestPaid { amount currency }
      totalTimeToPayoffMonths
      monthlySavings { amount currency }
      paymentPlans {
        debtName
        monthlyPayment { amount currency }
        payoffDate
        totalInterest { amount currency }
        priorityOrder
      }
    }
  }
}
```

### 2. Portfolio Analysis with Transaction History

```graphql
query PortfolioAnalysisWithHistory($portfolioId: String!, $userId: String!) {
  # Get transaction history from database
  transactions(
    where: {
      user_id: {_eq: $userId}
      account: {account_type: {_eq: "investment"}}
    }
    order_by: {date: desc}
    limit: 50
  ) {
    id
    amount
    description
    date
    category
    account {
      name
      account_type
    }
  }

  # Get portfolio risk analysis from Rust engine
  finance {
    get_analyzePortfolioRisk(portfolioId: $portfolioId) {
      volatility
      valueAtRisk95 { amount currency }
      conditionalValueAtRisk95 { amount currency }
      maximumDrawdown
      sharpeRatio
      beta
      alpha
      expectedReturn
      riskAnalysis {
        riskLevel
        recommendation
        diversificationScore
      }
    }
  }
}
```

### 3. Time Value of Money Calculations

```graphql
query TimeValueCalculations {
  finance {
    get_calculateTimeValue(input: {
      presentValue: { amount: "10000.00", currency: USD }
      interestRate: { percentage: { value: "7.0" }, period: ANNUAL }
      periods: 10
      compoundingFrequency: ANNUAL
      calculationType: FUTURE_VALUE
    }) {
      futureValue { amount currency }
      presentValue { amount currency }
      totalInterest { amount currency }
      effectiveRate
      calculations {
        period
        periodValue { amount currency }
        periodInterest { amount currency }
        cumulativeInterest { amount currency }
      }
    }
  }
}
```

## Mutation Examples

### 1. Create Account and Portfolio

```graphql
mutation CreateAccountAndPortfolio($userId: String!) {
  # Create account in database
  insert_accounts_one(object: {
    user_id: $userId
    name: "Investment Account"
    account_type: "investment"
    balance: 50000.00
    currency: "USD"
  }) {
    id
    name
    balance
    currency
  }

  # Create portfolio in Rust engine
  finance {
    execute_createPortfolio(input: {
      name: "Growth Portfolio"
      strategy: GROWTH
      riskTolerance: MODERATE
      initialCapital: { amount: "50000.00", currency: USD }
      targetAllocation: [
        { assetClass: STOCKS, percentage: 70.0 },
        { assetClass: BONDS, percentage: 20.0 },
        { assetClass: CASH, percentage: 10.0 }
      ]
    }) {
      id
      name
      strategy
      totalValue { amount currency }
      performance {
        totalReturn
        annualizedReturn
        volatility
      }
    }
  }
}
```

### 2. Update Portfolio with New Transaction

```graphql
mutation UpdatePortfolioWithTransaction(
  $userId: String!
  $portfolioId: String!
  $amount: Float!
  $description: String!
) {
  # Record transaction in database
  insert_transactions_one(object: {
    user_id: $userId
    amount: $amount
    description: $description
    category: "investment"
    date: "now()"
    account_id: 1 # Investment account ID
  }) {
    id
    amount
    description
    date
  }

  # Update portfolio in Rust engine
  finance {
    execute_updatePortfolio(
      portfolioId: $portfolioId
      input: {
        addCapital: { amount: $amount, currency: USD }
        rebalance: true
      }
    ) {
      id
      totalValue { amount currency }
      performance {
        totalReturn
        annualizedReturn
        volatility
      }
      holdings {
        assetClass
        currentValue { amount currency }
        targetPercentage
        actualPercentage
        rebalanceNeeded
      }
    }
  }
}
```

## Subscription Examples

### 1. Real-time Portfolio Updates

```graphql
subscription PortfolioUpdates($portfolioId: String!) {
  # Subscribe to transaction changes
  transactions(where: {account: {account_type: {_eq: "investment"}}}) {
    id
    amount
    description
    date
    account {
      name
      balance
    }
  }
}
```

## Advanced Query Patterns

### 1. Aggregate Financial Data

```graphql
query FinancialSummary($userId: String!) {
  # Account summaries
  accounts_aggregate(where: {user_id: {_eq: $userId}}) {
    aggregate {
      sum {
        balance
      }
      count
    }
    nodes {
      account_type
      balance
      currency
    }
  }

  # Transaction summaries
  transactions_aggregate(
    where: {
      user_id: {_eq: $userId}
      date: {_gte: "2024-01-01"}
    }
  ) {
    aggregate {
      sum {
        amount
      }
      avg {
        amount
      }
      count
    }
  }

  # Financial calculations
  finance {
    get_calculateNetWorth(userId: $userId) {
      totalAssets { amount currency }
      totalLiabilities { amount currency }
      netWorth { amount currency }
      breakdown {
        category
        value { amount currency }
        percentage
      }
    }
  }
}
```

### 2. Complex Financial Planning

```graphql
query FinancialPlan($userId: String!) {
  # Get user's financial profile
  user_by_pk(id: $userId) {
    id
    email
    profile {
      age
      income
      risk_tolerance
      financial_goals
    }
  }

  # Get comprehensive financial analysis
  finance {
    get_createFinancialPlan(input: {
      userId: $userId
      goals: [
        {
          type: RETIREMENT
          targetAmount: { amount: "1000000.00", currency: USD }
          targetDate: "2055-01-01"
          priority: HIGH
        },
        {
          type: HOME_PURCHASE
          targetAmount: { amount: "500000.00", currency: USD }
          targetDate: "2030-01-01"
          priority: MEDIUM
        }
      ]
      currentSavingsRate: 0.15
      expectedInflation: 0.03
    }) {
      feasibility {
        isAchievable
        confidenceLevel
        recommendations
      }
      milestones {
        date
        description
        targetAmount { amount currency }
        progressRequired
      }
      strategies {
        savingsRate
        investmentAllocation {
          assetClass
          percentage
          expectedReturn
        }
        timeline {
          year
          projectedValue { amount currency }
          contributionsNeeded { amount currency }
        }
      }
    }
  }
}
```

## Error Handling

The unified API provides consistent error handling across both Hasura and Rust components:

```graphql
query WithErrorHandling {
  # This will return detailed errors if something goes wrong
  finance {
    get_optimizeDebts(input: {
      debts: [] # Empty array will cause validation error
      strategy: AVALANCHE
      extraPayment: { amount: "0.00", currency: USD }
    }) {
      strategy
      # Error will be returned in the GraphQL errors array
    }
  }
}
```

## Performance Considerations

1. **Batching**: Use GraphQL query batching for multiple operations
2. **Caching**: Leverage Redis caching in the Rust engine
3. **Pagination**: Use Hasura's built-in pagination for large datasets
4. **Field Selection**: Only request needed fields to minimize response size

## Security Notes

1. All financial calculations require authentication
2. Role-based access control limits available operations
3. Sensitive data is automatically filtered based on user permissions
4. Rate limiting prevents abuse of computational resources

## Testing the Integration

Use the provided test script to verify the integration:

```bash
./scripts/test-integration-rust-hasura.sh
```

For interactive testing, use the GraphQL playgrounds:
- Hasura Console: http://localhost:8081/console
- Rust Engine Playground: http://localhost:8080/
