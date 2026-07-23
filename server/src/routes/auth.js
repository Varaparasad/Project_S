import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { z } from 'zod';
import User from '../models/User.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const cookieOptions = { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 };
const issue = (res, user) => res.cookie('token', jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOptions).json({ user: publicUser(user) });
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, addresses: u.addresses || [], role: u.role });

router.post('/register', validate(z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(100) })), async (req, res, next) => { try {
  if (await User.exists({ email: req.body.email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({ ...req.body, email: req.body.email.toLowerCase(), passwordHash: await bcrypt.hash(req.body.password, 12) });
  issue(res, user);
} catch (e) { next(e); } });
router.post('/login', validate(z.object({ email: z.string().email(), password: z.string().min(1) })), async (req, res, next) => { try {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash || !await bcrypt.compare(req.body.password, user.passwordHash)) return res.status(401).json({ message: 'Invalid email or password.' });
  issue(res, user);
} catch (e) { next(e); } });
router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie('token', clearOptions).status(204).end();
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/profile', requireAuth, validate(z.object({ phone: z.string().min(7).max(20).optional(), address: z.string().max(500).optional() })), async (req, res, next) => { try { Object.assign(req.user, req.body); await req.user.save(); res.json({ user: publicUser(req.user) }); } catch (e) { next(e); } });
const addressSchema = z.object({ label: z.string().min(2).max(40), line: z.string().min(5).max(300), city: z.string().min(2).max(80), pincode: z.string().min(4).max(12), latitude: z.number().optional(), longitude: z.number().optional(), isDefault: z.boolean().optional() });
router.post('/addresses', requireAuth, validate(addressSchema), async (req, res, next) => { try { if (req.body.isDefault || !req.user.addresses?.length) req.user.addresses.forEach(address => { address.isDefault = false; }); req.user.addresses.push(req.body); await req.user.save(); res.status(201).json({ user: publicUser(req.user) }); } catch (e) { next(e); } });
router.patch('/addresses/:id', requireAuth, validate(addressSchema.partial()), async (req, res, next) => { try { const address = req.user.addresses.id(req.params.id); if (!address) return res.status(404).json({ message: 'Address not found.' }); if (req.body.isDefault) req.user.addresses.forEach(item => { item.isDefault = false; }); Object.assign(address, req.body); await req.user.save(); res.json({ user: publicUser(req.user) }); } catch (e) { next(e); } });
router.delete('/addresses/:id', requireAuth, async (req, res, next) => { try { const address = req.user.addresses.id(req.params.id); if (!address) return res.status(404).json({ message: 'Address not found.' }); address.deleteOne(); await req.user.save(); res.status(204).end(); } catch (e) { next(e); } });
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }), (req, res) => { res.cookie('token', jwt.sign({ sub: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOptions); res.redirect(`${process.env.CLIENT_URL}/`); });
export default router;
