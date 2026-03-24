/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Controller for user profile management.
 */

const userModel = require('../models/userModel');
const bcryptUtils = require('../utils/bcrypt');
const auditService = require('../services/auditService');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/v1/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, mobile, age, gender } = req.body;

    // Get current user data for audit (old state)
    const oldUser = await userModel.getUserById(userId);
    if (!oldUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prepare updates
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) updates.mobile = mobile;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;

    // Check if any fields to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No valid fields to update'
        }
      });
    }

    // Check mobile uniqueness if mobile is being updated
    if (updates.mobile && updates.mobile !== oldUser.mobile) {
      const mobileExists = await userModel.mobileExists(updates.mobile);
      if (mobileExists) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Mobile number already in use'
          }
        });
      }
    }

    // Update user
    const updatedUser = await userModel.updateUserProfile(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await auditService.logProfileUpdate(userId, oldUser, updatedUser, ipAddress, userAgent);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * POST /api/v1/users/me/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get user with password hash
    const user = await userModel.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify current password
    const isValid = await bcryptUtils.comparePassword(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        }
      });
    }

    // Hash new password
    const newPasswordHash = await bcryptUtils.hashPassword(new_password);

    // Update password
    const updated = await userModel.updatePassword(userId, newPasswordHash);
    if (!updated) {
      return res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update password'
        }
      });
    }

    // Audit log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await auditService.createAuditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: userId,
      newData: { password_changed_at: new Date().toISOString() },
      ipAddress,
      userAgent
    });

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  changePassword
};