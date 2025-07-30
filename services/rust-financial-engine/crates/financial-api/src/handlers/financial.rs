/// Financial calculation handlers for Atlas Financial Engine
/// Primary calculation service for all Atlas applications
use crate::error::Result;
use axum::{extract::Query, http::StatusCode, response::Json};
use financial_core::{Currency, Money, Percentage, Period, Rate};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, warn};

#[derive(Debug, Deserialize)]
pub struct CalculationRequest {
    pub operation: String,
    pub operands: Option<Vec<MoneyData>>,
    pub factor: Option<String>,
    pub principal: Option<MoneyData>,
    pub annual_rate: Option<String>,
    pub compounds_per_year: Option<i32>,
    pub years: Option<i32>,
    pub term_months: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MoneyData {
    pub amount: String,
    pub currency: String,
}

#[derive(Debug, Serialize)]
pub struct CalculationResponse {
    pub amount: String,
    pub currency: String,
    pub operation: String,
    pub precision: String,
    pub engine: String,
}

#[derive(Debug, Serialize)]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub precision_check: bool,
}

/// Primary calculation endpoint for all Atlas applications
pub async fn calculate(
    Json(request): Json<CalculationRequest>,
) -> Result<Json<CalculationResponse>> {
    info!("Processing calculation request: {}", request.operation);

    let result = match request.operation.as_str() {
        "add" => handle_addition(request).await?,
        "subtract" => handle_subtraction(request).await?,
        "multiply" => handle_multiplication(request).await?,
        "divide" => handle_division(request).await?,
        "compound_interest" => handle_compound_interest(request).await?,
        "loan_payment" => handle_loan_payment(request).await?,
        _ => {
            return Err(crate::error::FinancialError::ValidationError(format!(
                "Unsupported operation: {}",
                request.operation
            )));
        }
    };

    Ok(Json(result))
}

/// Validate financial precision and constraints
pub async fn validate_precision(Json(data): Json<MoneyData>) -> Result<Json<ValidationResponse>> {
    info!("Validating precision for amount: {}", data.amount);

    let mut response = ValidationResponse {
        is_valid: true,
        errors: Vec::new(),
        warnings: Vec::new(),
        precision_check: false,
    };

    // Parse and validate decimal
    match data.amount.parse::<Decimal>() {
        Ok(decimal_val) => {
            // Check precision (max 4 decimal places for DECIMAL(19,4))
            if decimal_val.scale() > 4 {
                response.is_valid = false;
                response
                    .errors
                    .push("Amount precision exceeds 4 decimal places".to_string());
            } else {
                response.precision_check = true;
            }

            // Check database bounds
            let max_value = Decimal::from_parts(999999999999999u32, 0, 0, false, 4);
            if decimal_val.abs() > max_value {
                response.is_valid = false;
                response
                    .errors
                    .push("Amount exceeds DECIMAL(19,4) bounds".to_string());
            }

            // Warnings for unusual values
            if decimal_val.is_zero() {
                response.warnings.push("Amount is zero".to_string());
            }

            if decimal_val > Decimal::from(1_000_000) {
                response
                    .warnings
                    .push("Amount is very large (>$1M)".to_string());
            }
        }
        Err(_) => {
            response.is_valid = false;
            response.errors.push("Invalid decimal format".to_string());
        }
    }

    // Validate currency
    if !is_valid_currency(&data.currency) {
        response.is_valid = false;
        response
            .errors
            .push("Invalid or unsupported currency".to_string());
    }

    Ok(Json(response))
}

