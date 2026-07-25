import { Router } from 'express';
import { z } from 'zod';
import Snack from '../models/Snack.js';
import Review from '../models/Review.js';
import StoreSettings from '../models/StoreSettings.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const snackInput = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).default(''),
  imageUrl: z.string().url().or(z.literal('')).default(''),
  imageUrls: z.array(z.string().url()).max(6).default([]),
  category: z.string().max(60).default('Snacks'),
  price: z.number().nonnegative(),
  advanceAmount: z.number().nonnegative().optional().default(0),
  minimumPreparationDays: z.number().int().nonnegative().default(1),
  maximumPreparationDays: z.number().int().nonnegative().optional().default(0),
  preparationType: z.enum(['made_to_order', 'instant']).default('made_to_order'),
  unit: z.enum(['piece', 'kg', 'litre']).default('piece'),
  availableQuantity: z.number().int().nonnegative().default(9999),
  pickupAvailable: z.boolean().default(true),
  deliveryAvailable: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  active: z.boolean().default(true)
});
const instantOpen = (settings, now = new Date()) => { const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now); const start = settings.instantStartTime; const end = settings.instantEndTime; return start <= end ? time >= start && time < end : time >= start || time < end; };

router.get('/', async (req, res, next) => { try {
  const { search = '', category, includeInactive } = req.query;
  const query = { ...(includeInactive === 'true' ? {} : { active: true }), ...(category ? { category } : {}), ...(search ? { name: { $regex: search, $options: 'i' } } : {}) };
  const snacks = await Snack.find(query).sort({ isFavorite: -1, isPopular: -1, createdAt: -1 }).lean();
  const ratings = await Review.aggregate([{ $match: { snack: { $in: snacks.map(snack => snack._id) } } }, { $group: { _id: '$snack', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]);
  const ratingMap = new Map(ratings.map(rating => [rating._id.toString(), { averageRating: Number(rating.averageRating.toFixed(1)), reviewCount: rating.reviewCount }]));
  const settings = await StoreSettings.findOneAndUpdate({ key: 'main' }, {}, { new: true, upsert: true, setDefaultsOnInsert: true });
  const isAdminListing = includeInactive === 'true';
  res.json({ snacks: snacks.filter(snack => isAdminListing || snack.availableQuantity > 0).map(snack => ({ ...snack, instantAvailable: snack.preparationType !== 'instant' || instantOpen(settings), ...(ratingMap.get(snack._id.toString()) || { averageRating: null, reviewCount: 0 }) })) });
} catch (e) { next(e); } });
router.get('/:id', async (req, res, next) => { try { const snack = await Snack.findById(req.params.id).lean(); if (!snack || !snack.active) return res.status(404).json({ message: 'Snack not found.' }); const ratings = await Review.aggregate([{ $match: { snack: snack._id } }, { $group: { _id: '$snack', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]); const rating = ratings[0]; res.json({ snack: { ...snack, averageRating: rating ? Number(rating.averageRating.toFixed(1)) : null, reviewCount: rating?.reviewCount || 0 } }); } catch (e) { next(e); } });
router.post('/', requireAuth, requireAdmin, validate(snackInput), async (req, res, next) => { try { if (req.body.imageUrls.length) req.body.imageUrl = req.body.imageUrls[0]; if (req.body.preparationType === 'instant') { req.body.advanceAmount = 0; req.body.minimumPreparationDays = 0; } res.status(201).json({ snack: await Snack.create(req.body) }); } catch (e) { next(e); } });
router.patch('/:id', requireAuth, requireAdmin, validate(snackInput.partial()), async (req, res, next) => { try { if (req.body.preparationType === 'instant') { req.body.advanceAmount = 0; req.body.minimumPreparationDays = 0; } const snack = await Snack.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!snack) return res.status(404).json({ message: 'Snack not found.' }); res.json({ snack }); } catch (e) { next(e); } });
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => { try {
  const isHard = req.query.hard === 'true';
  const snack = isHard ? await Snack.findByIdAndDelete(req.params.id) : await Snack.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!snack) return res.status(404).json({ message: 'Snack not found.' });
  res.json({ message: 'Snack deleted successfully.', snack });
} catch (e) { next(e); } });
export default router;
