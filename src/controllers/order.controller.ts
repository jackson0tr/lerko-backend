require('dotenv').config();
import {Request,Response,NextFunction} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import CatchAsyncErrors from '../middleware/catchAsyncErrors';
import orderModel, {IOrder} from '../model/order.model';
import userModel from '../model/user.model';
import courseModel, { ICourse } from '../model/course.model';
import path from 'path';
import ejs from 'ejs';
import sendMail from '../utils/sendMail';
import notificationModel from '../model/notification.model';
import { getAllOrdersService, newOrder } from '../services/order.service';
import { redis } from '../utils/redis';
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ============================================ CREATE ORDER ==========================================================
export const createOrder = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {courseId,paymentInfo} = req.body as IOrder;

        if(paymentInfo){
            if("id" in paymentInfo){
                const paymentIntentId = paymentInfo.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

                if(paymentIntent.status !== "succeeded"){
                    return next(new ErrorHandler("Payment not authorized!",400));
                }
            }
        }

        const userId = req.user?._id;
        const user = await userModel.findById(userId);
        const courseExistInUser =  user?.courses.some((course:any) => course._id.toString() === courseId); 

        if(courseExistInUser){
            return next(new ErrorHandler('You have already purchased this course',400));
        }

        const course:ICourse | null = await courseModel.findById(courseId);

        if(!course){
            return next(new ErrorHandler('Course not found',404));
        }

        const data:any = {
            courseId: course._id,
            userId: user?._id,
            paymentInfo
        };


        const mailData = {
            order:{
                _id: course._id.toString().slice(0,6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US',{year: 'numeric', month: 'long', day:'numeric'})
            }
        }

        const html = await ejs.renderFile(path.join(__dirname, '../mails/conformOrder.ejs'), {order:mailData});

        try{
            if(user){
                await sendMail({
                    email: user.email,
                    subject: "تأكيد الطلب",
                    template: "conformOrder.ejs",
                    data: mailData
                });
            }
        }catch(err:any){
            return next(new ErrorHandler(err.message,500));
        }

        user?.courses.push(course?._id);

        await redis.set(req.user?._id, JSON.stringify(user));

        await user?.save();

        await notificationModel.create({
            user: user?._id,
            title: "طلب جديد",
            message: `لديك طلب جديد من ${course?.name}`
        });
        
        // course.purchased ? course.purchased += 1 : course.purchased;
        // create courses purchased counts
        course.purchased  = course.purchased + 1; 

        await course.save();

        newOrder(data,res,next);
        
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ GET ALL ORDERS ==========================================================
export const getAllOrders = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        getAllOrdersService(res);
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ SEND STRIPE PUBLISHABLE KEY ==========================================================
export const sendStripePublishableKey = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        res.status(200).json({
            publishablekey: process.env.STRIPE_PUBLISHABLE_KEY
        })
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ NEW PAYMENT ==========================================================
export const newPayment = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const myPayment = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: "USD",
            metadata: {
                company: "Lerko",
            },
            automatic_payment_methods:{
                enabled: true,
            }
        });

        res.status(201).json({
            success: true,
            client_secret: myPayment.client_secret
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});
