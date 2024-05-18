import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    minLength: 3,
    maxLength: 16,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  registration_date: {
    type: Date,
    required: true,
  },
  avatar: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    maxLength: 160,
  },
  followed_users: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  followed_categories: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
  ],
});

export default mongoose.model('User', UserSchema);
