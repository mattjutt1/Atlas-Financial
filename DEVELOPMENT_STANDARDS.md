# Atlas Financial - Development Standards & Quality Rules

## 🚨 MANDATORY QUALITY RULES - ENFORCE AFTER EACH UPDATE

### 1. Pre-Commit Requirements ✅
- **MUST** pass all pre-commit hooks before any commit
- **MUST** maintain test coverage thresholds (80% general, 100% financial calculations)
- **MUST** pass security scans (no secrets, vulnerabilities)
- **MUST** follow conventional commit message format

### 2. Code Quality Standards ✅
- **TypeScript/JavaScript**: ESLint + Prettier compliance required
- **Rust**: Clippy warnings as errors, rustfmt formatting required
- **SQL**: SQLFluff compliance for all database changes
- **Docker**: Hadolint compliance for all Dockerfiles

### 3. Testing Requirements ✅
- **Unit Tests**: 80% minimum coverage for all code
- **Financial Calculations**: 100% test coverage required
- **Integration Tests**: Must pass before deployment
- **Property-Based Tests**: Required for all financial algorithms

### 4. Documentation Standards ✅
- **Code Documentation**: All public APIs must have comprehensive docs
- **Architecture Decisions**: ADRs required for major changes
- **Memory Files**: Update static/contextual memory after significant changes
- **API Documentation**: GraphQL schema must be documented with examples

## Code Documentation Templates

### Rust Function Documentation Template
```rust
/// Brief description of what this function does
///
/// This function performs [specific operation] with [key characteristics].
/// It's designed for [use case] and ensures [quality guarantees].
///
/// # Arguments
///
/// * `param1` - Description of first parameter
/// * `param2` - Description of second parameter
///
/// # Returns
///
/// Returns `Result<ReturnType, ErrorType>` where:
/// - `Ok(value)` - Description of success case
/// - `Err(error)` - Description of error conditions
///
/// # Examples
///
/// ```rust
/// use financial_core::Money;
/// use rust_decimal_macros::dec;
///
/// let amount = Money::new(dec!(100.50), Currency::USD)?;
/// let result = calculate_interest(&amount, dec!(0.05))?;
/// assert_eq!(result.amount(), dec!(5.025));
/// ```
///
/// # Errors
///
/// This function will return an error if:
/// - Input validation fails
/// - Mathematical overflow occurs
/// - Currency mismatch detected
///
/// # Panics
///
/// This function panics if [conditions that cause panic].
///
/// # Safety
///
/// This function is safe because [safety guarantees].
///
/// # Performance
///
/// - Time complexity: O(n)
/// - Space complexity: O(1)
/// - Benchmark: ~10ms for typical portfolio (100 assets)
fn calculate_interest(principal: &Money, rate: Decimal) -> Result<Money, FinancialError> {
    // Implementation...
}
```

### TypeScript Function Documentation Template
```typescript
/**
 * Brief description of what this function does
 *
 * Detailed explanation of the function's purpose, behavior, and important
 * considerations. Include any side effects or state changes.
 *
 * @param param1 - Description of first parameter
 * @param param2 - Description of second parameter
 * @returns Description of return value and its structure
 *
 * @throws {ValidationError} When input validation fails
 * @throws {PrecisionError} When decimal precision is compromised
 *
 * @example
 * ```typescript
 * const portfolio = createPortfolio({
 *   name: "My Portfolio",
 *   assets: [...]
 * });
 * console.log(portfolio.totalValue); // "10000.00"
 * ```
 *
 * @see {@link RelatedFunction} for related functionality
 * @since 1.0.0
 */
export function createPortfolio(options: PortfolioOptions): Portfolio {
  // Implementation...
}
```

### React Component Documentation Template
```typescript
/**
 * Component brief description
 *
 * Detailed description of the component's purpose, behavior, and usage.
 * Include any important design decisions or accessibility considerations.
 *
 * @example
 * ```tsx
 * <AccountCard
 *   account={userAccount}
 *   showBalance={true}
 *   onEdit={handleEdit}
 * />
 * ```
 */
