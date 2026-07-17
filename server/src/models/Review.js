import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  snack: { type: mongoose.Schema.Types.ObjectId, ref: 'Snack', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 600 }
}, { timestamps: true });

reviewSchema.index({ snack: 1, order: 1 }, { unique: true });
export default mongoose.model('Review', reviewSchema);
