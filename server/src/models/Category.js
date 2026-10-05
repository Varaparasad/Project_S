import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
  imageUrl: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
