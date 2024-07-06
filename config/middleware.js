import User from '../models/User.js';
import Category from '../models/Category.js';

import passport from 'passport';
import slugify from 'slugify';
import { allowedFilterValues, allowedPostTypes } from './helpers.js';

// Check if the username provided is available (case-insensitive)
export const checkUsernameAvailability = async (value) => {
  const usernameTaken = await User.exists({
    username: { $regex: value, $options: 'i' },
  })
    .lean()
    .exec();
  if (usernameTaken) {
    return Promise.reject();
  }
  return Promise.resolve();
};

// Check if the username/category name does not start with a number
export const checkFirstCharacter = (value) => {
  const firstCharacter = value[0];
  return !(firstCharacter >= '0' && firstCharacter <= '9');
};

// Check if passwords match
export const checkPasswordsEquality = (value, { req }) => {
  return value === req.body.password;
};

// Check if the category name provided is available based on potential slug equality (to ensure slug and, hence, name uniqueness)
export const checkCategoryNameAvailability = async (value) => {
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

// Check if user is authenticated
export const checkAuth = passport.authenticate('jwt', { session: false });

// Check if the post type query parameter is one of the three allowed types
export const checkPostType = (value) => {
  if (allowedPostTypes.includes(value)) {
    return true;
  } else {
    return false;
  }
};

// Check if the filter query parameter is one of the four allowed types
export const checkFilterQueryParameter = (value) => {
  if (allowedFilterValues.includes(value)) {
    return true;
  } else {
    return false;
  }
};

// Check if the category provided in the category query parameter exists
// If it does, save the category ID for later use
export const checkCategoryExistence = async (value, { req }) => {
  const categoryExists = await Category.findOne({
    slug: value,
  })
    .lean()
    .exec();
  if (categoryExists) {
    req.query.categoryID = categoryExists._id;
    return Promise.resolve();
  }
  return Promise.reject();
};

// Check if the user provided in the user query parameter exists
// If they do, save the user ID for later use
export const checkUserExistence = async (value, { req }) => {
  const userExists = await User.findOne({
    username: value,
  })
    .lean()
    .exec();
  if (userExists) {
    req.query.userID = userExists._id;
    return Promise.resolve();
  }
  return Promise.reject();
};
