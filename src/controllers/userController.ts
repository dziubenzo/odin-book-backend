import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { handleUpload } from '../config/cloudinary';
import { getFirstErrorMsg, getRandomAvatar } from '../config/helpers';
import {
  checkFirstCharacter,
  checkPasswordsEquality,
  checkQuestionMark,
  checkUsernameAvailability,
} from '../config/middleware';
import { upload } from '../config/multer';
import { checkAuth } from '../config/passport';
import Category from '../models/Category';
import Comment from '../models/Comment';
import Post from '../models/Post';
import User from '../models/User';

// @desc    Get all users (in ascending order)
// @route   GET /users
export const getAllUsers = [
  checkAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const allUsers = await User.find({}, '-password')
      .sort({ username: 1 })
      .lean()
      .exec();
    res.json(allUsers);
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
    .custom(checkQuestionMark)
    .withMessage('Username cannot contain a question mark')
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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const username = req.body.username;
    const password = req.body.password;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for password-hashing errors
    if (!hashedPassword) {
      res
        .status(500)
        .json('Something went wrong while creating a user. Please try again.');
      return;
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

    res.json('User created successfully!');
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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const username = req.body.username;
    const password = req.body.password;

    // Get user from the DB
    const user = await User.findOne({ username }).lean().exec();

    // Return error message if no user found
    if (!user) {
      res.status(401).json('Invalid username and/or password');
      return;
    }

    // Compare passwords
    const passwordsMatch = await bcrypt.compare(password, user.password);

    // Return error message if passwords do not match
    if (!passwordsMatch) {
      res.status(401).json('Invalid username and/or password');
      return;
    }

    // Create token valid for 3 days if login credentials are valid
    // Use user's ID as payload
    const options = { expiresIn: '3 days' };
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, options);

    // Return token
    res.json(token);
  }),
];

// @desc    Authenticate user
// @route   POST /users/auth
export const authUser = [
  checkAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(req.user);
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
    .isLength({ max: 320 })
    .withMessage('Bio cannot exceed 320 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be an URL'),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const username = req.params.username;
    const bio = req.body.bio ?? req.user?.bio;

    // Transform and upload avatar to Cloudinary if image sent with request
    if (req.file) {
      const [cloudinaryRes, user] = await Promise.all([
        handleUpload(req.file, 'odin_book/avatars'),
        User.findOne({ username }, '-password').exec(),
      ]);

      if (!user) {
        res.status(400).json('Error while updating the user. Please try again');
        return;
      }

      user.bio = bio;
      user.avatar = cloudinaryRes.secure_url;
      await user.save();

      res.json(user);
      return;
    }

    const defaultAvatarURL = req.body.avatar ?? req.user?.avatar;
    const user = await User.findOne({ username }, '-password').exec();

    if (!user) {
      res.status(400).json('Error while updating the user. Please try again');
      return;
    }

    user.bio = bio;
    user.avatar = defaultAvatarURL;
    await user.save();

    res.json(user);
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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const categoryID = req.body.category_id;
    const username = req.params.username;

    // Make sure the category to be followed/unfollowed exists and retrieve the logged in user
    const [categoryExists, user] = await Promise.all([
      Category.findById(categoryID).exec(),
      User.findOne({ username }, '-password').exec(),
    ]);

    if (!categoryExists || !user) {
      res
        .status(400)
        .json('Error while following/unfollowing a category. Please try again');
      return;
    }

    // Follow or unfollow the category
    // Return updated user
    if (user.followed_categories.includes(categoryID)) {
      const index = user.followed_categories.indexOf(categoryID);
      user.followed_categories.splice(index, 1);
      await user.save();

      res.json(user);
      return;
    }

    user.followed_categories.push(categoryID);
    await user.save();

    res.json(user);
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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const userID = req.body.user_id;
    const username = req.params.username;

    // Make sure the logged in user cannot follow themselves
    if (userID === req.user?._id.toString()) {
      res.status(400).json('You cannot follow yourself');
      return;
    }

    // Make sure the user to be followed/unfollowed exists and retrieve the logged in user
    const [userExists, user] = await Promise.all([
      User.findById(userID).exec(),
      User.findOne({ username }, '-password').exec(),
    ]);

    if (!userExists || !user) {
      res
        .status(400)
        .json('Error while following/unfollowing a user. Please try again');
      return;
    }

    // Follow or unfollow the user
    // Return updated logged in user
    if (user.followed_users.includes(userID)) {
      const index = user.followed_users.indexOf(userID);
      user.followed_users.splice(index, 1);
      await user.save();

      res.json(user);
      return;
    }

    user.followed_users.push(userID);
    await user.save();

    res.json(user);
  }),
];

// @desc    Get user
// @desc    Get user stats as well
// @route   GET /users/:username
export const getUser = [
  checkAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const username = req.params.username;

    const user = await User.findOne({ username }, '-password').lean().exec();

    // Make sure the user exists
    if (!user) {
      res.status(400).json('Error while retrieving a user. Please try again');
      return;
    }

    // Get the number of posts, post likes, post dislikes, comments, comment likes, comment dislikes and followers of the user
    const [
      postsCount,
      postLikesCount,
      postDislikesCount,
      commentsCount,
      commentLikesCount,
      commentDislikesCount,
      followersCount,
    ] = await Promise.all([
      Post.countDocuments({ author: user._id }).lean().exec(),
      Post.countDocuments({ likes: user._id }).lean().exec(),
      Post.countDocuments({ dislikes: user._id }).lean().exec(),
      Comment.countDocuments({ author: user._id }).lean().exec(),
      Comment.countDocuments({ likes: user._id }).lean().exec(),
      Comment.countDocuments({ dislikes: user._id }).lean().exec(),
      User.countDocuments({ followed_users: user._id }).lean().exec(),
    ]);

    // Return user and all counts as a single object
    const enrichedUser = {
      ...user,
      postsCount,
      postLikesCount,
      postDislikesCount,
      commentsCount,
      commentLikesCount,
      commentDislikesCount,
      followersCount,
    };

    res.json(enrichedUser);
  }),
];
