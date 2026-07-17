import mongoose from 'mongoose';
const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  instantStartTime: { type: String, default: '09:00' },
  instantEndTime: { type: String, default: '20:00' }
}, { timestamps: true });
export default mongoose.model('StoreSettings', storeSettingsSchema);
