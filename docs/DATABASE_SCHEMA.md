# Common Grounds - Database Schema

## Overview

This document describes the complete database schema for Common Grounds, including table structures, relationships, indexes, and constraints. The schema is designed for PostgreSQL and uses Prisma as the ORM.

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    Users    │────────▶│ MagicLinks   │         │  Sessions   │
│             │         │              │         │             │
│  id (PK)    │         │  id (PK)     │         │  id (PK)    │
│  email      │         │  user_id (FK)│         │  user_id(FK)│
│  phone_hash │         │  token_hash  │         │  token_hash │
│  computing  │         │  expires_at  │         │  expires_at │
└──────┬──────┘         │  used        │         └─────────────┘
       │                └──────────────┘
       │
       │                ┌──────────────────────────────┐
       ├───────────────▶│      UserClasses             │
       │                │      (junction table)         │
       │                │  user_id (FK) + class_id(FK) │
       │                └────────────┬─────────────────┘
       │                             │
       │                ┌────────────▼──────┐
       │                │     Classes       │
       │                │                   │
       │                │  id (PK)          │
       │                │  subject          │
       │                │  catalog_number   │
       │                │  term             │
       │                │  title            │
       │                │  sis_class_number │
       │                └───────────────────┘
       │
       │                ┌──────────────────┐
       └───────────────▶│   Friendships    │
                        │                  │
                        │  id (PK)         │
                        │  user_id_1 (FK)  │
                        │  user_id_2 (FK)  │
                        │  status          │
                        └──────────────────┘

       ┌─────────────────────────────────────┐
       │        ClassMessages                 │
       │                                      │
       │  id (PK)                             │
       │  class_id (FK)                       │
       │  user_id (FK) [for moderation]       │
       │  anonymous_identifier                │
       │  content                             │
       │  created_at                          │
       └─────────────────────────────────────┘
```

## Prisma Schema

### Complete Prisma Schema File

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  phoneHash       String?  @unique @map("phone_hash") // bcrypt hash of phone number
  computingId     String?  @unique @map("computing_id") // Optional UVA computing ID
  emailVerified   Boolean  @default(false) @map("email_verified")
  phoneVerified   Boolean  @default(false) @map("phone_verified")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  magicLinks      MagicLink[]
  sessions        Session[]
  classes         UserClass[]

  // Friendships where this user is user_1
  friendshipsInitiated Friendship[] @relation("UserFriendshipsInitiated")
  // Friendships where this user is user_2
  friendshipsReceived  Friendship[] @relation("UserFriendshipsReceived")

  // Messages (for moderation purposes - anonymous to other users)
  messages        ClassMessage[]

  @@map("users")
}

model MagicLink {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  tokenHash   String   @unique @map("token_hash") // SHA-256 hash of token
  expiresAt   DateTime @map("expires_at")
  used        Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("magic_links")
}

model Session {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  tokenHash   String   @unique @map("token_hash") // SHA-256 hash of JWT
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")
  lastUsedAt  DateTime @default(now()) @map("last_used_at")

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

model Class {
  id              String   @id @default(uuid())
  subject         String   // e.g., "CS", "MATH"
  catalogNumber   String   @map("catalog_number") // e.g., "3120", "1110"
  term            String   // e.g., "1262" (Spring 2026)
  title           String?  // e.g., "Discrete Mathematics and Theory 1"
  description     String?  @db.Text
  sisClassNumber  String?  @map("sis_class_number") // From UVA SIS API
  instructor      String?
  component       String?  // e.g., "Lecture", "Lab"
  classSection    String?  @map("class_section") // e.g., "001"

  // Enrollment info (from SIS API)
  classCapacity   Int?     @map("class_capacity")
  enrollmentAvailable Int? @map("enrollment_available")

  // Time/location info
  days            String?  // e.g., "MoWeFr"
  startTime       String?  @map("start_time") // e.g., "1100"
  endTime         String?  @map("end_time") // e.g., "1150"
  location        String?

  // Metadata
  lastSyncedAt    DateTime? @map("last_synced_at") // Last sync from SIS API
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  users           UserClass[]
  messages        ClassMessage[]

  @@unique([subject, catalogNumber, term, sisClassNumber])
  @@index([subject, catalogNumber, term])
  @@index([term])
  @@map("classes")
}

model UserClass {
  userId      String   @map("user_id")
  classId     String   @map("class_id")
  enrolledAt  DateTime @default(now()) @map("enrolled_at")

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  class       Class    @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@id([userId, classId])
  @@index([userId])
  @@index([classId])
  @@map("user_classes")
}

// ============================================================================
// FRIEND SYSTEM
// ============================================================================

enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
  BLOCKED
}

model Friendship {
  id          String           @id @default(uuid())
  userId1     String           @map("user_id_1") // User who initiated
  userId2     String           @map("user_id_2") // User who received
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  // Relations
  user1       User             @relation("UserFriendshipsInitiated", fields: [userId1], references: [id], onDelete: Cascade)
  user2       User             @relation("UserFriendshipsReceived", fields: [userId2], references: [id], onDelete: Cascade)

  @@unique([userId1, userId2]) // Prevent duplicate friendships
  @@index([userId1])
  @@index([userId2])
  @@index([status])
  @@map("friendships")
}

// ============================================================================
// ANONYMOUS MESSAGING
// ============================================================================

model ClassMessage {
  id                    String   @id @default(uuid())
  classId               String   @map("class_id")
  userId                String   @map("user_id") // For moderation - not exposed to users
  anonymousIdentifier   String   @map("anonymous_identifier") // e.g., "Anon_a3f2e1"
  content               String   @db.Text
  parentMessageId       String?  @map("parent_message_id") // For threaded replies
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Moderation fields
  flaggedCount          Int      @default(0) @map("flagged_count")
  hidden                Boolean  @default(false)

  // Relations
  class                 Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentMessage         ClassMessage? @relation("MessageReplies", fields: [parentMessageId], references: [id], onDelete: Cascade)
  replies               ClassMessage[] @relation("MessageReplies")

  @@index([classId, createdAt(sort: Desc)])
  @@index([userId])
  @@index([parentMessageId])
  @@map("class_messages")
}

// ============================================================================
// CONTACT IMPORT (Optional - for future feature)
// ============================================================================

model ContactImport {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  phoneHashList   String[] @map("phone_hash_list") // Array of hashed phone numbers
  importedAt      DateTime @default(now()) @map("imported_at")

  @@index([userId])
  @@map("contact_imports")
}
```

