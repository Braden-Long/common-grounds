# Common Grounds - Implementation Roadmap

## Overview

This roadmap outlines the phased implementation strategy for Common Grounds, from initial POC to full production launch. Each phase builds incrementally on the previous one.

---

## Phase 0: Project Setup (Week 1)

**Goal**: Set up development environment and project scaffolding

### Backend Setup
- [ ] Initialize Node.js + TypeScript project
- [ ] Install dependencies (Express, Prisma, etc.)
- [ ] Configure ESLint, Prettier
- [ ] Set up folder structure
- [ ] Configure Prisma with PostgreSQL
- [ ] Create initial Prisma schema
- [ ] Set up environment variables (.env.development)
- [ ] Configure nodemon for hot reload

### Frontend Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (React Router, Zustand, Axios, etc.)
- [ ] Configure Tailwind CSS
- [ ] Set up folder structure
- [ ] Configure ESLint, Prettier
- [ ] Create basic UI components (Button, Input, Card, etc.)
- [ ] Set up environment variables

### Infrastructure
- [ ] Set up local PostgreSQL database (Docker or local install)
- [ ] Set up local Redis (Docker or local install)
- [ ] Create Neon database account (for staging/production)
- [ ] Create Resend account for email
- [ ] Set up GitHub repository
- [ ] Configure GitHub Actions (basic CI)

### Documentation
- [ ] Create README.md with setup instructions
- [ ] Create CONTRIBUTING.md
- [ ] Create SETUP.md for developers

**Deliverable**: Fully scaffolded project with local development environment

---

## Phase 1: Authentication System (Week 2)

**Goal**: Implement magic link authentication with UVA email verification

### Backend Tasks

**Database**
- [ ] Run initial Prisma migration (users, magic_links, sessions tables)
- [ ] Test database connection

**Email Service**
- [ ] Set up Resend integration
- [ ] Create email templates (magic link)
- [ ] Test email sending locally

**Authentication Endpoints**
- [ ] POST `/api/auth/request-magic-link`
  - Validate @virginia.edu email
  - Generate magic link token
  - Store in database
  - Send email via Resend
- [ ] GET `/api/auth/verify/:token`
  - Validate token
  - Create JWT session
  - Return user data
- [ ] GET `/api/auth/me`
  - Get current user from JWT
- [ ] POST `/api/auth/logout`
  - Invalidate session

**Middleware**
- [ ] JWT authentication middleware
- [ ] Rate limiting middleware (magic link: 3/hour)
- [ ] Error handling middleware
- [ ] Request logging middleware

**Utilities**
- [ ] JWT helper functions (sign, verify)
- [ ] Crypto helper functions (hash, compare)
- [ ] Email validation utilities

### Frontend Tasks

**Auth Store (Zustand)**
- [ ] Create auth store
  - User state
  - Login/logout actions
  - Token management

**Auth API Client**
- [ ] Configure Axios instance with interceptors
- [ ] Request magic link API call
- [ ] Verify magic link API call
- [ ] Get current user API call
- [ ] Auto token refresh logic

**Auth Components**
- [ ] LoginForm component
  - Email input
  - Submit button
  - Success/error messages
- [ ] MagicLinkVerify component
  - Extract token from URL
  - Call verify API
  - Redirect to dashboard
- [ ] ProtectedRoute component
  - Check auth state
  - Redirect to login if not authenticated

**Auth Pages**
- [ ] Login page
- [ ] Magic link verify page

**Hooks**
- [ ] useAuth hook (access auth store)
- [ ] useMagicLink hook (request/verify flow)

### Testing
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints
- [ ] E2E test for login flow

**Deliverable**: Working magic link authentication system

---

## Phase 2: User Registration & Profile (Week 3)

**Goal**: Complete user registration with phone number and computing ID

### Backend Tasks

**Database**
- [ ] Add phone number hashing logic

**User Endpoints**
- [ ] POST `/api/users/complete-registration`
  - Validate phone number format
  - Hash and store phone number
  - Store computing ID
- [ ] GET `/api/users/profile`
  - Get user profile
- [ ] PUT `/api/users/profile`
  - Update computing ID
- [ ] DELETE `/api/users/account`
  - Cascade delete all user data

**Validation**
- [ ] Zod schemas for user input
- [ ] Phone number validation (E.164 format)
- [ ] Computing ID validation (alphanumeric, 3-10 chars)

