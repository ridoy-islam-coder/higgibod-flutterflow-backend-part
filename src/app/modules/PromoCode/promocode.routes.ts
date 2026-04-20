// src/modules/promoCode/promoCode.routes.ts
import express from 'express';
import auth from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.interface';
import { PromoCodeController } from './promocode.controller';

const router = express.Router();

// ─── User Route ──────────────────────────────────────────────────────────────
router.post('/validate', auth(UserRole.USER), PromoCodeController.validatePromoCode);

// ─── Admin Routes ────────────────────────────────────────────────────────────
router.post('/', auth(UserRole.admin), PromoCodeController.createPromoCode);
router.get('/', auth(UserRole.admin), PromoCodeController.getAllPromoCodes);
router.get('/:id', auth(UserRole.admin), PromoCodeController.getSinglePromoCode);
router.patch('/:id', auth(UserRole.admin), PromoCodeController.updatePromoCode);
router.patch('/:id/toggle', auth(UserRole.admin), PromoCodeController.togglePromoCode);
router.delete('/:id', auth(UserRole.admin), PromoCodeController.deletePromoCode);

export const PromoCodeRoutes = router;