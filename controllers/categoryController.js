import Category from '../models/Category.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import { getFirstErrorMsg, defaultCategoryIcon } from '../config/helpers.js';
import {
  checkFirstCharacter,
  checkCategoryNameAvailability,
  checkForNew,
} from '../config/middleware.js';
import slugify from 'slugify';
import { upload } from '../config/multer.js';
import { handleUpload } from '../config/cloudinary.js';

// @desc    Get all categories
// @route   GET /categories
export const getAllCategories = asyncHandler(async (req, res, next) => {
  const allCategories = await Category.find({}).exec();

  return res.json(allCategories);
});

// @desc    Create category
// @route   POST /categories
export const createCategory = [
  upload.single('uploaded_icon'),
  body('name')
    .trim()
    .isLength({ min: 3, max: 32 })
    .withMessage('Category name must contain between 3 and 32 characters')
    .custom(checkFirstCharacter)
    .withMessage('Category name cannot start with a number')
    .custom(checkCategoryNameAvailability)
    .withMessage('Category already exists')
    .custom(checkForNew)
    .withMessage('Prohibited category name'),
  body('description')
    .trim()
    .isLength({ min: 3, max: 320 })
    .withMessage(
      'Category description must contain between 3 and 320 characters'
    ),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      return res.status(400).json(firstErrorMsg);
    }

    const name = req.body.name;
    const description = req.body.description;
    let icon = defaultCategoryIcon;

    // Transform and upload icon to Cloudinary if image sent with request
    if (req.file) {
      const cloudinaryRes = await handleUpload(
        req.file,
        'odin_book/category_icons'
      );

      icon = cloudinaryRes.secure_url;
    }

    // Create new category
    await new Category({
      name,
      icon,
      description,
      created_at: Date.now(),
      slug: slugify(name, { lower: true }),
    }).save();

    return res.json('Category created successfully!');
  }),
];

// @desc    Get single category
// @desc    Get category posts and followers as well
// @route   GET /categories/:slug
export const getSingleCategory = asyncHandler(async (req, res, next) => {
  const slug = req.params.slug;

  const category = await Category.findOne({ slug }).lean().exec();

  if (!category) {
    return res.status(404).json('Category not found');
  }

  // Get the number of posts and followers of the category
  const [postsCount, followersCount] = await Promise.all([
    Post.countDocuments({ category: category._id }).lean().exec(),
    User.countDocuments({ followed_categories: category._id }).lean().exec(),
  ]);

  // Return category and both counts as a single object
  const enrichedCategory = { ...category, postsCount, followersCount };

  return res.json(enrichedCategory);
});
