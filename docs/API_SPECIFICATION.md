# Common Grounds - API Specification

## API Overview

This document provides the complete REST API specification for Common Grounds, including all endpoints, request/response formats, authentication, and error handling.

**Base URL**: `https://api.commongrounds.app` (production)
**Base URL**: `http://localhost:3000` (development)

**API Version**: v1
**All endpoints**: `/api/*`

## Authentication

### Authentication Methods

1. **Magic Link Authentication**: Passwordless login via email
2. **JWT Bearer Token**: For authenticated requests

### JWT Token Format

```typescript
{
  "userId": "uuid",
  "email": "user@virginia.edu",
  "iat": 1234567890,  // Issued at (Unix timestamp)
  "exp": 1234567890   // Expires at (Unix timestamp - 7 days from iat)
}
```

### Including Auth Token

All authenticated endpoints require the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

## Rate Limiting

Rate limits are applied per user (authenticated) or per IP address (unauthenticated).

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Magic link requests | 3 requests | 1 hour |
| Authentication endpoints | 10 requests | 1 hour |
| Class search | 60 requests | 1 hour |
| Friend requests | 20 requests | 1 hour |
| Message posting | 30 per class | 1 hour |
| General API | 1000 requests | 1 hour |

**Rate Limit Headers**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

**429 Too Many Requests**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 minutes.",
  "retryAfter": 2700
}
```

## API Endpoints

---

## 🔐 Authentication Endpoints

### POST /api/auth/request-magic-link

Request a magic link to be sent via email.

**Request Body**
```json
{
  "email": "abc1de@virginia.edu"
}
```

**Validation**
- Email must be valid format
- Email must end with @virginia.edu
- Email is case-insensitive (normalized to lowercase)

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Magic link sent to abc1de@virginia.edu",
  "expiresIn": 900  // seconds (15 minutes)
}
```

**Error Responses**

400 Bad Request - Invalid email
```json
{
  "error": "Validation Error",
  "message": "Email must be a valid @virginia.edu address"
}
```

429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Magic link already sent. Please check your email or try again in 15 minutes."
}
```

---

### GET /api/auth/verify/:token

Verify a magic link token and create a session.

**URL Parameters**
- `token` (string): The magic link token from the email

**Success Response (200 OK)**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "abc1de@virginia.edu",
    "emailVerified": true,
    "phoneVerified": false,
    "computingId": null,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses**

400 Bad Request - Invalid/expired token
```json
{
  "error": "Invalid Token",
  "message": "Magic link is invalid or has expired"
}
```

---

### POST /api/auth/logout

Logout and invalidate the current session.

**Authentication**: Required

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Get the currently authenticated user's profile.

**Authentication**: Required

**Success Response (200 OK)**
```json
{
  "id": "uuid",
  "email": "abc1de@virginia.edu",
  "emailVerified": true,
  "phoneVerified": true,
  "computingId": "abc1de",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-16T14:20:00Z"
}
```

---

## 👤 User Management Endpoints

### POST /api/users/complete-registration

Complete user registration by providing phone number and optional computing ID.

**Authentication**: Required

**Request Body**
```json
{
  "phoneNumber": "+14341234567",
  "computingId": "abc1de"  // Optional
}
```

**Validation**
- Phone number must be valid format (E.164)
- Computing ID must be alphanumeric (3-10 characters)

**Success Response (200 OK)**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "abc1de@virginia.edu",
    "phoneVerified": false,  // Will be true after SMS verification
    "computingId": "abc1de",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Note**: In Phase 1, phone verification is optional. In future versions, an SMS verification code will be sent.

---

### PUT /api/users/profile

Update user profile.

**Authentication**: Required

**Request Body**
```json
{
  "computingId": "abc1de"  // Optional
}
```

**Success Response (200 OK)**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "abc1de@virginia.edu",
    "phoneVerified": true,
    "computingId": "abc1de",
    "updatedAt": "2025-01-16T14:20:00Z"
  }
}
```

---

### DELETE /api/users/account

Delete user account and all associated data (GDPR compliance).

**Authentication**: Required

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Note**: This is a hard delete that cascades to all related data (classes, friendships, messages).

---

## 📚 Class Management Endpoints

### GET /api/classes/search

Search for classes using UVA SIS API.

**Authentication**: Required

**Query Parameters**
- `subject` (string, required): Department code (e.g., "CS", "MATH")
- `number` (string, required): Catalog number (e.g., "3120")
- `term` (string, optional): Term code (e.g., "1262"). Defaults to current term.

**Example Request**
```
GET /api/classes/search?subject=CS&number=3120&term=1262
```

