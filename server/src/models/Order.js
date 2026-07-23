import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  snack: { type: mongoose.Schema.Types.ObjectId, ref: 'Snack', required: true },
  name: String, imageUrl: String, quantity: { type: Number, min: 1 },
  price: Number, advanceAmount: Number, minimumPreparationDays: Number, preparationType: String, unit: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: String, customerEmail: String, customerPhone: String,
  fulfilment: { type: String, enum: ['pickup', 'delivery'], required: true },
  deliveryAddress: { type: String, default: '' },
  latitude: Number,
  longitude: Number,
  items: { type: [itemSchema], validate: v => v.length > 0 },
  totalAmount: { type: Number, required: true },
  advanceRequired: { type: Number, default: 0 },
  expectedReadyDate: { type: Date, required: true },
  status: { type: String, enum: ['request_received', 'contacting_customer', 'awaiting_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'], default: 'request_received' },
  adminNote: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
