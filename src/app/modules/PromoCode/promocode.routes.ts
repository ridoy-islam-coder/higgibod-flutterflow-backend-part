// src/modules/promoCode/promoCode.routes.ts
import express from 'express';
import auth from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.interface';
import { PromoCodeController } from './promocode.controller';

const router = express.Router();

// ─── User Route ──────────────────────────────────────────────────────────────
router.post('/validate', auth(UserRole.USER), PromoCodeController.validatePromoCode);

// ─── Admin Routes ────────────────────────────────────────────────────────────
router.post('/create-promo-code', auth(UserRole.USER), PromoCodeController.createPromoCode);
router.get('/promo-codes', auth(UserRole.admin), PromoCodeController.getAllPromoCodes);
router.get('/promo-codes/:id', auth(UserRole.admin), PromoCodeController.getSinglePromoCode);
router.patch('/promo-codes/:id', auth(UserRole.admin), PromoCodeController.updatePromoCode);
router.patch('/promo-codes/:id/toggle', auth(UserRole.admin), PromoCodeController.togglePromoCode);
router.delete('/promo-codes/:id', auth(UserRole.admin), PromoCodeController.deletePromoCode);

export const PromoCodeRoutes = router;