interface AccountCardProps {
  /** Account data to display */
  account: Account;
  /** Whether to show account balance */
  showBalance?: boolean;
  /** Callback when edit button is clicked */
  onEdit?: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  showBalance = true,
  onEdit
}) => {
  // Implementation...
};
```

### GraphQL Schema Documentation Template
```graphql
"""
Portfolio optimization input parameters

This input type defines all parameters needed for portfolio optimization
including risk tolerance, target returns, and constraints.
"""
input OptimizePortfolioInput {
  """Portfolio ID to optimize"""
  portfolioId: ID!
  
  """Risk tolerance level (CONSERVATIVE, MODERATE, AGGRESSIVE)"""
  riskTolerance: RiskTolerance!
  
  """Target annual return percentage (e.g., 8.0 for 8%)"""
  targetReturn: Percentage
  
  """Maximum allocation percentage for any single asset"""
  maxAssetAllocation: Percentage
  
  """Rebalancing constraints and preferences"""
  constraints: RebalancingConstraints
}
```

## Architecture Decision Record (ADR) Template

```markdown
# ADR-XXX: [Decision Title]

**Status**: [Proposed | Accepted | Rejected | Superseded]  
**Date**: YYYY-MM-DD  
**Deciders**: [List of decision makers]  

## Context

Describe the forces at play, including technological, political, social, and 
project local. These forces are probably in tension, and should be called out 
as such.

## Decision

State the architecture decision and provide detailed justification.

## Consequences

What becomes easier or more difficult to do and any risks introduced by the change.

### Positive
- [Positive consequence 1]
- [Positive consequence 2]

### Negative
- [Negative consequence 1]
- [Risk mitigation strategy]

### Neutral
- [Neutral consequence]

## Implementation

Specific steps needed to implement this decision.

## Compliance

How this decision aligns with our quality standards and requirements.
```

## Memory File Update Requirements

### After Every Significant Change:

#### 1. Static Memory Files (When to Update)
- **Phase completion**: New `phase-X-Y_description.md` file
- **Major feature**: Update relevant static memory file
- **Architecture changes**: New or updated documentation

#### 2. Contextual Memory Files (When to Update)
- **Integration changes**: Update relationship mappings
- **Performance changes**: Update performance context
- **Security changes**: Update security context

#### 3. Knowledge Graph Files (When to Update)
- **System architecture**: Update component relationships
- **API changes**: Update schema documentation
- **Service additions**: Add new nodes and edges

## Commit Message Standards

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `security`: Security improvements

### Examples
```
feat(financial-engine): implement debt snowball algorithm

Add comprehensive debt snowball calculation with psychological 
motivation scoring and payment scheduling optimization.

- Implements smallest-balance-first prioritization
- Adds psychological win calculation
- Includes payment plan generation
- Maintains 100% test coverage

Closes #123
```

## Quality Gates

### Pre-Deployment Checklist
- [ ] All tests passing (unit + integration + e2e)
- [ ] Code coverage thresholds met
- [ ] Security scans passed
- [ ] Performance benchmarks within targets
- [ ] Documentation updated
- [ ] Memory files updated (if applicable)
- [ ] ADR created (for architecture changes)

### Performance Targets
- **Financial Calculations**: <50ms for complex operations
- **API Responses**: <200ms for GraphQL queries
- **Frontend Load**: <3 seconds initial load
- **Test Suite**: <5 minutes total execution time

## Error Handling Standards

### Rust Error Handling
```rust
// Use comprehensive error types
#[derive(Debug, thiserror::Error)]
pub enum FinancialError {
    #[error("Currency mismatch: {expected} vs {actual}")]
    CurrencyMismatch { expected: Currency, actual: Currency },
    
    #[error("Invalid decimal precision: {value}")]
    InvalidPrecision { value: String },
    
    #[error("Calculation overflow in {operation}")]
    CalculationOverflow { operation: String },
}
```

### TypeScript Error Handling
```typescript
// Use typed error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

This document serves as the **single source of truth** for all development standards in the Atlas Financial project. All team members must follow these standards, and automated tooling enforces compliance where possible.