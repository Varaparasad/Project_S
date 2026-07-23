import { Router } from 'express';
import { z } from 'zod';
import StoreSettings from '../models/StoreSettings.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router = Router();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const updateSchema = z.object({
  instantStartTime: time.optional(),
  instantEndTime: time.optional(),
  storeAddress: z.string().max(500).optional(),
  storePhone: z.string().max(30).optional(),
  storeEmail: z.string().email().or(z.string().max(100)).optional(),
  customerCareNotice: z.string().max(1000).optional()
});
router.get('/', async (req, res, next) => { try { const settings = await StoreSettings.findOneAndUpdate({ key: 'main' }, {}, { new: true, upsert: true, setDefaultsOnInsert: true }); res.json({ settings }); } catch (e) { next(e); } });
router.patch('/', requireAuth, requireAdmin, validate(updateSchema), async (req, res, next) => { try { const settings = await StoreSettings.findOneAndUpdate({ key: 'main' }, req.body, { new: true, upsert: true, setDefaultsOnInsert: true }); res.json({ settings }); } catch (e) { next(e); } });
export default router;
