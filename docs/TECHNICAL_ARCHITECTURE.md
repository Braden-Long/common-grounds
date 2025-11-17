# Common Grounds - Technical Architecture

## Executive Summary

Common Grounds is a full-stack web application designed to help UVA students discover shared classes with friends and communicate anonymously within class-specific channels. This document outlines the complete technical architecture, technology stack, and design decisions.

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (React SPA with TypeScript, Tailwind CSS, React Router)    │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS/REST API
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                     API Gateway/Backend                      │
│         (Node.js + Express + TypeScript)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication  │  Class Search  │  Friends  │ Chat │  │
│  │   Middleware     │    Service     │ Service   │Service│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────┐
    │             │             │              │
┌───▼────┐  ┌────▼─────┐  ┌───▼────┐    ┌───▼─────┐
│PostGres│  │  Redis   │  │SendGrid│    │UVA SIS  │
│   DB   │  │  Cache   │  │Email   │    │  API    │
└────────┘  └──────────┘  └────────┘    └─────────┘
```

## Technology Stack

### Frontend

**Framework**: React 18+ with TypeScript
- **Rationale**: Industry standard, excellent TypeScript support, large ecosystem, great for SPAs
- **Type Safety**: Full TypeScript for compile-time error detection
- **Developer Experience**: Hot reload, excellent tooling, widespread community support

**Build Tool**: Vite
- **Rationale**: Faster than Create React App, modern ESM-based dev server, optimized production builds
- **Benefits**: Lightning-fast HMR, optimized bundling, better developer experience

**UI Framework**: Tailwind CSS
- **Rationale**: Utility-first approach, highly customizable, excellent for rapid prototyping
- **Components**: Headless UI for accessible components
- **Icons**: Heroicons for consistent iconography

**State Management**: Zustand
- **Rationale**: Simpler than Redux, less boilerplate, excellent TypeScript support
- **Use Cases**:
  - User authentication state
  - Current user's classes
  - Friends list
  - UI state (modals, notifications)

**Routing**: React Router v6
- **Rationale**: Standard routing solution, supports protected routes, excellent documentation
- **Features**: Nested routes, lazy loading, protected routes for authenticated pages

**Form Handling**: React Hook Form
- **Rationale**: Performant, minimal re-renders, excellent validation support
- **Validation**: Zod for schema validation

**API Client**: Axios
- **Rationale**: Better error handling than fetch, interceptors for auth tokens, request cancellation
- **Configuration**: Centralized instance with auth interceptors

**Real-time**: Socket.io Client
- **Rationale**: WebSocket support for real-time anonymous messaging
- **Fallback**: Long polling for environments where WebSockets aren't available

### Backend

**Runtime**: Node.js 20 LTS
- **Rationale**: JavaScript/TypeScript across entire stack, excellent async I/O, large ecosystem

**Framework**: Express.js with TypeScript
- **Rationale**: Mature, flexible, minimalist framework with extensive middleware ecosystem
- **Middleware Stack**:
  - `helmet` - Security headers
  - `cors` - Cross-origin resource sharing
  - `express-rate-limit` - Rate limiting
  - `morgan` - Request logging
  - `compression` - Response compression

**ORM**: Prisma
- **Rationale**:
  - Type-safe database client
  - Excellent TypeScript integration
  - Auto-generated types from schema
  - Built-in migrations
  - Great developer experience with Prisma Studio
- **Database**: PostgreSQL (via Prisma adapter)

**Authentication**:
- **JWT**: jsonwebtoken for token generation/validation
- **Magic Links**: Unique tokens stored in database with expiration
- **Session Management**: HTTP-only cookies for token storage

**Email Service**: Resend
- **Rationale**:
  - Modern API, simple integration
  - Better deliverability than SendGrid for transactional emails
  - Generous free tier (3,000 emails/month)
  - Great DX with TypeScript SDK

**SMS Service**: Twilio (optional for phone verification)
- **Rationale**: Industry standard, reliable, comprehensive API
- **Use Case**: Phone number verification during registration

**Real-time**: Socket.io
- **Rationale**: Bi-directional communication for anonymous chat
- **Features**: Room-based messaging (one room per class)

**Caching**: Redis
- **Rationale**:
  - Fast in-memory caching for class data from UVA SIS API
  - Session storage (alternative to JWT)
  - Rate limiting counters
- **Use Cases**:
  - Cache UVA SIS API responses (24-hour TTL)
  - Magic link tokens (15-minute TTL)
  - Rate limiting counters (rolling window)

**Background Jobs**: Node-cron
- **Rationale**: Simple scheduling for periodic tasks
- **Jobs**:
  - Sync popular classes from UVA SIS API (nightly)
  - Clean up expired magic links (hourly)
  - Clean up expired sessions (daily)

### Database

**Primary Database**: PostgreSQL 15+
- **Rationale**:
  - Robust relational database
  - ACID compliance
  - Excellent JSON support for flexible data
  - Full-text search capabilities
  - Strong data integrity with foreign keys
  - Mature ecosystem and tooling

**Hosting Options**:
1. **Neon** (Recommended for POC)
   - Serverless PostgreSQL
   - Generous free tier
   - Auto-scaling
   - Built-in connection pooling

2. **Supabase** (Alternative)
   - PostgreSQL + additional features
   - Real-time subscriptions
   - Built-in auth (though we're rolling our own)

3. **Railway** (Alternative)
   - Simple deployment
   - Good free tier
   - Integrated with app hosting

### External APIs

**UVA SIS API**
- **Base URL**: `https://sisuva.admin.virginia.edu/psc/ihprd/UVSS/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch`
- **Authentication**: None required (public API)
- **Rate Limiting**: Unknown - implement conservative caching strategy
- **Caching Strategy**: 24-hour cache for class data, nightly sync for popular courses

