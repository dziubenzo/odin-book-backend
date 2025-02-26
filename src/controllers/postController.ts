import crypto from 'crypto';
import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { body, query, validationResult } from 'express-validator';
import fetch from 'node-fetch';
import sanitizeHtml from 'sanitize-html';
import slugify from 'slugify';
import { handlePostImageUpload } from '../config/cloudinary';
import { allowedImageFormats, getFirstErrorMsg } from '../config/helpers';
import {
  checkCategoryExistence,
  checkFilterQueryParameter,
  checkPostType,
  checkUserExistence,
} from '../config/middleware';
import { upload } from '../config/multer';
import Category from '../models/Category';
import Post from '../models/Post';
import User from '../models/User';

// @desc    Get all posts in descending order (newest first)
// @desc    Accepts limit, skip and filter query parameters
// @route   GET /posts
export const getAllPosts = [
  query('limit')
    .optional()
    .trim()
    .isInt()
    .withMessage('Limit query parameter must be an integer'),
  query('skip')
    .optional()
    .trim()
    .isInt()
    .withMessage('Skip query parameter must be an integer'),
  query('filter')
    .optional()
    .trim()
    .custom(checkFilterQueryParameter)
    .withMessage('Invalid filter query parameter'),
  query('category')
    .optional()
    .trim()
    .custom(checkCategoryExistence)
    .withMessage('Invalid category query parameter'),
  query('user')
    .optional()
    .trim()
    .custom(checkUserExistence)
    .withMessage('Invalid user query parameter'),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const limit = (req.query.limit as string) || undefined;
    const skip = (req.query.skip as string) || undefined;
    const filter = req.query.filter;
    const category = req.query.category;
    const user = req.query.user;
    let query = {};

    // Construct a query if the filter/category/user query parameter is provided
    if (filter) {
      const loggedInUser = req.user;
      if (!loggedInUser) {
        res.status(400).json('Error while retrieving posts. Please try again');
        return;
      }
      switch (filter) {
        case 'categories':
          query = { category: loggedInUser.followed_categories };
          break;
        case 'following':
          query = { author: loggedInUser.followed_users };
          break;
        case 'liked':
          query = { likes: loggedInUser._id };
          break;
        case 'yours':
          query = { author: loggedInUser._id };
          break;
      }
    }

    if (category) {
      const categoryID = req.query.categoryID;
      query = { category: categoryID };
    }

    if (user) {
      const userID = req.query.userID;
      query = { author: userID };
    }

    const allPosts = await Post.find(query)
      .populate({ path: 'author', select: 'username avatar' })
      .populate({ path: 'category', select: 'name slug' })
      .sort({ created_at: -1 })
      // Apply the limit if provided
      .limit(limit ? parseInt(limit) : Infinity)
      // Apply the skip if provided
      .skip(skip ? parseInt(skip) : 0)
      .exec();

    res.json(allPosts);
  }),
];

