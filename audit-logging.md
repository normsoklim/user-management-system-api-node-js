# Audit Logging Mechanism

## Overview
This document describes the audit logging implementation for the user management system, detailing how user actions are tracked, stored, and accessed.

## Audit Logging Requirements

Based on the user requirements, the audit logging system will:
1. Log user actions (create, update, delete) with timestamps
2. Record user IDs for each action
3. Track changes to critical resources (users, roles)
4. Store additional context information (IP address, user agent)

## Audit Log Structure

### Audit Log Model

```javascript
// auditLog.model.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
      'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
      'CHANGE_PASSWORD', 'RESET_PASSWORD',
      'ASSIGN_ROLE'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: ['users', 'roles', 'auth']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  before: {
    type: mongoose.Schema.Types.Mixed
  },
  after: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

## Audit Log Events

### User Management Events

| Action | Resource | Description | Data Captured |
|--------|----------|-------------|---------------|
| CREATE_USER | users | User created | User data (excluding password) |
| UPDATE_USER | users | User updated | Before/after user data |
| DELETE_USER | users | User deleted | Deleted user data |
| CHANGE_PASSWORD | auth | Password changed | User ID only |
| RESET_PASSWORD | auth | Password reset | User ID only |

### Role Management Events

| Action | Resource | Description | Data Captured |
|--------|----------|-------------|---------------|
| CREATE_ROLE | roles | Role created | Role data |
| UPDATE_ROLE | roles | Role updated | Before/after role data |
| DELETE_ROLE | roles | Role deleted | Deleted role data |
| ASSIGN_ROLE | users | Role assigned to user | User ID, new role ID |

### Authentication Events

| Action | Resource | Description | Data Captured |
|--------|----------|-------------|---------------|
| LOGIN | auth | Successful login | User ID |
| LOGOUT | auth | User logout | User ID |
| FAILED_LOGIN | auth | Failed login attempt | Email used |

## Implementation Approach

### Automatic Audit Logging Middleware

```javascript
// middleware/audit.middleware.js
const AuditLog = require('../models/auditLog.model');

class AuditLogger {
  /**
   * Log an action to the audit log
   * @param {Object} logData - Audit log data
   * @returns {Object} - Created audit log entry
   */
  static async log(logData) {
    try {
      const auditLog = new AuditLog(logData);
      return await auditLog.save();
    } catch (error) {
      // Log error but don't fail the request
      console.error('Audit logging failed:', error);
      return null;
    }
  }
  
  /**
   * Middleware to automatically log user actions
   * @param {string} action - Action being performed
   * @param {string} resource - Resource being affected
   * @param {Object} options - Additional options
   * @returns {Function} - Express middleware
   */
  static auditAction(action, resource, options = {}) {
    return async (req, res, next) => {
      // Store original send function
      const originalSend = res.send;
      
      // Capture response data for successful requests
      let responseData = null;
      res.send = function(data) {
        responseData = data;
        originalSend.call(this, data);
      };
      
      // Proceed with request
      next();
      
      // After request completes, log the action
      res.on('finish', async () => {
        // Only log successful requests (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const logData = {
            userId: req.user ? req.user.userId : null,
            action,
            resource,
            resourceId: this.extractResourceId(req, options),
            before: options.captureBefore ? req.body : null,
            after: this.extractAfterData(responseData, options),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          };
          
          await this.log(logData);
        }
      });
    };
  }
  
  /**
   * Extract resource ID from request
   * @param {Object} req - Express request object
   * @param {Object} options - Options object
   * @returns {string|null} - Resource ID
   */
  static extractResourceId(req, options) {
    // Use custom extractor if provided
    if (options.resourceIdExtractor) {
      return options.resourceIdExtractor(req);
    }
    
    // Default to ID from URL parameters
    return req.params.id || null;
  }
  
  /**
   * Extract after data from response
   * @param {string} responseData - Response data as string
   * @param {Object} options - Options object
   * @returns {Object|null} - Parsed after data
   */
  static extractAfterData(responseData, options) {
    if (!responseData || !options.captureAfter) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(responseData);
      // Remove sensitive data
      if (parsed.data && parsed.data.password) {
        delete parsed.data.password;
      }
      return parsed.data || parsed;
    } catch (error) {
      return null;
    }
  }
}

module.exports = AuditLogger;
```

### Manual Audit Logging in Services

```javascript
// services/user.service.js
const AuditLogger = require('../middleware/audit.middleware');
const User = require('../models/user.model');

