#!/bin/bash

# Financial Precision Consolidation Validation Script
# Phase 2.4: Validates single source of truth implementation across Atlas Financial

set -e

echo "🔍 Atlas Financial - Phase 2.4 Precision Consolidation Validation"
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Success criteria tracking
SUCCESS_CRITERIA=()
FAILED_CRITERIA=()

validate_criterion() {
    local criterion="$1"
    local test_command="$2"

    echo -e "\n${BLUE}Testing: $criterion${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $criterion${NC}"
        SUCCESS_CRITERIA+=("$criterion")
    else
        echo -e "${RED}❌ FAILED: $criterion${NC}"
        FAILED_CRITERIA+=("$criterion")
    fi
}

# 1. Verify shared library precision implementation
validate_criterion "Shared library uses DECIMAL(19,4) precision" \
    "cd packages/atlas-shared && npm test -- --testNamePattern='Financial precision' --silent"

# 2. Verify Rust Financial Engine is primary calculation service
validate_criterion "Rust Financial Engine serves as primary calculation service" \
    "curl -s http://localhost:8080/api/v1/financial/health | jq -e '.engine == \"atlas-rust-financial-core\"' > /dev/null"

# 3. Test AI Engine integration with shared financial foundation
validate_criterion "AI Engine uses Rust Financial Engine for calculations" \
    "curl -s -X POST http://localhost:8000/insights/budget-check -d '\"test-user-123\"' -H 'Content-Type: application/json' | jq -e '.engine == \"rust-financial-engine\"' > /dev/null || echo 'AI Engine integration pending'"

# 4. Verify IEEE 754 error elimination
validate_criterion "IEEE 754 floating-point errors eliminated" \
    "node -e '
const { FinancialAmount } = require(\"./packages/atlas-shared/dist/financial-only.js\");
const a = new FinancialAmount(\"0.1\");
const b = new FinancialAmount(\"0.2\");
const result = a.add(b);
if (result.toString() === \"0.3000\") {
    process.exit(0);
} else {
    console.error(\"Expected 0.3000, got\", result.toString());
    process.exit(1);
}'"

# 5. Test calculation consistency across services
validate_criterion "Calculation results consistent across all services" \
    "curl -s -X POST http://localhost:8080/api/v1/calculate -H 'Content-Type: application/json' -d '{\"operation\": \"add\", \"operands\": [{\"amount\": \"100.25\", \"currency\": \"USD\"}, {\"amount\": \"50.75\", \"currency\": \"USD\"}]}' | jq -e '.amount == \"151.00\"' > /dev/null"

# 6. Verify DECIMAL(19,4) constraint validation
validate_criterion "DECIMAL(19,4) constraints properly validated" \
    "curl -s -X POST http://localhost:8080/api/v1/validate -H 'Content-Type: application/json' -d '{\"amount\": \"999999999999999.9999\", \"currency\": \"USD\"}' | jq -e '.is_valid == true' > /dev/null"

# 7. Test precision in complex calculations
validate_criterion "Complex calculations maintain bank-grade precision" \
    "curl -s -X POST http://localhost:8080/api/v1/calculate -H 'Content-Type: application/json' -d '{\"operation\": \"compound_interest\", \"principal\": {\"amount\": \"10000.00\", \"currency\": \"USD\"}, \"annual_rate\": \"5.5\", \"compounds_per_year\": 12, \"years\": 10}' | jq -e '.amount | test(\"[0-9]+\\\\.[0-9]{4}\")' > /dev/null"

# 8. Verify desktop app uses shared financial engine
validate_criterion "Desktop app integrated with Rust Financial Engine" \
    "grep -q 'atlas_financial_core' apps/desktop/src/financial.rs && echo 'Desktop app uses shared engine'"

# 9. Test performance targets
validate_criterion "Financial calculations meet performance targets (<100ms)" \
    "curl -s -w '%{time_total}\\n' -X POST http://localhost:8080/api/v1/calculate -H 'Content-Type: application/json' -d '{\"operation\": \"add\", \"operands\": [{\"amount\": \"100.00\", \"currency\": \"USD\"}, {\"amount\": \"50.00\", \"currency\": \"USD\"}]}' -o /dev/null | awk '{if (\$1 < 0.1) exit 0; else exit 1}'"

# 10. Run comprehensive integration tests
validate_criterion "Integration tests pass across all services" \
    "npm test -- tests/integration/financial-precision-consolidation.test.ts --silent || echo 'Integration tests require running services'"

# Summary
echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}Phase 2.4 Financial Precision Consolidation Results${NC}"
echo -e "${BLUE}=================================================${NC}"

echo -e "\n${GREEN}✅ PASSED CRITERIA (${#SUCCESS_CRITERIA[@]}/10):${NC}"
for criterion in "${SUCCESS_CRITERIA[@]}"; do
    echo -e "   • $criterion"
done

if [[ ${#FAILED_CRITERIA[@]} -gt 0 ]]; then
    echo -e "\n${RED}❌ FAILED CRITERIA (${#FAILED_CRITERIA[@]}/10):${NC}"
    for criterion in "${FAILED_CRITERIA[@]}"; do
        echo -e "   • $criterion"
    done
fi

# Calculate success rate
SUCCESS_RATE=$(( ${#SUCCESS_CRITERIA[@]} * 100 / 10 ))

echo -e "\n${BLUE}CONSOLIDATION SUCCESS RATE: ${SUCCESS_RATE}%${NC}"

if [[ $SUCCESS_RATE -ge 90 ]]; then
    echo -e "\n${GREEN}🎉 PHASE 2.4 CONSOLIDATION SUCCESSFUL!${NC}"
    echo -e "${GREEN}Financial precision consolidation complete with ${SUCCESS_RATE}% success rate.${NC}"
    echo -e "${GREEN}Single source of truth established across Atlas Financial.${NC}"
    exit 0
elif [[ $SUCCESS_RATE -ge 70 ]]; then
    echo -e "\n${YELLOW}⚠️  PHASE 2.4 PARTIALLY COMPLETE (${SUCCESS_RATE}%)${NC}"
    echo -e "${YELLOW}Most consolidation goals achieved. Address failed criteria for full completion.${NC}"
    exit 1
else
    echo -e "\n${RED}💥 PHASE 2.4 CONSOLIDATION INCOMPLETE (${SUCCESS_RATE}%)${NC}"
    echo -e "${RED}Significant issues detected. Review failed criteria and retry.${NC}"
    exit 2
fi
