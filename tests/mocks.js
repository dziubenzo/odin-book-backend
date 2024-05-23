import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const passwordUser1 = 'password1';
export const passwordUser2 = 'password2';

export const user1 = {
  _id: new mongoose.Types.ObjectId(),
  username: `user1`,
  password: await bcrypt.hash(passwordUser1, 10),
  registered_at: Date.now(),
  avatar: '',
  bio: '',
  followed_users: [],
  followed_categories: [],
  __v: 0,
};
export const user2 = {
  ...user1,
  _id: new mongoose.Types.ObjectId(),
  username: 'user2',
  password: await bcrypt.hash(passwordUser2, 10),
};

export const validCredentials = {
  username: 'user3',
  password: 'password',
  confirm_password: 'password',
};
