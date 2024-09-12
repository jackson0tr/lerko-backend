import express from "express";
import { 
    addAnswer, 
    addQuestion, 
    addReplyCourse, 
    addReview, 
    courseSearch, 
    deleteCourse, 
    editCourse, 
    generateVideoUrl, 
    getAllCourses, 
    getAllCoursesFree, 
    getCourse, 
    getCoursePaid, 
    uploadCourse
} from "../controllers/course.controller";
import { authorizeRole, isAutheticated } from "../middleware/auth";
import { updateAccessToken } from "../controllers/user.controller";

const courseRouter = express.Router();

courseRouter.post('/upload',  isAutheticated, authorizeRole('admin'), uploadCourse);
courseRouter.put('/edit/:id', updateAccessToken, isAutheticated, authorizeRole('admin'), editCourse);
courseRouter.get('/get-course/:id', getCourse);
courseRouter.get('/all-courses', getAllCoursesFree);
courseRouter.get('/paid/:id', updateAccessToken, isAutheticated, getCoursePaid);
courseRouter.put('/question', updateAccessToken, isAutheticated, addQuestion);
courseRouter.put('/answer', updateAccessToken, isAutheticated, addAnswer);
courseRouter.put('/review/:id', updateAccessToken, isAutheticated, addReview);
courseRouter.put('/reply', updateAccessToken, isAutheticated, authorizeRole('admin'), addReplyCourse);
courseRouter.get('/get-all', updateAccessToken, isAutheticated, getAllCourses);
courseRouter.delete('/delete-course/:id', updateAccessToken, isAutheticated, authorizeRole("admin"), deleteCourse);
courseRouter.post('/getVdoCipherOTP', generateVideoUrl);
courseRouter.get('/search/:key', courseSearch);

export default courseRouter;