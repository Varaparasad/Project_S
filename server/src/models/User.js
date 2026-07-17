import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  phone: { type: String, trim: true, maxlength: 20 },
  address: { type: String, trim: true, maxlength: 500 },
  addresses: [{ label: { type: String, trim: true, maxlength: 40 }, line: { type: String, trim: true, maxlength: 300 }, city: { type: String, trim: true, maxlength: 80 }, pincode: { type: String, trim: true, maxlength: 12 }, isDefault: { type: Boolean, default: false } }],
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
