import mongoose from 'mongoose';
const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  storeAddress: { type: String, default: "Reddy's Home Foods, Main Road, Gourmet Plaza, Suite 10" },
  storePhone: { type: String, default: '+91 98765 43210' },
  storeEmail: { type: String, default: 'support@reddyshomefoods.com' },
  customerCareNotice: { type: String, default: "Available Mon-Sat 9 AM - 9 PM for order confirmation, custom batches & support at Reddy's Home Foods." },
  instantStartTime: { type: String, default: '09:00' },
  instantEndTime: { type: String, default: '20:00' }
}, { timestamps: true });
export default mongoose.model('StoreSettings', storeSettingsSchema);
