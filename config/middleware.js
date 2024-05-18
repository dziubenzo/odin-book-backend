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

// Check if passwords match
export const checkPasswordsEquality = (value, { req }) => {
  return value === req.body.password;
};
