import User from '../models/User.js';
import Category from '../models/Category.js';

import passport from 'passport';
import slugify from 'slugify';

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
