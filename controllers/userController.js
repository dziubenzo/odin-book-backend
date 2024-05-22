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

import passport from 'passport';
import jwt from 'jsonwebtoken';

// @desc    Get all users
// @route   GET /users
export const getAllUsers = [
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res, next) => {
    const allUsers = await User.find({}, '-password').exec();

    if (allUsers.length === 0) {
      return res.status(404).json(allUsers);
    }

    return res.json(allUsers);
  }),
];

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
      registered_at: Date.now(),
      avatar: '',
      bio: '',
      followed_users: [],
      followed_categories: [],
    }).save();

    return res.json('User created successfully!');
  }),
];

// @desc    Log in user
// @route   POST /users/login
export const loginUser = [
  // Validate and sanitise login form fields
  body('username')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Username must contain between 3 and 16 characters'),
  body('password')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Password must contain between 3 and 16 characters'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const username = req.body.username;
    const password = req.body.password;

    // Get user from the DB
    const user = await User.findOne({ username }).exec();

    // Return error message if no user found
    if (!user) {
      return res.status(401).json('Invalid username and/or password');
    }

    // Compare passwords
    const passwordsMatch = await bcrypt.compare(password, user.password);

    // Return error message if passwords do not match
    if (!passwordsMatch) {
      return res.status(401).json('Invalid username and/or password');
    }

    // Create token valid for 3 days if login credentials are valid
    // Use user's ID as payload
    const options = { expiresIn: '3 days' };
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, options);

    // Return token
    return res.json(token);
  }),
];

// @desc    Authenticate user
// @route   POST /users/auth
export const authUser = [
  passport.authenticate('jwt', { session: false }),
  asyncHandler(async (req, res, next) => {
    return res.json(req.user);
  }),
];
