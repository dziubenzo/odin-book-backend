import Category from '../models/Category.js';

import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import { getFirstErrorMsg } from '../config/helpers.js';

// @desc    Get all categories
// @route   GET /categories
export const getAllCategories = asyncHandler(async (req, res, next) => {
  const allCategories = await Category.find({}).exec();

  return res.json(allCategories);
});
