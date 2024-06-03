import Post from '../models/Post.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Comment from '../models/Comment.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import { getFirstErrorMsg } from '../config/helpers.js';

// @desc    Create post comment
// @route   POST /posts/:slug/comments
export const createComment = [
  body('author')
    .trim()
    .isMongoId()
    .withMessage('Author field must be a valid MongoDB ID'),
  body('content')
    .trim()
    .isLength({ min: 3, max: 320 })
    .withMessage('Comment content must contain between 3 and 320 characters'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const slug = req.params.slug;
    const author = req.body.author;
    const content = req.body.content;

    // Create comment and make it liked by comment author by default
    const comment = await new Comment({
      author,
      content,
      created_at: Date.now(),
      likes: [author],
    }).save();

    // Push new comment to the post
    const updatedPost = await Post.findOneAndUpdate(
      { slug },
      { $push: { comments: comment } },
      { new: true }
    );

    // Return updated post
    res.json(updatedPost);
  }),
];
