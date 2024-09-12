import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import userModel from "../model/user.model"
import { Response } from "express";
import { redis } from "../utils/redis";

// ============================================ GET USER SERVICE ==========================================================
export const getUserById = async(
    id:string,
    res:Response,
)=>{

    const userJson = await redis.get(id);

    if(userJson){
        const user = JSON.parse(userJson);
        res.status(200).json({
            success:true,
            user
        })
    }
    
}

// ============================================ GET ALL USERS SERVICE ==========================================================
export const getAllUsersService = async(res:Response)=>{

    const users = await userModel.find().sort({createdAt: -1});

    res.status(201).json({
        success: true,
        users
    });
}

// ============================================ UPDATE USER ROLE SERVICE ==========================================================
export const updateUserRoleService = async(res:Response,id:string,role:string)=>{
    
    const user = await userModel.findByIdAndUpdate(id,{role},{new:true});
    // const user = await userModel.findOneAndUpdate(email,{role},{new:true});
    
    res.status(201).json({
        success: true,
        user
    });

}


