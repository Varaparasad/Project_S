import { Router } from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.get('/snack/:snackId', async (req, res, next) => { try {
  const reviews = await Review.find({ snack: req.params.snackId }).sort({ createdAt: -1 }).select('customerName rating comment createdAt');
  const summary = reviews.length ? { count: reviews.length, average: Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) } : { count: 0, average: null };
  res.json({ reviews, summary });
} catch (e) { next(e); } });
router.get('/mine', requireAuth, async (req, res, next) => { try {
  const reviews = await Review.find({ customer: req.user.id }).select('snack order rating').lean();
  res.json({ reviews });
} catch (e) { next(e); } });
router.post('/', requireAuth, validate(z.object({ snackId: z.string().length(24), orderId: z.string().length(24), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3).max(600) })), async (req, res, next) => { try {
  const order = await Order.findOne({ _id: req.body.orderId, customer: req.user.id, status: 'delivered' });
  if (!order || !order.items.some(item => item.snack.toString() === req.body.snackId)) return res.status(403).json({ message: 'You can review only snacks from your delivered orders.' });
  const review = await Review.create({ snack: req.body.snackId, order: order.id, customer: req.user.id, customerName: req.user.name, rating: req.body.rating, comment: req.body.comment });
  res.status(201).json({ review });
} catch (e) { if (e?.code === 11000) return res.status(409).json({ message: 'You already reviewed this snack for this order.' }); next(e); } });
export default router;
