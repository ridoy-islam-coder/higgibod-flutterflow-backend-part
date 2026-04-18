import { Router } from 'express';
import { AuthControllers } from './social.controller';



const router = Router();
// POST /api/v1/auth/register  ← User + SocialLink একসাথে save
router.post('/register', AuthControllers.register);
 


export const sosaleMediaRoutes = router;
