/// Portfolio analysis and optimization module
/// 
/// Provides comprehensive portfolio analysis including:
/// - Expected return calculations
/// - Risk metrics (volatility, VaR, Sharpe ratio)
/// - Modern Portfolio Theory optimization
/// - Asset allocation strategies

pub mod types;
pub mod optimization;
pub mod risk;
pub mod allocation;

pub use types::*;
pub use optimization::*;
pub use risk::*;
pub use allocation::*;