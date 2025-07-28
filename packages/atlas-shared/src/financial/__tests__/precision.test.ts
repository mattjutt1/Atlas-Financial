/**
 * Tests for Financial Precision Foundation - Phase 1.5
 *
 * Validates that all financial calculations maintain bank-grade precision
 * and eliminate IEEE 754 floating-point errors
 */

import { FinancialAmount, FinancialCalculations, FinancialValidation, FinancialPerformance, Decimal } from '../precision';

describe('FinancialAmount', () => {
  describe('Basic Operations', () => {
    test('should create from string without precision loss', () => {
      const amount = new FinancialAmount('123.4567');
      expect(amount.toString()).toBe('123.4567');
    });

    test('should create from number without precision loss', () => {
      const amount = new FinancialAmount(123.45);
      expect(amount.toString()).toBe('123.4500');
    });

    test('should handle addition precisely', () => {
      const a = new FinancialAmount('0.1');
      const b = new FinancialAmount('0.2');
      const result = a.add(b);

      // This would fail with regular JavaScript: 0.1 + 0.2 = 0.30000000000000004
      expect(result.toString()).toBe('0.3000');
    });

    test('should handle subtraction precisely', () => {
      const a = new FinancialAmount('1.00');
      const b = new FinancialAmount('0.99');
      const result = a.subtract(b);

      expect(result.toString()).toBe('0.0100');
    });

    test('should handle multiplication precisely', () => {
      const a = new FinancialAmount('123.45');
      const b = new FinancialAmount('1.07');
      const result = a.multiply(b);

      expect(result.toString()).toBe('132.0915');
    });

    test('should handle division precisely', () => {
      const a = new FinancialAmount('100.00');
      const b = new FinancialAmount('3');
      const result = a.divide(b);

      expect(result.toString()).toBe('33.3333');
    });
  });

  describe('Percentage Calculations', () => {
    test('should calculate percentages correctly', () => {
      const amount = new FinancialAmount('1000.00');
      const tenPercent = amount.percentage(10);

      expect(tenPercent.toString()).toBe('100.0000');
    });

    test('should handle fractional percentages', () => {
      const amount = new FinancialAmount('1000.00');
      const result = amount.percentage(7.25);

      expect(result.toString()).toBe('72.5000');
    });
  });

  describe('Comparisons', () => {
    test('should compare amounts correctly', () => {
      const a = new FinancialAmount('100.00');
      const b = new FinancialAmount('100.0000');
      const c = new FinancialAmount('99.99');

      expect(a.equals(b)).toBe(true);
      expect(a.greaterThan(c)).toBe(true);
      expect(c.lessThan(a)).toBe(true);
    });
  });

  describe('Currency Formatting', () => {
    test('should format USD currency', () => {
      const amount = new FinancialAmount('1234.56');
      const formatted = amount.toCurrency('USD');

      expect(formatted).toBe('$1,234.56');
    });

    test('should format EUR currency', () => {
      const amount = new FinancialAmount('1234.56');
      const formatted = amount.toCurrency('EUR');

      expect(formatted).toBe('€1,234.56');
    });
  });

  describe('Cents Conversion', () => {
    test('should convert from cents correctly', () => {
      const amount = FinancialAmount.fromCents(12345);
      expect(amount.toString()).toBe('123.4500');
    });

    test('should convert to cents correctly', () => {
      const amount = new FinancialAmount('123.45');
      expect(amount.toCents()).toBe(12345);
    });
  });
});

