# MealFlow Constitution

This constitution records the durable product and engineering constraints for MealFlow. It applies to the whole product, not to one feature or intent. Feature specifications and implementation plans must consider these rules. Change this file only through an intentional, human-reviewed product-level decision.

## Product principles

- MealFlow serves one household on its trusted home network. Do not assume public access, accounts, or multi-tenant use.
- Keep the product practical to operate on a household Synology DiskStation. Prefer the simplest design that meets the household's needs.
- Preserve household data across restarts, container replacement, and upgrades. Never discard or destructively migrate user data without a safe, tested path.
- Make user-facing behavior honest and understandable, especially when an external shopping action partially succeeds or fails.
- Support desktop and mobile browsers.

## Security and privacy constraints

- The application has no general user authentication by design and is intended only for a trusted home LAN. Do not expose it to the public internet without an explicit product decision and a security design that addresses authentication and transport security.
- Never store or log Kroger passwords. Keep provider credentials and encryption keys out of source control; use runtime configuration and protect stored refresh tokens.
- Treat external API responses and user-provided values as untrusted input. Validate inputs and return safe errors.
- Do not claim regulatory or security compliance based only on tests or documentation.

## Engineering constraints

- Preserve the single-container deployment model: one Express process serves the built web client and API; SQLite is stored on a persistent mounted volume.
- Use Node's built-in `node:sqlite` rather than adding a native SQLite module unless an explicit architecture decision changes this rule.
- Keep automated tests aligned with user-visible behavior. Run the applicable build, server tests, and end-to-end tests for changes; test evidence supports review but does not replace human judgment.
- Record architecturally significant changes and tradeoffs in the product's architecture documentation or decision records.

## Applying and changing this constitution

Spec & Design must identify applicable principles and explain any conflict or proposed exception in the feature spec. A feature agent must not silently change this constitution. The product owner decides whether to revise a principle; an accepted change is committed through the repository's normal review process and applies to subsequent feature work.
