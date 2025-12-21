# Assetra E2E Test Plan

## Overview

This test plan covers the main user flows for the Assetra financial planning application.
Tests use Playwright with the configuration in `playwright.config.ts`.

---

## 1. Authentication Tests

### 1.1 Login Page
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Display login form | Verify email, password fields and submit button visible | High |
| Login with valid credentials | User can log in and is redirected to dashboard | High |
| Login with invalid credentials | Error message displayed for wrong password | High |
| Login with non-existent email | Appropriate error message shown | Medium |
| Password field masking | Password should be hidden by default | Low |
| Remember me functionality | Session persists across browser restarts | Medium |

### 1.2 Signup Page
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Display signup form | Verify all fields visible (name, email, password, confirm) | High |
| Signup with valid data | User account created and redirected | High |
| Password validation | Minimum 8 characters enforced | High |
| Password confirmation | Passwords must match | High |
| Duplicate email | Error shown for existing email | Medium |
| Navigate to login | "Sign in" link works | Low |

### 1.3 Protected Routes
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Dashboard requires auth | Unauthenticated user redirected to login | High |
| Auth token persistence | Refreshing page maintains session | High |
| Logout functionality | User can log out successfully | High |

---

## 2. Landing Page Tests

### 2.1 Hero Section
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Page load | Landing page loads with title | High |
| Hero content visible | "Your Future Is Not Written Yet" heading shown | High |
| CTA button works | "Start Planning" navigates to dashboard/login | High |

### 2.2 Feature Sections
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Butterfly Effect section | Interactive decision cards displayed | Medium |
| Singapore Context section | BTO, COE, CPF examples visible | Medium |
| Solution section | Scenario toggle buttons work | Medium |
| Footer links | Footer content and links work | Low |

---

## 3. Dashboard Tests (Authenticated)

### 3.1 Layout & Navigation
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Dashboard loads | Chart and data cards visible after login | High |
| Chat sidebar toggle | Cmd+B or button toggles chat panel | Medium |
| Responsive layout | Mobile view shows floating chat launcher | Medium |
| CPF view toggle | Can switch to CPF simulation view | Medium |

### 3.2 Net Worth Chart
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Chart renders | Recharts area chart displays data | High |
| Year selection | Clicking on chart updates selected year | High |
| Zoom controls | Yearly/monthly zoom levels work | Medium |
| Scenario markers | Scenario events shown as markers on chart | Medium |
| Chart tooltip | Hover shows breakdown tooltip | Medium |

### 3.3 Financial Data Cards
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Income card | Lists all incomes with amounts | High |
| Expense card | Lists all expenses with amounts | High |
| Asset card | Lists all assets with values | High |
| Liability card | Lists all liabilities with values | High |
| Summary totals | Net worth and cash flow totals correct | High |

---

## 4. Financial Item CRUD Tests

### 4.1 Income Management
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add income | Create new income with name, amount, frequency | High |
| Edit income | Update existing income details | High |
| Delete income | Remove income after confirmation | High |
| Income form validation | Required fields enforced | Medium |

### 4.2 Expense Management
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add expense | Create new expense | High |
| Edit expense | Update existing expense | High |
| Delete expense | Remove expense | High |
| Expense categories | Category selection works | Medium |

### 4.3 Asset Management
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add asset | Create new asset with value, growth rate | High |
| Edit asset | Update asset details | High |
| Delete asset | Remove asset | High |

### 4.4 Liability Management
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add liability | Create new liability | High |
| Edit liability | Update liability (interest rate, payments) | High |
| Delete liability | Remove liability | High |

### 4.5 Cash Accounts
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add cash account | Create new cash account | High |
| Edit cash account | Update balance | Medium |
| Delete cash account | Remove account | Medium |

---

## 5. Scenario Events Tests

### 5.1 Scenario Event Modal
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Open modal | "Add Scenario" button opens modal | High |
| Form fields visible | Name, description, date, icon picker | High |
| Icon picker | Can search and select icons | Medium |
| Example fill | "Fill Example" populates form | Low |

### 5.2 Impact Management
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add impact | Add income/expense/asset/liability impact | High |
| Impact types | Override, adjustment, start, end types work | High |
| Target selection | Can select existing financial items | High |
| Create new target | Can create new item from impact | Medium |
| Remove impact | Delete impact from list | Medium |
| Date range | Start/end dates for recurring impacts | Medium |