class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {Object} currentUser - User performing the action
   * @returns {Object} - Created user
   */
  static async createUser(userData, currentUser) {
    // Remove password from audit log
    const userDataForAudit = { ...userData };
    delete userDataForAudit.password;
    
    try {
      // Create user
      const user = new User(userData);
      const savedUser = await user.save();
      
      // Log action
      await AuditLogger.log({
        userId: currentUser.userId,
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: savedUser._id,
        after: userDataForAudit,
        ipAddress: currentUser.ipAddress,
        userAgent: currentUser.userAgent
      });
      
      return savedUser;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {string} userId - User ID to update
   * @param {Object} updateData - Update data
   * @param {Object} currentUser - User performing the action
   * @returns {Object} - Updated user
   */
  static async updateUser(userId, updateData, currentUser) {
    try {
      // Get current user data for "before" log
      const currentUserData = await User.findById(userId);
      
      // Remove password from audit log
      const updateDataForAudit = { ...updateData };
      delete updateDataForAudit.password;
      
      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      // Log action
      await AuditLogger.log({
        userId: currentUser.userId,
        action: 'UPDATE_USER',
        resource: 'users',
        resourceId: userId,
        before: currentUserData,
        after: updateDataForAudit,
        ipAddress: currentUser.ipAddress,
        userAgent: currentUser.userAgent
      });
      
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {string} userId - User ID to delete
   * @param {Object} currentUser - User performing the action
   * @returns {Object} - Deleted user
   */
  static async deleteUser(userId, currentUser) {
    try {
      // Get user data before deletion for logging
      const userToDelete = await User.findById(userId);
      
      if (!userToDelete) {
        throw new Error('User not found');
      }
      
      // Delete user
      const deletedUser = await User.findByIdAndDelete(userId);
      
      // Log action
      await AuditLogger.log({
        userId: currentUser.userId,
        action: 'DELETE_USER',
        resource: 'users',
        resourceId: userId,
        before: userToDelete,
        ipAddress: currentUser.ipAddress,
        userAgent: currentUser.userAgent
      });
      
      return deletedUser;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserService;
```

## Audit Log Querying

### Audit Log Service

```javascript
// services/audit.service.js
const AuditLog = require('../models/auditLog.model');

class AuditService {
  /**
   * Get audit logs with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated audit logs
   */
  static async getAuditLogs(filters = {}, page = 1, limit = 10) {
    const query = {};
    
    // Apply filters
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    if (filters.action) {
      query.action = filters.action;
    }
    
    if (filters.resource) {
      query.resource = filters.resource;
    }
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email'),
      AuditLog.countDocuments(query)
    ]);
    
    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get audit logs for a specific user
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated audit logs for user
   */
  static async getUserAuditLogs(userId, page = 1, limit = 10) {
    return this.getAuditLogs({ userId }, page, limit);
  }
  
  /**
   * Get audit log by ID
   * @param {string} logId - Audit log ID
   * @returns {Object} - Audit log entry
   */
  static async getAuditLogById(logId) {
    return await AuditLog.findById(logId)
      .populate('userId', 'firstName lastName email');
  }
}

module.exports = AuditService;
```

## Performance Considerations

### Database Indexing
Proper indexing is crucial for audit log performance:
- Compound index on `userId` and `timestamp` for user-specific queries
- Index on `action` for filtering by action type
- Index on `resource` for filtering by resource type
- Index on `timestamp` for time-based queries

### Data Retention Policy
Implement a data retention policy to prevent the audit collection from growing too large:

```javascript
// utils/audit-cleanup.util.js
class AuditCleanup {
  /**
   * Remove old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  static async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    console.log(`Deleted ${result.deletedCount} old audit logs`);
    return result;
  }
}

module.exports = AuditCleanup;
```

### Scheduled Cleanup
Set up a scheduled job to run cleanup periodically:

```javascript
// jobs/audit-cleanup.job.js
const cron = require('node-cron');
const AuditCleanup = require('../utils/audit-cleanup.util');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await AuditCleanup.cleanupOldLogs(90); // Keep 90 days
  } catch (error) {
    console.error('Audit cleanup failed:', error);
  }
});
```

## Security Considerations

1. **Data Sanitization**: Never log sensitive information like passwords
2. **Access Control**: Restrict access to audit logs (typically admin-only)
3. **Immutable Logs**: Consider making audit logs immutable after creation
4. **Tamper Detection**: Implement mechanisms to detect if logs have been tampered with

## Testing Audit Logging

### Test Cases

1. **Log Creation**: Verify audit logs are created for all tracked actions
2. **Data Accuracy**: Ensure correct data is captured in logs
3. **Filtering**: Test filtering by user, action, resource, and date range
4. **Pagination**: Verify pagination works correctly
5. **Performance**: Test query performance with large datasets
6. **Data Retention**: Verify old logs are properly cleaned up

### Example Test

```javascript
// tests/audit.test.js
describe('Audit Logging', () => {
  describe('User Actions', () => {
    it('should log user creation', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      
      // Create user
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);
      
      // Check audit log
      const auditLogs = await AuditLog.find({
        action: 'CREATE_USER',
        resourceId: response.body.data._id
      });
      
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].userId.toString()).toBe(adminUserId);
      expect(auditLogs[0].after.email).toBe(userData.email);
      expect(auditLogs[0].after.password).toBeUndefined();
    });
  });
});