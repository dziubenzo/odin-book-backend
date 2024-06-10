import Post from '../models/Post.js';
import User from '../models/User.js';
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

    // Make sure the user exists
    const userExists = await User.findById(author).exec();

    if (!userExists) {
      return res
        .status(400)
        .json('Error while creating a post comment. Please try again');
    }

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
    )
      .populate({ path: 'author', select: 'username' })
      .populate({ path: 'category', select: 'name' })
      .populate({ path: 'likes', select: 'username' })
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' },
        // Sort comments in descending order (newest first)
        options: { sort: { created_at: -1 } },
      })
      .exec();

    // Return updated post with all fields populated
    res.json(updatedPost);
  }),
];

// @desc    Like post comment
// @route   PUT /posts/:slug/comments/:commentID/like
export const likeComment = [
  body('user')
    .trim()
    .isMongoId()
    .withMessage('User field must be a valid MongoDB ID'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const user = req.body.user;
    const commentID = req.params.commentID;

    // Make sure the user exists
    const userExists = await User.findById(user).exec();

    if (!userExists) {
      return res
        .status(400)
        .json('Error while liking a post comment. Please try again');
    }

    const comment = await Comment.findOne({ _id: commentID });

    // Only remove like if the post comment is already liked by the user
    if (comment.likes.includes(user)) {
      const index = comment.likes.indexOf(user);
      comment.likes.splice(index, 1);
      await comment.save();

      return res.json('Comment unliked successfully!');
    }

    // Otherwise remove dislike from the post comment if it exists and push like to the post
    const index = comment.dislikes.indexOf(user);
    if (index !== -1) {
      comment.dislikes.splice(index, 1);
    }
    comment.likes.push(user);
    await comment.save();

    return res.json('Comment liked successfully!');
  }),
];

// @desc    Dislike post comment
// @route   PUT /posts/:slug/comments/:commentID/dislike
export const dislikeComment = [
  body('user')
    .trim()
    .isMongoId()
    .withMessage('User field must be a valid MongoDB ID'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const user = req.body.user;
    const commentID = req.params.commentID;

    // Make sure the user exists
    const userExists = await User.findById(user).exec();

    if (!userExists) {
      return res
        .status(400)
        .json('Error while disliking a post comment. Please try again');
    }

    const comment = await Comment.findOne({ _id: commentID });

    // Only remove dislike if the post comment is already disliked by the user
    if (comment.dislikes.includes(user)) {
      const index = comment.dislikes.indexOf(user);
      comment.dislikes.splice(index, 1);
      await comment.save();

      return res.json('Comment undisliked successfully!');
    }

    // Otherwise remove like from the post comment if it exists and push dislike to the post comment
    const index = comment.likes.indexOf(user);
    if (index !== -1) {
      comment.likes.splice(index, 1);
    }
    comment.dislikes.push(user);
    await comment.save();

    return res.json('Comment disliked successfully!');
  }),
];
