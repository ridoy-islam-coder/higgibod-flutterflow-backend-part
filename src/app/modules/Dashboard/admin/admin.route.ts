import { Router } from 'express';

import { adminControllers } from './admin.controller';
// import upload from '../../../middleware/fileUpload';
import auth from '../../../middleware/auth.middleware';

const router = Router();

router.post('/adminRegister', adminControllers.adminRegister);

router.post('/login', adminControllers.adminLogin);
router.get('/get-profile', auth('admin'), adminControllers.getProfile);

router.patch('/update-profile',auth('admin'),//   upload.single('file'),
  adminControllers.updateProfile,
);
router.patch('/change-password',auth('admin',),adminControllers.changePassword,);


router.post('/forgot-password', adminControllers.forgotPassword);
router.post('/verify-otp', adminControllers.verifyOtp);
router.post('/reset-password', adminControllers.resetPassword);

// GET /api/v1/admin/dashboard
// GET /api/v1/admin/dashboard?year=2025&type=tickets&page=1&limit=10
// GET /api/v1/admin/dashboard?type=orders

router.get('/dashboard', auth('admin'), adminControllers.getAdminDashboard);

export const adminRoutes = router;
