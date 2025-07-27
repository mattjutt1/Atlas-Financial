pub mod avalanche;
pub mod consolidation;
pub mod optimization;
pub mod snowball;
/// Debt management and optimization module
///
/// Provides comprehensive debt analysis including:
/// - Debt snowball and avalanche strategies
/// - Payment optimization algorithms
/// - Debt consolidation analysis
/// - Interest savings calculations
pub mod types;

pub use avalanche::*;
pub use consolidation::*;
pub use optimization::*;
pub use snowball::*;
pub use types::*;
