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
  registered_at: {
    type: Date,
    required: true,
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxLength: 320,
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
