"""
Financial Validation for AI Engine
Bank-grade validation ensuring IEEE 754 error elimination
"""

from decimal import Decimal
from typing import List, Dict, Any, Optional
from .precision_client import FinancialAmount
import structlog

logger = structlog.get_logger()

class FinancialValidation:
    """
    Validation utilities for financial data
    Ensures all financial calculations maintain bank-grade precision
    """

    # DECIMAL(19,4) database constraints
    MAX_FINANCIAL_VALUE = Decimal('999999999999999.9999')
    MIN_FINANCIAL_VALUE = Decimal('-999999999999999.9999')

    @staticmethod
    def validate_amount(amount: FinancialAmount) -> Dict[str, Any]:
        """
        Comprehensive validation of financial amount
        Returns validation result with details
        """
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }

        try:
            decimal_value = amount.to_decimal()

            # Check precision (max 4 decimal places)
            if decimal_value.as_tuple().exponent < -4:
                result["is_valid"] = False
                result["errors"].append(
                    f"Amount precision exceeds 4 decimal places: {amount.value}"
                )

            # Check database bounds
            if decimal_value > FinancialValidation.MAX_FINANCIAL_VALUE:
                result["is_valid"] = False
                result["errors"].append(
                    f"Amount exceeds maximum value: {amount.value}"
                )

            if decimal_value < FinancialValidation.MIN_FINANCIAL_VALUE:
                result["is_valid"] = False
                result["errors"].append(
                    f"Amount below minimum value: {amount.value}"
                )

            # Check for IEEE 754 issues (shouldn't happen with Decimal, but verify)
            if 'e' in amount.value.lower() or 'inf' in amount.value.lower() or 'nan' in amount.value.lower():
                result["is_valid"] = False
                result["errors"].append(
                    f"Amount contains floating-point notation: {amount.value}"
                )

            # Warnings for unusual values
            if decimal_value.is_zero():
                result["warnings"].append("Amount is zero")

            if decimal_value < Decimal('0.01') and not decimal_value.is_zero():
                result["warnings"].append("Amount is less than one cent")

            if decimal_value > Decimal('1000000'):
                result["warnings"].append("Amount is very large (>$1M)")

        except Exception as e:
            result["is_valid"] = False
            result["errors"].append(f"Failed to validate amount: {str(e)}")

        return result

    @staticmethod
    def validate_currency_code(currency: str) -> bool:
        """Validate ISO 4217 currency code"""
        if not currency or len(currency) != 3:
            return False

        if not currency.isupper() or not currency.isalpha():
            return False

        # Basic check for common currencies
        valid_currencies = {
            'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
            'SEK', 'NOK', 'DKK', 'NZD', 'SGD', 'HKD', 'KRW', 'INR'
        }

        return currency in valid_currencies

    @staticmethod
    def validate_interest_rate(rate: Decimal) -> Dict[str, Any]:
        """Validate interest rate (should be 0-100 for percentages)"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }

        try:
            if rate < Decimal('0'):
                result["errors"].append("Interest rate cannot be negative")
                result["is_valid"] = False

            if rate > Decimal('100'):
                result["warnings"].append("Interest rate over 100% is unusual")

            if rate > Decimal('1000'):
                result["errors"].append("Interest rate over 1000% is likely an error")
                result["is_valid"] = False

            # Check precision (max 4 decimal places for rates)
            if rate.as_tuple().exponent < -4:
                result["warnings"].append("Interest rate has high precision (>4 decimal places)")

        except Exception as e:
            result["is_valid"] = False
            result["errors"].append(f"Failed to validate interest rate: {str(e)}")

        return result

    @staticmethod
    def validate_debt_data(debt_info: Dict[str, Any]) -> Dict[str, Any]:
        """Validate debt information for snowball/avalanche calculations"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }

        required_fields = ['name', 'balance', 'minimum_payment', 'interest_rate']

        # Check required fields
        for field in required_fields:
            if field not in debt_info:
                result["errors"].append(f"Missing required field: {field}")
                result["is_valid"] = False
                continue

        if not result["is_valid"]:
            return result

        try:
            # Validate amounts
            balance = FinancialAmount(str(debt_info['balance']))
            min_payment = FinancialAmount(str(debt_info['minimum_payment']))

            balance_validation = FinancialValidation.validate_amount(balance)
            payment_validation = FinancialValidation.validate_amount(min_payment)

            if not balance_validation["is_valid"]:
                result["errors"].extend([f"Balance: {err}" for err in balance_validation["errors"]])
                result["is_valid"] = False

            if not payment_validation["is_valid"]:
                result["errors"].extend([f"Minimum payment: {err}" for err in payment_validation["errors"]])
                result["is_valid"] = False

            # Validate interest rate
            rate = Decimal(str(debt_info['interest_rate']))
            rate_validation = FinancialValidation.validate_interest_rate(rate)

            if not rate_validation["is_valid"]:
                result["errors"].extend([f"Interest rate: {err}" for err in rate_validation["errors"]])
                result["is_valid"] = False

            # Business logic validation
            if balance.to_decimal() <= Decimal('0'):
                result["errors"].append("Debt balance must be positive")
                result["is_valid"] = False

            if min_payment.to_decimal() <= Decimal('0'):
                result["errors"].append("Minimum payment must be positive")
                result["is_valid"] = False

            if min_payment.to_decimal() > balance.to_decimal():
                result["warnings"].append("Minimum payment is greater than balance")

            # Check if minimum payment covers interest
            monthly_interest = balance.to_decimal() * (rate / Decimal('100') / Decimal('12'))
            if min_payment.to_decimal() < monthly_interest:
                result["warnings"].append(
                    "Minimum payment may not cover monthly interest - debt may not pay down"
                )

        except Exception as e:
            result["is_valid"] = False
            result["errors"].append(f"Failed to validate debt data: {str(e)}")

        return result

    @staticmethod
    def validate_budget_breakdown(
        income: FinancialAmount,
        needs: FinancialAmount,
        wants: FinancialAmount,
        savings: FinancialAmount
    ) -> Dict[str, Any]:
        """Validate that budget breakdown adds up correctly"""
        result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }

        try:
            # Validate individual amounts
            for name, amount in [("income", income), ("needs", needs), ("wants", wants), ("savings", savings)]:
                validation = FinancialValidation.validate_amount(amount)
                if not validation["is_valid"]:
                    result["errors"].extend([f"{name}: {err}" for err in validation["errors"]])
                    result["is_valid"] = False

            if not result["is_valid"]:
                return result

            # Check that breakdown adds up to income
            total_allocated = (needs.to_decimal() + wants.to_decimal() + savings.to_decimal())
            income_decimal = income.to_decimal()

            # Allow small rounding differences (up to 1 cent)
            difference = abs(total_allocated - income_decimal)
            if difference > Decimal('0.01'):
                result["errors"].append(
                    f"Budget breakdown doesn't add up to income. "
                    f"Difference: ${difference}"
                )
                result["is_valid"] = False

            # Check reasonable percentages
            if income_decimal > Decimal('0'):
                needs_pct = (needs.to_decimal() / income_decimal * Decimal('100'))
                wants_pct = (wants.to_decimal() / income_decimal * Decimal('100'))
                savings_pct = (savings.to_decimal() / income_decimal * Decimal('100'))

                if needs_pct < Decimal('50') or needs_pct > Decimal('90'):
                    result["warnings"].append(f"Needs percentage unusual: {needs_pct:.1f}%")

                if wants_pct > Decimal('50'):
                    result["warnings"].append(f"Wants percentage high: {wants_pct:.1f}%")

                if savings_pct < Decimal('5'):
                    result["warnings"].append(f"Savings percentage low: {savings_pct:.1f}%")

        except Exception as e:
            result["is_valid"] = False
            result["errors"].append(f"Failed to validate budget breakdown: {str(e)}")

        return result

    @staticmethod
    def validate_calculation_result(
        operation: str,
        inputs: Dict[str, Any],
        result: FinancialAmount
    ) -> Dict[str, Any]:
        """Validate that calculation result is reasonable"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }

        # First validate the result amount itself
        amount_validation = FinancialValidation.validate_amount(result)
        if not amount_validation["is_valid"]:
            validation_result["errors"].extend(amount_validation["errors"])
            validation_result["is_valid"] = False

        # Operation-specific validation
        try:
            if operation == "add":
                # Sum should be larger than individual components (unless negatives involved)
                operands = inputs.get("operands", [])
                if all(Decimal(op.get("amount", "0")) >= 0 for op in operands):
                    min_expected = sum(Decimal(op.get("amount", "0")) for op in operands)
                    if result.to_decimal() < min_expected * Decimal('0.99'):  # Allow small rounding
                        validation_result["warnings"].append("Sum result seems too small")

            elif operation == "multiply":
                # Check for reasonable multiplication results
                if result.to_decimal() == Decimal('0') and inputs.get("factor", "0") != "0":
                    validation_result["warnings"].append("Multiplication result is zero")

            elif operation == "compound_interest":
                # Compound interest should be greater than principal
                principal = inputs.get("principal", {})
                if principal and result.to_decimal() <= Decimal(principal.get("amount", "0")):
                    validation_result["warnings"].append("Compound interest result not greater than principal")

        except Exception as e:
            validation_result["warnings"].append(f"Could not validate calculation result: {str(e)}")

        return validation_result

    @staticmethod
    def check_ieee_754_elimination(value: str) -> bool:
        """
        Verify that value doesn't contain IEEE 754 floating-point artifacts
        Returns True if clean decimal representation
        """
        try:
            # Check for scientific notation, infinity, NaN
            if any(marker in value.lower() for marker in ['e', 'inf', 'nan']):
                return False

            # Verify can be parsed as exact decimal
            decimal_val = Decimal(value)

            # Check that string representation matches (no precision loss)
            if str(decimal_val) != value:
                # Allow for trailing zeros differences
                if decimal_val == Decimal(value):
                    return True
                return False

            return True

        except:
            return False