**Success Response (200 OK)**
```json
{
  "success": true,
  "classes": [
    {
      "id": "uuid",
      "subject": "CS",
      "catalogNumber": "3120",
      "term": "1262",
      "title": "Discrete Mathematics and Theory 1",
      "description": "Introduction to discrete mathematics...",
      "sisClassNumber": "16031",
      "instructor": "Professor Smith",
      "component": "Lecture",
      "classSection": "001",
      "classCapacity": 100,
      "enrollmentAvailable": 25,
      "days": "MoWeFr",
      "startTime": "1100",
      "endTime": "1150",
      "location": "Rice Hall 130"
    }
  ],
  "cached": true  // Indicates if data came from cache
}
```

**Error Responses**

400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Subject and number are required"
}
```

404 Not Found
```json
{
  "error": "Not Found",
  "message": "No classes found for CS 9999"
}
```

---

### GET /api/classes/subjects

Get all available department/subject codes.

**Authentication**: Required

**Query Parameters**
- `term` (string, optional): Term code. Defaults to current term.

**Success Response (200 OK)**
```json
{
  "success": true,
  "subjects": [
    { "code": "CS", "name": "Computer Science" },
    { "code": "MATH", "name": "Mathematics" },
    { "code": "APMA", "name": "Applied Mathematics" }
  ]
}
```

---

### POST /api/users/classes

Add a class to the current user's schedule.

**Authentication**: Required

**Request Body**
```json
{
  "subject": "CS",
  "catalogNumber": "3120",
  "term": "1262",
  "sisClassNumber": "16031"  // Optional - for specific section
}
```

**Success Response (201 Created)**
```json
{
  "success": true,
  "message": "Class added successfully",
  "class": {
    "id": "uuid",
    "subject": "CS",
    "catalogNumber": "3120",
    "term": "1262",
    "title": "Discrete Mathematics and Theory 1",
    "enrolledAt": "2025-01-16T14:30:00Z"
  }
}
```

**Error Responses**

400 Bad Request - Already enrolled
```json
{
  "error": "Already Enrolled",
  "message": "You are already enrolled in this class"
}
```

404 Not Found - Class doesn't exist
```json
{
  "error": "Not Found",
  "message": "Class not found in UVA SIS"
}
```

---

### GET /api/users/classes

Get current user's enrolled classes.

**Authentication**: Required

**Query Parameters**
- `term` (string, optional): Filter by term. Defaults to all terms.

**Success Response (200 OK)**
```json
{
  "success": true,
  "classes": [
    {
      "id": "uuid",
      "subject": "CS",
      "catalogNumber": "3120",
      "term": "1262",
      "title": "Discrete Mathematics and Theory 1",
      "instructor": "Professor Smith",
      "enrolledAt": "2025-01-10T12:00:00Z"
    },
    {
      "id": "uuid",
      "subject": "CS",
      "catalogNumber": "2150",
      "term": "1262",
      "title": "Program and Data Representation",
      "instructor": "Professor Jones",
      "enrolledAt": "2025-01-10T12:05:00Z"
    }
  ]
}
```

---

### DELETE /api/users/classes/:classId

Remove a class from the current user's schedule.

**Authentication**: Required

**URL Parameters**
- `classId` (uuid): The class ID to remove

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Class removed successfully"
}
```

---

## 👥 Friend Management Endpoints

### POST /api/friends/request

Send a friend request to another user.

**Authentication**: Required

**Request Body**

Option 1: By computing ID
```json
{
  "computingId": "xyz2fg"
}
```

Option 2: By user ID
```json
{
  "userId": "uuid"
}
```

**Success Response (201 Created)**
```json
{
  "success": true,
  "message": "Friend request sent",
  "friendship": {
    "id": "uuid",
    "status": "PENDING",
    "createdAt": "2025-01-16T15:00:00Z",
    "user": {
      "id": "uuid",
      "email": "xyz2fg@virginia.edu",
      "computingId": "xyz2fg"
    }
  }
}
```

**Error Responses**

400 Bad Request - Already friends
```json
{
  "error": "Already Friends",
  "message": "You are already friends with this user"
}
```

404 Not Found
```json
{
  "error": "Not Found",
  "message": "User with computing ID 'xyz2fg' not found"
}
```

---

### GET /api/friends

Get current user's friends list.

**Authentication**: Required

**Query Parameters**
- `status` (string, optional): Filter by status (PENDING, ACCEPTED, REJECTED, BLOCKED). Defaults to ACCEPTED.

