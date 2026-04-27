import { Router } from 'express';
import { reviewController } from './profilereview.controller';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth.middleware';
import upload from '../../middleware/fileUpload';



const router = Router();

// router.get('/organizer/:organizerId', reviewController.getOrganizerReviews);

// router.post(
//   '/organizer/:organizerId',
//   auth(USER_ROLE.USER),
//   upload.single('image'),
//   reviewController.createReview,
// );

// router.post(
//   '/:reviewId/report',
//   auth(USER_ROLE.ORGANIZER),
//   reviewController.reportReview,
// );

// router.get('/admin/reports', auth(USER_ROLE.admin), reviewController.getAllReports);

// router.delete(
//   '/admin/reports/:reportId/remove',
//   auth(USER_ROLE.admin),
//   reviewController.removeReview,
// );

// router.patch(
//   '/admin/reports/:reportId/dismiss',
//   auth(USER_ROLE.admin),
//   reviewController.dismissReport,
// );




// ── Review CRUD ───────────────────────────────────────────────────────────────
router.get('/organizer/:organizerId', reviewController.getOrganizerReviews);
 
router.post(
  '/create/:organizerId',
  auth(USER_ROLE.USER),
  upload.single('image'),
  reviewController.createReview,
);
 
// ── Organizer Reply ───────────────────────────────────────────────────────────
// POST   /:reviewId/reply  — reply দাও
router.post(
  '/:reviewId/reply',
  auth(USER_ROLE.ORGANIZER),
  reviewController.replyToReview,
);
 // ── Organizer Reply ───────────────────────────────────────────────────────────
// PATCH  /:reviewId/reply  — reply update করো
router.patch(
  '/reply/:reviewId',
  auth(USER_ROLE.ORGANIZER,USER_ROLE.USER),
  reviewController.updateReply,
);
 // ── Organizer Reply ───────────────────────────────────────────────────────────
// DELETE /:reviewId/reply  — reply মুছো
router.delete(
  '/:reviewId/reply',
  auth(USER_ROLE.ORGANIZER),
  reviewController.deleteReply,
);
 
// ── Report ────────────────────────────────────────────────────────────────────
router.post(
  '/:reviewId/report',
  auth(USER_ROLE.ORGANIZER),
  reviewController.reportReview,
);
 
// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/reports', auth(USER_ROLE.admin), reviewController.getAllReports);
router.delete('/admin/reports/:reportId/remove', auth(USER_ROLE.admin), reviewController.removeReview);
router.patch('/admin/reports/:reportId/dismiss', auth(USER_ROLE.admin), reviewController.dismissReport);


export const reviewRoutes = router;