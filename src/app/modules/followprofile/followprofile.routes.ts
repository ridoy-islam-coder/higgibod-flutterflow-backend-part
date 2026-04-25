import { Router } from 'express';
import auth from '../../middleware/auth.middleware';
import { USER_ROLE } from '../user/user.constant';
import { followController } from './followprofile.controller';


const router = Router();

router.get('/my-following', auth(USER_ROLE.USER), followController.getMyFollowing);
router.get('/:organizerId/status', auth(USER_ROLE.USER), followController.checkFollowStatus);
router.get('/:organizerId/followers', followController.getOrganizerFollowers);
router.post('/:organizerId', auth(USER_ROLE.USER), followController.followOrganizer);
router.delete('/:organizerId', auth(USER_ROLE.USER), followController.unfollowOrganizer);

export const followRoutes = router;