### 5.3 Scenario CRUD
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Create scenario | Save new scenario event | High |
| Edit scenario | Update existing scenario | High |
| Delete scenario | Remove scenario after confirmation | High |
| Toggle included | Enable/disable scenario in projections | High |

### 5.4 Scenario Integration
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Chart updates | Toggling scenario updates net worth chart | High |
| Marker appears | Scenario marker shows on chart at date | Medium |
| Timeline impact | Scenario affects projected values | High |

---

## 6. CPF Simulation Tests

### 6.1 CPF View
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Open CPF view | Button opens CPF simulation | Medium |
| CPF balances | OA, SA, MA, RA balances displayed | Medium |
| CPF projections | Future CPF values projected | Medium |
| Close CPF view | Return to main dashboard | Low |

### 6.2 CPF Forms
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Update balances | Can edit current CPF balances | Medium |
| Contribution settings | Configure contribution rates | Medium |

---

## 7. Property Planner Tests

### 7.1 Property Modal
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Open property planner | Modal opens from dashboard | Medium |
| Step 1 - Property details | Price, type, purchase date | Medium |
| Step 2 - Financing | Down payment, loan details | Medium |
| Mortgage calculation | Monthly payment calculated | Medium |

### 7.2 Property Scenario
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Generate scenario | Property creates scenario event | Medium |
| CPF usage | Property uses CPF for down payment | Medium |

---

## 8. Chat/AI Assistant Tests

### 8.1 Chat Interface
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Chat opens | Chat panel visible when expanded | Medium |
| Send message | User can type and send message | Medium |
| Receive response | AI response displayed | Medium |
| Chat history | Previous messages persisted | Low |

---

## 9. Settings Tests

### 9.1 Settings Modal
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Open settings | Settings modal opens | Medium |
| Growth rates | Can configure investment growth rates | Medium |
| Chart PiP | Picture-in-picture toggle works | Low |

---

## 10. Error Handling Tests

### 10.1 Network Errors
| Test Case | Description | Priority |
|-----------|-------------|----------|
| API timeout | Graceful handling of slow responses | Medium |
| API error | Error message displayed to user | High |
| Offline mode | Appropriate message when offline | Low |

### 10.2 Validation Errors
| Test Case | Description | Priority |
|-----------|-------------|----------|
| Form validation | Invalid inputs show error messages | High |
| Save failures | Failed saves show error, don't lose data | High |

---

## Test Environment Setup

### Prerequisites
1. Backend server running at `localhost:8080`
2. Frontend dev server at `localhost:3000`
3. Test database with seed data

### Test User Setup
```typescript
// Use dev login endpoint for test authentication
const TEST_USER = {
  email: 'dev@test.com',
  password: 'password123'
}
```

### Running Tests
```bash
# Run all tests
pnpm playwright test

# Run specific test file
pnpm playwright test e2e/auth.spec.ts

# Run with UI
pnpm playwright test --ui

# Run headed (see browser)
pnpm playwright test --headed
```

---

## Suggested Test File Structure

```
frontend/e2e/
├── app.spec.ts          # Existing basic tests
├── auth.spec.ts         # Authentication tests
├── dashboard.spec.ts    # Dashboard and chart tests
├── financial-items.spec.ts  # CRUD for incomes/expenses/etc
├── scenarios.spec.ts    # Scenario event tests
├── cpf.spec.ts          # CPF simulation tests
├── property.spec.ts     # Property planner tests
└── fixtures/
    ├── auth.ts          # Login helper functions
    └── test-data.ts     # Seed data for tests
```

---

## Priority Implementation Order

1. **Phase 1 - Critical Path** (High Priority)
   - Authentication (login/signup)
   - Dashboard loads
   - Financial item CRUD (at least one type)
   - Basic scenario creation

2. **Phase 2 - Core Features** (Medium Priority)
   - All financial item types
   - Scenario impacts and integration
   - Chart interactions
   - CPF basics

3. **Phase 3 - Polish** (Low Priority)
   - Settings
   - Chat
   - Property planner
   - Error edge cases
