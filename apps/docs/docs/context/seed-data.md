---
title: Seed Data
sidebar_position: 3
---

# Seed Data

Initial data state for development and testing.

## Default Users

The seed script creates the following test users:

| Email              | Password      | Has Filebase | Notes                       |
| ------------------ | ------------- | ------------ | --------------------------- |
| `alice@test.com`   | `password123` | Yes          | Owner with full filebase    |
| `bob@test.com`     | `password123` | Yes          | Owner with minimal filebase |
| `charlie@test.com` | `password123` | No           | Worker (no filebase)        |

## Sample Filebase Structure

Alice's filebase contains a sample folder structure:

```
alice-files/
├── Documents/
│   ├── report.pdf
│   └── notes.txt
├── Images/
│   ├── photo1.jpg
│   └── Screenshots/
│       └── screen1.png
└── README.txt
```

## Test Fixtures

### Creating Test Users

```typescript
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123',
};

const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testUser),
});
```

### Creating a Filebase

```typescript
const response = await fetch('/api/filebases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ name: 'My Files' }),
});
```

### Inviting Members

```typescript
const response = await fetch('/api/filebases/:id/members', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'collaborator@example.com',
    role: 'editor',
  }),
});
```

## Running Seeds

```bash
# Reset database and run seeds
pnpm --filter api db:seed

# Or manually via Drizzle
pnpm --filter api db:push
```

## Test Data Patterns

### Role Hierarchy

```
owner > admin > editor > viewer
```

- **owner**: Full control, can delete filebase
- **admin**: Manage members, manage access rules
- **editor**: Create/edit/delete files and folders
- **viewer**: Read-only access

### Access Rule Examples

```typescript
// Allow user to read a specific folder
{
  targetFolderId: 'folder-uuid',
  subjectUserId: 'user-uuid',
  permission: 'read',
  effect: 'allow',
  inherit: true,  // Applies to subfolders
}

// Deny group from deleting files
{
  targetFolderId: 'folder-uuid',
  subjectGroupId: 'group-uuid',
  permission: 'delete',
  effect: 'deny',
  inherit: true,
}
```