// @desc    Create post
// @route   POST /posts
export const createPost = [
  upload.single('uploaded_image'),
  query('type')
    .trim()
    .isString()
    .custom(checkPostType)
    .withMessage('Invalid post type'),
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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const type = req.query.type;
    const author = req.body.author;
    const title = req.body.title;
    const category = req.body.category;
    let content;

    // Handle text post
    if (type === 'text') {
      // Sanitise HTML content
      content = sanitizeHtml(req.body.content);
    }

    // Make sure both the author and the category exist in the DB
    const [authorExists, categoryExists] = await Promise.all([
      User.findById(author).exec(),
      Category.findById(category).exec(),
    ]);

    // Return an error message if either does not exist
    if (!authorExists || !categoryExists) {
      res.status(400).json('Error while creating a post. Please try again');
      return;
    }

    // Handle image post (both URL and file)
    if (type === 'image' && req.file) {
      // Make sure only supported image formats are accepted
      if (!allowedImageFormats.includes(req.file.mimetype)) {
        res.status(400).json('Unsupported file format');
        return;
      }
      const { secure_url } = await handlePostImageUpload(
        req.file.buffer,
        req.file.mimetype
      );
      // Create an img tag with the uploaded image
      content = `<img class="post-image" src="${secure_url}" alt="Image for the ${title} post"/>`;
    } else if (type === 'image') {
      const response = await fetch(req.body.content);
      if (!response.ok) {
        res.status(400).json('Error while creating a post. Please try again');
        return;
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !allowedImageFormats.includes(contentType)) {
        res.status(400).json('Unsupported file format');
        return;
      }
      const resBuffer = await response.arrayBuffer();
      const { secure_url } = await handlePostImageUpload(
        resBuffer,
        contentType
      );
      content = `<img class="post-image" src="${secure_url}" alt="Image for the ${title} post"/>`;
    }

    // Handle video post
    if (type === 'video') {
      // Make sure the link is of a YT embed type
      if (!req.body.content.startsWith('https://www.youtube.com/embed/')) {
        res.status(400).json('Error while creating a post. Please try again');
        return;
      }
      content = `<iframe class="yt-video-player" src="${req.body.content}" title="YouTube video player for the ${title} post" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""/>`;
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
    res.json(newPost);
  }),
];

// @desc    Get single post
// @route   GET /posts/:slug
export const getSinglePost = asyncHandler(
  async (req: Request, res: Response) => {
    const slug = req.params.slug;

    const post = await Post.findOne({ slug })
      .populate({ path: 'author', select: 'username avatar' })
      .populate({ path: 'category', select: 'name slug' })
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username avatar' },
        // Sort comments in descending order (newest first)
        options: { sort: { created_at: -1 } },
      })
      .lean()
      .exec();

    if (!post) {
      res.status(404).json('Post not found');
      return;
    }

    res.json(post);
  }
);

// @desc    Like post
// @route   PUT /posts/:slug/like
export const likePost = [
  body('user')
    .trim()
    .isMongoId()
    .withMessage('User field must be a valid MongoDB ID'),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const slug = req.params.slug;
    const user = req.body.user;

    // Make sure the user and post exist
    const [userExists, post] = await Promise.all([
      User.findById(user).exec(),
      Post.findOne({ slug }).exec(),
    ]);

    if (!userExists || !post) {
      res.status(400).json('Error while liking a post. Please try again');
      return;
    }

    // Only remove like if the post is already liked by the user
    if (post.likes.includes(user)) {
      const index = post.likes.indexOf(user);
      post.likes.splice(index, 1);
      await post.save();

      res.json('Post unliked successfully!');
      return;
    }

    // Otherwise remove dislike from the post if it exists and push like to the post
    const index = post.dislikes.indexOf(user);
    if (index !== -1) {
      post.dislikes.splice(index, 1);
    }
    post.likes.push(user);
    await post.save();

    res.json('Post liked successfully!');
  }),
];

// @desc    Dislike post
// @route   PUT /posts/:slug/dislike
export const dislikePost = [
  body('user')
    .trim()
    .isMongoId()
    .withMessage('User field must be a valid MongoDB ID'),

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
    }

    const slug = req.params.slug;
    const user = req.body.user;

    // Make sure the user and post exist
    const [userExists, post] = await Promise.all([
      User.findById(user).exec(),
      Post.findOne({ slug }).exec(),
    ]);

    if (!userExists || !post) {
      res.status(400).json('Error while disliking a post. Please try again');
      return;
    }

    // Only remove dislike if the post is already disliked by the user
    if (post.dislikes.includes(user)) {
      const index = post.dislikes.indexOf(user);
      post.dislikes.splice(index, 1);
      await post.save();

      res.json('Post undisliked successfully!');
      return;
    }

    // Otherwise remove like from the post if it exists and push dislike to the post
    const index = post.likes.indexOf(user);
    if (index !== -1) {
      post.likes.splice(index, 1);
    }
    post.dislikes.push(user);
    await post.save();

    res.json('Post disliked successfully!');
  }),
];
