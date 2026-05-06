---
name: frontend-testing
description: Validate frontend features of the OctoCAT Supply Chain application using Playwright MCP. Use this skill when asked to test, verify, or QA any UI feature — including navigation, product catalog, cart, login, admin panel, dark mode, accessibility, or responsive layout.
---
# Frontend Testing with Playwright MCP

This skill guides agentic testing of the OctoCAT Supply Chain React application using the Playwright MCP server — navigating pages, interacting with components, validating visual state, and filing issues for defects.

## When to Use This Skill

- Test or verify a frontend feature after implementation
- User asks to verify frontend enhancements or bug fixes
- Run exploratory QA on existing pages (products, cart, login, admin)
- Validate dark mode / light mode theming
- Check accessibility (keyboard nav, ARIA, focus management)
- Verify responsive layout at different viewport sizes
- Confirm cart operations (add, update quantity, remove, empty state)
- Validate authentication flows (login, admin role gating, logout)

## Application Under Test — Quick Reference

| Route | Component | Key Behaviors |
|-------|-----------|---------------|
| `/` | `Welcome` | Hero section, call-to-action links |
| `/products` | `Products` | Product grid, search filter, add-to-cart |
| `/cart` | `Cart` | Line items, quantity +/−, remove, subtotal, empty state |
| `/login` | `Login` | Email + password form, error display, redirect on success |
| `/about` | `About` | Static content page |
| `/admin/products` | `AdminProducts` | Requires admin role; CRUD table, sort, add/edit form |

**Auth rules:** Any email + password logs in. Emails ending with `@github.com` grant admin role.

**Theme:** Dark mode toggle in the nav bar; class-based (`darkMode` context).

## Workflow

Follow these steps in order for every testing session.

### Step 1 — Identify Scope

Determine which feature or page needs testing. Scope the session to the task at hand — do **not** test unrelated features.

Gather context:
- Which component or route was changed?
- Does the feature have an existing Gherkin spec in `frontend/tests/features/`? If so, use it as the test plan.
- Are there accessibility or responsive requirements?

### Step 2 — Launch & Navigate

Use the Playwright MCP server for **all** browser interactions. Do **not** use terminal commands (`npx playwright`, scripts, etc.).

**Always use Microsoft Edge** as the browser for all Playwright MCP testing. The Playwright config (`frontend/playwright.config.ts`) includes an `edge` project (`Desktop Edge` with `--headless=new`). Do not use Chromium.

1. Open the application in **Microsoft Edge**.
2. Take a snapshot after page load to confirm the app is running.
3. Navigate to the page under test using link clicks or direct URL.

### Step 3 — Execute Test Scenarios

Run through the scenarios below that are relevant to the feature under test. For each scenario:

1. **Arrange** — Navigate to the correct page and set up preconditions (e.g., log in, add items to cart).
2. **Act** — Perform the user interaction (click, type, toggle).
3. **Assert** — Take a snapshot and verify the expected DOM state (text content, visibility, element count, URL).

#### 3a — Navigation & Routing

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Home → Products | Click "Products" in nav | URL contains `/products`; heading "Products" visible |
| 2 | Home → About | Click "About us" in nav | URL contains `/about`; About content visible |
| 3 | Home → Cart | Click cart icon in nav | URL contains `/cart`; empty cart state visible |
| 4 | Home → Login | Click "Login" in nav | URL contains `/login`; login form visible |
| 5 | Logo click returns home | From any page, click OctoCAT Supply logo | URL is `/` |

#### 3b — Product Catalog

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Products load | Navigate to `/products` | Product grid renders with multiple product cards |
| 2 | Search — valid match | Type "SmartFeeder" in search input | "SmartFeeder One" card visible; unrelated products hidden |
| 3 | Search — no match | Type "Space Tuna" in search input | "No products found" empty state with guidance to adjust filters |
| 4 | Search — clear | Type query, then clear input | Full product grid restores |
| 5 | Add to cart | Click "Add to Cart" on a product card | Cart icon badge count increments |

#### 3c — Shopping Cart

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Empty cart | Navigate to `/cart` with no items | "Your cart is empty" message and "Browse Products" link |
| 2 | Cart with items | Add product, navigate to `/cart` | Line item with name, price, quantity visible; subtotal correct |
| 3 | Increase quantity | Click "+" button on a line item | Quantity increments; subtotal updates |
| 4 | Decrease quantity | Click "−" button (quantity > 1) | Quantity decrements; subtotal updates |
| 5 | Remove item | Click remove/trash icon on a line item | Item disappears; subtotal updates or empty state shown |

