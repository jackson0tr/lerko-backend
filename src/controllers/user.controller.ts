require('dotenv').config();
import {Request,Response,NextFunction} from 'express';
import userModel,{IUser} from '../model/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import CatchAsyncErrors from '../middleware/catchAsyncErrors';
import  jwt, { JwtPayload, Secret }  from 'jsonwebtoken';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';
import { accessTokenOptions, refreshTokenOptions, sendToken } from '../utils/jwt';
import { redis } from '../utils/redis';
import { getUserById, updateUserRoleService } from '../services/user.service';
import cloudinary from 'cloudinary';
import bcrypt from "bcryptjs";
import nodemailer,{ Transporter } from 'nodemailer';

// ============================================ REGISTER ==========================================================
interface IRegistrationBody{
    name:string;
    email:string;
    password:string;
    avatar?:string;
}

export const register = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=> {
    try{
        const {name,email,password} = req.body;

        const isEmailExist = await userModel.findOne({email});

        if(isEmailExist){
            return next(new ErrorHandler("Email already exist",400));

        };

        const user:IRegistrationBody = {
            name,
            email,
            password,
        }

        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode;

        const data = {user:{name:user.name}, activationCode};

        const html = await ejs.renderFile(path.join(__dirname,"../mails/activationMail.ejs"), data);

        try{
            await sendMail({
                email: user.email,
                subject:"فعل حسابك",
                template:"activationMail.ejs",
                data
            });

            res.status(201).json({
                success:true,
                message:`تفقد بريدك الالكتروني من فضلك: ${user.email} لتفعيل حسابك!`,
                activationToken: activationToken.token
            })
        }catch(err:any){
            return next(new ErrorHandler(err.message,400));
        }

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));

    }
});

interface IActivationToken{
    token:string;
    activationCode:string;
}

export const createActivationToken = (user:any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({
        user,activationCode
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
        expiresIn: "5m",
    });

    return {token,activationCode};
}

// ============================================ ACTIVE USER ==========================================================
interface IActivationRequest{
    activation_token: string;
    activation_code: string;
}

export const activateUser = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction,
)=>{
    try{
        const {activation_token,activation_code} = req.body as IActivationRequest;

        const newUser: {user: IUser; activationCode:string} = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
            ) as {user:IUser; activationCode:string};
        
        if(newUser.activationCode !== activation_code){
            return next(new ErrorHandler('Invalid activation code ',400));
        }
        
        const {name,email,password} = newUser.user;

        const existUser = await userModel.findOne({email});

        if(existUser){
            return next(new ErrorHandler('Email already exist',400));
        }

        const user = await userModel.create({
            name,
            email,
            password
        });

        res.status(201).json({
            success:true,
            user
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ LOGIN ==========================================================
interface ILoginRequest{
    email:string;
    password:string;
}

export const login = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {email,password} = req.body as ILoginRequest;

        if(!email || !password){
            return next(new ErrorHandler('Please enter email and password',400));
        };

        const user = await userModel.findOne({email}).select("+password");

        if(!user){
            return next(new ErrorHandler('Invalid email or password',400));
        };
        
        const isPasswordMatch = await user.comparePassword(password);
        
        if(!isPasswordMatch){
            return next(new ErrorHandler('Invalid password',400));
        };

        sendToken(user,200,res);

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ LOGOUT ==========================================================
export const logout = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=> {
    try{
        res.cookie("access_token", "", {maxAge: 1});
        res.cookie("refresh_token", "", {maxAge: 1});

        const userId = req.user?._id || '';

        console.log('userId:',userId);

        redis.del(userId);

        res.status(200).json({
            success:true,
            message: "Logged out successfully",
        });
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ UPDATE ACCESS TOKEN ==========================================================
export const updateAccessToken = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const refresh_token = req.cookies.refresh_token as string;
        const decoded = jwt.verify(
            refresh_token,
            process.env.REFRESH_TOKEN as string) as JwtPayload;

        if(!decoded){
            return next(new ErrorHandler('Could not refresh token',400));
        }
        
        const session = await redis.get(decoded.id as string);
        
        if(!session){
            return next(new ErrorHandler('Please login to access this resource',400));
        }

        const user = JSON.parse(session);

        const accessToken = jwt.sign(
            {id: user._id},
            process.env.ACCESS_TOKEN as string,
            {
                expiresIn: '30m'
            });

        const refreshToken = jwt.sign(
            {id: user._id},
            process.env.REFRESH_TOKEN as string,
            {
                expiresIn: '3d'
            });

        req.user = user;

        res.cookie('access_token', accessToken,accessTokenOptions);
        res.cookie('refresh_token', refreshToken,refreshTokenOptions);

        await redis.set(user._id,JSON.stringify(user), "EX", 604800); // expired in 7 days 
            
        // res.status(200).json({
        //     success: true,
        //     accessToken
        // });

        next();

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
})

// ============================================ USER INFO ==========================================================
export const getUserInfo = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const userId = req.user?._id;
        getUserById(userId,res);
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});


// ============================================ SOCIAL AUTH ==========================================================
interface ISoicailAuthBody{
    email:string;
    name:string;
    avatar:string;
}

export const socialAuth = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {email,name,avatar} = req.body as ISoicailAuthBody;
        const user = await userModel.findOne({email});

        if(!user){
            const newUser = await userModel.create({email,name,avatar});
            sendToken(newUser,200,res);
        }else{
            sendToken(user,200,res);
        }
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ UPDATE USER INFO ==========================================================
interface IUpdateUserInfo{
    name?:string;
}

export const updateUserInfo = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {name} = req.body as IUpdateUserInfo;
        const userId = req.user?._id; 
        const user = await userModel.findById(userId);
        
        if(name && user){
            user.name = name;
        }

        await user?.save();

        await redis.set(userId,JSON.stringify(user));

        res.status(201).json({
            success: true,
            user
        })

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ UPDATE USER PASSWORD ==========================================================
interface IUpdatePassword{
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {oldPassword,newPassword} = req.body as IUpdatePassword;

        if(!oldPassword || !newPassword){
            return next(new ErrorHandler('Please enter old and new password',400));
        }

        const userId = req.user?._id;

        const user = await userModel.findById(userId).select('+password');

        if(user?.password === undefined){
            return next(new ErrorHandler('Invalid user',400));
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword);

        if(!isPasswordMatch){
            return next(new ErrorHandler('Invalid old password',400));
        }

        user.password = newPassword;

        await user.save();

        await redis.set(userId,JSON.stringify(user));

        res.status(201).json({
            success: true,
            user
        })

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ UPDATE USER PICTURE ==========================================================
interface IUpdateUserPic{
    avatar: string;
}

export const updateUserPic = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {avatar} = req.body as IUpdateUserPic;

        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        if(avatar && user){
            if(user?.avatar?.public_id){
                // delete old pic
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
            }else{
               const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                folder:"Pics",
                width:150,
               });
    
               user.avatar = {
                   public_id: myCloud.public_id,
                   url: myCloud.secure_url
               }
            }
        }

        await user?.save();

        await redis.set(userId,JSON.stringify(user));

        res.status(201).json({
            success: true,
            message: 'Profile pic has been uploaded successfully',
            user
        })

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ UPDATE USER ROLE ==========================================================
export const updateUserRole = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {id,role} = req.body;
        updateUserRoleService(res,id,role);
    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ DELETE USER ==========================================================
