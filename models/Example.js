import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ExampleSchema = new Schema({
  some_example: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 16,
  },
  another_one: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export default mongoose.model('Example', ExampleSchema);
