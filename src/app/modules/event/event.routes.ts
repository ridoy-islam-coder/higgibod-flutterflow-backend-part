
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../middleware/fileUpload";
import auth from "../../middleware/auth.middleware";
import { eventcontroller } from "./event.controller";


const router = Router();

router.post('/create-event',auth(USER_ROLE.USER,),upload.fields([ { name: 'coverImage', maxCount: 1 }, { name: 'gallery', maxCount: 10 },]),eventcontroller.createEvent);


router.get("/getAll",auth(USER_ROLE.USER,), eventcontroller.getAllEvents);
router.get("/getPast", auth(USER_ROLE.USER,), eventcontroller.getPastEvents);
router.get("/getevent-details/:id", auth(USER_ROLE.USER,), eventcontroller.getEventDetails);
router.put("/update-event/:id", auth(USER_ROLE.USER,), upload.fields([{ name: 'coverImage', maxCount: 1 },{ name: 'gallery', maxCount: 10 },]), eventcontroller.updateEvent);
router.delete("/delete-event/:id", auth(USER_ROLE.USER,), eventcontroller.deleteEvent);
router.post("/attend-event/:id", auth(USER_ROLE.USER,), eventcontroller.attendEvent);
router.post("/add-review/:id", auth(USER_ROLE.USER,), eventcontroller.addReview);

export const eventRoutes = router;