**Success Response (200 OK)**
```json
{
  "success": true,
  "friends": [
    {
      "id": "uuid",
      "email": "xyz2fg@virginia.edu",
      "computingId": "xyz2fg",
      "friendshipId": "uuid",
      "friendshipCreatedAt": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### GET /api/friends/requests

Get pending friend requests (sent and received).

**Authentication**: Required

**Success Response (200 OK)**
```json
{
  "success": true,
  "received": [
    {
      "friendshipId": "uuid",
      "from": {
        "id": "uuid",
        "email": "test3hi@virginia.edu",
        "computingId": "test3hi"
      },
      "createdAt": "2025-01-16T14:00:00Z"
    }
  ],
  "sent": [
    {
      "friendshipId": "uuid",
      "to": {
        "id": "uuid",
        "email": "abc4jk@virginia.edu",
        "computingId": "abc4jk"
      },
      "createdAt": "2025-01-16T13:00:00Z"
    }
  ]
}
```

---

### PUT /api/friends/requests/:friendshipId/accept

Accept a friend request.

**Authentication**: Required

**URL Parameters**
- `friendshipId` (uuid): The friendship ID to accept

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Friend request accepted",
  "friendship": {
    "id": "uuid",
    "status": "ACCEPTED",
    "friend": {
      "id": "uuid",
      "email": "test3hi@virginia.edu",
      "computingId": "test3hi"
    }
  }
}
```

---

### PUT /api/friends/requests/:friendshipId/reject

Reject a friend request.

**Authentication**: Required

**URL Parameters**
- `friendshipId` (uuid): The friendship ID to reject

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Friend request rejected"
}
```

---

### DELETE /api/friends/:friendshipId

Remove a friend (unfriend).

**Authentication**: Required

**URL Parameters**
- `friendshipId` (uuid): The friendship ID to remove

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Friend removed successfully"
}
```

---

### POST /api/friends/find-by-contacts

Find friends by phone number contacts (privacy-preserving).

**Authentication**: Required

**Request Body**
```json
{
  "phoneNumbers": ["+14341234567", "+14349876543"]
}
```

**Process**:
1. Frontend hashes phone numbers with SHA-256
2. Backend compares hashes with stored phone hashes
3. Returns matched users without exposing phone numbers

**Success Response (200 OK)**
```json
{
  "success": true,
  "matches": [
    {
      "id": "uuid",
      "email": "xyz2fg@virginia.edu",
      "computingId": "xyz2fg",
      "alreadyFriends": false
    }
  ]
}
```

---

## 🤝 Class Commonality Endpoints

### GET /api/friends/:friendId/common-classes

Get classes shared with a specific friend.

**Authentication**: Required

**URL Parameters**
- `friendId` (uuid): The friend's user ID

**Query Parameters**
- `term` (string, optional): Filter by term. Defaults to current term.

**Success Response (200 OK)**
```json
{
  "success": true,
  "commonClasses": [
    {
      "id": "uuid",
      "subject": "CS",
      "catalogNumber": "3120",
      "term": "1262",
      "title": "Discrete Mathematics and Theory 1",
      "instructor": "Professor Smith"
    }
  ],
  "friend": {
    "id": "uuid",
    "email": "xyz2fg@virginia.edu",
    "computingId": "xyz2fg"
  }
}
```

---

### GET /api/classes/:classId/friends

Get friends enrolled in a specific class.

**Authentication**: Required

**URL Parameters**
- `classId` (uuid): The class ID

**Success Response (200 OK)**
```json
{
  "success": true,
  "class": {
    "id": "uuid",
    "subject": "CS",
    "catalogNumber": "3120",
    "term": "1262",
    "title": "Discrete Mathematics and Theory 1"
  },
  "friends": [
    {
      "id": "uuid",
      "email": "xyz2fg@virginia.edu",
      "computingId": "xyz2fg"
    },
    {
      "id": "uuid",
      "email": "test3hi@virginia.edu",
      "computingId": "test3hi"
    }
  ]
}
```

---

### GET /api/friends/class-overlap

Get class overlap summary for all friends.

**Authentication**: Required

**Success Response (200 OK)**
```json
{
  "success": true,
  "friendOverlaps": [
    {
      "friend": {
        "id": "uuid",
        "email": "xyz2fg@virginia.edu",
        "computingId": "xyz2fg"
      },
      "commonClassCount": 3,
      "commonClasses": [
        {
          "subject": "CS",
          "catalogNumber": "3120",
          "title": "Discrete Mathematics and Theory 1"
        }
      ]
    }
  ]
}
```

---

## 💬 Anonymous Messaging Endpoints

### GET /api/classes/:classId/messages

Get messages for a class (paginated).

**Authentication**: Required
**Authorization**: User must be enrolled in the class

**URL Parameters**
- `classId` (uuid): The class ID

**Query Parameters**
- `limit` (number, optional): Number of messages to return. Default: 50, Max: 100
- `offset` (number, optional): Offset for pagination. Default: 0
- `parentMessageId` (uuid, optional): Get replies to a specific message

