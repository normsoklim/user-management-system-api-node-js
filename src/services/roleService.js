const Role = require('../models/Role');
const User = require('../models/User');
const logger = require('../utils/logger');

class RoleService {
  /**
   * Get all roles with pagination and filtering
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated roles
   */
  static async getRoles(filters = {}, page = 1, limit = 10, sortBy = 'createdAt', sort = 'desc') {
    try {
      const query = {};
      
      // Apply filters
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      // Prepare sort object
      const sortObj = {};
      sortObj[sortBy] = sort === 'desc' ? -1 : 1;
      
      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [roles, total] = await Promise.all([
        Role.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit),
        Role.countDocuments(query)
      ]);
      
      return {
        data: roles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get roles error:', error);
      throw error;
    }
  }

  /**
   * Get role by ID
   * @param {string} roleId - Role ID
   * @returns {Object} - Role object
   */
  static async getRoleById(roleId) {
    try {
      const role = await Role.findById(roleId);
      
      if (!role) {
        throw new Error('Role not found');
      }
      
      return role;
    } catch (error) {
      logger.error('Get role by ID error:', error);
      throw error;
    }
  }

  /**
   * Create a new role
   * @param {Object} roleData - Role data
   * @returns {Object} - Created role
   */
  static async createRole(roleData) {
    try {
      // Check if role already exists
      const existingRole = await Role.findOne({ name: roleData.name });
      if (existingRole) {
        throw new Error('Role with this name already exists');
      }

      // Create role
      const role = new Role({
        name: roleData.name,
        description: roleData.description || '',
        permissions: roleData.permissions,
        isActive: roleData.isActive !== undefined ? roleData.isActive : true
      });

      const savedRole = await role.save();
      return savedRole;
    } catch (error) {
      logger.error('Create role error:', error);
      throw error;
    }
  }

  /**
   * Update role by ID
   * @param {string} roleId - Role ID to update
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated role
   */
  static async updateRole(roleId, updateData) {
    try {
      // Get current role data for validation
      const currentRole = await Role.findById(roleId);
      
      if (!currentRole) {
        throw new Error('Role not found');
      }

      // If updating name, check if it's already taken
      if (updateData.name && updateData.name !== currentRole.name) {
        const existingRole = await Role.findOne({ name: updateData.name });
        if (existingRole) {
          throw new Error('Role name already exists');
        }
      }

      // Prevent modification of super-admin role name and basic permissions
      if (currentRole.name === 'super-admin') {
        if (updateData.name && updateData.name !== 'super-admin') {
          throw new Error('Cannot rename super-admin role');
        }
        
        if (updateData.permissions && !updateData.permissions.includes('*:*')) {
          throw new Error('Super-admin role must have *:* permission');
        }
      }

      // Update role
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedRole;
    } catch (error) {
      logger.error('Update role error:', error);
      throw error;
    }
  }

  /**
   * Delete role by ID
   * @param {string} roleId - Role ID to delete
   * @returns {Object} - Deleted role
   */
  static async deleteRole(roleId) {
    try {
      const roleToDelete = await Role.findById(roleId);
      
      if (!roleToDelete) {
        throw new Error('Role not found');
      }

      // Prevent deletion of super-admin role
      if (roleToDelete.name === 'super-admin') {
        throw new Error('Cannot delete super-admin role');
      }

      // Check if role is assigned to any users
      const usersWithRole = await User.countDocuments({ role: roleId });
      if (usersWithRole > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Delete role
      const deletedRole = await Role.findByIdAndDelete(roleId);
      return deletedRole;
    } catch (error) {
      logger.error('Delete role error:', error);
      throw error;
    }
  }

  /**
   * Get users with a specific role
   * @param {string} roleId - Role ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated users
   */
  static async getRoleUsers(roleId, page = 1, limit = 10) {
    try {
      // Verify role exists
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find({ role: roleId })
          .select('-password')
          .populate('role', 'name permissions description')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments({ role: roleId })
      ]);
      
      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get role users error:', error);
      throw error;
    }
  }

  /**
   * Get available permissions
   * @returns {Array} - List of available permissions
   */
  static getAvailablePermissions() {
    return [
      {
        category: 'User Management',
        permissions: [
          { name: 'user:create', description: 'Create new users' },
          { name: 'user:read', description: 'View all users' },
          { name: 'user:update', description: 'Update any user' },
          { name: 'user:delete', description: 'Delete users' },
          { name: 'user:read:self', description: 'View own profile' },
          { name: 'user:update:self', description: 'Update own profile' }
        ]
      },
      {
        category: 'Role Management',
        permissions: [
          { name: 'role:create', description: 'Create new roles' },
          { name: 'role:read', description: 'View all roles' },
          { name: 'role:update', description: 'Update roles' },
          { name: 'role:delete', description: 'Delete roles' }
        ]
      },
      {
        category: 'Audit Logs',
        permissions: [
          { name: 'audit:read', description: 'View all audit logs' },
          { name: 'audit:read:self', description: 'View own audit logs' }
        ]
      },
      {
        category: 'System Administration',
        permissions: [
          { name: '*:*', description: 'Full system access (Super Admin)' }
        ]
      }
    ];
  }
}

module.exports = RoleService;