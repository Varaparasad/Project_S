import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import snackRoutes from './routes/snacks.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/uploads.js';

passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: process.env.GOOGLE_CALLBACK_URL }, async (_access, _refresh, profile, done) => { try { const email = profile.emails?.[0]?.value?.toLowerCase(); if (!email) return done(new Error('Google did not return an email.')); let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] }); if (!user) user = await User.create({ googleId: profile.id, name: profile.displayName || 'Customer', email }); else if (!user.googleId) { user.googleId = profile.id; await user.save(); } done(null, user); } catch (e) { done(e); } }));

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/snacks', snackRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' }); });

const startServer = async (preferredPort) => {
  const server = app.listen(preferredPort, () => {
    const address = server.address();
    console.log(`API listening on ${address.port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      server.close();
      startServer(preferredPort + 1).catch(() => process.exit(1));
      return;
    }
    console.error('Server failed to start:', err.message);
    process.exit(1);
  });
};

mongoose.connect(process.env.MONGODB_URI).then(() => startServer(Number(process.env.PORT) || 5000)).catch(err => { console.error('Database connection failed:', err.message); process.exit(1); });
