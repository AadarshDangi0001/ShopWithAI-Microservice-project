import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

async function initializeSocketServer(httpServer) {
   const io = new Server(httpServer, {});

   io.use((socket, next) => {
      const cookies = socket.handshake.headers.cookie;
      const token = cookies ? cookie.parse(cookies).token : {};

      if (!token) {
         return next(new Error("Authentication error: Token not provided"));
      }

      try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         socket.user = decoded; 
         next();
      } catch (err) {
         return next(new Error("Authentication error: Invalid token"));
      }
   })

    io.on("connection", (socket) => {
        console.log("A client connected:", socket.id);  
    });

}

export default initializeSocketServer;