## Architecture Patterns

### Backend Architecture: Layered Architecture

```
Controllers (HTTP handlers)
     ↓
Services (Business logic)
     ↓
Repositories (Data access)
     ↓
Database
```

**Benefits**:
- Clear separation of concerns
- Easy to test (mock at each layer)
- Maintainable and scalable
- Standard pattern familiar to most developers

### Frontend Architecture: Feature-Based Structure

```
src/
  features/
    auth/
    classes/
    friends/
    messaging/
  shared/
    components/
    hooks/
    utils/
```

**Benefits**:
- Features are self-contained
- Easy to locate code
- Promotes reusability through shared folder
- Scales well as app grows

## Data Flow

### Authentication Flow

```
1. User enters email (@virginia.edu)
     ↓
2. Backend validates email domain
     ↓
3. Generate unique magic link token
     ↓
4. Store token in DB with 15-min expiration
     ↓
5. Send email via Resend with magic link
     ↓
6. User clicks link → frontend catches token
     ↓
7. Frontend sends token to backend
     ↓
8. Backend validates token (exists, not expired, not used)
     ↓
9. Mark token as used
     ↓
10. Generate JWT session token
     ↓
11. Return JWT to frontend
     ↓
12. Frontend stores JWT in localStorage
     ↓
13. All subsequent requests include JWT in Authorization header
```

### Class Search Flow

```
1. User types "CS 3120" in search box
     ↓
2. Frontend parses input → {subject: "CS", catalog_nbr: "3120"}
     ↓
3. Frontend debounces input (500ms)
     ↓
4. API call: GET /api/classes/search?subject=CS&number=3120&term=1262
     ↓
5. Backend checks Redis cache (key: "class:CS:3120:1262")
     ↓
6. If cached → return from Redis
     ↓
7. If not cached:
    - Query UVA SIS API
    - Parse response
    - Store in PostgreSQL classes table
    - Cache in Redis (24h TTL)
    - Return to frontend
     ↓
8. Frontend displays results
     ↓
9. User clicks "Add Class"
     ↓
10. POST /api/users/classes {classId: "..."}
     ↓
11. Create entry in user_classes junction table
     ↓
12. Trigger class commonality recalculation for user's friends
```

### Friend Discovery Flow (Contact Import)

```
1. User clicks "Import Contacts"
     ↓
2. Frontend requests phone number list (browser contacts API or manual entry)
     ↓
3. Frontend hashes phone numbers (SHA-256)
     ↓
4. POST /api/friends/find-by-contacts {hashedPhones: [...]}
     ↓
5. Backend:
    - Hashes stored phone numbers
    - Finds matches
    - Returns matched users (without exposing phone numbers)
     ↓
6. Frontend shows "Found 3 friends" with names
     ↓
7. User sends friend requests
     ↓
8. POST /api/friends/request {userId: "..."}
     ↓
9. Create entry in friendships table with status="pending"
     ↓
10. Target user receives notification
     ↓
11. Target user accepts/rejects request
     ↓
12. PUT /api/friends/requests/:id/accept
     ↓
13. Update friendship status to "accepted"
```

