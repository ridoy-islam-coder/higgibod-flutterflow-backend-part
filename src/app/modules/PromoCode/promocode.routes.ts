import { Router } from 'express';

import { UserRole } from '../user/user.interface';
import auth from '../../middleware/auth.middleware';
import { PromoCodeController } from './promocode.controller';


const router = Router();

// ─── Admin Only ───────────────────────────────────────────────────────────────
router.post('/generate', auth(UserRole.USER), PromoCodeController.generatePromoCode);
router.get('/', auth(UserRole.admin), PromoCodeController.getAllPromoCodes);
router.delete('/:id', auth(UserRole.admin), PromoCodeController.deletePromoCode);

// ─── User ─────────────────────────────────────────────────────────────────────
router.post('/validate', auth(UserRole.USER), PromoCodeController.validatePromoCode);

export const PromoCodeRoutes = router;