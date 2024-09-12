import {Request,Response,NextFunction} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import CatchAsyncErrors from '../middleware/catchAsyncErrors';
import notificationModel from '../model/notification.model';
import cron from 'node-cron';
import { getAllUsersService } from '../services/user.service';

// ============================================ GET ALL NOTIFICATIONS {ADMIN} ==========================================================
export const getNotifications = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const notifications = await notificationModel.find().sort({createdAt: -1});

        res.status(201).json({
            success:true,
            notifications
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ UPDATE NOTIFICATIONS STATUS {ADMIN} ==========================================================
export const updateNotifications = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const notification = await notificationModel.findById(req.params.id);

        if(!notification){
            return next(new ErrorHandler('Notification not found',404));
        }else{
            notification.status ? notification.status = 'read' : notification.status;
        }

        await notification.save();

        const notifications = await notificationModel.find().sort({createdAt: -1});

        res.status(201).json({
            success: true,
            notifications
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ DELETE NOTIFICATIONS STATUS {ADMIN} ==========================================================
cron.schedule("0 0 0 * * *",async()=>{
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await notificationModel.deleteMany({status: "read",createdAt: {$lt: thirtyDaysAgo}});
});

// ============================================ GET ALL USERS ==========================================================
export const getAllUsers = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        getAllUsersService(res);
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});



