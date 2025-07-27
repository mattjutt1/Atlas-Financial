/// Debt management and optimization module
/// 
/// Provides comprehensive debt analysis including:
/// - Debt snowball and avalanche strategies
/// - Payment optimization algorithms
/// - Debt consolidation analysis
/// - Interest savings calculations

pub mod types;
pub mod snowball;
pub mod avalanche;
pub mod optimization;
pub mod consolidation;

pub use types::*;
pub use snowball::*;
pub use avalanche::*;
pub use optimization::*;
pub use consolidation::*;