export const deleteUser = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {id} = req.params;
        const user = await userModel.findById(id);

        if(!user){
            return next(new ErrorHandler('User not found',404));
        }

        await user.deleteOne({id});
        
        await redis.del(id);

        res.status(201).json({
            success: true,
            message: "User deleted successfully"
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ FORGET PASSWORD ==========================================================
export const forgetPassword = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {email} = req.body;
        const user = await userModel.findOne({email});

        if(!user){
            return next(new ErrorHandler('User not found',404));
        }

        const transporter:Transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            service: process.env.SMTP_SERVICE,
            auth:{
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD
            },
        });
    
        const locale = 'ar';
        // const token = jwt.sign({id: user._id}, "jwt_secret_key", {expiresIn: '2h'});
        const token = jwt.sign(
            {id: user._id},
            process.env.ACCESS_TOKEN as string,
            {
                expiresIn: '1d'
            });

        // sendToken(user,200,res);

        const resetToken = `${process.env.FRONT_LINK}/${locale}/reset-password/${user._id}/${token}`

        const data = {user:{name:user.name}, resetToken};

        const html = await ejs.renderFile(path.join(__dirname,"../mails/resetPassword.ejs"), data);

        try{
            await sendMail({
                email: user.email,
                subject:"اعد ضبط كلمه السر",
                template:"resetPassword.ejs",
                data
            });

            res.status(201).json({
                success:true,
                message:`انقر هنا لإعادة تعيين كلمة المرور الخاصة بك: ${process.env.FRONT_LINK}/${locale}/reset-password/${user._id}/${token}`,
            })
        }catch(err:any){
            return next(new ErrorHandler(err.message,400));
        }

        // const mailOptions = {
        //     from: process.env.STMP_MAIL,
        //     to: email,
        //     subject: "اعد ضبط كلمه السر",
        //     text: `انقر هنا لإعادة تعيين كلمة المرور الخاصة بك:  ${process.env.FRONT_LINK}/${locale}/reset-password/${user._id}/${token}`
        // }
    
        // await transporter.sendMail(mailOptions, function(error,info){
        //     if(error){
        //         console.log(error)
        //     }else{
        //         return res.status(201).json({
        //             success: true,
        //             message: "Code send successfully!"
        //         });
        //     }
        // });

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});

// ============================================ RESET PASSWORD ==========================================================
export const resetPassword = CatchAsyncErrors(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const {password} = req.body;
        const {id,token} = req.params;
        
        jwt.verify(token as string, process.env.ACCESS_TOKEN as string, (err,decoded)=>{
            if(err){
                return next(new ErrorHandler(err.message,404));
            }else{
                bcrypt.hash(password,10)
                .then(hash=>{
                    userModel.findByIdAndUpdate({_id: id}, {password: hash})
                    .then(u => res.status(201).json({
                        success: true,
                        message: "Password Reset Successfully!"
                    }))
                })
            }
        });

    }catch(err:any){
        return next(new ErrorHandler(err.message,400));
    }
});