// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to access this resource'
      });
    }
    
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'victoria-hall-secret');
    
    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }
    
    // 4) Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }
    
    // 5) Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this resource'
    });
  }
};

module.exports = { auth };

// const jwt = require('jsonwebtoken');
// const User = require('../models/user.model');

// const auth = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Please authenticate to access this resource'
//       });
//     }
    
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'victoria-hall-secret');
//     const user = await User.findOne({ 
//       _id: decoded.id,
//       isActive: true 
//     });
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found or account is inactive'
//       });
//     }
    
//     req.user = user;
//     req.token = token;
//     next();
//   } catch (error) {
//     res.status(401).json({
//       success: false,
//       message: 'Please authenticate'
//     });
//   }
// };

// // // Optional: Role-based middleware (for admin features)
// const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         message: `Role ${req.user.role} is not authorized to access this resource`
//       });
//     }
//     next();
//   };
// };

// module.exports = { auth, authorize };