require('dotenv').config();
import mongoose,{Document,Schema,Model} from "mongoose";
import { IUser } from "./user.model";

export interface IOrder extends Document {
    courseId:string;
    userId:string;
    paymentInfo:object;
}


const orderSchema = new Schema<IOrder>({
    courseId:{
        type:String,
        required:true
    },
    userId:{
        type:String,
        required:true
    },
    paymentInfo:{
        type:Object,
        // required:true
    },
},{timestamps:true});

const orderModel:Model<IOrder> = mongoose.model("Order", orderSchema);

export default orderModel;