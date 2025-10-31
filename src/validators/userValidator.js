const Joi = require('joi');

const createUserSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  email: Joi.string()
    .email()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Role ID is required',
      'string.pattern.base': 'Invalid role ID format',
      'any.required': 'Role ID is required'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .default(true),
  
  avatar: Joi.any()
    .optional()
    .meta({ swaggerType: 'file' }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional()
    .messages({
      'any.only': 'Gender must be one of: male, female, other'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
  
  dateOfBirth: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.base': 'Please enter a valid date of birth'
    }),
  
  address: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    })
});

const updateUserSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.empty': 'First name cannot be empty',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.empty': 'Last name cannot be empty',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  email: Joi.string()
    .email()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Email cannot be empty',
      'string.email': 'Please enter a valid email address'
    }),
  
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid role ID format'
    }),
  
  isActive: Joi.boolean()
    .optional(),
  
  avatar: Joi.any()
    .optional()
    .meta({ swaggerType: 'file' }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional()
    .messages({
      'any.only': 'Gender must be one of: male, female, other'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
  
  dateOfBirth: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.base': 'Please enter a valid date of birth'
    }),
  
  address: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    })
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.empty': 'First name cannot be empty',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.empty': 'Last name cannot be empty',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  avatar: Joi.any()
    .optional()
    .meta({ swaggerType: 'file' }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional()
    .messages({
      'any.only': 'Gender must be one of: male, female, other'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
  
  dateOfBirth: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.base': 'Please enter a valid date of birth'
    }),
  
  address: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Address cannot exceed 500 characters'
    })
});

const getUsersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10),
  
  search: Joi.string()
    .trim()
    .max(100)
    .optional(),
  
  role: Joi.string()
    .trim()
    .optional(),
  
  isActive: Joi.boolean()
    .optional(),
    
  sortBy: Joi.string()
    .trim()
    .optional()
    .default('createdAt'),
    
  sort: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
});

/**
 * Validate request body against a schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    // Handle both JSON and form-data
    let dataToValidate = req.body;
    
    // If req.body is empty but we have fields in req.fields (from multer)
    if ((!dataToValidate || Object.keys(dataToValidate).length === 0) && req.fields) {
      dataToValidate = req.fields;
    }
    
    const { error } = schema.validate(dataToValidate);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Update req.body with validated data to ensure it's available in controllers
    req.body = dataToValidate;
    next();
  };
};

/**
 * Validate query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  getUsersQuerySchema,
  validate,
  validateQuery
};