/// Core financial types with exact decimal precision
/// 
/// All monetary calculations use rust_decimal to ensure
/// exact decimal arithmetic without floating-point errors.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::fmt;
use validator::Validate;

/// Supported currencies for financial calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    CAD,
    AUD,
    JPY,
    CHF,
    CNY,
}

impl fmt::Display for Currency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Currency::USD => write!(f, "USD"),
            Currency::EUR => write!(f, "EUR"),
            Currency::GBP => write!(f, "GBP"),
            Currency::CAD => write!(f, "CAD"),
            Currency::AUD => write!(f, "AUD"),
            Currency::JPY => write!(f, "JPY"),
            Currency::CHF => write!(f, "CHF"),
            Currency::CNY => write!(f, "CNY"),
        }
    }
}

/// Exact decimal monetary amount with currency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Validate)]
pub struct Money {
    #[validate(range(min = -1000000000, max = 1000000000))]
    amount: Decimal,
    currency: Currency,
}

impl Money {
    /// Create a new Money instance with validation
    pub fn new(amount: Decimal, currency: Currency) -> crate::Result<Self> {
        let money = Self { amount, currency };
        money.validate()
            .map_err(|e| crate::error::FinancialError::ValidationError(e.to_string()))?;
        Ok(money)
    }

    /// Create without validation (for internal use)
    pub fn new_unchecked(amount: Decimal, currency: Currency) -> Self {
        Self { amount, currency }
    }

    /// Get the decimal amount
    pub fn amount(&self) -> Decimal {
        self.amount
    }

    /// Get the currency
    pub fn currency(&self) -> Currency {
        self.currency
    }

    /// Add two money amounts (must be same currency)
    pub fn add(&self, other: &Money) -> crate::Result<Money> {
        if self.currency != other.currency {
            return Err(crate::error::FinancialError::CurrencyMismatch {
                expected: self.currency,
                actual: other.currency,
            });
        }
        Ok(Money::new_unchecked(self.amount + other.amount, self.currency))
    }

    /// Subtract two money amounts (must be same currency)
    pub fn subtract(&self, other: &Money) -> crate::Result<Money> {
        if self.currency != other.currency {
            return Err(crate::error::FinancialError::CurrencyMismatch {
                expected: self.currency,
                actual: other.currency,
            });
        }
        Ok(Money::new_unchecked(self.amount - other.amount, self.currency))
    }

    /// Multiply money by a decimal factor
    pub fn multiply(&self, factor: Decimal) -> Money {
        Money::new_unchecked(self.amount * factor, self.currency)
    }

    /// Divide money by a decimal divisor
    pub fn divide(&self, divisor: Decimal) -> crate::Result<Money> {
        if divisor.is_zero() {
            return Err(crate::error::FinancialError::DivisionByZero);
        }
        Ok(Money::new_unchecked(self.amount / divisor, self.currency))
    }

    /// Check if amount is positive
    pub fn is_positive(&self) -> bool {
        self.amount.is_sign_positive()
    }

    /// Check if amount is negative
    pub fn is_negative(&self) -> bool {
        self.amount.is_sign_negative()
    }

    /// Get absolute value
    pub fn abs(&self) -> Money {
        Money::new_unchecked(self.amount.abs(), self.currency)
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.currency, self.amount)
    }
}

/// Percentage type for rates and ratios
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Validate)]
pub struct Percentage {
    #[validate(range(min = -100.0, max = 10000.0))]
    value: Decimal,
}

impl Percentage {
    /// Create a percentage from a decimal value (e.g., 0.05 for 5%)
    pub fn from_decimal(value: Decimal) -> crate::Result<Self> {
        let percentage = Self { value: value * Decimal::from(100) };
        percentage.validate()
            .map_err(|e| crate::error::FinancialError::ValidationError(e.to_string()))?;
        Ok(percentage)
    }

