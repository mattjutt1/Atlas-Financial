/// Atlas Financial Core Library
/// 
/// Provides exact decimal precision financial calculations using rust_decimal
/// to eliminate floating-point errors in monetary computations.

pub mod types;
pub mod error;
pub mod portfolio;
pub mod debt;

// Re-export commonly used types
pub use types::*;
pub use error::{FinancialError, Result};

// Re-export module functionality
pub use portfolio::*;
pub use debt::*;