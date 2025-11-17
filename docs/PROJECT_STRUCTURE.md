# Common Grounds - Project Structure

## Repository Organization

This is a monorepo containing both frontend and backend applications.

```
common-grounds/
├── frontend/                 # React frontend application
├── backend/                  # Node.js/Express backend API
├── docs/                     # Documentation
├── .github/                  # GitHub Actions workflows
├── README.md                 # Main project README
└── LICENSE                   # MIT License
```

---

## Frontend Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   └── index.html
│
├── src/
│   ├── features/             # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── MagicLinkVerify.tsx
│   │   │   │   └── CompleteRegistration.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useMagicLink.ts
│   │   │   ├── store/
│   │   │   │   └── authStore.ts  # Zustand store
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── classes/
│   │   │   ├── components/
│   │   │   │   ├── ClassSearch.tsx
│   │   │   │   ├── ClassCard.tsx
│   │   │   │   ├── ClassList.tsx
│   │   │   │   ├── AddClassModal.tsx
│   │   │   │   └── ClassDetails.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useClassSearch.ts
│   │   │   │   └── useUserClasses.ts
│   │   │   ├── store/
│   │   │   │   └── classesStore.ts
│   │   │   ├── api/
│   │   │   │   └── classesApi.ts
│   │   │   └── types/
│   │   │       └── classes.types.ts
│   │   │
│   │   ├── friends/
│   │   │   ├── components/
│   │   │   │   ├── FriendsList.tsx
│   │   │   │   ├── FriendCard.tsx
│   │   │   │   ├── FriendRequests.tsx
│   │   │   │   ├── AddFriendModal.tsx
│   │   │   │   ├── ContactImport.tsx
│   │   │   │   └── CommonClasses.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFriends.ts
│   │   │   │   ├── useFriendRequests.ts
│   │   │   │   └── useCommonClasses.ts
│   │   │   ├── store/
│   │   │   │   └── friendsStore.ts
│   │   │   ├── api/
│   │   │   │   └── friendsApi.ts
│   │   │   └── types/
│   │   │       └── friends.types.ts
│   │   │
│   │   ├── messaging/
│   │   │   ├── components/
│   │   │   │   ├── ClassChat.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageItem.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useClassMessages.ts
│   │   │   │   └── useSocket.ts
│   │   │   ├── store/
│   │   │   │   └── messagesStore.ts
│   │   │   ├── api/
│   │   │   │   ├── messagesApi.ts
│   │   │   │   └── socket.ts
│   │   │   └── types/
│   │   │       └── messages.types.ts
│   │   │
│   │   └── user/
│   │       ├── components/
│   │       │   ├── ProfileView.tsx
│   │       │   ├── ProfileEdit.tsx
│   │       │   └── AccountSettings.tsx
│   │       ├── hooks/
│   │       │   └── useProfile.ts
│   │       ├── api/
│   │       │   └── userApi.ts
│   │       └── types/
│   │           └── user.types.ts
│   │
│   ├── shared/              # Shared/common code
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Alert.tsx
│   │   │   │   └── Badge.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── PageLayout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── useIntersectionObserver.ts
│   │   │   └── useClickOutside.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── api.ts          # Axios instance
│   │   │   ├── validation.ts    # Zod schemas
│   │   │   ├── formatters.ts    # Date, time formatters
│   │   │   ├── classParser.ts   # Parse "CS 3120" input
│   │   │   └── constants.ts     # App constants
│   │   │
│   │   ├── types/
│   │   │   └── common.types.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css      # Tailwind base styles
│   │
│   ├── pages/                   # Page components (routes)
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── CompleteRegistration.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Classes.tsx
│   │   ├── ClassDetails.tsx
│   │   ├── Friends.tsx
│   │   ├── FriendProfile.tsx
│   │   ├── Messages.tsx
│   │   ├── Profile.tsx
│   │   └── NotFound.tsx
│   │
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── router.tsx               # React Router setup
│
├── .env.development             # Development environment variables
├── .env.production              # Production environment variables
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── vite.config.ts               # Vite configuration
├── package.json
└── README.md
```

### Key Frontend Files

#### `src/main.tsx` (Entry Point)
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './shared/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### `src/App.tsx` (Root Component)
```typescript
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

function App() {
  return <RouterProvider router={router} />
}

