import express from "express";
import { getCoursesAnalytices, getOrderAnalytices, getUserAnalytices } from "../controllers/analytics.controller";
import { authorizeRole, isAutheticated } from "../middleware/auth";
const analyticsRouter = express.Router();

analyticsRouter.get("/get-users", isAutheticated, authorizeRole("admin"), getUserAnalytices);
analyticsRouter.get("/get-courses", isAutheticated, authorizeRole("admin"), getCoursesAnalytices);
analyticsRouter.get("/get-orders", isAutheticated, authorizeRole("admin"), getOrderAnalytices);

export default analyticsRouter;