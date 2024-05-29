import Post from '../models/Post.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

import asyncHandler from 'express-async-handler';
import { body, query, validationResult } from 'express-validator';
import { getFirstErrorMsg } from '../config/helpers.js';
import slugify from 'slugify';
import crypto from 'crypto';

// @desc    Get all posts in descending order (newest first)
// @desc    Accepts limit query parameter
// @route   GET /posts
export const getAllPosts = [
  query('limit')
    .optional()
    .trim()
    .isInt()
    .withMessage('Limit query parameter must be an integer'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const limit = req.query.limit;

    const allPosts = await Post.find({})
      .sort({ created_at: -1 })
      .limit(limit ?? limit)
      .exec();

    return res.json(allPosts);
  }),
];

// @desc    Create post
// @route   POST /posts
export const createPost = [
  body('author')
    .trim()
    .isMongoId()
    .withMessage('Author field must be a valid MongoDB ID'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('Post title must contain between 3 and 64 characters'),
  body('content')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Post content must contain at least 8 characters'),
  body('category')
    .trim()
    .isMongoId()
    .withMessage('Category field must be a valid MongoDB ID'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const author = req.body.author;
    const title = req.body.title;
    const content = req.body.content;
    const category = req.body.category;

    // Make sure both the author and the category exist in the DB
    const [authorExists, categoryExists] = await Promise.all([
      User.findById(author).exec(),
      Category.findById(category).exec(),
    ]);

    // Return an error message if either does not exist
    if (!authorExists || !categoryExists) {
      return res
        .status(400)
        .json('Error while creating a post. Please try again');
    }

    // Generate a random eight-character string to add to the end of the slug to ensure that the slug is unique
    const uniqueString = '-' + crypto.randomUUID().slice(0, 8);

    // Create new post
    await new Post({
      author,
      title,
      content,
      category,
      created_at: Date.now(),
      likes: [],
      comments: [],
      slug: slugify(title + uniqueString, { lower: true }),
    }).save();

    return res.json('Post created successfully!');
  }),
];
