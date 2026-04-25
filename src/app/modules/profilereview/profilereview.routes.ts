import { Router } from 'express';
import { reviewController } from './profilereview.controller';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth.middleware';
import upload from '../../middleware/fileUpload';



const router = Router();

router.get('/organizer/:organizerId', reviewController.getOrganizerReviews);

router.post(
  '/organizer/:organizerId',
  auth(USER_ROLE.USER),
  upload.single('image'),
  reviewController.createReview,
);

router.post(
  '/:reviewId/report',
  auth(USER_ROLE.ORGANIZER),
  reviewController.reportReview,
);

router.get('/admin/reports', auth(USER_ROLE.admin), reviewController.getAllReports);

router.delete(
  '/admin/reports/:reportId/remove',
  auth(USER_ROLE.admin),
  reviewController.removeReview,
);

router.patch(
  '/admin/reports/:reportId/dismiss',
  auth(USER_ROLE.admin),
  reviewController.dismissReport,
);

export const reviewRoutes = router;