### Frontend Tasks

**User Components**
- [ ] CompleteRegistration component
  - Phone number input
  - Computing ID input
  - Submit button
- [ ] ProfileView component
  - Display user info
  - Edit button
- [ ] ProfileEdit component
  - Update form
- [ ] AccountSettings component
  - Delete account button with confirmation

**User Pages**
- [ ] Complete registration page
- [ ] Profile page

**Hooks**
- [ ] useProfile hook

### Testing
- [ ] Unit tests for user service
- [ ] Integration tests for user endpoints

**Deliverable**: Complete user profile management

---

## Phase 3: UVA SIS API Integration (Week 4)

**Goal**: Integrate with UVA SIS API to search and retrieve class data

### Backend Tasks

**UVA SIS Service**
- [ ] Create UVA SIS API client
  - Search classes by subject + catalog number
  - Parse API response
  - Transform to internal format
  - Handle pagination
  - Error handling
- [ ] Get all subjects/departments
- [ ] Get current term (calculate from date)
- [ ] Parse class input ("CS 3120" → {subject: "CS", number: "3120"})

**Caching Layer**
- [ ] Redis integration
  - Cache class search results (24h TTL)
  - Cache subjects list (7d TTL)
  - Cache key strategy: `class:{subject}:{number}:{term}`

**Database**
- [ ] Run migration for classes table
- [ ] Create/update classes from API responses
- [ ] Track last_synced_at timestamp

**Class Endpoints**
- [ ] GET `/api/classes/search?subject=CS&number=3120&term=1262`
  - Check cache first
  - Query UVA SIS API if not cached
  - Store in PostgreSQL
  - Cache in Redis
  - Return to client
- [ ] GET `/api/classes/subjects?term=1262`
  - Get all department codes
  - Cache results

**Background Jobs**
- [ ] Set up node-cron
- [ ] Create sync job for popular classes (nightly)
- [ ] Create cleanup job for expired cache entries

### Frontend Tasks

**Class Store**
- [ ] Create classes store
  - Search results state
  - User's classes state
  - Actions (search, add, remove)

**Class Components**
- [ ] ClassSearch component
  - Search input with autocomplete
  - Parse "CS 3120" format
  - Debounce input (500ms)
  - Display search results
- [ ] ClassCard component
  - Display class info
  - Add/remove button
- [ ] ClassList component
  - Display user's classes
  - Filter by term
- [ ] ClassDetails component
  - Full class information
  - Enrollment stats
  - Time/location

