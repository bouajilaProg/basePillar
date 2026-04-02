---
title: Database Schema
sidebar_position: 2
---

# Database Schema

BasePillar uses PostgreSQL with Drizzle ORM. This document describes the current schema.

## Core Tables

### Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
```

## Filebase System

### Filebases

Each user can have at most one filebase (personal file storage space).

```sql
CREATE TABLE filebases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(owner_id)  -- One filebase per user
);
```

### Filebase Members

Users can be invited to other filebases with specific roles.

```sql
CREATE TABLE filebase_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- 'admin' | 'editor' | 'viewer'
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(filebase_id, user_id)
);
```

### Folders

Directory structure within a filebase.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
```

### Files

File metadata (actual content stored in S3).

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  s3_key VARCHAR(1024) NOT NULL,
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
```

### File Pointers

Shortcuts/links to files (supports cross-filebase shortcuts).

```sql
CREATE TABLE file_pointers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  target_file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);
```

## Access Control

### User Groups

Named groups of users for simplified permission management.

```sql
CREATE TABLE user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);
```

### User Group Members

```sql
CREATE TABLE user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);
```

### Access Rules

Fine-grained allow/deny rules for files and folders.

```sql
CREATE TABLE access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filebase_id UUID NOT NULL REFERENCES filebases(id) ON DELETE CASCADE,
  -- Target (one of these must be set)
  target_file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  target_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  -- Subject (one of these must be set)
  subject_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
  -- Rule configuration
  permission VARCHAR(20) NOT NULL,  -- 'read' | 'write' | 'delete' | 'share' | 'admin'
  effect VARCHAR(10) NOT NULL DEFAULT 'allow',  -- 'allow' | 'deny'
  inherit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);
```

## Entity Relationships

```
users
  └── filebases (1:1, owner)
        ├── filebase_members (1:N)
        ├── folders (1:N)
        │     └── folders (self-ref, parent)
        ├── files (1:N)
        ├── file_pointers (1:N)
        ├── user_groups (1:N)
        │     └── user_group_members (1:N)
        └── access_rules (1:N)
```
