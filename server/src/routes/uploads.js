import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
router.post('/image', requireAuth, requireAdmin, (req, res, next) => { if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return res.status(503).json({ message: 'Cloudinary is not configured yet.' }); upload.array('images', 6)(req, res, error => { if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.' : 'Upload up to 6 JPG, PNG, WEBP, or GIF images.' }); if (!req.files?.length) return res.status(400).json({ message: 'Choose one or more images to upload.' }); Promise.all(req.files.map(file => new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: 'crave-craft-snacks', resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto' }] }, (uploadError, result) => uploadError ? reject(uploadError) : resolve(result.secure_url)); stream.end(file.buffer); }))).then(imageUrls => res.status(201).json({ imageUrls })).catch(next); }); });
export default router;
