Create the Test Environments section for <SYSTEM/PRODUCT>.

Include:
- Environment list (e.g., local/dev/QA/staging/prod) and intended use.
- Configuration details per environment: URLs/endpoints, feature flags, build/deploy cadence, third-party integrations, authentication method.
- Required access/roles and how to obtain them.
- Environment constraints and known limitations.

Constraints:
- Use placeholders for secrets and endpoints (e.g., <QA_BASE_URL>).

Validation:
- Each environment has a clear purpose and at least one configuration detail.
- Access requirements are explicit (roles, permissions, request process).
- Known limitations are documented or explicitly marked as "None known".