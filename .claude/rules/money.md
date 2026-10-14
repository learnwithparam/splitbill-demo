---
paths:
  - "src/money/**"
  - "src/expenses.ts"
  - "src/balances.ts"
  - "src/csv.ts"
---

# Money

- Every amount is an integer number of cents. Never a float.
- A split must sum to the original total: the leftover cents go to the first members, one each.
- Format to a decimal string only at an output boundary (JSON, CSV, CLI text).
- The full rules and examples are in the `handling-money` skill.