## SQL Migration (PostgreSQL)

### Initial Migration SQL

```sql
-- ============================================================================
-- Common Grounds Database Schema - PostgreSQL
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_hash VARCHAR(255) UNIQUE,
    computing_id VARCHAR(50) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Email must be @virginia.edu
ALTER TABLE users
ADD CONSTRAINT email_domain_check
CHECK (email ~ '^[a-zA-Z0-9._%+-]+@virginia\.edu$');

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_computing_id ON users(computing_id);
CREATE INDEX idx_users_phone_hash ON users(phone_hash);

-- ============================================================================
-- MAGIC LINKS TABLE
-- ============================================================================

CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);
CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- ============================================================================
-- CLASSES TABLE
-- ============================================================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(10) NOT NULL,
    catalog_number VARCHAR(10) NOT NULL,
    term VARCHAR(4) NOT NULL,
    title TEXT,
    description TEXT,
    sis_class_number VARCHAR(20),
    instructor VARCHAR(255),
    component VARCHAR(50),
    class_section VARCHAR(10),
    class_capacity INTEGER,
    enrollment_available INTEGER,
    days VARCHAR(20),
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    location VARCHAR(255),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(subject, catalog_number, term, sis_class_number)
);

CREATE INDEX idx_classes_subject_catalog_term ON classes(subject, catalog_number, term);
CREATE INDEX idx_classes_term ON classes(term);
CREATE INDEX idx_classes_sis_class_number ON classes(sis_class_number);

-- ============================================================================
-- USER CLASSES TABLE (Junction)
-- ============================================================================

CREATE TABLE user_classes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, class_id)
);

CREATE INDEX idx_user_classes_user_id ON user_classes(user_id);
CREATE INDEX idx_user_classes_class_id ON user_classes(class_id);

-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================

CREATE TYPE friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friendship_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(user_id_1, user_id_2),
    CHECK(user_id_1 != user_id_2) -- Can't befriend yourself
);

CREATE INDEX idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX idx_friendships_user_id_2 ON friendships(user_id_2);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================================================
-- CLASS MESSAGES TABLE
-- ============================================================================

CREATE TABLE class_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anonymous_identifier VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    parent_message_id UUID REFERENCES class_messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    flagged_count INTEGER NOT NULL DEFAULT 0,
    hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_class_messages_class_id_created ON class_messages(class_id, created_at DESC);
CREATE INDEX idx_class_messages_user_id ON class_messages(user_id);
CREATE INDEX idx_class_messages_parent_id ON class_messages(parent_message_id);
CREATE INDEX idx_class_messages_anonymous_id ON class_messages(anonymous_identifier);

-- ============================================================================
-- CONTACT IMPORTS TABLE (Optional)
-- ============================================================================

CREATE TABLE contact_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_hash_list TEXT[] NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_imports_user_id ON contact_imports(user_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_messages_updated_at
    BEFORE UPDATE ON class_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Function to get common classes between two users
CREATE OR REPLACE FUNCTION get_common_classes(
    p_user_id_1 UUID,
    p_user_id_2 UUID
)
RETURNS TABLE (
    class_id UUID,
    subject VARCHAR,
    catalog_number VARCHAR,
    term VARCHAR,
    title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.subject,
        c.catalog_number,
        c.term,
        c.title
    FROM classes c
    INNER JOIN user_classes uc1 ON c.id = uc1.class_id AND uc1.user_id = p_user_id_1
    INNER JOIN user_classes uc2 ON c.id = uc2.class_id AND uc2.user_id = p_user_id_2;
END;
$$ LANGUAGE plpgsql;

-- Function to get all friends for a user (accepted friendships only)
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
    friend_id UUID,
    friend_email VARCHAR,
    friend_computing_id VARCHAR,
    friendship_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN f.user_id_1 = p_user_id THEN u.id
            ELSE u.id
        END as friend_id,
        u.email as friend_email,
        u.computing_id as friend_computing_id,
        f.created_at as friendship_created_at
    FROM friendships f
    INNER JOIN users u ON (
        (f.user_id_1 = p_user_id AND u.id = f.user_id_2) OR
        (f.user_id_2 = p_user_id AND u.id = f.user_id_1)
    )
    WHERE f.status = 'ACCEPTED';
END;
$$ LANGUAGE plpgsql;

-- Function to get friends in a specific class
CREATE OR REPLACE FUNCTION get_friends_in_class(
    p_user_id UUID,
    p_class_id UUID
)
RETURNS TABLE (
    friend_id UUID,
    friend_email VARCHAR,
    friend_computing_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.id as friend_id,
        u.email as friend_email,
        u.computing_id as friend_computing_id
    FROM users u
    INNER JOIN user_classes uc ON u.id = uc.user_id
    INNER JOIN friendships f ON (
        (f.user_id_1 = p_user_id AND f.user_id_2 = u.id) OR
        (f.user_id_2 = p_user_id AND f.user_id_1 = u.id)
    )
    WHERE uc.class_id = p_class_id
      AND f.status = 'ACCEPTED'
      AND u.id != p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate anonymous identifier for user in class
CREATE OR REPLACE FUNCTION generate_anonymous_id(
    p_user_id UUID,
    p_class_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
    hash_input TEXT;
    hash_result TEXT;
BEGIN
    hash_input := p_user_id::TEXT || p_class_id::TEXT;
    hash_result := encode(digest(hash_input, 'sha256'), 'hex');
    RETURN 'Anon_' || substring(hash_result, 1, 6);
END;
$$ LANGUAGE plpgsql;
```

