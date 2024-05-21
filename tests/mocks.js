import mongoose from 'mongoose';

export const user1 = {
  _id: new mongoose.Types.ObjectId(),
  username: `user1`,
  password: 'password1',
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
  password: 'password2',
};
