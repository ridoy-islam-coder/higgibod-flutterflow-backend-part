import { Router } from 'express';
import { getInstagramProfileController, getTikTokProfileController, getYoutubeChannelDataController } from './social.controller';



const router = Router();


router.get("/youtube/:username",getYoutubeChannelDataController);

router.get("/tiktok/:username", getTikTokProfileController);

router.get("/instagram/:username", getInstagramProfileController);


export const sosaleMediaRoutes = router;
