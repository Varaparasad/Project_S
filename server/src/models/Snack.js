import mongoose from 'mongoose';

const snackSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 1000 },
  imageUrl: { type: String, default: '' },
  category: { type: String, default: 'Snacks', trim: true },
  price: { type: Number, required: true, min: 0 },
  advanceAmount: { type: Number, required: true, min: 0 },
  minimumPreparationDays: { type: Number, required: true, min: 0 },
  preparationType: { type: String, enum: ['made_to_order', 'instant'], default: 'made_to_order' },
  unit: { type: String, enum: ['piece', 'kg', 'litre'], default: 'piece' },
  availableQuantity: { type: Number, required: true, min: 0, default: 9999 },
  pickupAvailable: { type: Boolean, default: true },
  deliveryAvailable: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Snack', snackSchema);
