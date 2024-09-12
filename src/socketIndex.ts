import {Server as SocketIOServer} from "socket.io";
import http from 'http';

export const initSocketServer = (server:http.Server)=>{
    const io = new SocketIOServer(server);

    io.on("connection", (socket)=> {
        console.log("User Connected")
        // Listen notification event from the frontend
        socket.on("notification", (data)=>{
            // broadcast the notification data to all connected clients '{-admin-}'
            io.emit("newNotification", data);
        });
        
        socket.on("disconnect", ()=>{
            console.log("User disconnected");
        });

    });
}