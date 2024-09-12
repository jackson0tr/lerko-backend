import { Request,Response,NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import CatchAsyncErrors from "../middleware/catchAsyncErrors";
import layoutModel from "../model/layout.model";
import cloudinary from "cloudinary";

// ============================================ CREATE LAYOUT ==========================================================
export const createLayout = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {type} = req.body;
        const isTypeExist = await layoutModel.findOne({type});

        if(isTypeExist){
            return next(new ErrorHandler(`${type} is already exist`,400));
        }

        if(type === "Banner"){
            const {image,title,subTitle} = req.body;
            const myCloud = await cloudinary.v2.uploader.upload(image,{
                folder: "layout"
            });

            const banner = {
                type: "Banner",
                banner: {
                    image: {
                        public_id: myCloud.public_id,
                        url: myCloud.secure_url
                    },
                    title,
                    subTitle
                }
            }

            await layoutModel.create(banner);
        }

        if(type === "FAQ"){
            const {faq} = req.body;
            const faqItems = await Promise.all(
                faq.map(async(item:any)=>{
                    return{
                        question: item.question,
                        answer: item.answer,
                    };
                })
            );
            await layoutModel.create({type: "FAQ", faq: faqItems});
        }

        if(type === "Categories"){
            const {categories} = req.body;
            const categoriesItems = await Promise.all(
                categories.map(async(item:any)=>{
                    return{
                        title: item.title
                    };
                })
            );
            await layoutModel.create({type: "Categories", categories:categoriesItems});
        }

        res.status(200).json({
            success: true,
            message: "Layout created successfully"
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ EDIT LAYOUT ==========================================================
export const editLayout = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {type} = req.body;

        if(type === "Banner"){
            const bannerData:any = await layoutModel.findOne({type: "Banner"});
            const {image,title,subTitle} = req.body;

            const data = image.startsWith('https') ? bannerData : await cloudinary.v2.uploader.upload(image, {folder: 'layout'});
            
            // await cloudinary.v2.uploader.destroy(bannerData.image.public_id);

            // const myCloud = await cloudinary.v2.uploader.upload(image,{
            //     folder: "layout"
            // });

            const banner = {
                type: "Banner",
                image: {
                    public_id: image.startsWith('https') ? bannerData.banner.image.url : data?.public_id,
                    url: image.startsWith('https') ? bannerData.banner.image.url : data?.secure_url
                },
                title,
                subTitle
            }

            await layoutModel.findByIdAndUpdate(bannerData._id,{banner});
        }

        if(type === "FAQ"){
            const {faq} = req.body;
            const faqData = await layoutModel.findOne({type: "FAQ"}); 
            const faqItems = await Promise.all(
                faq.map(async(item:any)=>{
                    return{
                        question: item.question,
                        answer: item.answer,
                    };
                })
            );
            await layoutModel.findByIdAndUpdate(faqData?._id,{type: "FAQ", faq: faqItems});
        }

        if(type === "Categories"){
            const {categories} = req.body;
            const categoriesData = await layoutModel.findOne({type: "Categories"});
            const categoriesItems = await Promise.all(
                categories.map(async(item:any)=>{
                    return{
                        title: item.title
                    };
                })
            );
            await layoutModel.findByIdAndUpdate(categoriesData?._id,{type: "Categories", categories:categoriesItems});
        }

        res.status(200).json({
            success: true,
            message: "Layout Updated successfully"
        });
    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});

// ============================================ GET LAYOUT ==========================================================

export const getLayoutByType = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {type} = req.params;
        const layout = await layoutModel.findOne({type});

        res.status(201).json({
            success: true,
            layout
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,500));
    }
});