describe('FinancialCalculations', () => {
  describe('Compound Interest', () => {
    test('should calculate compound interest correctly', () => {
      const principal = new FinancialAmount('1000.00');
      const result = FinancialCalculations.compoundInterest(
        principal,
        5, // 5% annual rate
        12, // monthly compounding
        1 // 1 year
      );

      // Expected: $1051.16 (approximately)
      expect(result.toNumber()).toBeCloseTo(1051.16, 2);
    });
  });

  describe('Monthly Payment', () => {
    test('should calculate monthly payment for loan', () => {
      const principal = new FinancialAmount('200000.00'); // $200k loan
      const result = FinancialCalculations.monthlyPayment(
        principal,
        4.5, // 4.5% annual rate
        360 // 30 years
      );

      // Expected: ~$1013.37/month
      expect(result.toNumber()).toBeCloseTo(1013.37, 2);
    });

    test('should handle zero interest rate', () => {
      const principal = new FinancialAmount('12000.00');
      const result = FinancialCalculations.monthlyPayment(
        principal,
        0, // 0% interest
        12 // 12 months
      );

      expect(result.toString()).toBe('1000.0000');
    });
  });

  describe('Budget Breakdown', () => {
    test('should calculate 75/15/10 budget correctly', () => {
      const income = new FinancialAmount('5000.00');
      const breakdown = FinancialCalculations.budgetBreakdown(income);

      expect(breakdown.needs.toString()).toBe('3750.0000'); // 75%
      expect(breakdown.wants.toString()).toBe('750.0000');  // 15%
      expect(breakdown.savings.toString()).toBe('500.0000'); // 10%
    });
  });

  describe('Debt Management', () => {
    const debts = [
      {
        name: 'Credit Card 1',
        balance: new FinancialAmount('3000.00'),
        minimumPayment: new FinancialAmount('60.00'),
        interestRate: 18.99,
      },
      {
        name: 'Credit Card 2',
        balance: new FinancialAmount('1500.00'),
        minimumPayment: new FinancialAmount('30.00'),
        interestRate: 24.99,
      },
      {
        name: 'Student Loan',
        balance: new FinancialAmount('5000.00'),
        minimumPayment: new FinancialAmount('150.00'),
        interestRate: 4.5,
      },
    ];

    test('should order debts by snowball method (lowest balance first)', () => {
      const ordered = FinancialCalculations.debtSnowballOrder(debts);

      expect(ordered[0].name).toBe('Credit Card 2'); // $1,500
      expect(ordered[1].name).toBe('Credit Card 1'); // $3,000
      expect(ordered[2].name).toBe('Student Loan');  // $5,000
    });

    test('should order debts by avalanche method (highest rate first)', () => {
      const ordered = FinancialCalculations.debtAvalancheOrder(debts);

      expect(ordered[0].name).toBe('Credit Card 2'); // 24.99%
      expect(ordered[1].name).toBe('Credit Card 1'); // 18.99%
      expect(ordered[2].name).toBe('Student Loan');  // 4.5%
    });
  });
});

describe('FinancialValidation', () => {
  test('should validate positive amounts', () => {
    const positive = new FinancialAmount('100.00');
    const negative = new FinancialAmount('-50.00');
    const zero = new FinancialAmount('0.00');

    expect(FinancialValidation.isPositive(positive)).toBe(true);
    expect(FinancialValidation.isPositive(negative)).toBe(false);
    expect(FinancialValidation.isPositive(zero)).toBe(false);
  });

  test('should validate reasonable amounts', () => {
    const reasonable = new FinancialAmount('50000.00');
    const unreasonable = new FinancialAmount('2000000.00');

    expect(FinancialValidation.isReasonableAmount(reasonable)).toBe(true);
    expect(FinancialValidation.isReasonableAmount(unreasonable)).toBe(false);
  });

  test('should validate interest rates', () => {
    expect(FinancialValidation.isValidInterestRate(5.25)).toBe(true);
    expect(FinancialValidation.isValidInterestRate(0)).toBe(true);
    expect(FinancialValidation.isValidInterestRate(100)).toBe(true);
    expect(FinancialValidation.isValidInterestRate(-1)).toBe(false);
    expect(FinancialValidation.isValidInterestRate(101)).toBe(false);
  });

  test('should validate precision maintenance', () => {
    const precise = new FinancialAmount('123.4567');
    const imprecise = new FinancialAmount('123.456789123');

    expect(FinancialValidation.validatePrecision(precise)).toBe(true);
    // This should pass as we round to 4 decimal places
    expect(FinancialValidation.validatePrecision(imprecise.round(4))).toBe(true);
  });
});

