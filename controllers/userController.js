import User from '../models/User.js';
import Category from '../models/Category.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import {
  checkPasswordsEquality,
  checkFirstCharacter,
  checkUsernameAvailability,
  checkAuth,
} from '../config/middleware.js';
import { getFirstErrorMsg, getRandomAvatar } from '../config/helpers.js';
import { upload } from '../config/multer.js';
import { handleUpload } from '../config/cloudinary.js';

import jwt from 'jsonwebtoken';

// @desc    Get all users (in ascending order)
// @route   GET /users
export const getAllUsers = [
  checkAuth,
  asyncHandler(async (req, res, next) => {
    const allUsers = await User.find({}, '-password')
      .sort({ username: 1 })
      .exec();

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
    .custom(checkFirstCharacter)
    .withMessage('Username cannot start with a number')
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

    // Create new user with a random default avatar
    await new User({
      username,
      password: hashedPassword,
      registered_at: Date.now(),
      avatar: getRandomAvatar(),
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
  checkAuth,
  asyncHandler(async (req, res, next) => {
    return res.json(req.user);
  }),
];

// @desc    Update user (bio and/or avatar)
// @route   PUT /users/:username/update
export const updateUser = [
  checkAuth,
  upload.single('uploaded_avatar'),
  body('bio')
    .trim()
    .optional()
    .isLength({ max: 160 })
    .withMessage('Bio cannot exceed 160 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be an URL'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const username = req.params.username;
    const bio = req.body.bio || req.user.bio;

    // Transform and upload avatar to Cloudinary if image sent with request
    if (req.file) {
      const [cloudinaryRes, user] = await Promise.all([
        handleUpload(req.file, 'odin_book/avatars'),
        User.findOne({ username }, '-password').exec(),
      ]);

      user.bio = bio;
      user.avatar = cloudinaryRes.secure_url;
      await user.save();

      return res.json(user);
    }

    const defaultAvatarURL = req.body.avatar || req.user.avatar;
    const user = await User.findOne({ username }, '-password').exec();

    user.bio = bio;
    user.avatar = defaultAvatarURL;
    await user.save();

    return res.json(user);
  }),
];

// @desc    Follow/unfollow category
// @route   PUT /users/:username/update_category
export const updateFollowedCategories = [
  checkAuth,
  body('category_id')
    .trim()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const categoryID = req.body.category_id;
    const username = req.params.username;

    // Make sure the category exists and retrieve user
    const [categoryExists, user] = await Promise.all([
      Category.findById(categoryID).exec(),
      User.findOne({ username }, '-password').exec(),
    ]);

    if (!categoryExists) {
      return res
        .status(400)
        .json('Error while following/unfollowing a category. Please try again');
    }

    // Follow or unfollow the category
    // Return updated user
    if (user.followed_categories.includes(categoryID)) {
      const index = user.followed_categories.indexOf(categoryID);
      user.followed_categories.splice(index, 1);
      await user.save();

      return res.json(user);
    }

    user.followed_categories.push(categoryID);
    await user.save();

    return res.json(user);
  }),
];

// @desc    Follow/unfollow user
// @route   PUT /users/:username/update_user
export const updateFollowedUsers = [
  checkAuth,
  body('user_id')
    .trim()
    .isMongoId()
    .withMessage('User must be a valid MongoDB ID'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const userID = req.body.user_id;
    const username = req.params.username;

    // Make sure the logged in user cannot follow themselves
    if (userID === req.user._id.toString()) {
      return res.status(400).json('You cannot follow yourself');
    }

    // Make sure the user exists and retrieve user
    const [userExists, user] = await Promise.all([
      User.findById(userID).exec(),
      User.findOne({ username }, '-password').exec(),
    ]);

    if (!userExists) {
      return res
        .status(400)
        .json('Error while following/unfollowing a user. Please try again');
    }

    // Follow or unfollow the user
    // Return updated logged in user
    if (user.followed_users.includes(userID)) {
      const index = user.followed_users.indexOf(userID);
      user.followed_users.splice(index, 1);
      await user.save();

      return res.json(user);
    }

    user.followed_users.push(userID);
    await user.save();

    return res.json(user);
  }),
];