/// Health check for financial calculation capabilities
pub async fn financial_health() -> Result<Json<HashMap<String, String>>> {
    info!("Financial engine health check");

    let mut health = HashMap::new();
    health.insert("status".to_string(), "healthy".to_string());
    health.insert("precision".to_string(), "DECIMAL(19,4)".to_string());
    health.insert(
        "operations".to_string(),
        "add,subtract,multiply,divide,compound_interest,loan_payment".to_string(),
    );
    health.insert(
        "currencies".to_string(),
        "USD,EUR,GBP,CAD,AUD,JPY,CHF,CNY".to_string(),
    );
    health.insert(
        "engine".to_string(),
        "atlas-rust-financial-core".to_string(),
    );

    // Test basic calculation to ensure engine is working
    match test_calculation().await {
        Ok(_) => {
            health.insert("calculation_test".to_string(), "passed".to_string());
        }
        Err(e) => {
            warn!("Financial calculation test failed: {}", e);
            health.insert("calculation_test".to_string(), "failed".to_string());
            health.insert("status".to_string(), "degraded".to_string());
        }
    }

    Ok(Json(health))
}

// Private helper functions

async fn handle_addition(request: CalculationRequest) -> Result<CalculationResponse> {
    let operands = request.operands.ok_or_else(|| {
        crate::error::FinancialError::ValidationError("Missing operands for addition".to_string())
    })?;

    if operands.len() < 2 {
        return Err(crate::error::FinancialError::ValidationError(
            "Addition requires at least 2 operands".to_string(),
        ));
    }

    // Convert first operand
    let mut result = parse_money_data(&operands[0])?;

    // Add remaining operands
    for operand in &operands[1..] {
        let money = parse_money_data(operand)?;
        result = result.add(&money)?;
    }

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "add".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

async fn handle_subtraction(request: CalculationRequest) -> Result<CalculationResponse> {
    let operands = request.operands.ok_or_else(|| {
        crate::error::FinancialError::ValidationError(
            "Missing operands for subtraction".to_string(),
        )
    })?;

    if operands.len() != 2 {
        return Err(crate::error::FinancialError::ValidationError(
            "Subtraction requires exactly 2 operands".to_string(),
        ));
    }

    let money1 = parse_money_data(&operands[0])?;
    let money2 = parse_money_data(&operands[1])?;
    let result = money1.subtract(&money2)?;

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "subtract".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

async fn handle_multiplication(request: CalculationRequest) -> Result<CalculationResponse> {
    let operands = request.operands.ok_or_else(|| {
        crate::error::FinancialError::ValidationError(
            "Missing operands for multiplication".to_string(),
        )
    })?;

    if operands.len() != 1 {
        return Err(crate::error::FinancialError::ValidationError(
            "Multiplication requires exactly 1 operand".to_string(),
        ));
    }

    let factor_str = request.factor.ok_or_else(|| {
        crate::error::FinancialError::ValidationError(
            "Missing factor for multiplication".to_string(),
        )
    })?;

    let money = parse_money_data(&operands[0])?;
    let factor = factor_str.parse::<Decimal>().map_err(|_| {
        crate::error::FinancialError::ValidationError("Invalid factor format".to_string())
    })?;

    let result = money.multiply(factor)?;

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "multiply".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

async fn handle_division(request: CalculationRequest) -> Result<CalculationResponse> {
    let operands = request.operands.ok_or_else(|| {
        crate::error::FinancialError::ValidationError("Missing operands for division".to_string())
    })?;

    if operands.len() != 1 {
        return Err(crate::error::FinancialError::ValidationError(
            "Division requires exactly 1 operand".to_string(),
        ));
    }

    let divisor_str = request.factor.ok_or_else(|| {
        crate::error::FinancialError::ValidationError("Missing divisor for division".to_string())
    })?;

    let money = parse_money_data(&operands[0])?;
    let divisor = divisor_str.parse::<Decimal>().map_err(|_| {
        crate::error::FinancialError::ValidationError("Invalid divisor format".to_string())
    })?;

    let result = money.divide(divisor)?;

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "divide".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

async fn handle_compound_interest(request: CalculationRequest) -> Result<CalculationResponse> {
    let principal_data = request.principal.ok_or_else(|| {
        crate::error::FinancialError::ValidationError(
            "Missing principal for compound interest".to_string(),
        )
    })?;

    let principal = parse_money_data(&principal_data)?;

    let annual_rate = request
        .annual_rate
        .ok_or_else(|| {
            crate::error::FinancialError::ValidationError("Missing annual rate".to_string())
        })?
        .parse::<Decimal>()
        .map_err(|_| {
            crate::error::FinancialError::ValidationError("Invalid annual rate format".to_string())
        })?;

    let compounds_per_year = request.compounds_per_year.unwrap_or(12) as u32;
    let years = request.years.unwrap_or(1) as u32;

    // Calculate compound interest: A = P(1 + r/n)^(nt)
    let rate_per_compound = annual_rate / Decimal::from(100) / Decimal::from(compounds_per_year);
    let total_compounds = compounds_per_year * years;

    let growth_factor = (Decimal::from(1) + rate_per_compound)
        .powu(total_compounds)
        .unwrap();

    let result = principal.multiply(growth_factor)?;

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "compound_interest".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

async fn handle_loan_payment(request: CalculationRequest) -> Result<CalculationResponse> {
    let principal_data = request.principal.ok_or_else(|| {
        crate::error::FinancialError::ValidationError(
            "Missing principal for loan payment".to_string(),
        )
    })?;

    let principal = parse_money_data(&principal_data)?;

    let annual_rate = request
        .annual_rate
        .ok_or_else(|| {
            crate::error::FinancialError::ValidationError("Missing annual rate".to_string())
        })?
        .parse::<Decimal>()
        .map_err(|_| {
            crate::error::FinancialError::ValidationError("Invalid annual rate format".to_string())
        })?;

    let term_months = request.term_months.unwrap_or(12);

    // Calculate monthly payment: M = P * (r(1+r)^n) / ((1+r)^n - 1)
    if annual_rate == Decimal::from(0) {
        // No interest case
        let result = principal.divide(Decimal::from(term_months))?;
        return Ok(CalculationResponse {
            amount: result.amount().to_string(),
            currency: result.currency().to_string(),
            operation: "loan_payment".to_string(),
            precision: "DECIMAL(19,4)".to_string(),
            engine: "atlas-rust-financial-core".to_string(),
        });
    }

    let monthly_rate = annual_rate / Decimal::from(100) / Decimal::from(12);
    let factor = (Decimal::from(1) + monthly_rate)
        .powu(term_months as u32)
        .unwrap();
    let payment_factor = monthly_rate * factor / (factor - Decimal::from(1));

    let result = principal.multiply(payment_factor)?;

    Ok(CalculationResponse {
        amount: result.amount().to_string(),
        currency: result.currency().to_string(),
        operation: "loan_payment".to_string(),
        precision: "DECIMAL(19,4)".to_string(),
        engine: "atlas-rust-financial-core".to_string(),
    })
}

fn parse_money_data(data: &MoneyData) -> Result<Money> {
    let amount = data.amount.parse::<Decimal>().map_err(|_| {
        crate::error::FinancialError::ValidationError("Invalid amount format".to_string())
    })?;

    let currency = match data.currency.as_str() {
        "USD" => Currency::USD,
        "EUR" => Currency::EUR,
        "GBP" => Currency::GBP,
        "CAD" => Currency::CAD,
        "AUD" => Currency::AUD,
        "JPY" => Currency::JPY,
        "CHF" => Currency::CHF,
        "CNY" => Currency::CNY,
        _ => {
            return Err(crate::error::FinancialError::ValidationError(format!(
                "Unsupported currency: {}",
                data.currency
            )))
        }
    };

    Money::new(amount, currency).map_err(|e| e.into())
}

fn is_valid_currency(currency: &str) -> bool {
    matches!(
        currency,
        "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "CNY"
    )
}

async fn test_calculation() -> Result<()> {
    // Test basic addition
    let money1 = Money::new(Decimal::from(100), Currency::USD)?;
    let money2 = Money::new(Decimal::from(50), Currency::USD)?;
    let _result = money1.add(&money2)?;

    info!("Financial calculation test passed");
    Ok(())
}
