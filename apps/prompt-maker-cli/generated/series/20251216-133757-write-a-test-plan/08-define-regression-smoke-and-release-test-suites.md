Create a Test Suites section for <SYSTEM/PRODUCT>.

Include:
- Definitions and intent for Smoke, Sanity, Regression, and Release/Go-Live suites.
- Inclusion criteria for each suite (what qualifies a test to be in the suite).
- Target execution time budgets (e.g., smoke < 15 minutes) and frequency.
- Ownership and execution triggers (CI, nightly, pre-release).

Validation:
- Each suite has a clear definition, inclusion criteria, and execution trigger.
- Time budgets are stated for at least Smoke and Regression.
- A reviewer can determine which tests belong in which suite based on the criteria.