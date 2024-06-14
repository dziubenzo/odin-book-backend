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
      .populate({ path: 'author', select: 'username' })
      .populate({ path: 'category', select: 'name slug' })
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

    // Create new post and make it liked by post author by default
    const newPost = await new Post({
      author,
      title,
      content,
      category,
      created_at: Date.now(),
      likes: [author],
      dislikes: [],
      comments: [],
      slug: slugify(title + uniqueString, { lower: true }),
    }).save();

    // Return new post
    return res.json(newPost);
  }),
];

// @desc    Get single post
// @route   GET /posts/:slug
export const getSinglePost = asyncHandler(async (req, res, next) => {
  const slug = req.params.slug;

  const post = await Post.findOne({ slug })
    .populate({ path: 'author', select: 'username' })
    .populate({ path: 'category', select: 'name slug' })
    .populate({
      path: 'comments',
      populate: { path: 'author', select: 'username avatar' },
      // Sort comments in descending order (newest first)
      options: { sort: { created_at: -1 } },
    })
    .exec();

  if (!post) {
    return res.status(404).json('Post not found');
  }

  return res.json(post);
});

// @desc    Like post
// @route   PUT /posts/:slug/like
export const likePost = [
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

    const slug = req.params.slug;
    const user = req.body.user;

    // Make sure the user exists
    const userExists = await User.findById(user).exec();

    if (!userExists) {
      return res
        .status(400)
        .json('Error while liking a post. Please try again');
    }

    const post = await Post.findOne({ slug });

    // Only remove like if the post is already liked by the user
    if (post.likes.includes(user)) {
      const index = post.likes.indexOf(user);
      post.likes.splice(index, 1);
      await post.save();

      return res.json('Post unliked successfully!');
    }

    // Otherwise remove dislike from the post if it exists and push like to the post
    const index = post.dislikes.indexOf(user);
    if (index !== -1) {
      post.dislikes.splice(index, 1);
    }
    post.likes.push(user);
    await post.save();

    return res.json('Post liked successfully!');
  }),
];

// @desc    Dislike post
// @route   PUT /posts/:slug/dislike
export const dislikePost = [
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

    const slug = req.params.slug;
    const user = req.body.user;

    // Make sure the user exists
    const userExists = await User.findById(user).exec();

    if (!userExists) {
      return res
        .status(400)
        .json('Error while disliking a post. Please try again');
    }

    // Check if the post is already disliked by the user
    const post = await Post.findOne({ slug });

    // Only remove dislike if the post is already disliked by the user
    if (post.dislikes.includes(user)) {
      const index = post.dislikes.indexOf(user);
      post.dislikes.splice(index, 1);
      await post.save();

      return res.json('Post undisliked successfully!');
    }

    // Otherwise remove like from the post if it exists and push dislike to the post
    const index = post.likes.indexOf(user);
    if (index !== -1) {
      post.likes.splice(index, 1);
    }
    post.dislikes.push(user);
    await post.save();

    return res.json('Post disliked successfully!');
  }),
];
