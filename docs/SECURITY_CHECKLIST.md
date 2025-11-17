# Common Grounds - Security Checklist

## Authentication & Authorization

### Magic Link Security
- [x] Tokens are cryptographically random (crypto.randomBytes(32))
- [x] Tokens are hashed before storage (SHA-256)
- [x] Tokens have short expiration (15 minutes)
- [x] Tokens are single-use only
- [x] Rate limiting on magic link requests (3 per hour per email)
- [ ] Implement token rotation on verification
- [ ] Log all authentication attempts

### JWT Security
- [x] Strong secret key (256-bit minimum)
- [x] HS256 algorithm
- [x] Short expiration (7 days)
- [x] Include minimal payload (userId, email only)
- [ ] Implement token refresh mechanism
- [ ] Blacklist tokens on logout (Redis)
- [ ] Validate token signature on every request
- [ ] Check token expiration

### Email Verification
- [x] Only allow @virginia.edu emails
- [x] Regex validation: `/^[a-zA-Z0-9._%+-]+@virginia\.edu$/`
- [x] Normalize emails to lowercase
- [ ] Prevent typosquatting (virginiia.edu, virginia.ed, etc.)
- [ ] Check for disposable email services

### Password-less Best Practices
- [x] No passwords to leak/crack
- [x] Email-based verification
- [ ] Optional 2FA (SMS or TOTP) for sensitive operations

---

## Input Validation & Sanitization

### API Input Validation
- [x] Use Zod schemas for all request bodies
- [x] Validate email format
- [x] Validate phone number format (E.164)
- [x] Validate computing ID format (alphanumeric, 3-10 chars)
- [x] Validate UUIDs
- [x] Sanitize string inputs (trim, escape)

### XSS Prevention
- [x] Sanitize message content before storage
- [x] Use React's built-in XSS protection (JSX escaping)
- [x] Set Content-Security-Policy headers
- [ ] Use DOMPurify for rich text (if adding later)
- [ ] Escape HTML in message display

```typescript
// Example: Sanitize message content
import DOMPurify from 'isomorphic-dompurify';

function sanitizeMessage(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
}
```

### SQL Injection Prevention
- [x] Use Prisma ORM (parameterized queries)
- [x] Never concatenate user input into SQL
- [ ] Review all raw SQL queries
- [ ] Escape special characters in dynamic queries

---

## Data Privacy & Protection

### Sensitive Data Handling
- [x] Hash phone numbers before storage (bcrypt)
- [x] Never expose phone numbers in API responses
- [x] Store minimal user data
- [ ] Encrypt sensitive fields at rest (optional: pgcrypto)
- [ ] Use HTTPS for all communications (TLS 1.2+)

### Anonymous Messaging
- [x] Generate consistent anonymous IDs per user per class
- [x] hash(userId + classId + term) for anonymity
- [x] Store real userId for moderation (not exposed to users)
- [ ] Implement admin-only de-anonymization
- [ ] Rate limit message posting

### GDPR Compliance
- [ ] Provide user data export endpoint
- [x] Implement account deletion (cascade delete)
- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Cookie consent (if using analytics)
- [ ] Data retention policy (delete old data)

### Data Minimization
- [x] Only collect necessary data
- [x] Optional computing ID (not required)
- [ ] Auto-delete old messages (> 1 year)
- [ ] Auto-delete inactive accounts (> 2 years)

---

## Network Security

### HTTPS/TLS
- [ ] Enforce HTTPS in production
- [ ] Redirect HTTP → HTTPS
- [ ] Use TLS 1.2 or higher
- [ ] Valid SSL certificate
- [ ] HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### CORS Configuration
```typescript
// backend/src/app.ts
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Only allow frontend domain
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Security Headers (Helmet)
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

---

## Rate Limiting

### Rate Limit Configuration

```typescript
// backend/src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

export const magicLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many magic link requests. Please try again later.',
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 messages per hour per class
  keyGenerator: (req) => `${req.user.id}:${req.params.classId}`,
});
```

### DDoS Protection
- [ ] Use Cloudflare or similar CDN
- [ ] Implement IP-based rate limiting
- [ ] Monitor for unusual traffic patterns
- [ ] Set up alerts for traffic spikes

---

## WebSocket Security

### Socket.io Security
```typescript
// backend/src/socket/authMiddleware.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});
```

### Room-Based Authorization
```typescript
// Verify user is enrolled in class before joining room
socket.on('join-class', async ({ classId }) => {
  const isEnrolled = await checkUserEnrolledInClass(
    socket.data.userId,
    classId
  );

  if (!isEnrolled) {
    socket.emit('error', { message: 'Not enrolled in class' });
    return;
  }

  socket.join(classId);
});
```

---

## Database Security

### Connection Security
- [x] Use environment variables for database credentials
- [x] Never commit credentials to git
- [ ] Use SSL/TLS for database connections
- [ ] Use connection pooling (prevent exhaustion)
- [ ] Set up read-only user for analytics queries

### Query Security
- [x] Use Prisma ORM (prevents SQL injection)
- [x] Parameterized queries
- [ ] Limit query results (prevent data dumps)
- [ ] Use database roles and permissions

### Backup Security
- [ ] Encrypt backups at rest
- [ ] Encrypt backups in transit
- [ ] Store backups in separate location
- [ ] Test backup restoration regularly

---

## Secrets Management

### Environment Variables
```bash
# Never commit .env files to git
# Use different secrets for dev/staging/prod

