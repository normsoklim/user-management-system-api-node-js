# API Endpoints

## Overview
This document outlines all the API endpoints for the user management system, organized by module.

## Authentication Endpoints

### POST /api/auth/register
**Description**: Register a new user
**Request Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "roleId": "string" (optional)
}
```
**Responses**:
- 201: User created successfully
- 400: Validation error
- 409: Email already exists

### POST /api/auth/login
**Description**: Authenticate user and return JWT tokens
**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Responses**:
- 200: Login successful with access and refresh tokens
- 400: Validation error
- 401: Invalid credentials

### POST /api/auth/refresh
**Description**: Refresh access token using refresh token
**Request Body**:
```json
{
  "refreshToken": "string"
}
```
**Responses**:
- 200: New access token
- 401: Invalid refresh token

### POST /api/auth/logout
**Description**: Logout user and invalidate refresh token
**Request Body**:
```json
{
  "refreshToken": "string"
}
```
**Responses**:
- 200: Logout successful
- 400: Validation error

### POST /api/auth/forgot-password
**Description**: Send password reset email
**Request Body**:
```json
{
  "email": "string"
}
```
**Responses**:
- 200: Reset email sent
- 400: Validation error
- 404: User not found

### POST /api/auth/reset-password
**Description**: Reset user password
**Request Body**:
```json
{
  "token": "string",
  "newPassword": "string"
}
```
**Responses**:
- 200: Password reset successful
- 400: Validation error
- 401: Invalid or expired token

## User Management Endpoints

### GET /api/users
**Description**: Get all users (paginated)
**Query Parameters**:
- page: number (default: 1)
- limit: number (default: 10)
- search: string (optional)
- role: string (optional)
**Responses**:
- 200: List of users
- 401: Unauthorized
- 403: Forbidden

### GET /api/users/:id
**Description**: Get user by ID
**Responses**:
- 200: User details
- 401: Unauthorized
- 403: Forbidden
- 404: User not found

### POST /api/users
**Description**: Create a new user
**Request Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "roleId": "string",
  "isActive": "boolean",
  "gender": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```
**Responses**:
- 201: User created successfully
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 409: Email already exists

### PUT /api/users/:id
**Description**: Update user by ID
**Request Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "roleId": "string",
  "isActive": "boolean",
  "gender": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```
**Responses**:
- 200: User updated successfully
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: User not found
- 409: Email already exists

### DELETE /api/users/:id
**Description**: Delete user by ID
**Responses**:
- 200: User deleted successfully
- 401: Unauthorized
- 403: Forbidden
- 404: User not found

### GET /api/users/profile
**Description**: Get current user's profile
**Responses**:
- 200: User profile
- 401: Unauthorized

### PUT /api/users/profile
**Description**: Update current user's profile
**Request Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "gender": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```
**Responses**:
- 200: Profile updated successfully
- 400: Validation error
- 401: Unauthorized

### PUT /api/users/change-password
**Description**: Change current user's password
**Request Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Responses**:
- 200: Password changed successfully
- 400: Validation error
- 401: Unauthorized

## Role Management Endpoints

### GET /api/roles
**Description**: Get all roles
**Responses**:
- 200: List of roles
- 401: Unauthorized
- 403: Forbidden

### GET /api/roles/:id
**Description**: Get role by ID
**Responses**:
- 200: Role details
- 401: Unauthorized
- 403: Forbidden
- 404: Role not found

### POST /api/roles
**Description**: Create a new role
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "permissions": ["string"]
}
```
**Responses**:
- 201: Role created successfully
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 409: Role name already exists

### PUT /api/roles/:id
**Description**: Update role by ID
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "permissions": ["string"]
}
```
**Responses**:
- 200: Role updated successfully
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Role not found
- 409: Role name already exists

### DELETE /api/roles/:id
**Description**: Delete role by ID
**Responses**:
- 200: Role deleted successfully
- 401: Unauthorized
- 403: Forbidden
- 404: Role not found
- 409: Role is assigned to users

## Audit Log Endpoints

### GET /api/audit-logs
**Description**: Get audit logs (paginated)
**Query Parameters**:
- page: number (default: 1)
- limit: number (default: 10)
- userId: string (optional)
- action: string (optional)
- resource: string (optional)
- startDate: string (optional, ISO format)
- endDate: string (optional, ISO format)
**Responses**:
- 200: List of audit logs
- 401: Unauthorized
- 403: Forbidden

### GET /api/audit-logs/:id
**Description**: Get audit log by ID
**Responses**:
- 200: Audit log details
- 401: Unauthorized
- 403: Forbidden
- 404: Audit log not found

### GET /api/users/:id/audit-logs
**Description**: Get audit logs for a specific user
**Query Parameters**:
- page: number (default: 1)
- limit: number (default: 10)
**Responses**:
- 200: List of audit logs for user
- 401: Unauthorized
- 403: Forbidden
- 404: User not found

## Error Responses

All endpoints will return standardized error responses in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error