**Class Pages**
- [ ] Classes page (search + user's classes)
- [ ] Class details page

**Hooks**
- [ ] useClassSearch hook
- [ ] useUserClasses hook

**Utilities**
- [ ] Class parser ("CS 3120" → {subject, number})
- [ ] Term calculator (current term)
- [ ] Class formatter (display format)

### Testing
- [ ] Unit tests for UVA SIS service
- [ ] Integration tests for class endpoints
- [ ] Mock UVA SIS API responses

**Deliverable**: Working class search and enrollment system

---

## Phase 4: Friend System (Week 5-6)

**Goal**: Implement friend requests and friend management

### Backend Tasks

**Database**
- [ ] Run migration for friendships table
- [ ] Test bidirectional queries

**Friend Endpoints**
- [ ] POST `/api/friends/request`
  - Validate user exists
  - Check not already friends
  - Create pending friendship
- [ ] GET `/api/friends`
  - Get accepted friendships
  - Return friend details
- [ ] GET `/api/friends/requests`
  - Get pending requests (sent + received)
- [ ] PUT `/api/friends/requests/:id/accept`
  - Update status to ACCEPTED
- [ ] PUT `/api/friends/requests/:id/reject`
  - Update status to REJECTED
- [ ] DELETE `/api/friends/:id`
  - Remove friendship
- [ ] POST `/api/friends/find-by-contacts`
  - Hash phone numbers
  - Find matches
  - Return without exposing phone numbers

**Search Endpoint**
- [ ] GET `/api/search/users?q=abc`
  - Search by computing ID or email prefix
  - Limit results to 20

**Friend Service**
- [ ] Get user friends (accepted only)
- [ ] Get pending requests
- [ ] Send friend request
- [ ] Accept/reject request
- [ ] Remove friend
- [ ] Find by contacts (phone matching)

### Frontend Tasks

**Friends Store**
- [ ] Create friends store
  - Friends list state
  - Requests state
  - Actions

**Friends Components**
- [ ] FriendsList component
  - Display all friends
  - Search/filter
- [ ] FriendCard component
  - Friend info
  - Remove button
  - View common classes button
- [ ] FriendRequests component
  - Tabs: received / sent
  - Accept/reject buttons
- [ ] AddFriendModal component
  - Search by computing ID
  - Send request button
- [ ] ContactImport component
  - Upload contacts (future feature)
  - Hash phone numbers client-side
  - Send to API
  - Display matches

**Friends Pages**
- [ ] Friends page (list + requests)
- [ ] Friend profile page (common classes)

**Hooks**
- [ ] useFriends hook
- [ ] useFriendRequests hook
- [ ] useUserSearch hook

### Testing
- [ ] Unit tests for friend service
- [ ] Integration tests for friend endpoints
- [ ] Test bidirectional friendship logic

**Deliverable**: Complete friend management system

---

## Phase 5: Class Commonality Finder (Week 6)

**Goal**: Show common classes between friends

### Backend Tasks

**Commonality Endpoints**
- [ ] GET `/api/friends/:friendId/common-classes`
  - Query user_classes for both users
  - Find intersection
  - Return common classes
- [ ] GET `/api/classes/:classId/friends`
  - Get all friends in a specific class
- [ ] GET `/api/friends/class-overlap`
  - Summary of class overlaps for all friends

**Database Functions**
- [ ] SQL function: `get_common_classes(userId1, userId2)`
- [ ] SQL function: `get_friends_in_class(userId, classId)`

**Caching**
- [ ] Cache common classes (invalidate on class add/remove)
- [ ] Cache friends in class

**Optimizations**
- [ ] Database indexes for common queries
- [ ] Batch queries where possible

### Frontend Tasks

**Components**
- [ ] CommonClasses component
  - Display shared classes with friend
  - Visual indicators (badges, colors)
- [ ] FriendOverlapCard component
  - Friend name
  - Number of common classes
  - Quick view of shared classes
- [ ] ClassFriendsList component
  - Friends enrolled in specific class

**Dashboard Page**
- [ ] Create dashboard showing:
  - User's classes
  - Friends with most overlap
  - Recent activity

**Hooks**
- [ ] useCommonClasses hook
- [ ] useClassFriends hook

**Visualizations**
- [ ] Class overlap chart (optional)
- [ ] Friend connection graph (optional)

### Testing
- [ ] Unit tests for commonality queries
- [ ] Integration tests for commonality endpoints

**Deliverable**: Working class commonality finder

---

## Phase 6: Anonymous Messaging (Week 7-8)

**Goal**: Implement anonymous class-based chat with Socket.io

### Backend Tasks

**Database**
- [ ] Run migration for class_messages table
- [ ] Test message queries with pagination

**Socket.io Setup**
- [ ] Initialize Socket.io server
- [ ] Socket authentication middleware (JWT)
- [ ] Create message handlers
  - join-class
  - leave-class
  - send-message
  - typing indicators

**Message Endpoints (REST)**
- [ ] GET `/api/classes/:classId/messages`
  - Paginated message history
  - Filter hidden messages
  - Include reply count
- [ ] POST `/api/classes/:classId/messages`
  - Create message (also via WebSocket)
  - Validate user is enrolled
  - Generate anonymous identifier
  - Sanitize content (XSS prevention)
- [ ] POST `/api/classes/:classId/messages/:messageId/flag`
  - Flag message for moderation
  - Auto-hide after 5 flags

**Anonymous ID Generation**
- [ ] Create function: `generateAnonymousId(userId, classId, term)`
  - SHA-256 hash
  - Consistent per user per class per term
  - Format: "Anon_a3f2e1"

**Moderation**
- [ ] Message flagging system
- [ ] Auto-hide after threshold
- [ ] Admin endpoints (Phase 2)

### Frontend Tasks

**Socket.io Client**
- [ ] Initialize Socket.io client
- [ ] Connection management
- [ ] Event listeners
  - new-message
  - user-typing
  - error

**Messages Store**
- [ ] Create messages store
  - Messages by class
  - Socket connection state
  - Typing users
  - Actions

**Messaging Components**
- [ ] ClassChat component
  - Full chat interface
  - Header with class info
- [ ] MessageList component
  - Scrollable message list
  - Infinite scroll (load more)
  - Auto-scroll to bottom
- [ ] MessageItem component
  - Anonymous user badge
  - Message content
  - Timestamp
  - Reply button
  - Flag button
- [ ] MessageInput component
  - Text input
  - Send button
  - Character count
  - Typing indicator
- [ ] TypingIndicator component
  - Show "Anon_xyz is typing..."

**Messaging Pages**
- [ ] Class chat page

**Hooks**
- [ ] useClassMessages hook (REST API)
- [ ] useSocket hook (WebSocket events)

**Real-time Features**
- [ ] New message notifications
- [ ] Typing indicators
- [ ] Online user count (optional)

### Testing
- [ ] Unit tests for anonymous ID generation
- [ ] Integration tests for message endpoints
- [ ] Socket.io event tests
- [ ] E2E test for sending/receiving messages

**Deliverable**: Working anonymous messaging system

---

## Phase 7: Polish & UX Improvements (Week 9)

**Goal**: Improve user experience and fix edge cases

### Frontend Tasks

**UI/UX Improvements**
- [ ] Add loading states (skeletons, spinners)
- [ ] Add error states (error boundaries, fallbacks)
- [ ] Add empty states (no classes, no friends, no messages)
- [ ] Improve responsive design (mobile, tablet)
- [ ] Add animations and transitions
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Dark mode support (optional)

**Notifications**
- [ ] Toast notifications for success/error
- [ ] Browser notifications for new messages (with permission)
- [ ] Friend request notifications

**Performance**
- [ ] Code splitting (React.lazy)
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Lighthouse audit

**User Onboarding**
- [ ] Welcome tour for new users
- [ ] Tooltips for features
- [ ] Help documentation links

### Backend Tasks

**Error Handling**
- [ ] Comprehensive error messages
- [ ] Proper HTTP status codes
- [ ] Error logging (Winston)

**Performance**
- [ ] Query optimization
- [ ] Index analysis
- [ ] N+1 query elimination
- [ ] Connection pooling

**Security**
- [ ] Security audit
- [ ] Dependency vulnerability scan
- [ ] Rate limiting review
- [ ] Input validation review

### Testing
- [ ] Increase test coverage to 80%+
- [ ] E2E tests for critical flows
- [ ] Performance testing
- [ ] Load testing (Artillery or k6)

**Deliverable**: Polished, production-ready application

---

## Phase 8: Testing & QA (Week 10)

**Goal**: Comprehensive testing and bug fixes

### Testing Tasks

**Backend Testing**
- [ ] Unit test coverage: 80%+
  - Services
  - Utilities
  - Validators
- [ ] Integration test coverage: 70%+
  - All API endpoints
  - Authentication flows
  - Database operations
- [ ] Load testing
  - Concurrent users: 100
  - API endpoint performance
  - WebSocket connections

**Frontend Testing**
- [ ] Component tests (React Testing Library)
- [ ] Hook tests
- [ ] Store tests
- [ ] E2E tests (Playwright or Cypress)
  - Login flow
  - Add class flow
  - Send friend request flow
  - Send message flow

**Manual QA**
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on different devices (Desktop, tablet, mobile)
- [ ] Test edge cases
  - Empty states
  - Error states
  - Slow network
  - Offline mode
- [ ] Accessibility testing
  - Screen reader compatibility
  - Keyboard navigation
  - Color contrast

**Bug Fixes**
- [ ] Fix all critical bugs
- [ ] Fix all high-priority bugs
- [ ] Document known issues

### Security Testing
- [ ] OWASP Top 10 review
- [ ] Penetration testing (basic)
- [ ] XSS prevention verification
- [ ] SQL injection prevention verification
- [ ] CSRF protection verification

**Deliverable**: Well-tested, stable application

---

## Phase 9: Deployment (Week 11)

**Goal**: Deploy to production

### Infrastructure Setup

**Database (Neon)**
- [ ] Create production database
- [ ] Run migrations
- [ ] Set up automatic backups
- [ ] Configure connection pooling

**Redis (Upstash or Railway)**
- [ ] Create production Redis instance
- [ ] Configure connection

**Email (Resend)**
- [ ] Verify production domain
- [ ] Update DNS records (SPF, DKIM)
- [ ] Test email deliverability

### Backend Deployment (Railway)
- [ ] Create Railway project
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Deploy backend
- [ ] Set up custom domain (api.commongrounds.app)
- [ ] Configure SSL certificate
- [ ] Test all endpoints in production

### Frontend Deployment (Vercel)
- [ ] Create Vercel project
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Deploy frontend
- [ ] Set up custom domain (commongrounds.app)
- [ ] Configure SSL certificate
- [ ] Test application in production

### CI/CD
- [ ] Set up GitHub Actions
  - Run tests on PR
  - Build frontend
  - Build backend
  - Auto-deploy on merge to main

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up logging (Papertrail or similar)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Set up analytics (Plausible or Google Analytics)

**Deliverable**: Live production application

---

## Phase 10: Documentation & Launch Prep (Week 12)

**Goal**: Finalize documentation and prepare for launch

### Documentation

**User Documentation**
- [ ] Create landing page
- [ ] Write user guide
  - How to create account
  - How to add classes
  - How to add friends
  - How to use class chat
- [ ] Create FAQ
- [ ] Create privacy policy
- [ ] Create terms of service

**Developer Documentation**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] README.md (setup instructions)
- [ ] CONTRIBUTING.md
- [ ] Architecture diagrams
- [ ] Database schema documentation

