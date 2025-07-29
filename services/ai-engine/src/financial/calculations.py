"""
Financial Calculations for AI Engine
Implements Dave Ramsey principles using bank-grade precision
Routes all calculations through Rust Financial Engine
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional, NamedTuple
from dataclasses import dataclass
from .precision_client import FinancialPrecisionClient, FinancialAmount
import structlog

logger = structlog.get_logger()

@dataclass
class DebtInfo:
    """Debt information for snowball/avalanche calculations"""
    name: str
    balance: FinancialAmount
    minimum_payment: FinancialAmount
    interest_rate: Decimal  # Annual percentage rate

@dataclass
class BudgetBreakdown:
    """75/15/10 budget breakdown"""
    needs: FinancialAmount      # 75% - necessities
    wants: FinancialAmount      # 15% - discretionary
    savings: FinancialAmount    # 10% - savings/investment

@dataclass
class DebtPayoffPlan:
    """Debt payoff plan with ordering"""
    debts: List[Dict[str, Any]]
    total_interest_saved: FinancialAmount
    payoff_time_months: int
    monthly_extra_payment: FinancialAmount


class FinancialCalculations:
    """
    Financial calculations using Dave Ramsey principles
    All calculations route through Rust Financial Engine for precision
    """
    
    def __init__(self, rust_engine_url: str = "http://localhost:8080"):
        self.client = FinancialPrecisionClient(rust_engine_url)
    
    async def apply_75_15_10_rule(self, monthly_income: FinancialAmount) -> BudgetBreakdown:
        """
        Apply Dave Ramsey's 75/15/10 budget rule
        75% needs, 15% wants, 10% savings
        """
        logger.info("Calculating 75/15/10 budget breakdown", income=monthly_income.value)
        
        async with self.client:
            # Calculate percentages using Rust engine for precision
            needs = await self.client.calculate_percentage(monthly_income, Decimal('75'))
            wants = await self.client.calculate_percentage(monthly_income, Decimal('15'))
            savings = await self.client.calculate_percentage(monthly_income, Decimal('10'))
            
            return BudgetBreakdown(
                needs=needs,
                wants=wants,
                savings=savings
            )
    
    async def calculate_debt_snowball(
        self, 
        debts: List[DebtInfo],
        extra_payment: FinancialAmount
    ) -> DebtPayoffPlan:
        """
        Calculate debt snowball payoff plan (Ramsey method)
        Pay minimums on all debts, extra payment goes to smallest balance
        """
        logger.info("Calculating debt snowball plan", 
                   debt_count=len(debts), extra_payment=extra_payment.value)
        
        if not debts:
            return DebtPayoffPlan(
                debts=[],
                total_interest_saved=FinancialAmount.zero(),
                payoff_time_months=0,
                monthly_extra_payment=extra_payment
            )
        
        # Sort by balance (smallest first)
        sorted_debts = sorted(debts, key=lambda d: d.balance.to_decimal())
        
        async with self.client:
            payoff_plan = []
            current_extra = extra_payment
            total_months = 0
            
            for i, debt in enumerate(sorted_debts):
                # Calculate total monthly payment (minimum + extra)
                total_payment = await self.client.add_amounts([debt.minimum_payment, current_extra])
                
                # Calculate payoff time for this debt
                months_to_payoff = await self._calculate_payoff_months(
                    debt.balance, debt.interest_rate, total_payment
                )
                
                # Calculate interest paid
                total_paid = await self.client.multiply_amount(total_payment, Decimal(str(months_to_payoff)))
                interest_paid = await self.client.add_amounts([total_paid, debt.balance.negate()])
                
                payoff_plan.append({
                    "name": debt.name,
                    "balance": debt.balance.value,
                    "minimum_payment": debt.minimum_payment.value,
                    "total_payment": total_payment.value,
                    "payoff_months": months_to_payoff,
                    "interest_paid": interest_paid.value,
                    "order": i + 1
                })
                
                # Add this debt's minimum to extra payment for next debt
                current_extra = await self.client.add_amounts([current_extra, debt.minimum_payment])
                total_months = max(total_months, months_to_payoff)
            
            # Calculate total interest saved compared to minimum payments
            total_interest_saved = await self._calculate_interest_savings(debts, payoff_plan)
            
            return DebtPayoffPlan(
                debts=payoff_plan,
                total_interest_saved=total_interest_saved,
                payoff_time_months=total_months,
                monthly_extra_payment=extra_payment
            )
    
    async def calculate_debt_avalanche(
        self,
        debts: List[DebtInfo], 
        extra_payment: FinancialAmount
    ) -> DebtPayoffPlan:
        """
        Calculate debt avalanche payoff plan
        Pay minimums on all debts, extra payment goes to highest interest rate
        """
        logger.info("Calculating debt avalanche plan",
                   debt_count=len(debts), extra_payment=extra_payment.value)
        
        if not debts:
            return DebtPayoffPlan(
                debts=[],
                total_interest_saved=FinancialAmount.zero(),
                payoff_time_months=0,
                monthly_extra_payment=extra_payment
            )
        
        # Sort by interest rate (highest first)
        sorted_debts = sorted(debts, key=lambda d: d.interest_rate, reverse=True)
        
        async with self.client:
            payoff_plan = []
            current_extra = extra_payment
            total_months = 0
            
            for i, debt in enumerate(sorted_debts):
                # Calculate total monthly payment (minimum + extra)
                total_payment = await self.client.add_amounts([debt.minimum_payment, current_extra])
                
                # Calculate payoff time for this debt
                months_to_payoff = await self._calculate_payoff_months(
                    debt.balance, debt.interest_rate, total_payment
                )
                
                # Calculate interest paid
                total_paid = await self.client.multiply_amount(total_payment, Decimal(str(months_to_payoff)))
                interest_paid = await self.client.add_amounts([total_paid, debt.balance.negate()])
                
                payoff_plan.append({
                    "name": debt.name,
                    "balance": debt.balance.value,
                    "minimum_payment": debt.minimum_payment.value,
                    "total_payment": total_payment.value,
                    "payoff_months": months_to_payoff,
                    "interest_paid": interest_paid.value,
                    "interest_rate": str(debt.interest_rate),
                    "order": i + 1
                })
                
                # Add this debt's minimum to extra payment for next debt
                current_extra = await self.client.add_amounts([current_extra, debt.minimum_payment])
                total_months = max(total_months, months_to_payoff)
            
            # Calculate total interest saved
            total_interest_saved = await self._calculate_interest_savings(debts, payoff_plan)
            
            return DebtPayoffPlan(
                debts=payoff_plan,
                total_interest_saved=total_interest_saved,
                payoff_time_months=total_months,
                monthly_extra_payment=extra_payment
            )
    
    async def calculate_emergency_fund_target(
        self,
        monthly_expenses: FinancialAmount,
        months: int = 6
    ) -> FinancialAmount:
        """Calculate emergency fund target (3-6 months of expenses)"""
        logger.info("Calculating emergency fund target", 
                   monthly_expenses=monthly_expenses.value, months=months)
        
        async with self.client:
            return await self.client.multiply_amount(monthly_expenses, Decimal(str(months)))
    
    async def calculate_net_worth(
        self,
        assets: List[FinancialAmount],
        liabilities: List[FinancialAmount]
    ) -> FinancialAmount:
        """Calculate net worth (assets - liabilities)"""
        logger.info("Calculating net worth", 
                   asset_count=len(assets), liability_count=len(liabilities))
        
        async with self.client:
            total_assets = await self.client.add_amounts(assets) if assets else FinancialAmount.zero()
            total_liabilities = await self.client.add_amounts(liabilities) if liabilities else FinancialAmount.zero()
            
            # Net worth = assets - liabilities
            return await self.client.add_amounts([total_assets, total_liabilities.negate()])
    
    async def _calculate_payoff_months(
        self,
        balance: FinancialAmount,
        annual_rate: Decimal,
        monthly_payment: FinancialAmount
    ) -> int:
        """Calculate months to pay off debt with compound interest"""
        if annual_rate == 0:
            # No interest case
            return max(1, int(balance.to_decimal() / monthly_payment.to_decimal()))
        
        # Monthly interest rate
        monthly_rate = annual_rate / Decimal('100') / Decimal('12')
        
        balance_decimal = balance.to_decimal()
        payment_decimal = monthly_payment.to_decimal()
        
        if payment_decimal <= balance_decimal * monthly_rate:
            # Payment is less than or equal to interest - debt never pays off
            return 999  # Return large number to indicate problem
        
        # Calculate months using loan payoff formula
        # n = -log(1 - (r * P) / PMT) / log(1 + r)
        import math
        
        try:
            rate_factor = float(monthly_rate * balance_decimal / payment_decimal)
            if rate_factor >= 1:
                return 999
            
            numerator = -math.log(1 - rate_factor)
            denominator = math.log(1 + float(monthly_rate))
            
            months = numerator / denominator
            return max(1, int(math.ceil(months)))
        
        except (ValueError, ZeroDivisionError):
            # Fallback to simple calculation
            return max(1, int(balance_decimal / payment_decimal))
    
    async def _calculate_interest_savings(
        self,
        original_debts: List[DebtInfo],
        payoff_plan: List[Dict[str, Any]]
    ) -> FinancialAmount:
        """Calculate total interest saved compared to minimum payments only"""
        # This is a simplified calculation - in production would need more sophisticated modeling
        async with self.client:
            # Estimate interest saved by paying off debts faster
            total_saved = FinancialAmount.zero()
            
            for i, debt in enumerate(original_debts):
                # Estimate interest with minimum payments (simplified)
                months_minimum = await self._calculate_payoff_months(
                    debt.balance, debt.interest_rate, debt.minimum_payment
                )
                
                # Compare to accelerated payoff
                accelerated_months = payoff_plan[i]["payoff_months"]
                
                if months_minimum > accelerated_months:
                    # Rough calculation of interest saved
                    monthly_interest = await self.client.calculate_percentage(
                        debt.balance, debt.interest_rate / Decimal('12')
                    )
                    months_saved = months_minimum - accelerated_months
                    interest_saved = await self.client.multiply_amount(
                        monthly_interest, Decimal(str(months_saved))
                    )
                    total_saved = await self.client.add_amounts([total_saved, interest_saved])
            
            return total_saved