#### 3d — Authentication & Admin

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Login success | Enter email + password, submit | Redirected to `/`; nav shows logout option |
| 2 | Admin access | Login with `admin@github.com` | "Admin" dropdown appears in nav |
| 3 | Admin products page | Login as admin, navigate to `/admin/products` | Product table with sort headers, Add button visible |
| 4 | Non-admin guard | Navigate to `/admin/products` without admin login | Redirected away (no admin content visible) |
| 5 | Logout | Click "Logout" button | Login link reappears; admin menu hidden |

#### 3e — Dark Mode & Theming

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Toggle dark mode | Click theme toggle in nav | Background switches to dark palette; text becomes light |
| 2 | Toggle light mode | Click theme toggle again | Background returns to light palette |
| 3 | Persistence across pages | Enable dark mode, navigate to another page | Dark mode remains active |

#### 3f — Accessibility

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Keyboard navigation | Tab through nav links | Each link receives visible focus ring in order |
| 2 | Search input label | Inspect product search input | `aria-label="Search products"` present |
| 3 | Cart link label | Inspect cart nav link | `aria-label="Shopping cart"` present |
| 4 | Semantic headings | Check each page | Proper `<h1>` exists for the page title |
| 5 | Image alt text | Inspect product images | Meaningful `alt` attributes on all `<img>` tags |

#### 3g — Responsive Layout

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Desktop (1280×720) | Resize viewport to 1280×720 | Full nav bar visible; product grid multi-column |
| 2 | Tablet (768×1024) | Resize viewport to 768×1024 | Layout adjusts; nav may collapse |
| 3 | Mobile (375×667) | Resize viewport to 375×667 | Single-column layout; hamburger menu or stacked nav |



### Step 4 — Capture Evidence

For every test scenario:
- **Pass**: Take a snapshot confirming the expected state. Note the scenario as passed.
- **Fail**: Take a screenshot capturing the defect. Note the scenario as failed with:
  - Steps to reproduce
  - Expected vs. actual result
  - Screenshot reference

### Step 5 — File Issues for Defects

For each **failed** scenario, create a GitHub issue using the GitHub CLI. Do **not** use the GitHub MCP server for issue creation.

```bash
gh issue create \
  --title "🐛 [Frontend] <Short defect description>" \
  --label "bug,frontend,playwright" \
  --body "## Description
<What went wrong>

## Steps to Reproduce
1. Navigate to ...
2. Click ...
3. Observe ...

## Expected Result
<What should happen>

## Actual Result
<What actually happened>

## Evidence
<Paste screenshot or snapshot reference>

## Environment
- Browser: Microsoft Edge (Playwright)
- Viewport: <dimensions>
- Theme: <dark/light>

## Test Scenario Reference
Section: <3a–3g> | Scenario #: <number>"
```

### Step 6 — Compile Summary Report

After all scenarios are executed, create a summary issue:

```bash
gh issue create \
  --title "📋 Playwright Test Report — <Feature/Page> — $(date +%Y-%m-%d)" \
  --label "test-report,frontend" \
  --body "## Test Summary

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Navigation & Routing | X | X | X |
| Product Catalog | X | X | X |
| Shopping Cart | X | X | X |
| Auth & Admin | X | X | X |
| Dark Mode | X | X | X |
| Accessibility | X | X | X |
| Responsive | X | X | X |

## Defects Filed
- #<issue_number> — <title>
- #<issue_number> — <title>

## Notes
<Any observations, flaky behaviors, or recommendations>"
```

## Rules & Guardrails

1. **MCP only** — All browser automation MUST go through the Playwright MCP server. No terminal-based Playwright commands.
2. **No code changes** — Do not modify application source code during testing. Testing is read-only.
3. **Scoped testing** — Only test the feature or page relevant to the current task unless explicitly asked for a full regression.
4. **Evidence-driven** — Every assertion must be backed by a snapshot or screenshot. Do not report pass/fail without visual proof.
5. **Deterministic locators** — Prefer `aria-label`, `role`, `data-testid`, or semantic selectors (`<h1>`, `<nav>`, `<button>`) over fragile CSS class selectors.
6. **Wait for readiness** — Always wait for content to load (e.g., product grid, API responses) before asserting. Use Playwright's built-in auto-waiting via `expect(...).toBeVisible()`.

## Existing Test Assets

| Asset | Location | Purpose |
|-------|----------|---------|
| Gherkin feature | `frontend/tests/features/product-navigation.feature` | Product catalog BDD spec |
| E2E spec | `frontend/tests/e2e/product-navigation.spec.ts` | Playwright test implementation |
| Playwright config | `frontend/playwright.config.ts` | Browser/project/server config |

When a Gherkin feature exists for the page under test, use it as the primary test plan and verify each scenario.