## Key Design Decisions

### 1. UUID Primary Keys
**Rationale**: UUIDs prevent enumeration attacks and allow for distributed ID generation. No need for auto-incrementing integers.

### 2. Phone Number Hashing
**Rationale**: Store bcrypt hash of phone numbers instead of plaintext for privacy. Still allows matching for friend discovery.

### 3. Bidirectional Friendships
**Rationale**: Store friendships as directed edges (user_1 → user_2) with status. This allows for pending/accepted/rejected/blocked states.

### 4. Class Caching Strategy
**Rationale**: Store full class details from UVA SIS API to avoid repeated API calls. `last_synced_at` tracks freshness.

### 5. Anonymous Identifier Generation
**Rationale**: Hash of `userId + classId` creates consistent anonymous ID per user per class. Allows moderation while maintaining anonymity.

### 6. Soft Delete Alternative
**Decision**: Use CASCADE deletes for data privacy (GDPR right to be forgotten). Alternative: add `deleted_at` timestamp for soft deletes.

## Query Performance Considerations

### Most Common Queries

1. **Get User's Classes**
```sql
SELECT c.* FROM classes c
INNER JOIN user_classes uc ON c.id = uc.class_id
WHERE uc.user_id = $1;
```
*Index used*: `idx_user_classes_user_id`

