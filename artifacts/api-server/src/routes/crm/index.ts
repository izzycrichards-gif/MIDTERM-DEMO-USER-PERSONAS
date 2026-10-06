import { Router, type IRouter } from "express";
import { crmAuth } from "../../middlewares/crmAuth";
import contacts from "./contacts";
import followUps from "./follow-ups";
import overview from "./overview";
import reminderPreferences from "./reminder-preferences";

const router: IRouter = Router();
router.use(crmAuth);
router.use(contacts);
router.use(followUps);
router.use(overview);
router.use(reminderPreferences);
export default router;
