import express from "express";
import { 
    activateUser, 
    deleteUser, 
    forgetPassword, 
    getUserInfo, 
    login, 
    logout, 
    register, 
    resetPassword, 
    socialAuth, 
    updateAccessToken, 
    updatePassword, 
    updateUserInfo, 
    updateUserPic, 
    updateUserRole
} from "../controllers/user.controller";
import { authorizeRole, isAutheticated } from "../middleware/auth";
import { getAllUsers } from "../controllers/notification.controller"; 
const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/activeUser', activateUser);
userRouter.post('/login', login);
userRouter.get('/logout', isAutheticated , logout);
userRouter.get('/refresh', updateAccessToken);
userRouter.get('/userInfo', updateAccessToken, isAutheticated , getUserInfo);
userRouter.post('/socialAuth', socialAuth);
userRouter.put('/update', updateAccessToken, isAutheticated , updateUserInfo);
userRouter.put('/updatePassword', updateAccessToken, isAutheticated , updatePassword);
userRouter.put('/pic', updateAccessToken, isAutheticated , updateUserPic);
userRouter.get('/all', updateAccessToken, isAutheticated , authorizeRole("admin"), getAllUsers);
userRouter.put('/update-role', updateAccessToken, isAutheticated , authorizeRole("admin"), updateUserRole);
userRouter.delete('/delete-user/:id', updateAccessToken, isAutheticated , authorizeRole("admin"), deleteUser);
userRouter.post('/forget-password', forgetPassword);
userRouter.post('/reset-password/:id/:token', resetPassword);

export default userRouter;
