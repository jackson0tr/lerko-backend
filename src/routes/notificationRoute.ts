import express from "express";
import { authorizeRole, isAutheticated } from "../middleware/auth";
import { getNotifications, updateNotifications } from "../controllers/notification.controller";
import { updateAccessToken } from "../controllers/user.controller"; 
const notificationRouter = express.Router();

notificationRouter.get("/get-notification", updateAccessToken, isAutheticated, authorizeRole("admin"), getNotifications);
notificationRouter.put("/update/:id", updateAccessToken, isAutheticated, authorizeRole("admin"), updateNotifications);

export default notificationRouter;