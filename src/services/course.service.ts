import { Response } from "express";
import courseModel from "../model/course.model";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";

// ============================================ CREATE COURSE ==========================================================
export const createCourse = CatchAsyncErrors(async(data:any, res:Response)=>{
    const course = await courseModel.create(data);

    res.status(201).json({
        success:true,
        course
    });
});

// ============================================ GET ALL USERS ==========================================================
export const getAllCoursesService = async(res:Response)=>{
    const courses = await courseModel.find().sort({createdAt: -1});

    res.status(201).json({
        success: true,
        courses
    });
}