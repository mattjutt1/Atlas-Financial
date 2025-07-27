# Atlas Financial - Rust Financial Engine Makefile
# Provides standardized commands for development, testing, and deployment

.PHONY: help build test lint fmt check doc clean install dev release security audit bench

# Default target
help: ## Show this help message
	@echo "Atlas Financial - Rust Financial Engine"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development Commands
dev: ## Start development server with hot reload
	cargo watch -x "run --bin financial-api"

build: ## Build all crates in release mode
	cargo build --release --all

test: ## Run all tests with coverage
	cargo test --all --all-features
	cargo test --doc

test-coverage: ## Generate test coverage report
	cargo tarpaulin --out Html --output-dir coverage --all-features

bench: ## Run performance benchmarks
	cargo bench --all

# Code Quality Commands
lint: ## Run clippy linter
	cargo clippy --all-targets --all-features -- -D warnings

fmt: ## Format code using rustfmt
	cargo fmt --all

check: ## Check code without building
	cargo check --all --all-features

doc: ## Generate and open documentation
	cargo doc --open --all --all-features

# Security Commands
security: ## Run security audit
	cargo audit
	cargo deny check

audit: ## Comprehensive security and dependency audit
	cargo audit
	cargo deny check
	cargo outdated

# Utility Commands
clean: ## Clean build artifacts
	cargo clean

install: ## Install development dependencies
	rustup component add rustfmt clippy
	cargo install cargo-watch cargo-tarpaulin cargo-audit cargo-deny cargo-outdated

# Release Commands
release-patch: ## Create patch release
	cargo release patch --execute

release-minor: ## Create minor release
	cargo release minor --execute

release-major: ## Create major release
	cargo release major --execute

# Docker Commands
docker-build: ## Build Docker image
	docker build -t atlas-rust-financial:latest .

docker-run: ## Run Docker container
	docker run -p 8080:8080 atlas-rust-financial:latest

# Database Commands
db-migrate: ## Run database migrations (if applicable)
	@echo "Database migrations not yet implemented"

# Integration Commands
integration-test: ## Run integration tests
	cargo test --test '*' --all-features

api-test: ## Test GraphQL API endpoints
	@echo "Starting API tests..."
	cargo test --bin financial-api -- --test-threads=1

# Performance Commands
perf-profile: ## Profile performance
	cargo build --release
	perf record --call-graph=dwarf target/release/financial-api
	perf report

memory-profile: ## Profile memory usage
	valgrind --tool=massif target/release/financial-api

# Continuous Integration Commands
ci: lint test security doc ## Run all CI checks
	@echo "All CI checks passed!"

ci-coverage: test-coverage ## Run CI with coverage
	@echo "CI with coverage completed!"

# Pre-commit Hook
pre-commit: fmt lint test ## Run pre-commit checks
	@echo "Pre-commit checks passed!"

# Development Environment Setup
setup-dev: install ## Setup development environment
	@echo "Development environment setup complete!"
	@echo "Run 'make dev' to start development server"

# Financial Engine Specific Commands
validate-precision: ## Validate financial precision across all calculations
	cargo test precision --all-features

stress-test: ## Run stress tests for high-volume calculations
	cargo test stress --all-features --release

portfolio-benchmark: ## Benchmark portfolio optimization performance
	cargo bench portfolio --all-features

debt-benchmark: ## Benchmark debt optimization performance
	cargo bench debt --all-features