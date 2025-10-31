require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to database for seeding');

    // Create default roles
    await Role.createDefaultRoles();
    logger.info('Default roles created');

    // Create super admin user if it doesn't exist
    const superAdminRole = await Role.findOne({ name: 'super-admin' });
    if (!superAdminRole) {
      throw new Error('Super admin role not found');
    }

    const existingSuperAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (!existingSuperAdmin) {
      const superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@gmail.com',
        password: 'Admin123', // This will be hashed automatically
        role: superAdminRole._id,
        isActive: true,
        gender: 'other',
        phone: '+1-555-0100',
        address: '123 Admin Street, Admin City, Admin State, 12345, Admin Country'
      });

      await superAdmin.save();
      logger.info('Super admin user created');
      logger.info('Email: admin@gmail.com');
      logger.info('Password: Admin123');
    } else {
      // Update existing super admin to include new fields if they don't exist
      const needsUpdate =
        existingSuperAdmin.gender === null ||
        existingSuperAdmin.phone === null ||
        existingSuperAdmin.address === null;
      
      if (needsUpdate) {
        existingSuperAdmin.gender = existingSuperAdmin.gender || 'other';
        existingSuperAdmin.phone = existingSuperAdmin.phone || '+855-555-0100';
        existingSuperAdmin.address = existingSuperAdmin.address || '123 Admin Street, Admin City, Admin State, 12345, Admin Country';
        await existingSuperAdmin.save();
        logger.info('Super admin user updated with new fields');
      } else {
        logger.info('Super admin user already exists and is up to date');
      }
    }

    logger.info('Database seeding completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;