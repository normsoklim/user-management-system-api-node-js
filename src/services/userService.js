const User = require('../models/User');
const Role = require('../models/Role');
const AuditLogger = require('../middleware/audit');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get all users with pagination and filtering
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated users
   */
  static async getUsers(filters = {}, page = 1, limit = 10, sortBy = 'createdAt', sort = 'desc') {
    try {
      const query = {};
      
      // Apply filters
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      if (filters.role) {
        const role = await Role.findOne({ name: filters.role });
        if (role) {
          query.role = role._id;
        }
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      // Prepare sort object
      const sortObj = {};
      sortObj[sortBy] = sort === 'desc' ? -1 : 1;
      
      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .populate('role', 'name permissions description')
          .sort(sortObj)
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
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
      logger.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} - User object
   */
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password')
        .populate('role', 'name permissions description');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {Object} currentUser - User performing the action
   * @param {Object} req - Express request object
   * @returns {Object} - Created user
   */
  static async createUser(userData, currentUser, req) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Verify role exists
      const role = await Role.findById(userData.roleId);
      if (!role) {
        throw new Error('Invalid role ID');
      }

      // Create user
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.roleId,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        avatar: userData.avatar || null,
        gender: userData.gender || null,
        phone: userData.phone || null,
        dateOfBirth: userData.dateOfBirth || null,
        address: userData.address || null
      });

      const savedUser = await user.save();
      
      // Populate role for response
      await savedUser.populate('role', 'name permissions description');

      // Audit logging is handled by middleware

      return savedUser;
    } catch (error) {
      logger.error('Create user error:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID to update
   * @param {Object} updateData - Update data
   * @param {Object} currentUser - User performing the action
   * @param {Object} req - Express request object
   * @returns {Object} - Updated user
   */
  static async updateUser(userId, updateData, currentUser, req) {
    try {
      // Get current user data for "before" log
      const currentUserData = await User.findById(userId);
      
      if (!currentUserData) {
        throw new Error('User not found');
      }

      // If updating email, check if it's already taken
      if (updateData.email && updateData.email !== currentUserData.email) {
        const existingUser = await User.findOne({ email: updateData.email });
        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      // If updating role, verify it exists
      if (updateData.roleId) {
        const role = await Role.findById(updateData.roleId);
        if (!role) {
          throw new Error('Invalid role ID');
        }
      }

      // Prepare update data
      const updateFields = {};
      
      // Only include fields that are being updated
      if (updateData.firstName) updateFields.firstName = updateData.firstName;
      if (updateData.lastName) updateFields.lastName = updateData.lastName;
      if (updateData.email) updateFields.email = updateData.email;
      if (updateData.roleId) updateFields.role = updateData.roleId;
      if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
      if (updateData.avatar !== undefined) updateFields.avatar = updateData.avatar;
      if (updateData.gender !== undefined) updateFields.gender = updateData.gender;
      if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
      if (updateData.dateOfBirth !== undefined) updateFields.dateOfBirth = updateData.dateOfBirth;
      if (updateData.address !== undefined) updateFields.address = updateData.address;
      
      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, runValidators: true }
      ).populate('role', 'name permissions description');

      // Audit logging is handled by middleware

      return updatedUser;
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param {string} userId - User ID to delete
   * @param {Object} currentUser - User performing the action
   * @param {Object} req - Express request object
   * @returns {Object} - Deleted user
   */
  static async deleteUser(userId, currentUser, req) {
    try {
      // Get user data before deletion for logging
      const userToDelete = await User.findById(userId).populate('role', 'name permissions description');
      
      if (!userToDelete) {
        throw new Error('User not found');
      }

      // Prevent deletion of self
      if (currentUser.userId.toString() === userId) {
        throw new Error('Cannot delete your own account');
      }

      // Delete user
      const deletedUser = await User.findByIdAndDelete(userId);

      // Audit logging is handled by middleware

      return deletedUser;
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }

  /**
   * Update current user's profile
   * @param {Object} userData - Profile update data
   * @param {Object} currentUser - Current user
   * @param {Object} req - Express request object
   * @returns {Object} - Updated user
   */
  static async updateProfile(userData, currentUser, req) {
    try {
      // Get current user data
      const currentUserData = await User.findById(currentUser.userId);
      
      if (!currentUserData) {
        throw new Error('User not found');
      }

      // Prepare update data
      const updateFields = {};
      
      // Only include fields that are being updated
      if (userData.firstName) updateFields.firstName = userData.firstName;
      if (userData.lastName) updateFields.lastName = userData.lastName;
      if (userData.avatar !== undefined) updateFields.avatar = userData.avatar;
      if (userData.gender !== undefined) updateFields.gender = userData.gender;
      if (userData.phone !== undefined) updateFields.phone = userData.phone;
      if (userData.dateOfBirth !== undefined) updateFields.dateOfBirth = userData.dateOfBirth;
      if (userData.address !== undefined) updateFields.address = userData.address;
      
      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        currentUser.userId,
        updateFields,
        { new: true, runValidators: true }
      ).populate('role', 'name permissions description');

      // Audit logging is handled by middleware

      return updatedUser;
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated audit logs
   */
  static async getUserAuditLogs(userId, page = 1, limit = 10) {
    try {
      const AuditLog = require('../models/AuditLog');
      return await AuditLog.getUserAuditLogs(userId, page, limit);
    } catch (error) {
      logger.error('Get user audit logs error:', error);
      throw error;
    }
  }
}

module.exports = UserService;