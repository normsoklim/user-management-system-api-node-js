# User Management System API

A comprehensive user management system built with Node.js, Express, and MongoDB, featuring JWT authentication, role-based access control, and audit logging.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Complete CRUD operations for users
- **Role Management**: Flexible role-based access control (RBAC)
- **Audit Logging**: Comprehensive audit trail for all user actions
- **Security**: Password hashing, rate limiting, input validation
- **API Documentation**: RESTful API with comprehensive endpoints

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd user-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Copy the `.env` file and update the configuration:
   ```bash
   cp .env.example .env
   ```
   
   Update the following variables in `.env`:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/user-management

   # JWT Configuration
   JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Email Configuration (for password reset)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@yourdomain.com

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Security
   BCRYPT_ROUNDS=12
   ```

4. **Database Setup**
   
   Make sure MongoDB is running on your system, then seed the database:
   ```bash
   npm run seed
   ```
   
   This will create:
   - Default roles (super-admin, admin, moderator, user)
   - A super admin user with credentials:
     - Email: `admin@example.com`
     - Password: `Admin123`

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "Password123",
  "roleId": "role_id_here" // optional
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "Password123"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "NewPassword123"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer access_token_here
Content-Type: application/json

{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewPassword123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer access_token_here
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer access_token_here
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // response data here
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Error message for this field"
    }
  ]
}
```

## Default Roles and Permissions

### Super Admin
- Permissions: `*:*` (All permissions)
- Can manage all aspects of the system

### Admin
- Permissions: `user:*`, `role:*`, `audit:read`
- Can manage users and roles, view audit logs

### Moderator
- Permissions: `user:read`, `user:update`, `audit:read`
- Can view and update users, view audit logs

### User
- Permissions: `user:read:self`, `user:update:self`
- Can only manage their own profile

## Security Features

1. **Password Security**
   - Passwords are hashed using bcrypt
   - Minimum password requirements: 6 characters, at least one lowercase, one uppercase, and one number

2. **JWT Security**
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens are signed with secure secrets

3. **Rate Limiting**
   - Global rate limiting: 100 requests per 15 minutes per IP
   - Prevents brute force attacks

4. **Input Validation**
   - All inputs are validated using Joi schemas
   - Prevents injection attacks

5. **Security Headers**
   - Helmet middleware sets security headers
   - CORS configuration for cross-origin requests

## Audit Logging

All user actions are automatically logged with:
- User ID who performed the action
- Action type (CREATE_USER, UPDATE_USER, etc.)
- Resource affected
- Before/after state for updates
- Timestamp
- IP address and user agent

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
user-management/
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Custom middleware
│   ├── models/              # Database models
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   └── validators/          # Input validation
├── tests/                   # Test files
├── docs/                    # Documentation
├── logs/                    # Log files
├── .env                     # Environment variables
├── server.js                # Application entry point
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/user-management |
| JWT_ACCESS_SECRET | JWT access token secret | - |
| JWT_REFRESH_SECRET | JWT refresh token secret | - |
| JWT_ACCESS_EXPIRES_IN | Access token expiration | 15m |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiration | 7d |
| BCRYPT_ROUNDS | Password hashing rounds | 12 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository.# user-management-system-api-node-js
