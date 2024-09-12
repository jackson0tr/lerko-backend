require('dotenv').config();
import {Request,Response,NextFunction} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import CatchAsyncErrors from '../middleware/catchAsyncErrors';
import cloudinary from 'cloudinary';
import { createCourse, getAllCoursesService } from '../services/course.service';
import courseModel from '../model/course.model';
import { redis } from '../utils/redis';
import mongoose from 'mongoose';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';
import notificationModel from '../model/notification.model';
import axios from 'axios';

// ============================================ UPLOAD COURSE ==========================================================
export const uploadCourse = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const data = req.body;
        const thumbnail = data.thumbnail;

        if(thumbnail){
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail,
            {
                folder:"courses"
            });

            data.thumbnail = {
                public_id:myCloud.public_id,
                url:myCloud.secure_url
            }
        }
        createCourse(data,res,next);
    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ EDIT COURSE ==========================================================
export const editCourse = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = await courseModel.findById(courseId) as any;

        if(thumbnail 
            // && !thumbnail.startsWith('https')
            ){
            await cloudinary.v2.uploader.destroy(thumbnail.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail,{
                folder:"courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        }
        
        // if(thumbnail.startsWith('https')){
        //     data.thumbnail = {
        //         public_id: courseData?.thumbnail.public_id,
        //         url: courseData?.thumbnail.secure_url
        //     }
        // }

        // if(thumbnail){
        //    data.thumbnail = {
        //         public_id: courseData?.thumbnail.public_id,
        //         url: courseData?.thumbnail.secure_url
        //     }
        // }

        const course = await courseModel.findByIdAndUpdate(courseId, {$set: data}, {new: true});

        res.status(201).json({
            success:true,
            course
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ GET COURSE {Without Purchasing} ==========================================================
export const getCourse = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const courseId = req.params.id;
        const isCacheExist = await redis.get(courseId);

        if(isCacheExist){
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success:true,
                course
            });
        }else{
            // Important it's ignore {videoUrl-suggestion-questions-links} from click to get the course
            // won't send this data bcs, it's an important data
            const course = await courseModel.findById(courseId)
            .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            
            await redis.set(courseId,JSON.stringify(course), 'EX', 604800); // expired in 7 days 

            res.status(201).json({
                success:true,
                course
            });
        }

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ GET ALL COURSES {Without Purchasing} ==========================================================
export const getAllCoursesFree = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        // const isCacheExist = await redis.get("allCourse");

        // if(isCacheExist){
        //     const courses = JSON.parse(isCacheExist);
        //     res.status(200).json({
        //         success:true,
        //         courses
        //     });
        // }else{
            // Important it's ignore {videoUrl-suggestion-questions-links} from click to get the course
            // won't send this data bcs, it's an important data
            const courses = await courseModel.find()
            .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            // await redis.set("allCourse",JSON.stringify(courses));

            res.status(201).json({
                success:true,
                courses
            });
        // }
        
    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ GET COURSE {With Purchasing} ==========================================================
export const getCoursePaid = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const userCourse = req.user?.courses;
        const courseId = req.params.id;
        const courseExists = userCourse?.find((course:any) => course._id.toString() === courseId);

        if(!courseExists){
            return next(new ErrorHandler('You are not eligible to access this course',404));
        }

        const course = await courseModel.findById(courseId);
        const content = course?.courseData;

        res.status(201).json({
            success:true,
            content
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ ADD QUESTION COURSE ==========================================================
interface IQuestionData{
    question:string;
    courseId:string;
    contentId:string;
}

export const addQuestion = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {question, courseId, contentId} :IQuestionData = req.body;
        const course = await courseModel.findById(courseId);

        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandler('Invalid content id',400));
        }

        const courseContent = course?.courseData?.find((item:any) => item._id.equals(contentId));

        if(!courseContent){
            return next(new ErrorHandler('Invalid content id',400)); 
        }

        const newQuestion:any = {
            user:req.user,
            question,
            questionReplies:[]
        }

        courseContent.questions.push(newQuestion);

        await notificationModel.create({
            user: req.user?._id,
            title: "تم استلام سؤال جديد",
            message: `لديك سؤال جديد في ${courseContent.title}`
        });

        await course?.save();

        res.status(200).json({
            success:true,
            course
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ ANSWER QUESTION COURSE ==========================================================
interface IAnswerData{
    answer:string;
    courseId:string;
    contentId:string;
    questionId:string;
}

export const addAnswer = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {answer,courseId,contentId,questionId}:IAnswerData = req.body;
        const course = await courseModel.findById(courseId);

        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandler('Invalid content id',400));
        }

        const courseContent = course?.courseData?.find((item:any) => item._id.equals(contentId));

        if(!courseContent){
            return next(new ErrorHandler('Invalid content id',400)); 
        }

        const question = courseContent?.questions?.find((item:any) => item._id.equals(questionId));

        if(!question){
            return next(new ErrorHandler('Invalid question id',400)); 
        }

        const newAnswer:any = {
            user:req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        
        question.questionReplies?.push(newAnswer);

        await course?.save();

        if(req.user?.id === question.user._id){
            
            await notificationModel.create({
                user: req.user?._id,
                title: "تم تلقي الرد على سؤال جديد",
                message: `لديك سؤال جديد الرد في ${courseContent.title}`
            });

        }else{
            const data = {
                name:question.user.name,
                title:courseContent.title,
            }

            const html = await ejs.renderFile(path.join(__dirname,'../mails/questionReply.ejs'),data);

            try{
                await sendMail({
                    email: question.user.email,
                    subject: "الرد على السؤال",
                    template: "questionReply.ejs",
                    data
                })
            }catch(err:any){
                return next(new ErrorHandler(err.message,500)); 
            }
            
        }

        res.status(200).json({
            success:true,
            course
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
});

// ============================================ ADD REVIEW COURSE ==========================================================
interface IAddReviewData{
    review:string;
    rating:number;
    userId:string;
}

export const addReview = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
    )=>{
        try{
            const userCourse = req.user?.courses;
            const courseId = req.params.id;
            const courseExists = userCourse?.some((course:any)=>course._id.toString() === courseId.toString()); 

            if(!courseExists){
                return next(new ErrorHandler('You are not eligible to access this course',404));
            }

            const {review,rating} = req.body as IAddReviewData;

            const course = await courseModel.findById(courseId);
            const reviewData:any = {
                user:req.user,
                comment: review,
                rating
            }

            course?.reviews.push(reviewData);

            let avg = 0;

            course?.reviews.forEach((rev:any) => {avg += rev.rating});

            if(course){
                course.ratings = avg / course.reviews.length;
            }

            await course?.save();

            await redis.set(courseId,JSON.stringify(course), "EX", 604800); // Expire in 7 days  

            // const notification = {
            //     title: "New Review Received",
            //     message: `${req.user?.name} has been given a review in ${course?.name}`
            // }

            await notificationModel.create({
                user: req.user?._id,
                title: "تم استلام مراجعة جديدة",
                message: `${req.user?.name} وقد أعطيت مراجعة في ${course?.name}`
            });

            res.status(200).json({
                success: true,
                course
            });

        }catch(err:any){
            return next(new ErrorHandler(err.message,500)); 
        }
});

// ============================================ ADD Reply COURSE ==========================================================
interface IAddReplyData {
    comment:string;
    courseId:string;
    reviewId:string;
}

export const addReplyCourse = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=> {
    try{
        const {comment,courseId,reviewId} = req.body as IAddReplyData;
        const course = await courseModel.findById(courseId);

        if(!course){
            return next(new ErrorHandler('Course not found',404));
        }

        const review = course?.reviews?.find((rev:any)=>rev._id.toString() === reviewId);

        if(!review){
            return next(new ErrorHandler("Review not found",404))
        }

        const replyData:any ={
            user:req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        if(!review.commentReplies){
            review.commentReplies = [];
        }

        review.commentReplies?.push(replyData);

        await course?.save();

        await redis.set(courseId,JSON.stringify(course), "EX", 604800); // Expire in 7 days  

        res.status(200).json({
            success:true,
            course
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500)); 
    }
})

// ============================================ GET ALL COURSES ==========================================================
export const getAllCourses = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        getAllCoursesService(res);
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ DELETE Course ==========================================================
export const deleteCourse = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {id} = req.params;
        const course = await courseModel.findById(id);

        if(!course){
            return next(new ErrorHandler('Course not found',404));
        }

        await course.deleteOne({id});
        
        await redis.del(id);

        res.status(201).json({
            success: true,
            message: "Course deleted successfully"
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ GENERATE VIDEO URL  ==========================================================
export const generateVideoUrl = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {videoUrl} = req.body;

        if(!videoUrl){
            console.error('can not find video id')
        }

        const response = await axios.post(
            `https://dev.vdocipher.com/api/videos/${videoUrl}/otp`,
            {ttl: 300},
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Apisecret ${process.env.VODCIPHER_API_SECRET}`
                }
            }
        )
        res.json(response.data);
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ GENERATE VIDEO URL  ==========================================================
export const courseSearch = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const data = await courseModel.find({"$or": [
            {title: {$regex: req.params.key}},
            // {categories: {$regex: req.params.key}}
        ]});

        res.json(data);
        
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
})