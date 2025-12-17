Create a Non-Functional Testing section for <SYSTEM/PRODUCT>.

Include subsections for:
- Performance/load: target SLAs/SLOs, test types (load/stress/soak), tooling, and acceptance thresholds.
- Security: threat areas, basic test activities (authz/authn, OWASP checks), and responsibilities.
- Accessibility (if UI): target standard (e.g., WCAG 2.1 AA), testing approach (manual + tooling).
- Reliability/Resilience: failover, retries, chaos/lightweight fault injection (as applicable).

Constraints:
- If targets are unknown, list assumptions and propose default thresholds.

Validation:
- Each non-functional area includes at least one measurable acceptance threshold or an explicitly stated assumption.
- Responsibilities/owners are stated for each area.
- A reviewer can identify what will be tested, how, and what constitutes pass/fail.