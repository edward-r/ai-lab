Produce a testable requirements inventory for <SYSTEM/PRODUCT>.

Input sources: <PRD_LINK>, <USER_STORIES>, <ACCEPTANCE_CRITERIA>, <API_SPEC>, <ARCH_DOC>.

Output:
- A table with columns: Requirement ID, Source (story/PRD section), Description (testable), Priority (P0/P1/P2), Risk (High/Med/Low), Notes/Assumptions.
- Normalize wording so each requirement is verifiable.

Constraints:
- If requirement IDs do not exist, create stable IDs (e.g., REQ-001).
- Do not design tests yet; only list requirements.

Validation:
- Table contains all known requirements from the provided sources or explicitly notes gaps.
- Each requirement description is phrased so a tester can determine pass/fail.
- IDs are unique and stable (no duplicates).