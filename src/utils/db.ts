import mongoose from 'mongoose';
require('dotenv').config();

const dbUrl:string = process.env.DB_URL || '';

// const connectedDb =async () => {
//     try{
//         await mongoose.connect(dbUrl).then((data:any)=>{
//             console.log(`Database is connected... ${data.connection.host}`);
//         });
//     }catch(err:any){
//         console.log(err.message);
//         setTimeout(connectedDb, 5000);
//     }
// }

const connectedDb = async (): Promise<void> => {
    try {
        const connection = await mongoose.connect(dbUrl);
        console.log(`Database connected: ${connection.connection.host}`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`Error connecting to the database: ${error.message}`);
        } else {
            console.error('Unknown error occurred during database connection');
        }

        // Retry connecting after 5 seconds
        setTimeout(connectedDb, 5000);
    }
};

export default connectedDb;

