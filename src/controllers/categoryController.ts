import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import slugify from 'slugify';
import { handleUpload } from '../config/cloudinary';
import {
  defaultCategoryIcon,
  getFirstErrorMsg,
  replaceQuestionMarks,
} from '../config/helpers';
import {
  checkCategoryNameAvailability,
  checkFirstCharacter,
  checkForNew,
} from '../config/middleware';
import { upload } from '../config/multer';
import Category from '../models/Category';
import Post from '../models/Post';
import User from '../models/User';

// @desc    Get all categories (in ascending order)
// @route   GET /categories
export const getAllCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const allCategories = await Category.find({})
      .sort({ name: 1 })
      .lean()
      .exec();
    res.json(allCategories);
  }
);

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

  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Return the first validation error message if there are any errors
      const firstErrorMsg = getFirstErrorMsg(errors);
      res.status(400).json(firstErrorMsg);
      return;
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
      slug: slugify(replaceQuestionMarks(name), { lower: true }),
    }).save();

    res.json('Category created successfully!');
  }),
];

// @desc    Get single category
// @desc    Get category posts and followers as well
// @route   GET /categories/:slug
export const getSingleCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const slug = req.params.slug;

    const category = await Category.findOne({ slug }).lean().exec();

    if (!category) {
      res.status(404).json('Category not found');
      return;
    }

    // Get the number of posts and followers of the category
    const [postsCount, followersCount] = await Promise.all([
      Post.countDocuments({ category: category._id }).lean().exec(),
      User.countDocuments({ followed_categories: category._id }).lean().exec(),
    ]);

    // Return category and both counts as a single object
    const enrichedCategory = { ...category, postsCount, followersCount };

    res.json(enrichedCategory);
  }
);
