import type { Meta } from 'express-validator';
import slugify from 'slugify';
import Category from '../models/Category';
import User from '../models/User';
import { allowedFilterValues, allowedPostTypes } from './helpers';

// Check if the username provided is available (case-insensitive)
export const checkUsernameAvailability = async (value: string) => {
  const usernameTaken = await User.exists({
    username: { $regex: new RegExp(`^${value}$`), $options: 'i' },
  })
    .lean()
    .exec();
  if (usernameTaken) {
    return Promise.reject();
  }
  return Promise.resolve();
};

// Check if the username/category name does not start with a number
export const checkFirstCharacter = (value: string) => {
  const firstCharacter = value[0];
  return !(firstCharacter >= '0' && firstCharacter <= '9');
};

// Check if passwords match
export const checkPasswordsEquality = (value: string, meta: Meta) => {
  const req = meta.req;
  return value === req.body.password;
};

// Check if the category name provided is available based on potential slug equality (to ensure slug and, hence, name uniqueness)
export const checkCategoryNameAvailability = async (value: string) => {
  const categoryFound = await Category.findOne({
    slug: slugify(value, { lower: true }),
  })
    .lean()
    .exec();
  if (categoryFound) {
    return Promise.reject();
  }
  return Promise.resolve();
};

// Check if the post type query parameter is one of the three allowed types
export const checkPostType = (value: string) => {
  return allowedPostTypes.includes(value) ? true : false;
};

// Check if the filter query parameter is one of the four allowed types
export const checkFilterQueryParameter = (value: string) => {
  return allowedFilterValues.includes(value) ? true : false;
};

// Check if the category provided in the category query parameter exists
// If it does, save the category ID for later use
export const checkCategoryExistence = async (value: string, meta: Meta) => {
  const categoryExists = await Category.findOne({
    slug: value,
  })
    .lean()
    .exec();
  if (categoryExists) {
    const req = meta.req;
    req.query!.categoryID = categoryExists._id;
    return Promise.resolve();
  }
  return Promise.reject();
};

// Check if the user provided in the user query parameter exists
// If they do, save the user ID for later use
export const checkUserExistence = async (value: string, meta: Meta) => {
  const userExists = await User.findOne({
    username: value,
  })
    .lean()
    .exec();
  if (userExists) {
    const req = meta.req;
    req.query!.userID = userExists._id;
    return Promise.resolve();
  }
  return Promise.reject();
};

// Make sure a new category cannot be named "new" so that it does not collide with the '/categories/new' route once created
export const checkForNew = (value: string) => {
  return value.toLowerCase() === 'new' ? true : false;
};
