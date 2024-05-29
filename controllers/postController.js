import Post from '../models/Post.js';

import asyncHandler from 'express-async-handler';
import { body, query, validationResult } from 'express-validator';
import { getFirstErrorMsg } from '../config/helpers.js';

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
