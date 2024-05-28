import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    minLength: 3,
    maxLength: 320,
  },
  created_at: {
    type: Date,
    required: true,
  },
  likes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
});

export default mongoose.model('Comment', CommentSchema);
