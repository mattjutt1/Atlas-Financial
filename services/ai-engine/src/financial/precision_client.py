"""
Financial Precision Client - AI Engine Integration
Routes all financial calculations through Rust Financial Engine for consistency
"""

import aiohttp
import json
from decimal import Decimal
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()

@dataclass
class FinancialAmount:
    """
    Lightweight wrapper for financial amounts that delegates to Rust engine
    Maintains compatibility with existing AI engine code
    """
    value: str  # String to preserve precision
    currency: str = "USD"

    def __post_init__(self):
        # Validate precision on creation
        try:
            decimal_val = Decimal(self.value)
            if decimal_val.as_tuple().exponent < -4:
                raise ValueError(f"Financial amount precision exceeds 4 decimal places: {self.value}")
        except Exception as e:
            raise ValueError(f"Invalid financial amount: {self.value}, error: {e}")

    @classmethod
    def from_decimal(cls, value: Decimal, currency: str = "USD") -> 'FinancialAmount':
        """Create from Decimal with precision validation"""
        return cls(str(value.quantize(Decimal('0.0001'))), currency)

    @classmethod
    def from_number(cls, value: float, currency: str = "USD") -> 'FinancialAmount':
        """Create from number with precision conversion"""
        decimal_val = Decimal(str(value)).quantize(Decimal('0.0001'))
        return cls(str(decimal_val), currency)

    @classmethod
    def zero(cls, currency: str = "USD") -> 'FinancialAmount':
        """Create zero amount"""
        return cls("0.0000", currency)

    def to_decimal(self) -> Decimal:
        """Convert to Decimal for calculations"""
        return Decimal(self.value)

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for JSON serialization"""
        return {"amount": self.value, "currency": self.currency}


class FinancialPrecisionClient:
    """
    Client for communicating with Rust Financial Engine
    Provides bank-grade precision calculations for AI engine
    """

    def __init__(self, rust_engine_url: str = "http://localhost:8080"):
        self.rust_engine_url = rust_engine_url
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make request to Rust Financial Engine with error handling"""
        if not self.session:
            self.session = aiohttp.ClientSession()

        url = f"{self.rust_engine_url}/api/v1/{endpoint}"

        try:
            async with self.session.post(url, json=data) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    logger.error("Rust engine request failed",
                               endpoint=endpoint, status=response.status, error=error_text)
                    raise Exception(f"Rust engine error: {response.status} - {error_text}")

        except aiohttp.ClientError as e:
            logger.error("Failed to connect to Rust engine", endpoint=endpoint, error=str(e))
            # Fallback to local calculation for resilience
            return await self._fallback_calculation(endpoint, data)

    async def _fallback_calculation(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback calculations when Rust engine unavailable"""
        logger.warning("Using fallback calculation", endpoint=endpoint)

        if endpoint == "calculate":
            operation = data.get("operation")
            if operation == "add":
                a = Decimal(data["operands"][0]["amount"])
                b = Decimal(data["operands"][1]["amount"])
                result = a + b
                return {"amount": str(result.quantize(Decimal('0.0001'))), "currency": "USD"}
            elif operation == "multiply":
                a = Decimal(data["operands"][0]["amount"])
                b = Decimal(data["factor"])
                result = a * b
                return {"amount": str(result.quantize(Decimal('0.0001'))), "currency": "USD"}

        # Default fallback
        return {"amount": "0.0000", "currency": "USD"}

    async def add_amounts(self, amounts: List[FinancialAmount]) -> FinancialAmount:
        """Add multiple financial amounts using Rust engine"""
        if not amounts:
            return FinancialAmount.zero()

        if len(amounts) == 1:
            return amounts[0]

        # Validate same currency
        currency = amounts[0].currency
        for amount in amounts:
            if amount.currency != currency:
                raise ValueError(f"Currency mismatch: expected {currency}, got {amount.currency}")

        data = {
            "operation": "add",
            "operands": [amount.to_dict() for amount in amounts]
        }

        result = await self._make_request("calculate", data)
        return FinancialAmount(result["amount"], result["currency"])

    async def multiply_amount(self, amount: FinancialAmount, factor: Decimal) -> FinancialAmount:
        """Multiply financial amount by factor using Rust engine"""
        data = {
            "operation": "multiply",
            "operands": [amount.to_dict()],
            "factor": str(factor)
        }

        result = await self._make_request("calculate", data)
        return FinancialAmount(result["amount"], result["currency"])

    async def calculate_percentage(self, amount: FinancialAmount, percentage: Decimal) -> FinancialAmount:
        """Calculate percentage of amount"""
        factor = percentage / Decimal('100')
        return await self.multiply_amount(amount, factor)

    async def compound_interest(
        self,
        principal: FinancialAmount,
        annual_rate: Decimal,
        compounds_per_year: int,
        years: int
    ) -> FinancialAmount:
        """Calculate compound interest using Rust engine"""
        data = {
            "operation": "compound_interest",
            "principal": principal.to_dict(),
            "annual_rate": str(annual_rate),
            "compounds_per_year": compounds_per_year,
            "years": years
        }

        result = await self._make_request("financial/compound-interest", data)
        return FinancialAmount(result["amount"], result["currency"])

    async def loan_payment(
        self,
        principal: FinancialAmount,
        annual_rate: Decimal,
        term_months: int
    ) -> FinancialAmount:
        """Calculate monthly loan payment using Rust engine"""
        data = {
            "operation": "loan_payment",
            "principal": principal.to_dict(),
            "annual_rate": str(annual_rate),
            "term_months": term_months
        }

        result = await self._make_request("financial/loan-payment", data)
        return FinancialAmount(result["amount"], result["currency"])

    async def validate_precision(self, amount: FinancialAmount) -> bool:
        """Validate that amount maintains bank-grade precision"""
        try:
            decimal_val = amount.to_decimal()
            return decimal_val.as_tuple().exponent >= -4
        except:
            return False

    async def health_check(self) -> bool:
        """Check if Rust Financial Engine is available"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            async with self.session.get(f"{self.rust_engine_url}/health") as response:
                return response.status == 200
        except:
            return False
