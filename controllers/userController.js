import User from '../models/User.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import {
  checkPasswordsEquality,
  checkUsernamePattern,
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
export const createUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Username must contain between 3 and 16 characters')
    .custom(checkUsernamePattern)
    .withMessage(
      'Username must start with a letter and contain only a-z, A-Z and 0-9 characters'
    )
    .custom(checkUsernameAvailability)
    .withMessage('Username already taken'),
  body('password')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Password must contain between 3 and 16 characters'),
  body('confirm_password')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage(
      'Password confirmation must contain between 3 and 16 characters'
    )
    .custom(checkPasswordsEquality)
    .withMessage('Passwords do not match'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const username = req.body.username;
    const password = req.body.password;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for password-hashing errors
    if (!hashedPassword) {
      return res
        .status(500)
        .json('Something went wrong while creating a user. Please try again.');
    }

    // Create new user
    await new User({
      username,
      password: hashedPassword,
      registration_date: Date.now(),
      avatar: '',
      bio: '',
      followed_users: [],
      followed_categories: [],
    }).save();

    return res.json('User created successfully!');
  }),
];