### Anonymous Messaging Flow

```
1. User navigates to class chat (e.g., CS 3120)
     ↓
2. Frontend establishes WebSocket connection
     ↓
3. Socket.io: socket.emit('join-class', {classId: "..."})
     ↓
4. Backend validates:
    - User is authenticated
    - User is enrolled in this class
     ↓
5. Backend joins socket to room (classId)
     ↓
6. Generate anonymous identifier for user in this class:
    - hash(userId + classId + term) → consistent per user per class
    - e.g., "Anon_a3f2e1"
     ↓
7. User types message and hits send
     ↓
8. Socket.io: socket.emit('send-message', {classId, content})
     ↓
9. Backend:
    - Validates user is in class
    - Sanitizes content (prevent XSS)
    - Stores in class_messages table
    - Broadcasts to room: io.to(classId).emit('new-message', {...})
     ↓
10. All clients in room receive message in real-time
     ↓
11. Messages persisted in DB for history
```

## Security Architecture

### Authentication Security

1. **Magic Link Tokens**
   - Cryptographically random (crypto.randomBytes)
   - One-time use (marked as used after validation)
   - Short expiration (15 minutes)
   - Stored hashed in database

2. **JWT Sessions**
   - Signed with HS256 algorithm
   - Contains minimal payload (userId, email)
   - 7-day expiration
   - Refresh token mechanism for long-lived sessions

3. **Email Domain Validation**
   - Strict regex: `/^[a-zA-Z0-9._%+-]+@virginia\.edu$/`
   - Prevents typosquatting (virginiia.edu, virginia.ed, etc.)

### API Security

1. **Rate Limiting**
   ```typescript
   // Magic link requests: 3 per hour per email
   // Class search: 60 per hour per user
   // Friend requests: 20 per hour per user
   // Message posting: 30 per hour per class per user
   ```

2. **Input Validation**
   - Zod schemas for all API inputs
   - SQL injection prevention (Prisma parameterized queries)
   - XSS prevention (sanitize user content)

3. **CORS Configuration**
   - Whitelist specific origins (frontend domain)
   - Credentials: true (for cookies)

4. **Helmet Middleware**
   - CSP headers
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff

### Data Privacy

1. **Phone Numbers**
   - Stored hashed (bcrypt with salt)
   - Used only for friend matching
   - Never exposed in API responses
   - Optional: allow users to delete after verification

2. **Anonymous Messaging**
   - Consistent anonymous ID per user per class
   - No way to reverse engineer user from anonymous ID
   - Moderation tools store mapping (for abuse prevention)

3. **GDPR Compliance**
   - User data export endpoint
   - Account deletion endpoint (cascade delete all user data)
   - Privacy policy clearly stating data usage

## Scalability Considerations

### Horizontal Scaling

**Frontend**
- Stateless React SPA → easily deployed to CDN
- Vite builds optimized chunks
- Route-based code splitting
- Image optimization and lazy loading

**Backend**
- Stateless API (JWT auth, no server-side sessions)
- Can run multiple instances behind load balancer
- Shared state in PostgreSQL and Redis
- Socket.io with Redis adapter for multi-instance support

### Database Optimization

**Indexing Strategy**
```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_computing_id ON users(computing_id);

-- Classes table
CREATE INDEX idx_classes_subject_number_term ON classes(subject, catalog_number, term);

-- User classes table
CREATE INDEX idx_user_classes_user_id ON user_classes(user_id);
CREATE INDEX idx_user_classes_class_id ON user_classes(class_id);

-- Friendships table
CREATE INDEX idx_friendships_user1 ON friendships(user_id_1);
CREATE INDEX idx_friendships_user2 ON friendships(user_id_2);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Messages table
CREATE INDEX idx_messages_class_id_created ON class_messages(class_id, created_at DESC);
```

**Connection Pooling**
- Prisma connection pool (default: 10 connections)
- PgBouncer for production (session pooling)

### Caching Strategy

**Redis Caching**
```typescript
// Class data: 24-hour cache
SET class:CS:3120:1262 {classData} EX 86400

// User's classes: invalidate on add/remove
SET user:classes:{userId} {classIds} EX 3600

// Friend list: invalidate on friendship change
SET user:friends:{userId} {friendIds} EX 3600

// Common classes: invalidate on class or friendship change
SET common:classes:{userId}:{friendId} {commonClassIds} EX 3600
```

