import User from '../models/User.js';
import Category from '../models/Category.js';

import passport from 'passport';

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

// Check if the category name provided is available (case-insensitive)
export const checkCategoryNameAvailability = async (value) => {
  const categoryNameTaken = await Category.exists({
    name: { $regex: value, $options: 'i' },
  })
    .lean()
    .exec();
  if (categoryNameTaken) {
    return Promise.reject();
  }
  return Promise.resolve();
};

// Check if user is authenticated
export const checkAuth = passport.authenticate('jwt', { session: false });
