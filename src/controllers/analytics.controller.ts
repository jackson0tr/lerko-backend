import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import { generateLastYearData } from "../utils/analytics.generator";
import userModel from "../model/user.model";
import courseModel from "../model/course.model";
import orderModel from "../model/order.model";

// ============================================ GET USERS ANALYTICS ==========================================================
export const getUserAnalytices = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{    
        const users = await generateLastYearData(userModel);

        res.status(201).json({
            success: true,
            users
        });
    }catch(err:any){    
        next(new ErrorHandler(err.message,500));
    }
});

// ============================================ GET COURSES ANALYTICS ==========================================================
export const getCoursesAnalytices = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{    
        const courses = await generateLastYearData(courseModel);

        res.status(201).json({
            success: true,
            courses
        });
    }catch(err:any){    
        next(new ErrorHandler(err.message,500));
    }
});

// ============================================ GET ORSERS ANALYTICS ==========================================================
export const getOrderAnalytices = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{    
        const orders = await generateLastYearData(orderModel);

        res.status(201).json({
            success: true,
            orders
        });
    }catch(err:any){    
        next(new ErrorHandler(err.message,500));
    }
});