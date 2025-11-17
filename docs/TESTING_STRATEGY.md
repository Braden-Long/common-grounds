# Common Grounds - Testing Strategy

## Testing Pyramid

```
       /\
      /E2E\          10% - End-to-End Tests
     /──────\
    /Integration\    30% - Integration Tests
   /────────────\
  /  Unit Tests  \   60% - Unit Tests
 /────────────────\
```

## Unit Testing

### Backend (Jest + TypeScript)

**Services to Test**
```typescript
// tests/unit/services/auth.service.test.ts
describe('AuthService', () => {
  describe('generateMagicLink', () => {
    it('should generate unique token')
    it('should set 15-minute expiration')
    it('should hash token before storing')
  })

  describe('verifyMagicLink', () => {
    it('should validate token exists')
    it('should reject expired tokens')
    it('should reject used tokens')
    it('should mark token as used')
  })
})
```

**Utilities to Test**
- JWT generation/validation
- Email validation
- Class parser ("CS 3120" → {subject, number})
- Anonymous ID generation
- Phone number hashing

**Target Coverage**: 80%+

### Frontend (Vitest + React Testing Library)

**Components to Test**
```typescript
// src/features/auth/components/__tests__/LoginForm.test.tsx
describe('LoginForm', () => {
  it('should render email input')
  it('should validate email format')
  it('should show error for non-UVA email')
  it('should call onSubmit with valid email')
})
```

**Hooks to Test**
- useAuth
- useDebounce
- useClassSearch
- useFriends

**Stores to Test**
- Auth store state changes
- Classes store actions
- Friends store actions

**Target Coverage**: 70%+

---

## Integration Testing

### Backend API Tests

**Setup**
```typescript
// tests/integration/setup.ts
beforeAll(async () => {
  // Start test database
  // Run migrations
  // Seed test data
})

afterAll(async () => {
  // Clean up database
  // Close connections
})
```

**Auth Flow Tests**
```typescript
describe('POST /api/auth/request-magic-link', () => {
  it('should send magic link for valid UVA email')
  it('should reject non-UVA email')
  it('should rate limit requests')
})

describe('GET /api/auth/verify/:token', () => {
  it('should return JWT for valid token')
  it('should reject invalid token')
  it('should reject expired token')
})
```

**Class Tests**
```typescript
describe('GET /api/classes/search', () => {
  it('should return classes from UVA SIS API')
  it('should cache results')
  it('should return 404 for invalid class')
})
```

**Friend Tests**
```typescript
describe('POST /api/friends/request', () => {
  it('should create pending friendship')
  it('should prevent duplicate requests')
  it('should prevent self-friending')
})
```

**Target Coverage**: 70%+

---

## End-to-End Testing

### Tool: Playwright

**Critical User Flows**

**1. Registration & Login**
```typescript
test('user can register and login', async ({ page }) => {
  // Visit login page
  await page.goto('/login')

  // Enter email
  await page.fill('input[type="email"]', 'test@virginia.edu')
  await page.click('button[type="submit"]')

  // Check for success message
  await expect(page.locator('text=Check your email')).toBeVisible()

  // Simulate magic link click (get token from test email)
  const token = await getTestMagicLinkToken('test@virginia.edu')
  await page.goto(`/verify/${token}`)

  // Should redirect to complete registration
  await expect(page).toHaveURL('/complete-registration')

  // Fill registration form
  await page.fill('input[name="phoneNumber"]', '+14341234567')
  await page.fill('input[name="computingId"]', 'abc1de')
  await page.click('button[type="submit"]')

  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
})
```

**2. Add Class**
```typescript
test('user can search and add class', async ({ page }) => {
  await loginAsTestUser(page)

  await page.goto('/classes')
  await page.fill('input[placeholder="Search classes"]', 'CS 3120')

  // Wait for search results
  await expect(page.locator('text=Discrete Mathematics')).toBeVisible()

  // Add class
  await page.click('button:has-text("Add Class")')

  // Verify class added
  await expect(page.locator('text=Class added')).toBeVisible()
})
```