**Maintenance Documentation**
- [ ] Runbook for common operations
- [ ] Incident response plan
- [ ] Backup/restore procedures
- [ ] Monitoring dashboard setup

### Launch Prep
- [ ] Soft launch to small group (beta testers)
- [ ] Gather feedback
- [ ] Fix critical issues
- [ ] Performance tuning
- [ ] Final security review

**Deliverable**: Fully documented, launch-ready application

---

## Post-Launch: Phase 11 (Ongoing)

**Goal**: Iterate based on user feedback

### Planned Features (Phase 2)

**Notifications System**
- [ ] Email notifications
  - Friend requests
  - New messages in class
- [ ] Push notifications (PWA)
- [ ] In-app notification center

**Enhanced Search**
- [ ] Advanced class search
  - Filter by time
  - Filter by professor
  - Filter by days
- [ ] Friend recommendations
  - Based on common classes
  - Based on mutual friends

**Profile Enhancements**
- [ ] Profile pictures
- [ ] Bio/description
- [ ] Privacy settings
  - Who can find you
  - Who can see your classes

**Class Features**
- [ ] Class ratings/reviews (anonymous)
- [ ] Study group formation
- [ ] Resource sharing (notes, links)

**Admin Features**
- [ ] Admin dashboard
- [ ] User management
- [ ] Message moderation
- [ ] Analytics

