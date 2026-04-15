
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../middleware/fileUpload";
import auth from "../../middleware/auth.middleware";
import { eventcontroller } from "./event.controller";


const router = Router();

router.post('/create-event',auth(USER_ROLE.USER,),upload.fields([ { name: 'coverImage', maxCount: 1 }, { name: 'gallery', maxCount: 10 },]),eventcontroller.createEvent);

//done
router.get("/getAll",auth(USER_ROLE.USER,), eventcontroller.getAllEvents);
//not done
router.get("/getPast", auth(USER_ROLE.USER,), eventcontroller.getPastEvents);
//done
router.get("/getevent-details/:id", auth(USER_ROLE.USER,), eventcontroller.getEventDetails);
//done
router.put("/update-event/:id", auth(USER_ROLE.USER,), upload.fields([{ name: 'coverImage', maxCount: 1 },{ name: 'gallery', maxCount: 10 },]), eventcontroller.updateEvent);
router.delete("/delete-event/:id", auth(USER_ROLE.USER,), eventcontroller.deleteEvent);

router.post("/attend-event/:id", auth(USER_ROLE.USER,), eventcontroller.attendEvent);

router.post("/add-review/:id", auth(USER_ROLE.USER,), eventcontroller.addReview);




// ─────────────────────────────────────────────────────────────
// EVENT ROUTES (add to existing event router)
// ─────────────────────────────────────────────────────────────
// GET /events/search?q=disco&category=music&country=BD&minPrice=0&maxPrice=500&date=2024-12-01&page=1&limit=10
router.get("/search", auth(USER_ROLE.USER), eventcontroller.searchEvents);
 
// GET /events/featured

//ai tar aktu somosa asa 
router.get("/featured", auth(USER_ROLE.USER), eventcontroller.getFeaturedEvents);
 
// GET /events/nearby?location=Dhaka

router.get("/nearby", auth(USER_ROLE.USER), eventcontroller.getNearbyEvents);
 
// GET /events/organizer/:id
router.get("/organizer/:id", auth(USER_ROLE.USER), eventcontroller.getEventsByOrganizer);
 
// GET /events/categories
router.get("/categories", auth(USER_ROLE.USER), eventcontroller.getAllCategories);



export const eventRoutes = router;