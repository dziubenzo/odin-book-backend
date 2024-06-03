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

    // Check if the post comment is already liked by the user
    const comment = await Comment.findOne({ _id: commentID });

    if (comment.likes.includes(user)) {
      return res.json("You've already liked this comment!");
    }

    // Push new like to the post comment
    comment.likes.push(user);
    await comment.save();

    return res.json('Comment liked successfully!');
  }),
];

// @desc    Unlike post comment
// @route   PUT /posts/:slug/comments/:commentID/unlike
export const unlikeComment = [
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
        .json('Error while unliking a post comment. Please try again');
    }

    // Make sure the post comment is already liked by the user
    const { likes: currentCommentLikes } = await Comment.findOne(
      { _id: commentID },
      'likes -_id'
    );

    if (!currentCommentLikes.includes(user)) {
      return res.json('Like the comment first to unlike it!');
    }

    // Remove like from the post comment
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentID },
      { $pull: { likes: user } },
      { new: true }
    );

    return res.json('Comment unliked successfully!');
  }),
];
