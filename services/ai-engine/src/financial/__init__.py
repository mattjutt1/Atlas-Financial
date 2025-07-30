"""
Financial Precision Integration for AI Engine
Migrated to use @atlas/shared/financial foundation via REST API
"""

from .precision_client import FinancialPrecisionClient
from .calculations import FinancialCalculations
from .validation import FinancialValidation

__all__ = [
    'FinancialPrecisionClient',
    'FinancialCalculations',
    'FinancialValidation'
]
