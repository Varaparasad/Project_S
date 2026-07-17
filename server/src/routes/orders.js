import { Router } from 'express';
import { z } from 'zod';
import Order from '../models/Order.js';
import Snack from '../models/Snack.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendOrderAlert } from '../services/email.js';
import StoreSettings from '../models/StoreSettings.js';

const router = Router();
const statuses = ['request_received', 'contacting_customer', 'awaiting_advance_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
const instantOpen = (settings, now = new Date()) => { const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now); return settings.instantStartTime <= settings.instantEndTime ? time >= settings.instantStartTime && time < settings.instantEndTime : time >= settings.instantStartTime || time < settings.instantEndTime; };
const createSchema = z.object({ items: z.array(z.object({ snackId: z.string().length(24), quantity: z.number().int().min(1).max(50) })).min(1).max(30), fulfilment: z.enum(['pickup', 'delivery']), deliveryAddress: z.string().max(500).optional(), phone: z.string().min(7).max(20) });

router.post('/', requireAuth, validate(createSchema), async (req, res, next) => { try {
  if (req.body.fulfilment === 'delivery' && !req.body.deliveryAddress?.trim()) return res.status(400).json({ message: 'A delivery address is required.' });
  const snackIds = req.body.items.map(i => i.snackId);
  const snacks = await Snack.find({ _id: { $in: snackIds }, active: true });
  if (snacks.length !== snackIds.length) return res.status(400).json({ message: 'One or more snacks are unavailable.' });
  const map = new Map(snacks.map(s => [s.id, s]));
  const settings = await StoreSettings.findOneAndUpdate({ key: 'main' }, {}, { new: true, upsert: true, setDefaultsOnInsert: true });
  const items = req.body.items.map(({ snackId, quantity }) => { const s = map.get(snackId); if (quantity > s.availableQuantity) throw new Error(`${s.name} has only ${s.availableQuantity} available.`); if (!(req.body.fulfilment === 'pickup' ? s.pickupAvailable : s.deliveryAvailable)) throw new Error(`${s.name} is not available for this fulfilment type.`); const isInstant = s.preparationType === 'instant'; if (isInstant && !instantOpen(settings)) throw new Error(`${s.name} is currently outside instant-order hours.`); return { snack: s.id, name: s.name, imageUrl: s.imageUrl, quantity, price: s.price, advanceAmount: isInstant ? 0 : s.advanceAmount, minimumPreparationDays: isInstant ? 0 : s.minimumPreparationDays, preparationType: isInstant ? 'instant' : 'made_to_order', unit: s.unit }; });
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const advanceRequired = items.reduce((sum, i) => sum + i.advanceAmount * i.quantity, 0);
  const days = Math.max(...items.map(i => i.minimumPreparationDays));
  const expectedReadyDate = new Date(); expectedReadyDate.setDate(expectedReadyDate.getDate() + days);
  req.user.phone = req.body.phone; if (req.body.deliveryAddress) req.user.address = req.body.deliveryAddress; await req.user.save();
  const order = await Order.create({ customer: req.user.id, customerName: req.user.name, customerEmail: req.user.email, customerPhone: req.body.phone, fulfilment: req.body.fulfilment, deliveryAddress: req.body.deliveryAddress || '', items, totalAmount, advanceRequired, expectedReadyDate });
  sendOrderAlert(order).catch(err => console.error('Order email failed:', err.message));
  res.status(201).json({ order });
} catch (e) { next(e); } });
router.get('/my-orders', requireAuth, async (req, res, next) => { try { res.json({ orders: await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.get('/admin', requireAuth, requireAdmin, async (req, res, next) => { try { const filter = req.query.status ? { status: req.query.status } : {}; if (req.query.kind === 'instant') filter['items.preparationType'] = 'instant'; if (req.query.kind === 'made_to_order') filter['items.preparationType'] = { $ne: 'instant' }; res.json({ orders: await Order.find(filter).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.patch('/admin/:id/status', requireAuth, requireAdmin, validate(z.object({ status: z.enum(statuses), adminNote: z.string().max(1000).optional() })), async (req, res, next) => { try { const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: 'Order not found.' }); if (req.body.status === 'confirmed' && order.status !== 'confirmed') { const reduced = []; for (const item of order.items) { const snack = await Snack.findOneAndUpdate({ _id: item.snack, availableQuantity: { $gte: item.quantity } }, { $inc: { availableQuantity: -item.quantity } }, { new: true }); if (!snack) { for (const previous of reduced) await Snack.findByIdAndUpdate(previous.snack, { $inc: { availableQuantity: previous.quantity } }); return res.status(409).json({ message: 'Insufficient available quantity for one or more items.' }); } reduced.push(item); } } Object.assign(order, req.body); await order.save(); res.json({ order }); } catch (e) { next(e); } });
router.get('/:id', requireAuth, async (req, res, next) => { try { const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: 'Order not found.' }); if (req.user.role !== 'admin' && order.customer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized.' }); res.json({ order }); } catch (e) { next(e); } });
export default router;
