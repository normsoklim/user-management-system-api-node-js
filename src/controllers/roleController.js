const RoleService = require('../services/roleService');
const logger = require('../utils/logger');

class RoleController {
  /**
   * Get all roles
   */
  static async getRoles(req, res) {
    try {
      const { page, limit, search, isActive, sortBy, sort } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const result = await RoleService.getRoles(
        filters,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
        sortBy,
        sort
      );

      res.json({
        success: true,
        message: 'Roles retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get roles controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get role by ID
   */
  static async getRoleById(req, res) {
    try {
      const { id } = req.params;
      
      const role = await RoleService.getRoleById(id);
      
      res.json({
        success: true,
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error) {
      logger.error('Get role by ID controller error:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Create a new role
   */
  static async createRole(req, res) {
    try {
      const { name, description, permissions, isActive } = req.body;
      
      const roleData = {
        name,
        description,
        permissions,
        isActive
      };

      const newRole = await RoleService.createRole(roleData);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: newRole
      });
    } catch (error) {
      logger.error('Create role controller error:', error);
      
      if (error.message === 'Role with this name already exists') {
        return res.status(409).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update role by ID
   */
  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, permissions, isActive } = req.body;
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedRole = await RoleService.updateRole(id, updateData);

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: updatedRole
      });
    } catch (error) {
      logger.error('Update role controller error:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      if (error.message === 'Role name already exists') {
        return res.status(409).json({
          success: false,
          message: 'Role name already exists'
        });
      }
      
      if (error.message === 'Cannot rename super-admin role' || 
          error.message === 'Super-admin role must have *:* permission') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete role by ID
   */
  static async deleteRole(req, res) {
    try {
      const { id } = req.params;
      
      const deletedRole = await RoleService.deleteRole(id);

      res.json({
        success: true,
        message: 'Role deleted successfully',
        data: deletedRole
      });
    } catch (error) {
      logger.error('Delete role controller error:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      if (error.message === 'Cannot delete super-admin role') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Cannot delete role that is assigned to users') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get users with a specific role
   */
  static async getRoleUsers(req, res) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      
      const result = await RoleService.getRoleUsers(
        id,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        message: 'Role users retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get role users controller error:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available permissions
   */
  static async getAvailablePermissions(req, res) {
    try {
      const permissions = RoleService.getAvailablePermissions();

      res.json({
        success: true,
        message: 'Available permissions retrieved successfully',
        data: permissions
      });
    } catch (error) {
      logger.error('Get available permissions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = RoleController;