export default App
```

#### `src/router.tsx` (Routes)
```typescript
import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './shared/components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
// ... other imports

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  // ... other routes
])
```

---

## Backend Structure

```
backend/
├── src/
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── classes.controller.ts
│   │   ├── friends.controller.ts
│   │   └── messages.controller.ts
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   ├── users.service.ts
│   │   ├── classes.service.ts
│   │   ├── uvasis.service.ts   # UVA SIS API integration
│   │   ├── friends.service.ts
│   │   ├── messages.service.ts
│   │   └── cache.service.ts    # Redis caching
│   │
│   ├── repositories/           # Data access layer
│   │   ├── users.repository.ts
│   │   ├── classes.repository.ts
│   │   ├── friends.repository.ts
│   │   └── messages.repository.ts
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── validator.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   └── logger.middleware.ts
│   │
│   ├── routes/                 # Route definitions
│   │   ├── index.ts            # Main router
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── classes.routes.ts
│   │   ├── friends.routes.ts
│   │   └── messages.routes.ts
│   │
│   ├── socket/                 # Socket.io handlers
│   │   ├── index.ts
│   │   ├── messageHandlers.ts
│   │   └── authMiddleware.ts
│   │
│   ├── lib/                    # Shared libraries
│   │   ├── prisma.ts           # Prisma client
│   │   ├── redis.ts            # Redis client
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── crypto.ts           # Hashing utilities
│   │   └── logger.ts           # Winston logger
│   │
│   ├── validators/             # Zod validation schemas
│   │   ├── auth.validators.ts
│   │   ├── users.validators.ts
│   │   ├── classes.validators.ts
│   │   ├── friends.validators.ts
│   │   └── messages.validators.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── express.d.ts        # Extended Express types
│   │   ├── auth.types.ts
│   │   ├── api.types.ts
│   │   └── socket.types.ts
│   │
│   ├── jobs/                   # Background jobs
│   │   ├── index.ts
│   │   ├── syncClasses.job.ts
│   │   └── cleanupExpired.job.ts
│   │
│   ├── config/                 # Configuration
│   │   ├── index.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── email.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── classParser.ts
│   │   ├── termHelper.ts
│   │   └── anonymousId.ts
│   │
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point
│
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data
│
├── tests/                      # Test files
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── classes.test.ts
│   │   └── friends.test.ts
│   └── setup.ts
│
├── .env.development            # Development environment variables
├── .env.test                   # Test environment variables
├── .env.production             # Production environment variables
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
├── nodemon.json                # Nodemon configuration
├── package.json
└── README.md
```

### Key Backend Files

#### `src/server.ts` (Entry Point)
```typescript
import app from './app'
import { createServer } from 'http'
import { initializeSocket } from './socket'
import { logger } from './lib/logger'
import { initializeJobs } from './jobs'

const PORT = process.env.PORT || 3000
const httpServer = createServer(app)

// Initialize Socket.io
initializeSocket(httpServer)

// Initialize background jobs
initializeJobs()

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
```

#### `src/app.ts` (Express App)
```typescript
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler.middleware'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(morgan('combined'))

// Routes
app.use('/api', routes)

// Error handling
app.use(errorHandler)

export default app
```

---

## Environment Variables

### Frontend `.env.development`
```bash
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Frontend `.env.production`
```bash
VITE_API_URL=https://api.commongrounds.app
VITE_SOCKET_URL=https://api.commongrounds.app
```

### Backend `.env.development`
```bash
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/commongrounds

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=7d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@commongrounds.app

# UVA SIS API
UVA_SIS_API_URL=https://sisuva.admin.virginia.edu/psc/ihprd/UVSS/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch

# Optional: SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Backend `.env.production`
```bash
# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://commongrounds.app

# Database (from Neon/Railway)
DATABASE_URL=postgresql://...

# Redis (from Railway/Upstash)
REDIS_URL=redis://...

# JWT (generate strong secret)
JWT_SECRET=<generate-with-openssl-rand>
JWT_EXPIRATION=7d

# Email (Resend)
RESEND_API_KEY=<production-key>
FROM_EMAIL=noreply@commongrounds.app

# UVA SIS API
UVA_SIS_API_URL=https://sisuva.admin.virginia.edu/psc/ihprd/UVSS/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch
```

---

## Configuration Files

### Frontend `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Backend `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

---

## NPM Scripts

### Frontend `package.json` (partial)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### Backend `package.json` (partial)
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

---

## Git Structure

### `.gitignore`
```
# Dependencies
node_modules/

# Build outputs
dist/
build/
.vite/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Prisma
prisma/.env

# Testing
coverage/
.nyc_output/
```

---

## Documentation Structure

```
docs/
├── TECHNICAL_ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── API_SPECIFICATION.md
├── PROJECT_STRUCTURE.md        # This file
├── IMPLEMENTATION_ROADMAP.md
├── TESTING_STRATEGY.md
├── SECURITY_CHECKLIST.md
├── DEPLOYMENT_GUIDE.md
├── SETUP.md                    # Developer setup instructions
├── CONTRIBUTING.md             # Contribution guidelines
└── postman_collection.json     # Postman API collection
```

---

## Deployment Structure

### Frontend (Vercel)
```
vercel.json:
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Backend (Railway)
```
railway.json:
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude
**Status**: Ready for Implementation
