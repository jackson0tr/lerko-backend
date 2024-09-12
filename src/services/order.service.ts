import { NextFunction, Response } from "express";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import orderModel from "../model/order.model";

// ============================================ CREATE ORDER ==========================================================
export const newOrder = CatchAsyncErrors(async(data:any,res:Response,next:NextFunction)=>{
    const order = await orderModel.create(data);

    res.status(201).json({
        success: true,
        order
    });
});

// ============================================ GET ALL ORDERS ==========================================================
export const getAllOrdersService = async(res:Response)=>{
    const orders = await orderModel.find().sort({createdAt: -1});

    res.status(201).json({
        success: true,
        orders
    });
}