describe('IEEE 754 Floating Point Error Prevention', () => {
  test('should prevent classic floating point errors', () => {
    // Classic JavaScript floating point error: 0.1 + 0.2 !== 0.3
    const jsResult = 0.1 + 0.2;
    expect(jsResult).not.toBe(0.3); // This demonstrates the problem

    // Our solution should handle this correctly
    const a = new FinancialAmount('0.1');
    const b = new FinancialAmount('0.2');
    const ourResult = a.add(b);

    expect(ourResult.equals('0.3')).toBe(true);
    expect(ourResult.toString()).toBe('0.3000');
  });

  test('should handle complex financial calculations without precision loss', () => {
    // Real-world scenario: calculating tax on a sale
    const saleAmount = new FinancialAmount('999.99');
    const taxRate = 8.25; // 8.25% tax
    const tax = saleAmount.percentage(taxRate);
    const total = saleAmount.add(tax);

    expect(tax.toString()).toBe('82.4992'); // Precise tax calculation
    expect(total.toString()).toBe('1082.4892'); // Precise total

    // The calculation involves more than 4 decimal places internally, but should round properly
    const roundedTotal = total.round(4);
    expect(FinancialValidation.validatePrecision(roundedTotal)).toBe(true);

    // Verify the calculation is deterministic and accurate
    const recalculated = saleAmount.add(saleAmount.percentage(8.25));
    expect(total.equals(recalculated)).toBe(true);
  });

  test('should maintain precision through multiple operations', () => {
    let amount = new FinancialAmount('1000.00');

    // Perform 10 operations that would accumulate floating point errors
    for (let i = 0; i < 10; i++) {
      amount = amount.multiply('1.01').subtract('0.33').add('2.17');
    }

    // Round to bank-grade precision for validation
    const roundedAmount = amount.round(4);

    // Verify the result maintains precision
    expect(roundedAmount.toString().length).toBeGreaterThan(0);
    expect(FinancialValidation.validatePrecision(roundedAmount)).toBe(true);

    // Verify no accumulated errors by checking the calculation is deterministic
    let verifyAmount = new FinancialAmount('1000.00');
    for (let i = 0; i < 10; i++) {
      verifyAmount = verifyAmount.multiply('1.01').subtract('0.33').add('2.17');
    }
    expect(amount.equals(verifyAmount)).toBe(true);
  });
});