**Success Response (200 OK)**
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "anonymousIdentifier": "Anon_a3f2e1",
      "content": "Does anyone have notes from last lecture?",
      "createdAt": "2025-01-16T14:30:00Z",
      "replyCount": 3,
      "isOwnMessage": false  // True if message was sent by current user
    }
  ],
  "pagination": {
    "total": 245,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### POST /api/classes/:classId/messages

Post an anonymous message to a class.

**Authentication**: Required
**Authorization**: User must be enrolled in the class

**URL Parameters**
- `classId` (uuid): The class ID

**Request Body**
```json
{
  "content": "Does anyone have notes from last lecture?",
  "parentMessageId": "uuid"  // Optional - for threaded replies
}
```

**Validation**
- Content: 1-1000 characters
- Content is sanitized (XSS prevention)

**Success Response (201 Created)**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "anonymousIdentifier": "Anon_a3f2e1",
    "content": "Does anyone have notes from last lecture?",
    "createdAt": "2025-01-16T14:35:00Z",
    "replyCount": 0
  }
}
```

**Error Responses**

403 Forbidden - Not enrolled
```json
{
  "error": "Forbidden",
  "message": "You must be enrolled in this class to post messages"
}
```

400 Bad Request - Invalid content
```json
{
  "error": "Validation Error",
  "message": "Message content must be between 1 and 1000 characters"
}
```

---

### POST /api/classes/:classId/messages/:messageId/flag

Flag a message for moderation.

**Authentication**: Required
**Authorization**: User must be enrolled in the class

**URL Parameters**
- `classId` (uuid): The class ID
- `messageId` (uuid): The message ID

**Request Body**
```json
{
  "reason": "spam"  // Options: "spam", "harassment", "inappropriate", "other"
}
```

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Message flagged for review"
}
```

**Note**: After 5 flags, message is automatically hidden pending moderator review.

---

## 🔍 Search Endpoints

### GET /api/search/users

Search for users by computing ID or email.

**Authentication**: Required

**Query Parameters**
- `q` (string, required): Search query (computing ID or email prefix)

**Example Request**
```
GET /api/search/users?q=abc
```

**Success Response (200 OK)**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "abc1de@virginia.edu",
      "computingId": "abc1de",
      "isFriend": true
    }
  ]
}
```

**Note**: Only returns users who have opted into search (privacy setting).

---

## WebSocket Events (Socket.io)

### Connection

**Connect to WebSocket**
```javascript
const socket = io('https://api.commongrounds.app', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client → Server

**join-class**
```javascript
socket.emit('join-class', {
  classId: 'uuid'
});
```

**leave-class**
```javascript
socket.emit('leave-class', {
  classId: 'uuid'
});
```

**send-message**
```javascript
socket.emit('send-message', {
  classId: 'uuid',
  content: 'Message content',
  parentMessageId: 'uuid'  // Optional
});
```

**typing**
```javascript
socket.emit('typing', {
  classId: 'uuid',
  isTyping: true
});
```

#### Server → Client

**new-message**
```javascript
socket.on('new-message', (data) => {
  console.log(data);
  // {
  //   classId: 'uuid',
  //   message: {
  //     id: 'uuid',
  //     anonymousIdentifier: 'Anon_a3f2e1',
  //     content: 'Message content',
  //     createdAt: '2025-01-16T14:35:00Z'
  //   }
  // }
});
```

**user-typing**
```javascript
socket.on('user-typing', (data) => {
  console.log(data);
  // {
  //   classId: 'uuid',
  //   anonymousIdentifier: 'Anon_xyz789',
  //   isTyping: true
  // }
});
```

**error**
```javascript
socket.on('error', (error) => {
  console.error(error);
  // {
  //   message: 'Not enrolled in class'
  // }
});
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {}  // Optional - additional error context
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Temporary server issue |

---

## Pagination

For endpoints that return lists, use limit/offset pagination:

**Query Parameters**
- `limit` (number): Items per page (default: 20, max: 100)
- `offset` (number): Number of items to skip (default: 0)

**Response Format**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 245,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## CORS Configuration

**Allowed Origins** (Production)
```
https://commongrounds.app
https://www.commongrounds.app
```

**Allowed Methods**
```
GET, POST, PUT, DELETE, OPTIONS
```

**Allowed Headers**
```
Content-Type, Authorization, X-Requested-With
```

**Credentials**: Allowed

---

## Versioning Strategy

**Current Version**: v1 (implicit in /api/ prefix)

**Future Versions**: Will use explicit versioning
- `/api/v2/...` for breaking changes
- v1 will be maintained for 6 months after v2 release

---

## Testing the API

### Using cURL

```bash
# Request magic link
curl -X POST https://api.commongrounds.app/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"abc1de@virginia.edu"}'

# Search classes
curl -X GET "https://api.commongrounds.app/api/classes/search?subject=CS&number=3120" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add class
curl -X POST https://api.commongrounds.app/api/users/classes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"CS","catalogNumber":"3120","term":"1262"}'
```

### Postman Collection

A Postman collection with all endpoints will be provided in `/docs/postman_collection.json`.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude
**Status**: Ready for Implementation