**Mobile App**
- [ ] Progressive Web App (PWA)
- [ ] Native mobile app (React Native)

---

## Success Metrics

### Launch Targets
- [ ] 100 registered users in first month
- [ ] 500 classes added
- [ ] 200 friendships created
- [ ] 1000 messages sent

### Performance Targets
- [ ] API response time < 200ms (p95)
- [ ] Page load time < 2s
- [ ] Uptime > 99.5%

### Quality Targets
- [ ] Test coverage > 80%
- [ ] Zero critical bugs
- [ ] Lighthouse score > 90

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| UVA SIS API downtime | Cache aggressively, implement fallback |
| Database performance | Optimize queries, add indexes, connection pooling |
| WebSocket scaling | Use Redis adapter for Socket.io |
| Email deliverability | Use Resend with verified domain |

### Product Risks
| Risk | Mitigation |
|------|------------|
| Low user adoption | Soft launch, gather feedback, iterate |
| Abuse of anonymous messaging | Flagging system, moderation tools |
| Privacy concerns | Clear privacy policy, minimal data collection |

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0: Setup | 1 week | Project scaffolding |
| 1: Auth | 1 week | Magic link login |
| 2: Profile | 1 week | User registration |
| 3: Classes | 1 week | Class search/enrollment |
| 4: Friends | 2 weeks | Friend management |
| 5: Commonality | 1 week | Class overlap finder |
| 6: Messaging | 2 weeks | Anonymous chat |
| 7: Polish | 1 week | UX improvements |
| 8: Testing | 1 week | QA and testing |
| 9: Deployment | 1 week | Production launch |
| 10: Docs | 1 week | Documentation |
| **Total** | **12 weeks** | **MVP Launch** |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude
**Status**: Ready to Execute
