// controllers/auth.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'victoria-hall-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user
    }
  });
};

// Signup
async function signup(req, res) {
  try {
    const { name, email, password, dateOfBirth, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Calculate age for loyalty membership
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Auto-enroll adults as loyalty members
    const isLoyaltyMember = age >= 18;
    
    const newUser = await User.create({
      name,
      email,
      password,
      dateOfBirth: birthDate,
      phone: phone || '',
      isLoyaltyMember,
      loyaltySince: isLoyaltyMember ? new Date() : null
    });
    
    createSendToken(newUser, 201, res);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
}

// Login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }
    
    // Check password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }
    
    // 3) Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }
    
    // 4) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
}

// Update Password (logged in user)
async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    
    // 2) Check if current password is correct
    if (!(await user.correctPassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Your current password is wrong'
      });
    }
    
    // 3) Update password
    user.password = newPassword;
    await user.save();
    
    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message
    });
  }
}

// Get current user profile
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
}

// Update user profile
async function updateMe(req, res) {
  try {
    const { name, phone, dateOfBirth } = req.body;
    
    // Create update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) {
      updateData.dateOfBirth = new Date(dateOfBirth);
      
      // Recalculate loyalty membership if date of birth changes
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      updateData.isLoyaltyMember = age >= 18;
      if (age >= 18 && !req.user.isLoyaltyMember) {
        updateData.loyaltySince = new Date();
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
}

module.exports = {
  signup,
  login,
  updatePassword,
  getMe,
  updateMe
};