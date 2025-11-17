# Common Grounds

> Discover shared classes with UVA friends and communicate anonymously within class-specific channels.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Project Overview

Common Grounds is a full-stack web application designed specifically for University of Virginia students to:

- **Discover Class Commonalities**: Find out which classes you share with your friends
- **Connect with Classmates**: Build your network by finding friends through UVA Computing IDs or phone contacts
- **Anonymous Class Communication**: Participate in class-specific anonymous discussion channels
- **Secure Authentication**: Passwordless login using magic links sent to @virginia.edu emails

## ✨ Key Features

### 1. Magic Link Authentication
- Passwordless login via email
- UVA email (@virginia.edu) verification
- Secure JWT session management

### 2. UVA Class Integration
- Real-time class search powered by UVA SIS API
- Automatic class data caching for performance
- Support for all UVA departments and courses

### 3. Friend System
- Add friends by UVA Computing ID
- Import contacts to find registered friends (privacy-preserving)
- Friend request management (accept/reject)

### 4. Class Commonality Finder
- See which classes you share with each friend
- View all friends enrolled in a specific class
- Dashboard showing class overlap summary

### 5. Anonymous Messaging
- Class-specific anonymous chat channels
- Real-time messaging with Socket.io
- Consistent anonymous identities per class
- Message moderation and flagging system

## 🏗️ Technical Architecture

### Technology Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation
- Socket.io Client for real-time messaging
- Axios for API calls

**Backend**
- Node.js 20 + Express + TypeScript
- Prisma ORM with PostgreSQL
- Redis for caching
- Socket.io for WebSockets
- JWT for authentication
- Resend for email delivery

**Infrastructure**
- PostgreSQL (Neon) - Database
- Redis (Railway) - Caching
- Vercel - Frontend hosting
- Railway - Backend hosting

## 📂 Repository Structure

```
common-grounds/
├── frontend/              # React frontend application
├── backend/               # Node.js backend API
├── docs/                  # Comprehensive documentation
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── PROJECT_STRUCTURE.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── TESTING_STRATEGY.md
│   ├── SECURITY_CHECKLIST.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── code-templates/    # Implementation templates
│       ├── AUTH_IMPLEMENTATION.md
│       └── UVA_SIS_INTEGRATION.md
├── .github/               # GitHub Actions workflows
├── LICENSE
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL (local or cloud)
- Redis (local or cloud)
- Resend API key (for emails)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Braden-Long/common-grounds.git
   cd common-grounds
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env.development
   # Edit .env.development with your credentials
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.development
   # Edit .env.development with your API URL
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 📖 Documentation

### Planning & Architecture
- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - Complete system design and technology choices
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Detailed database structure with Prisma schema
- **[API Specification](docs/API_SPECIFICATION.md)** - Complete REST API reference
- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - File organization and configuration

### Implementation
- **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)** - 12-week development plan
- **[Code Templates](docs/code-templates/)** - Ready-to-use implementation examples
  - [Authentication Implementation](docs/code-templates/AUTH_IMPLEMENTATION.md)
  - [UVA SIS API Integration](docs/code-templates/UVA_SIS_INTEGRATION.md)

### Operations
- **[Testing Strategy](docs/TESTING_STRATEGY.md)** - Unit, integration, and E2E testing approach
- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** - Security best practices and audit checklist
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment to production

## 🔐 Security

This application implements multiple security best practices:

- **Authentication**: Magic link authentication with JWT sessions
- **Authorization**: Protected routes and API endpoints
- **Data Privacy**: Phone numbers hashed, anonymous messaging
- **Input Validation**: Zod schemas on all inputs
- **XSS Protection**: Content sanitization and CSP headers
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **HTTPS**: Enforced SSL/TLS in production

For full details, see [Security Checklist](docs/SECURITY_CHECKLIST.md).

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                    # Run unit tests
npm run test:integration    # Run integration tests
npm run test:coverage       # Generate coverage report

# Frontend tests
cd frontend
npm test                    # Run component tests
npm run test:e2e           # Run end-to-end tests
```

See [Testing Strategy](docs/TESTING_STRATEGY.md) for details.

## 🚢 Deployment

### Production Deployment

1. **Database**: Deploy PostgreSQL on Neon
2. **Redis**: Deploy Redis on Railway or Upstash
3. **Backend**: Deploy to Railway
4. **Frontend**: Deploy to Vercel
5. **Email**: Configure Resend with custom domain

For detailed instructions, see [Deployment Guide](docs/DEPLOYMENT_GUIDE.md).

### Environment Variables

**Backend (.env)**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_...
FRONTEND_URL=https://commongrounds.app
```

**Frontend (.env)**
```bash
VITE_API_URL=https://api.commongrounds.app
VITE_SOCKET_URL=https://api.commongrounds.app
```

## 📊 Development Roadmap

### Phase 1: POC (Weeks 1-6) ✅
- [x] Project setup and architecture
- [x] Documentation and planning
- [ ] Authentication system
- [ ] User registration
- [ ] UVA SIS API integration
- [ ] Friend system
- [ ] Class commonality finder

### Phase 2: MVP (Weeks 7-12)
- [ ] Anonymous messaging
- [ ] Real-time WebSocket integration
- [ ] UI/UX polish
- [ ] Comprehensive testing
- [ ] Production deployment

### Phase 3: Enhancements (Post-launch)
- [ ] Notifications system
- [ ] Advanced search filters
- [ ] Profile enhancements
- [ ] Mobile PWA
- [ ] Admin dashboard

See [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) for full timeline.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting PR

## 📝 API Documentation

### Core Endpoints

- `POST /api/auth/request-magic-link` - Request magic link
- `GET /api/auth/verify/:token` - Verify and login
- `GET /api/classes/search` - Search for classes
- `POST /api/users/classes` - Add class to schedule
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/:id/common-classes` - Get common classes
- `POST /api/classes/:id/messages` - Send anonymous message

For complete API documentation, see [API Specification](docs/API_SPECIFICATION.md).

## 🔗 Useful Links

- **UVA SIS API**: https://sisuva.admin.virginia.edu/
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/Braden-Long/common-grounds/issues)
- **Wiki**: [GitHub Wiki](https://github.com/Braden-Long/common-grounds/wiki)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- University of Virginia for providing the SIS API
- All contributors and testers
- Open source community for the amazing tools

## 📧 Contact

**Project Maintainer**: Braden Long
**Repository**: [github.com/Braden-Long/common-grounds](https://github.com/Braden-Long/common-grounds)

---

**Built with ❤️ for UVA students**

---

## 📈 Project Status

**Current Status**: Planning & Documentation Phase Complete
**Next Steps**: Begin Phase 1 implementation (Authentication System)
**Target Launch**: 12 weeks from start date

For detailed progress tracking, see [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md).
