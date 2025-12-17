Produce a Requirements Traceability Matrix for <SYSTEM/PRODUCT>.

Input: the requirements inventory (REQ-###) and high-level scenarios (SCN-###).

Output:
- A table with columns: Requirement ID, Scenario IDs, Planned Test Case IDs (placeholder allowed), Coverage Status (Covered/Partial/Not Covered), Notes.

Constraints:
- If detailed test cases are not yet written, use placeholders like TC-TBD.

Validation:
- Every requirement appears at least once in the RTM.
- Any Not Covered requirement has an explicit note explaining why and what is needed.
- A reviewer can trace from a requirement to at least one scenario and planned test case placeholder.