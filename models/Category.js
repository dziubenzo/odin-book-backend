import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    minLength: 3,
    maxLength: 32,
  },
  thumbnail: {
    type: String,
  },
  description: {
    type: String,
    minLength: 3,
    maxLength: 320,
  },
  created_at: {
    type: Date,
    required: true,
  },
});

export default mongoose.model('Category', CategorySchema);
