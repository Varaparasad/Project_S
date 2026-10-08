import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const bearer = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearer || req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Please log in.' });
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: 'Your session has expired.' }); }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  next();
}
