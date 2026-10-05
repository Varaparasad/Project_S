import { Router } from 'express';
import { z } from 'zod';
import Category from '../models/Category.js';
import Snack from '../models/Snack.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const categoryInput = z.object({ name: z.string().trim().min(2).max(60), imageUrl: z.string().url().or(z.literal('')).default(''), active: z.boolean().default(true) });

router.get('/', async (_req, res, next) => { try {
  const [allSaved, snackCategories] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Snack.aggregate([{ $match: { active: true, availableQuantity: { $gt: 0 } } }, { $group: { _id: '$category', snackCount: { $sum: 1 } } }])
  ]);
  const saved = allSaved.filter(item => item.active);
  const counts = new Map(snackCategories.map(item => [item._id, item.snackCount]));
  const savedNames = new Set(allSaved.map(item => item.name));
  const categories = [
    ...saved.map(item => ({ ...item, snackCount: counts.get(item.name) || 0 })),
    ...snackCategories.filter(item => !savedNames.has(item._id)).map(item => ({ _id: item._id, name: item._id, imageUrl: '', snackCount: item.snackCount }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ categories });
} catch (e) { next(e); } });

router.get('/admin', requireAuth, requireAdmin, async (_req, res, next) => { try {
  const [saved, snackNames] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Snack.distinct('category')
  ]);
  const knownNames = new Set(saved.map(category => category.name));
  const categories = [
    ...saved,
    ...snackNames.filter(name => name && !knownNames.has(name)).map(name => ({ _id: `derived:${name}`, name, imageUrl: '', active: true, derived: true }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ categories });
} catch (e) { next(e); } });
router.post('/', requireAuth, requireAdmin, validate(categoryInput), async (req, res, next) => { try {
  const category = await Category.findOneAndUpdate({ name: req.body.name }, req.body, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.status(201).json({ category });
} catch (e) { next(e); } });
router.patch('/:id', requireAuth, requireAdmin, validate(categoryInput.partial()), async (req, res, next) => { try {
  const current = await Category.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Category not found.' });
  if (req.body.name && req.body.name !== current.name) await Snack.updateMany({ category: current.name }, { category: req.body.name });
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  res.json({ category });
} catch (e) { next(e); } });
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => { try {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  res.json({ message: 'Category deleted.' });
} catch (e) { next(e); } });

export default router;
