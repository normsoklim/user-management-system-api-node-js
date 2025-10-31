const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'READ_USER', 'READ_USERS',
      'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE', 'READ_ROLE', 'READ_ROLES',
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
    default: Date.now
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

// TTL index to automatically delete old audit logs (90 days)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(logData) {
  try {
    const auditLog = new this(logData);
    return await auditLog.save();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Audit logging failed:', error);
    return null;
  }
};

// Static method to get audit logs with filtering
auditLogSchema.statics.getAuditLogs = async function(filters = {}, page = 1, limit = 10) {
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
    this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email'),
    this.countDocuments(query)
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
};

// Static method to get audit logs for a specific user
auditLogSchema.statics.getUserAuditLogs = async function(userId, page = 1, limit = 10) {
  return this.getAuditLogs({ userId }, page, limit);
};

// Static method to get audit log by ID
auditLogSchema.statics.getAuditLogById = async function(logId) {
  return await this.findById(logId)
    .populate('userId', 'firstName lastName email');
};

module.exports = mongoose.model('AuditLog', auditLogSchema);