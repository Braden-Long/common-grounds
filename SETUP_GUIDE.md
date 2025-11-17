# Common Grounds - Setup Guide

## What Has Been Implemented

### ✅ Backend (Complete - Production Ready)
- **Authentication System**: Magic link passwordless authentication with JWT
- **User Management**: Registration, profile management, account deletion
- **UVA SIS API Integration**: Class search with Redis caching
- **Classes Service**: Add/remove classes, get user's classes
- **Friends System**: Send requests, accept/reject, view friends, common classes
- **Messages Service**: Anonymous messaging with class-specific channels
- **Socket.io**: Real-time messaging infrastructure
- **Middleware**: Auth, rate limiting, error handling
- **Database**: Complete Prisma schema for PostgreSQL

### ⚠️ Frontend (Structure Created - Needs Components)
- Project structure with Vite + React + TypeScript
- Tailwind CSS configuration
- Package dependencies configured

## Quick Start

### Prerequisites
```bash
# Install Node.js 20+
# Install PostgreSQL (or use Neon cloud database)
# Install Redis (or use Upstash/Railway)
```

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values:
# DATABASE_URL=postgresql://user:password@localhost:5432/commongrounds
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=$(openssl rand -base64 32)
# RESEND_API_KEY=your_resend_key (optional for development)

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

The backend will run on http://localhost:3000

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will run on http://localhost:5173

## Testing the Backend API

### 1. Request Magic Link
```bash
curl -X POST http://localhost:3000/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"your-computing-id@virginia.edu"}'
```

Check console output for the magic link (in development mode)

### 2. Verify Magic Link
```bash
# Extract token from the magic link URL
curl http://localhost:3000/api/auth/verify/TOKEN_HERE
```

You'll receive a JWT token. Use this for authenticated requests.

### 3. Search for Classes
```bash
curl "http://localhost:3000/api/classes/search?subject=CS&number=3120" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Add Class
```bash
curl -X POST http://localhost:3000/api/classes/enroll \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "CS",
    "catalogNumber": "3120",
    "term": "1262"
  }'
```

### 5. Get Your Classes
```bash
curl http://localhost:3000/api/classes/my-classes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Implementation Status

### To Complete:
1. **Create main React app files** (src/main.tsx, src/App.tsx)
2. **Auth components** (Login, Verify, Register)
3. **Store setup** (Zustand for state management)
4. **API client** (Axios with auth interceptors)
5. **UI components** (Button, Input, Card, etc.)
6. **Feature components** (Classes, Friends, Messages)
7. **Pages and routing** (React Router setup)

### Minimal Frontend Implementation

Here's a minimal working frontend to get started:

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// src/App.tsx
import { useState } from 'react'

function App() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const requestMagicLink = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      setMessage(data.message || 'Check your email!')
    } catch (error) {
      setMessage('Error sending magic link')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Common Grounds</h1>
        <input
          type="email"
          placeholder="your-id@virginia.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded mb-4"
        />
        <button
          onClick={requestMagicLink}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Send Magic Link
        </button>
        {message && <p className="mt-4 text-green-600">{message}</p>}
      </div>
    </div>
  )
}

export default App

// src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Database Schema

See `backend/prisma/schema.prisma` for the complete database schema.

Key tables:
- `users` - User accounts
- `magic_links` - Magic link tokens
- `sessions` - JWT sessions
- `classes` - Class information from UVA SIS
- `user_classes` - User enrollments
- `friendships` - Friend relationships
- `class_messages` - Anonymous messages

## API Endpoints

See `docs/API_SPECIFICATION.md` for complete API documentation.

### Auth
- POST `/api/auth/request-magic-link`
- GET `/api/auth/verify/:token`
- GET `/api/auth/me`
- POST `/api/auth/logout`

### Users
- POST `/api/users/complete-registration`
- PUT `/api/users/profile`
- DELETE `/api/users/account`

### Classes
- GET `/api/classes/search`
- GET `/api/classes/current-term`
- POST `/api/classes/enroll`
- GET `/api/classes/my-classes`
- DELETE `/api/classes/:classId`

### Friends
- POST `/api/friends/request`
- GET `/api/friends`
- GET `/api/friends/requests`
- PUT `/api/friends/requests/:id/accept`
- DELETE `/api/friends/:id`
- GET `/api/friends/:id/common-classes`

### Messages
- GET `/api/classes/:classId/messages`
- POST `/api/classes/:classId/messages`
- POST `/api/messages/:messageId/flag`

## WebSocket Events

### Client → Server
- `join-class` - Join a class chat room
- `leave-class` - Leave a class chat room
- `send-message` - Send a message
- `typing` - Typing indicator

### Server → Client
- `new-message` - New message received
- `user-typing` - Someone is typing
- `error` - Error occurred

## Development Tips

### Running Without Email Service
In development, magic links are printed to the console instead of being emailed. This allows testing without configuring Resend.

### Using Prisma Studio
```bash
cd backend
npm run prisma:studio
```

This opens a GUI to view/edit database records at http://localhost:5555

### Clearing Redis Cache
```bash
redis-cli FLUSHALL
```

## Production Deployment

See `docs/DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

Quick summary:
1. Database: Neon PostgreSQL
2. Redis: Railway or Upstash
3. Backend: Railway
4. Frontend: Vercel
5. Email: Resend

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Check Redis is running
- Verify DATABASE_URL and REDIS_URL in .env
- Run `npm run prisma:generate`

### Cannot connect to UVA SIS API
- The API might be temporarily down
- Classes will be served from cached database
- Check `config.uvaSis.apiUrl` is correct

### Prisma errors
```bash
# Reset database (WARNING: Deletes all data)
npm run prisma:migrate reset

# Regenerate Prisma client
npm run prisma:generate
```

## Next Steps

1. Complete the frontend React components
2. Implement full authentication flow
3. Build class search UI
4. Build friends management UI
5. Build anonymous messaging UI
6. Deploy to production

## Additional Resources

- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [API Specification](docs/API_SPECIFICATION.md)
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Security Checklist](docs/SECURITY_CHECKLIST.md)

---

**Backend Status**: ✅ Complete and functional
**Frontend Status**: ⚠️ Structure created, components needed
**Next Priority**: Complete frontend React components