2. **Find Common Classes Between Friends**
```sql
SELECT c.* FROM classes c
INNER JOIN user_classes uc1 ON c.id = uc1.class_id
INNER JOIN user_classes uc2 ON c.id = uc2.class_id
WHERE uc1.user_id = $1 AND uc2.user_id = $2;
```
*Indexes used*: `idx_user_classes_user_id`, `idx_user_classes_class_id`

3. **Get Class Messages**
```sql
SELECT * FROM class_messages
WHERE class_id = $1 AND hidden = false
ORDER BY created_at DESC
LIMIT 50;
```
*Index used*: `idx_class_messages_class_id_created`

4. **Search Classes**
```sql
SELECT * FROM classes
WHERE subject = $1 AND catalog_number = $2 AND term = $3;
```
*Index used*: `idx_classes_subject_catalog_term`

### Performance Tips

1. **Connection Pooling**: Use PgBouncer in production
2. **Query Optimization**: Use EXPLAIN ANALYZE to check query plans
3. **Pagination**: Always use LIMIT/OFFSET for large result sets
4. **Caching**: Cache common queries in Redis (user's classes, friend list)

## Data Retention & Cleanup

### Automated Cleanup Jobs

```sql
-- Delete expired magic links (run hourly)
DELETE FROM magic_links
WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '7 days');

-- Delete expired sessions (run daily)
DELETE FROM sessions
WHERE expires_at < NOW();

-- Archive old messages (run monthly - optional)
-- Move messages older than 1 year to archive table
```

## Backup Strategy

### Recommended Approach

1. **Automated Backups**: Daily full backups via Neon/Railway
2. **Point-in-Time Recovery**: Keep 7 days of WAL logs
3. **Export Critical Data**: Weekly export of user data to S3
4. **Test Restores**: Monthly restore test to verify backup integrity

## Sample Data for Testing

```sql
-- Insert test users
INSERT INTO users (email, email_verified) VALUES
('abc1de@virginia.edu', true),
('xyz2fg@virginia.edu', true),
('test3hi@virginia.edu', true);

-- Insert test classes
INSERT INTO classes (subject, catalog_number, term, title) VALUES
('CS', '3120', '1262', 'Discrete Mathematics and Theory 1'),
('CS', '2150', '1262', 'Program and Data Representation'),
('MATH', '3351', '1262', 'Elementary Linear Algebra');

-- Link users to classes
INSERT INTO user_classes (user_id, class_id)
SELECT
    u.id,
    c.id
FROM users u, classes c
WHERE u.email = 'abc1de@virginia.edu' AND c.subject = 'CS' AND c.catalog_number = '3120';

-- Create friendship
INSERT INTO friendships (user_id_1, user_id_2, status)
SELECT
    u1.id,
    u2.id,
    'ACCEPTED'
FROM users u1, users u2
WHERE u1.email = 'abc1de@virginia.edu' AND u2.email = 'xyz2fg@virginia.edu';
```

## Migration Strategy

### Development to Production

1. **Initial Setup**: Run full schema migration
2. **Schema Changes**: Use Prisma migrations or Flyway
3. **Data Migration**: Separate scripts for data transformations
4. **Rollback Plan**: Always test rollback scripts

### Prisma Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Security Considerations

1. **Row-Level Security**: Consider RLS for multi-tenant scenarios
2. **Encryption**: Use PostgreSQL pgcrypto for sensitive fields
3. **Audit Logs**: Add audit table for critical operations
4. **SQL Injection**: Prisma parameterized queries prevent SQLi
5. **Access Control**: Database user with minimal privileges for app

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude
**Status**: Ready for Implementation