    /// Create a percentage from a percentage value (e.g., 5.0 for 5%)
    pub fn from_percentage(value: Decimal) -> crate::Result<Self> {
        let percentage = Self { value };
        percentage.validate()
            .map_err(|e| crate::error::FinancialError::ValidationError(e.to_string()))?;
        Ok(percentage)
    }

    /// Get the decimal representation (e.g., 0.05 for 5%)
    pub fn as_decimal(&self) -> Decimal {
        self.value / Decimal::from(100)
    }

    /// Get the percentage representation (e.g., 5.0 for 5%)
    pub fn as_percentage(&self) -> Decimal {
        self.value
    }
}

impl fmt::Display for Percentage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}%", self.value)
    }
}

/// Interest rate type with period specification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rate {
    percentage: Percentage,
    period: Period,
}

impl Rate {
    /// Create a new interest rate
    pub fn new(percentage: Percentage, period: Period) -> Self {
        Self { percentage, period }
    }

    /// Get the rate as a decimal for the specified period
    pub fn as_decimal(&self) -> Decimal {
        self.percentage.as_decimal()
    }

    /// Convert rate to different period
    pub fn convert_to_period(&self, target_period: Period) -> crate::Result<Rate> {
        let annual_rate = match self.period {
            Period::Annual => self.percentage.as_decimal(),
            Period::Monthly => self.percentage.as_decimal() * Decimal::from(12),
            Period::Daily => self.percentage.as_decimal() * Decimal::from(365),
        };

        let target_rate = match target_period {
            Period::Annual => annual_rate,
            Period::Monthly => annual_rate / Decimal::from(12),
            Period::Daily => annual_rate / Decimal::from(365),
        };

        Ok(Rate::new(
            Percentage::from_decimal(target_rate)?,
            target_period,
        ))
    }
}

/// Time period for rate calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Period {
    Annual,
    Monthly,
    Daily,
}

/// Risk level classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Conservative,
    Moderate,
    Aggressive,
    Speculative,
}

/// Asset class for portfolio analysis
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AssetClass {
    Cash,
    Bonds,
    Stocks,
    RealEstate,
    Commodities,
    Crypto,
    Alternative,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_money_operations() {
        let m1 = Money::new(dec!(100.50), Currency::USD).unwrap();
        let m2 = Money::new(dec!(50.25), Currency::USD).unwrap();
        
        let sum = m1.add(&m2).unwrap();
        assert_eq!(sum.amount(), dec!(150.75));
        
        let diff = m1.subtract(&m2).unwrap();
        assert_eq!(diff.amount(), dec!(50.25));
        
        let product = m1.multiply(dec!(2.0));
        assert_eq!(product.amount(), dec!(201.00));
        
        let quotient = m1.divide(dec!(2.0)).unwrap();
        assert_eq!(quotient.amount(), dec!(50.25));
    }

    #[test]
    fn test_currency_mismatch() {
        let m1 = Money::new(dec!(100.00), Currency::USD).unwrap();
        let m2 = Money::new(dec!(50.00), Currency::EUR).unwrap();
        
        assert!(m1.add(&m2).is_err());
        assert!(m1.subtract(&m2).is_err());
    }

    #[test]
    fn test_percentage() {
        let pct = Percentage::from_percentage(dec!(5.5)).unwrap();
        assert_eq!(pct.as_decimal(), dec!(0.055));
        assert_eq!(pct.as_percentage(), dec!(5.5));
        
        let pct2 = Percentage::from_decimal(dec!(0.075)).unwrap();
        assert_eq!(pct2.as_percentage(), dec!(7.5));
    }

    #[test]
    fn test_rate_conversion() {
        let monthly_rate = Rate::new(
            Percentage::from_percentage(dec!(1.0)).unwrap(),
            Period::Monthly
        );
        
        let annual_rate = monthly_rate.convert_to_period(Period::Annual).unwrap();
        assert_eq!(annual_rate.as_decimal(), dec!(0.12)); // 12% annually
    }
}