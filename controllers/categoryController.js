import Category from '../models/Category.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import { getFirstErrorMsg, defaultCategoryIcon } from '../config/helpers.js';
import {
  checkPattern,
  checkCategoryNameAvailability,
} from '../config/middleware.js';
import slugify from 'slugify';

// @desc    Get all categories
// @route   GET /categories
export const getAllCategories = asyncHandler(async (req, res, next) => {
  const allCategories = await Category.find({}).exec();

  return res.json(allCategories);
});

// @desc    Create category
// @route   POST /categories
export const createCategory = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 32 })
    .withMessage('Category name must contain between 3 and 32 characters')
    .custom(checkPattern)
    .withMessage(
      'Category name must start with a letter and contain only a-z, A-Z and 0-9 characters'
    )
    .custom(checkCategoryNameAvailability)
    .withMessage('Category already exists'),
  body('icon').trim(),
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
    const icon = req.body.icon || defaultCategoryIcon;
    const description = req.body.description;

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
// @route   GET /categories/:slug
export const getSingleCategory = asyncHandler(async (req, res, next) => {
  const slug = req.params.slug;

  const category = await Category.findOne({ slug }).exec();

  if (!category) {
    return res.status(404).json('Category not found');
  }

  return res.json(category);
});
