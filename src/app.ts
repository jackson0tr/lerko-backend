require('dotenv').config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error"; 
import userRouter from "./routes/userRoute";
import courseRouter from "./routes/courseRoute";
import orderRouter from "./routes/orderRoute";
import notificationRouter from "./routes/notificationRoute";
import analyticsRouter from "./routes/analyticsRoute";
import layoutRouter from "./routes/layoutRoute";
import { rateLimit } from "express-rate-limit";

app.use(express.json({limit: "50mb"}));

app.use(cookieParser());

app.use(cors({
    origin:['https://lerko.vercel.app'],
    // origin:['http://localhost:3000'],
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false
})

app.use('/api',userRouter,courseRouter,orderRouter,notificationRouter,analyticsRouter,layoutRouter); // public route

// test api
app.get("/test", (
    req:Request,
    res:Response,
    next:NextFunction) => {
        res.status(200).json({
            success: true,
            message: "API has been working",
        });
});

app.all("*", (
    req:Request,
    res:Response,
    next:NextFunction) =>{
        const err = new Error(`Route ${req.originalUrl} not found`) as any;
        err.statusCode = 404;
        next(err);
});

app.use(limiter);

app.use(ErrorMiddleware);