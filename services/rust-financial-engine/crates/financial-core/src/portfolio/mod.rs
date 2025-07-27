pub mod allocation;
pub mod optimization;
pub mod risk;
/// Portfolio analysis and optimization module
///
/// Provides comprehensive portfolio analysis including:
/// - Expected return calculations
/// - Risk metrics (volatility, VaR, Sharpe ratio)
/// - Modern Portfolio Theory optimization
/// - Asset allocation strategies
pub mod types;

pub use allocation::*;
pub use optimization::*;
pub use risk::*;
pub use types::*;
