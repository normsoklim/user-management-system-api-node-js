# Database Schema Design

## Overview
This document outlines the MongoDB schema design for the user management system, including collections for users, roles, and audit logs.

## Collections

### 1. Users Collection

```javascript
// users
{
  _id: ObjectId,
  firstName: String,           // User's first name
  lastName: String,            // User's last name
  email: String,               // Unique email address
  password: String,            // Hashed password
  role: ObjectId,              // Reference to roles collection
  isActive: Boolean,           // Account status
  lastLogin: Date,             // Last login timestamp
  createdAt: Date,             // Account creation timestamp
  updatedAt: Date,             // Last update timestamp
  resetPasswordToken: String,  // Token for password reset
  resetPasswordExpires: Date,  // Expiration time for reset token
  avatar: String,              // Path to avatar image
  gender: String,              // Gender: 'male', 'female', 'other'
  phone: String,               // Phone number
  dateOfBirth: Date,           // Date of birth
  address:String ,
}
```

**Indexes:**
- `email` (unique)
- `role`
- `isActive`

### 2. Roles Collection

```javascript
// roles
{
  _id: ObjectId,
  name: String,                // Role name (e.g., "admin", "user", "moderator")
  permissions: [String],       // Array of permissions (e.g., ["user:create", "user:read"])
  description: String,         // Description of the role
  createdAt: Date,             // Role creation timestamp
  updatedAt: Date              // Last update timestamp
}
```

**Indexes:**
- `name` (unique)

### 3. Audit Logs Collection

```javascript
// auditLogs
{
  _id: ObjectId,
  userId: ObjectId,            // Reference to user who performed the action
  action: String,              // Action performed (e.g., "CREATE_USER", "UPDATE_ROLE")
  resource: String,            // Resource affected (e.g., "users", "roles")
  resourceId: ObjectId,        // ID of the affected resource
  before: Object,              // State before the change (for updates)
  after: Object,               // State after the change
  timestamp: Date,             // When the action occurred
  ipAddress: String,           // IP address of the request
  userAgent: String            // User agent of the request
}
```

**Indexes:**
- `userId`
- `action`
- `resource`
- `timestamp`

## Relationships

1. **Users and Roles**: Many-to-One
   - Each user has one role
   - Each role can be assigned to many users

2. **Users and Audit Logs**: One-to-Many
   - Each user can have many audit log entries
   - Each audit log entry belongs to one user

3. **Roles and Audit Logs**: One-to-Many
   - Each role can have many audit log entries (when role is modified)
   - Each audit log entry for a role belongs to one role

## Sample Documents

### User Document
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  password: "$2b$10$examplehashedpassword",
  role: ObjectId("507f191e810c19729de860ea"),
  isActive: true,
  lastLogin: ISODate("2023-05-15T14:30:00Z"),
  createdAt: ISODate("2023-05-01T10:00:00Z"),
  updatedAt: ISODate("2023-05-15T14:30:00Z"),
  avatar: "/uploads/avatar.jpg",
  gender: "male",
  phone: "+1234567890",
  dateOfBirth: ISODate("1990-01-01T00:00:00Z"),
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA"
  }
}
```

### Role Document
```javascript
{
  _id: ObjectId("507f191e810c19729de860ea"),
  name: "admin",
  permissions: ["user:*", "role:*", "audit:*"],
  description: "Administrator with full access",
  createdAt: ISODate("2023-05-01T09:00:00Z"),
  updatedAt: ISODate("2023-05-01T09:00:00Z")
}
```

### Audit Log Document
```javascript
{
  _id: ObjectId("507f191e810c19729de860eb"),
  userId: ObjectId("507f1f77bcf86cd799439011"),
  action: "CREATE_USER",
  resource: "users",
  resourceId: ObjectId("507f1f77bcf86cd799439012"),
  before: null,
  after: {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    role: ObjectId("507f191e810c19729de860ec"),
    isActive: true
  },
  timestamp: ISODate("2023-05-15T15:00:00Z"),
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}