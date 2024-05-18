import User from '../models/User.js';

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

// Check if the username provided is consistent with regex pattern (starts with a letter and contains only word characters)
export const checkUsernamePattern = (value) => {
  const regex = /^[a-zA-z]\w+$/;
  return regex.test(value);
};

// Check if passwords match
export const checkPasswordsEquality = (value, { req }) => {
  return value === req.body.password;
};