**3. Send Friend Request**
```typescript
test('user can send and accept friend request', async ({ page }) => {
  await loginAsTestUser(page)

  await page.goto('/friends')
  await page.click('button:has-text("Add Friend")')

  // Search for friend
  await page.fill('input[placeholder="Enter computing ID"]', 'xyz2fg')
  await page.click('button:has-text("Send Request")')

  // Verify request sent
  await expect(page.locator('text=Request sent')).toBeVisible()
})
```

**4. Send Anonymous Message**
```typescript
test('user can send anonymous message in class chat', async ({ page }) => {
  await loginAsTestUser(page)

  // Navigate to class chat
  await page.goto('/classes/cs-3120/chat')

  // Type message
  await page.fill('textarea[placeholder="Type a message"]', 'Hello class!')
  await page.click('button:has-text("Send")')

  // Verify message appears
  await expect(page.locator('text=Hello class!')).toBeVisible()
  await expect(page.locator('text=Anon_')).toBeVisible()
})
```

**Target**: Cover all critical user journeys

---

## Performance Testing

### Tool: k6 or Artillery

**Load Test Scenarios**

**1. API Endpoint Load Test**
```javascript
// k6 script
import http from 'k6/http';

export let options = {
  vus: 100,  // 100 virtual users
  duration: '5m',
};

export default function() {
  const token = getAuthToken();

  http.get('http://localhost:3000/api/classes/search?subject=CS&number=3120', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
}
```

**Performance Targets**
- API response time (p95): < 200ms
- WebSocket connection time: < 100ms
- Page load time (Lighthouse): < 2s
- Time to Interactive: < 3s

**Concurrent User Tests**
- 100 concurrent users
- 500 concurrent users (stretch goal)

---

## Security Testing

### Automated Scans

**Dependency Vulnerabilities**
```bash
npm audit
npm audit fix
```

**Static Analysis**
```bash
# ESLint security rules
npm install --save-dev eslint-plugin-security

# SonarQube (optional)
```

### Manual Security Tests

**Authentication**
- [ ] Test JWT expiration
- [ ] Test invalid/malformed tokens
- [ ] Test token reuse after logout
- [ ] Test magic link reuse

**Authorization**
- [ ] Test accessing other users' data
- [ ] Test modifying other users' data
- [ ] Test accessing classes not enrolled in
- [ ] Test sending messages in classes not enrolled in

**Input Validation**
- [ ] Test XSS in message content
- [ ] Test SQL injection in search queries
- [ ] Test email validation bypass
- [ ] Test phone number format bypass

**Rate Limiting**
- [ ] Test magic link rate limit bypass
- [ ] Test API rate limit bypass

---

## Continuous Testing

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      - name: Run unit tests
        run: npm test
        working-directory: ./backend
      - name: Run integration tests
        run: npm run test:integration
        working-directory: ./backend
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      - name: Run tests
        run: npm test
        working-directory: ./frontend
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Test Data Management

### Test Users
```typescript
// tests/fixtures/users.ts
export const testUsers = {
  user1: {
    email: 'test1@virginia.edu',
    phoneNumber: '+14341111111',
    computingId: 'test1',
  },
  user2: {
    email: 'test2@virginia.edu',
    phoneNumber: '+14342222222',
    computingId: 'test2',
  },
}
```

### Test Classes
```typescript
// tests/fixtures/classes.ts
export const testClasses = {
  cs3120: {
    subject: 'CS',
    catalogNumber: '3120',
    term: '1262',
    title: 'Discrete Mathematics and Theory 1',
  },
}
```

### Database Seeding
```typescript
// prisma/seed.test.ts
async function seedTestData() {
  // Create test users
  // Create test classes
  // Create test friendships
  // Create test messages
}
```

---

## Test Maintenance

### Best Practices

1. **DRY Principle**: Extract common test logic into helpers
2. **Isolation**: Each test should be independent
3. **Cleanup**: Always clean up test data
4. **Mocking**: Mock external APIs (UVA SIS, email)
5. **Fast Tests**: Keep unit tests < 100ms
6. **Clear Assertions**: Use descriptive test names

### Test Review Checklist

- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Coverage meets targets
- [ ] No flaky tests
- [ ] Test names are descriptive
- [ ] Proper setup/teardown

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Status**: Ready for Implementation