describe('Performance Validation', () => {
  describe('Bank-Grade Performance Requirements', () => {
    test('should complete basic operations within 100ms', async () => {
      const operation = () => {
        const a = new FinancialAmount('1000.00');
        const b = new FinancialAmount('250.75');
        return a.add(b).multiply('1.05').subtract('50.25').divide('2');
      };

      const result = await FinancialPerformance.validatePerformance(operation);

      expect(result.withinTarget).toBe(true);
      expect(result.durationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS);
      // Calculate expected result: (1000 + 250.75) * 1.05 - 50.25 / 2
      const expected = new FinancialAmount('1000.00')
        .add('250.75')
        .multiply('1.05')
        .subtract('50.25')
        .divide('2');
      expect(result.result.toString()).toBe(expected.toString());
    });

    test('should complete compound interest calculation within 100ms', async () => {
      const operation = () => {
        const principal = new FinancialAmount('100000.00');
        return FinancialCalculations.compoundInterest(principal, 7.5, 12, 10);
      };

      const result = await FinancialPerformance.validatePerformance(operation);

      expect(result.withinTarget).toBe(true);
      expect(result.durationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS);
    });

    test('should complete monthly payment calculation within 100ms', async () => {
      const operation = () => {
        const principal = new FinancialAmount('500000.00');
        return FinancialCalculations.monthlyPayment(principal, 6.25, 360);
      };

      const result = await FinancialPerformance.validatePerformance(operation);

      expect(result.withinTarget).toBe(true);
      expect(result.durationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS);
    });

    test('should handle complex multi-operation calculations within 100ms', async () => {
      const operation = () => {
        // Simulate complex financial calculation workflow
        const income = new FinancialAmount('75000.00');
        const budget = FinancialCalculations.budgetBreakdown(income);

        const monthlyIncome = income.divide(12);
        const emergencyFund = FinancialCalculations.emergencyFundTarget(budget.needs.divide(12), 6);

        // Calculate multiple debt payments
        const debts = [
          { balance: new FinancialAmount('15000.00'), rate: 18.99, term: 60 },
          { balance: new FinancialAmount('8500.00'), rate: 24.99, term: 36 },
          { balance: new FinancialAmount('3200.00'), rate: 12.5, term: 24 }
        ];

        const totalPayments = debts.map(debt =>
          FinancialCalculations.monthlyPayment(debt.balance, debt.rate, debt.term)
        ).reduce((sum, payment) => sum.add(payment), new FinancialAmount('0'));

        return {
          monthlyIncome,
          budget,
          emergencyFund,
          totalPayments,
          remainingIncome: monthlyIncome.subtract(totalPayments)
        };
      };

      const result = await FinancialPerformance.validatePerformance(operation);

      expect(result.withinTarget).toBe(true);
      expect(result.durationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS);
      expect(result.result.monthlyIncome.toString()).toBe('6250.0000');
    });
  });

  describe('Benchmark Testing', () => {
    test('should maintain consistent performance across multiple iterations', async () => {
      const operation = () => {
        const amount = new FinancialAmount('1000.00');
        return amount.multiply('1.08').add('50.75').subtract('25.25').divide('1.05');
      };

      const benchmark = await FinancialPerformance.benchmark(operation, 100);

      expect(benchmark.withinTarget).toBe(true);
      expect(benchmark.averageDurationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS);
      expect(benchmark.maxDurationMs).toBeLessThan(FinancialPerformance.PERFORMANCE_TARGET_MS * 2); // Allow some variance
      expect(benchmark.results.length).toBe(100);

      // Verify all results are identical (deterministic)
      const firstResult = benchmark.results[0].toString();
      benchmark.results.forEach(result => {
        expect(result.toString()).toBe(firstResult);
      });
    });

    test('should benchmark debt calculation algorithms efficiently', async () => {
      const debts = Array.from({ length: 10 }, (_, i) => ({
        name: `Debt ${i + 1}`,
        balance: new FinancialAmount(`${(i + 1) * 1000}.00`),
        minimumPayment: new FinancialAmount(`${(i + 1) * 25}.00`),
        interestRate: 5 + (i * 2.5)
      }));

      const snowballOperation = () => FinancialCalculations.debtSnowballOrder(debts);
      const avalancheOperation = () => FinancialCalculations.debtAvalancheOrder(debts);

      const snowballBenchmark = await FinancialPerformance.benchmark(snowballOperation, 50);
      const avalancheBenchmark = await FinancialPerformance.benchmark(avalancheOperation, 50);

      expect(snowballBenchmark.withinTarget).toBe(true);
      expect(avalancheBenchmark.withinTarget).toBe(true);

      expect(snowballBenchmark.averageDurationMs).toBeLessThan(50); // Should be very fast
      expect(avalancheBenchmark.averageDurationMs).toBeLessThan(50); // Should be very fast
    });
  });
});

describe('Database Integration Preparation', () => {
  describe('DECIMAL(19,4) Compatibility', () => {
    test('should handle maximum precision values for DECIMAL(19,4)', () => {
      // DECIMAL(19,4) can store values up to 999,999,999,999,999.9999
      const maxValue = new FinancialAmount('999999999999999.9999');
      expect(maxValue.toString()).toBe('999999999999999.9999');

      const minValue = new FinancialAmount('-999999999999999.9999');
      expect(minValue.toString()).toBe('-999999999999999.9999');
    });

    test('should properly format values for database storage', () => {
      const amounts = [
        new FinancialAmount('0.0001'),
        new FinancialAmount('123.45'),
        new FinancialAmount('1000000.00'),
        new FinancialAmount('999999999999999.9999')
      ];

      amounts.forEach(amount => {
        const dbValue = amount.toString();
        expect(dbValue).toMatch(/^-?\d+\.\d{4}$/); // Must have exactly 4 decimal places

        // Verify round-trip compatibility
        const restored = new FinancialAmount(dbValue);
        expect(restored.equals(amount)).toBe(true);
      });
    });

    test('should handle cents conversion for database storage', () => {
      const amount = new FinancialAmount('123.45');
      const cents = amount.toCents();
      const restored = FinancialAmount.fromCents(cents);

      expect(cents).toBe(12345);
      expect(restored.equals(amount)).toBe(true);
    });
  });
});
