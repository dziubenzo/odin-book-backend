import User from '../models/User.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import {
  checkPasswordsEquality,
  checkUsernameAvailability,
} from '../config/middleware.js';
import { getFirstErrorMsg } from '../config/helpers.js';

// @desc    Get all users
// @route   GET /users
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const allUsers = await User.find({}, '-password').exec();

  return res.json(allUsers);
});

// @desc    Create user
// @route   POST /users
export const createUser = asyncHandler(async (req, res, next) => {
  return res.json('TODO');
});
