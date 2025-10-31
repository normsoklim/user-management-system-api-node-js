const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  permissions: [{
    type: String,
    required: true
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Indexes (name already has unique index from schema definition)

// Pre-save middleware to validate permissions format
roleSchema.pre('save', function(next) {
  const validPattern = /^[a-zA-Z0-9*]+:[a-zA-Z0-9*]+(:self)?$/;
  
  for (const permission of this.permissions) {
    if (!validPattern.test(permission)) {
      return next(new Error(`Invalid permission format: ${permission}. Expected format: resource:action or resource:action:self`));
    }
  }
  
  next();
});

// Static method to find role by name
roleSchema.statics.findByName = function(name) {
  return this.findOne({ name });
};

// Static method to create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const defaultRoles = [
    {
      name: 'super-admin',
      permissions: ['*:*'],
      description: 'Full system access'
    },
    {
      name: 'admin',
      permissions: [
        'user:*',
        'role:*',
        'audit:read'
      ],
      description: 'Can manage users and roles, view audit logs'
    },
    {
      name: 'moderator',
      permissions: [
        'user:read',
        'user:update',
        'audit:read'
      ],
      description: 'Can view and update users, view audit logs'
    },
    {
      name: 'user',
      permissions: [
        'user:read:self',
        'user:update:self'
      ],
      description: 'Standard user with limited permissions'
    }
  ];

  for (const roleData of defaultRoles) {
    const existingRole = await this.findByName(roleData.name);
    if (!existingRole) {
      await this.create(roleData);
    }
  }
};

// Method to check if role has a specific permission
roleSchema.methods.hasPermission = function(permission) {
  // Super admin has all permissions
  if (this.permissions.includes('*:*')) {
    return true;
  }
  
  // Check for exact permission
  if (this.permissions.includes(permission)) {
    return true;
  }
  
  // Check for wildcard permissions (e.g., "user:*")
  const [resource] = permission.split(':');
  if (this.permissions.includes(`${resource}:*`)) {
    return true;
  }
  
  return false;
};

module.exports = mongoose.model('Role', roleSchema);