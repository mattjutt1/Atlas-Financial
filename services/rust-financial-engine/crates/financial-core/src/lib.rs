pub mod debt;
pub mod error;
pub mod portfolio;
/// Atlas Financial Core Library
///
/// Provides exact decimal precision financial calculations using rust_decimal
/// to eliminate floating-point errors in monetary computations.
pub mod types;

// Re-export commonly used types
pub use error::{FinancialError, Result};
pub use types::*;

// Re-export module functionality
pub use debt::*;
pub use portfolio::*;