# Generate strong secrets
openssl rand -base64 32  # For JWT_SECRET

# Rotate secrets periodically (every 90 days)
```

### Secret Storage
- [ ] Use Railway/Vercel environment variables (production)
- [ ] Use .env files (development only)
- [ ] Never log secrets
- [ ] Never expose secrets in error messages
- [ ] Use secret scanning tools (GitGuardian, TruffleHog)

---

## Error Handling

### Safe Error Messages
```typescript
// ❌ Bad: Exposes internal details
throw new Error('Database connection to postgres://user:pass@host failed');

// ✅ Good: Generic message
throw new Error('An error occurred. Please try again later.');

// Backend logs full error, frontend sees generic message
```

### Error Logging
```typescript
// backend/src/middleware/errorHandler.middleware.ts
export function errorHandler(err, req, res, next) {
  // Log full error server-side
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    userId: req.user?.id,
    url: req.url,
  });

  // Send generic error to client (production)
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  } else {
    // Development: send full error
    res.status(500).json({
      error: err.name,
      message: err.message,
      stack: err.stack,
    });
  }
}
```

---

## Dependency Security

### Automated Scanning
```bash
# Run on every commit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### GitHub Dependabot
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
```

### Trusted Dependencies
- [ ] Review all dependencies before installing
- [ ] Check package download stats (npm)
- [ ] Check for known vulnerabilities (Snyk)
- [ ] Pin dependency versions (no ^ or ~)
- [ ] Regular security audits

---

## Logging & Monitoring

### Security Logging
```typescript
// Log security events
logger.warn('Failed login attempt', {
  email: req.body.email,
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

logger.warn('Rate limit exceeded', {
  ip: req.ip,
  endpoint: req.path,
});

logger.info('User deleted account', {
  userId: req.user.id,
});
```

### Monitoring Alerts
- [ ] Set up alerts for failed login attempts
- [ ] Set up alerts for rate limit violations
- [ ] Set up alerts for unusual API usage
- [ ] Set up alerts for error spikes
- [ ] Set up alerts for slow database queries

---

## Incident Response

### Incident Response Plan

**1. Detection**
- Monitor logs for suspicious activity
- Monitor error rates
- Monitor traffic patterns

**2. Containment**
- Block malicious IPs
- Revoke compromised tokens
- Take affected systems offline if necessary

**3. Investigation**
- Review logs
- Identify attack vector
- Assess damage

**4. Remediation**
- Patch vulnerabilities
- Rotate secrets
- Notify affected users (if data breach)

**5. Post-Incident**
- Document incident
- Update security measures
- Conduct post-mortem

### Emergency Contacts
- [ ] Designate security team lead
- [ ] Document escalation process
- [ ] Maintain contact list

---

## Pre-Launch Security Checklist

### Code Review
- [ ] Review all authentication logic
- [ ] Review all authorization checks
- [ ] Review all input validation
- [ ] Review all database queries
- [ ] Review all error handling

### Penetration Testing
- [ ] Test for XSS vulnerabilities
- [ ] Test for SQL injection
- [ ] Test for CSRF
- [ ] Test for broken authentication
- [ ] Test for broken access control
- [ ] Test for security misconfiguration

### Configuration Review
- [ ] Verify HTTPS is enforced
- [ ] Verify security headers are set
- [ ] Verify CORS is configured correctly
- [ ] Verify rate limiting is active
- [ ] Verify secrets are not exposed

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified
- [ ] Data retention policy defined
- [ ] User consent mechanisms in place

---

## Security Maintenance

### Regular Tasks

**Weekly**
- [ ] Review security logs
- [ ] Check for dependency updates
- [ ] Monitor error rates

**Monthly**
- [ ] Run security audit
- [ ] Review access logs
- [ ] Update dependencies

**Quarterly**
- [ ] Rotate secrets
- [ ] Penetration testing
- [ ] Security training for team

**Annually**
- [ ] Security architecture review
- [ ] Compliance audit
- [ ] Disaster recovery drill

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Status**: Critical - Review Before Launch