**CDN Caching**
- Static assets (JS, CSS, images): 1 year cache
- index.html: no cache (always fresh)
- API responses: no cache (dynamic data)

## Monitoring & Observability

### Logging

**Backend Logging** (Winston)
```typescript
logger.info('User logged in', { userId, email });
logger.warn('Rate limit exceeded', { userId, endpoint });
logger.error('UVA SIS API error', { error, subject, catalogNumber });
```

**Log Levels**:
- ERROR: System errors, API failures
- WARN: Rate limits, validation failures
- INFO: User actions, successful operations
- DEBUG: Detailed debugging (development only)

### Metrics

**Application Metrics**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (5xx responses)
- Cache hit rate (Redis)

**Business Metrics**
- User registrations (daily, weekly)
- Class additions (daily, weekly)
- Friend requests sent/accepted
- Messages sent per class
- Active users (DAU, WAU, MAU)

### Error Tracking

**Sentry** (Recommended)
- Frontend and backend error tracking
- Source map support
- User context in errors
- Performance monitoring

## Deployment Architecture

### Development Environment

```
Frontend: http://localhost:5173 (Vite dev server)
Backend: http://localhost:3000 (Express server)
Database: PostgreSQL (local Docker or Neon)
Redis: Local Docker
```

### Production Environment (Recommended: Railway)

**Frontend**
- Deployed to Vercel or Netlify
- Automatic deployments from git
- Custom domain with SSL
- Environment variables for API URL

**Backend**
- Deployed to Railway
- Automatic deployments from git
- Environment variables for secrets
- Custom domain with SSL

**Database**
- Neon PostgreSQL (serverless)
- Automatic backups
- Connection pooling

**Redis**
- Railway Redis addon
- Or Upstash (serverless Redis)

**File Storage** (if needed for future features)
- AWS S3 or Cloudflare R2

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
on: [push]
jobs:
  test:
    - Run TypeScript compilation
    - Run tests
    - Run linters
  deploy:
    - Build frontend
    - Deploy frontend to Vercel
    - Deploy backend to Railway
```

## Technology Justification Summary

| Technology | Rationale | Alternatives Considered |
|------------|-----------|------------------------|
| React | Industry standard, excellent ecosystem | Vue (smaller community), Svelte (less mature) |
| TypeScript | Type safety, better DX | JavaScript (less safe) |
| Vite | Fast builds, modern tooling | CRA (slower), Next.js (overkill for SPA) |
| Tailwind | Rapid styling, utility-first | CSS Modules (more boilerplate), Styled Components (runtime cost) |
| Zustand | Simple, lightweight state | Redux (too complex), Context (performance issues) |
| Node.js + Express | JavaScript across stack, mature | Python/Flask (different language), Next.js API routes (couples frontend/backend) |
| Prisma | Type-safe ORM, great DX | TypeORM (less intuitive), Drizzle (newer, less proven) |
| PostgreSQL | Robust, relational data | MongoDB (data is relational), MySQL (PostgreSQL has better features) |
| Redis | Fast caching, pub/sub | Memcached (fewer features), in-memory (not persistent) |
| Socket.io | Bi-directional real-time | Server-sent events (one-way), WebSocket library (more low-level) |
| JWT | Stateless auth | Session cookies (requires server state), OAuth (overkill) |
| Resend | Modern email API | SendGrid (older API), AWS SES (more complex) |

## Next Steps

1. Review this architecture with stakeholders
2. Set up development environment (see SETUP.md)
3. Initialize frontend and backend projects
4. Implement database schema (see DATABASE_SCHEMA.md)
5. Build authentication system (see AUTH_IMPLEMENTATION.md)
6. Integrate UVA SIS API (see UVA_SIS_INTEGRATION.md)
7. Implement friend system
8. Build class commonality finder
9. Add anonymous messaging
10. Deploy POC version

## Questions & Decisions Log

**Q: Should computing ID be required during registration?**
A: Optional. Phone number + email is sufficient. Computing ID can be used for friend search but not required.

**Q: How to handle multiple sections of same class?**
A: Match at course level (CS 3120) not section level. Most students don't care about specific section for commonality.

**Q: Anonymous identity persistence?**
A: Per-class, per-term. hash(userId + classId + term) ensures consistency within a class/term but different across terms.

**Q: Direct messaging between friends?**
A: Phase 2 feature. Start with class-only anonymous messaging for POC.

**Q: Historical data support?**
A: Support current and future terms. Historical terms optional (Phase 2).

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude
**Status**: Draft for Review
