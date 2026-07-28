import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "./config/env";

const initializeSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // socket.on("join-private-room", (userEmail: string) => {
    //   socket.join(userEmail);
    // });

    // socket.on("New-Comment", (data) => {
    //   io.emit("Comment-Received", data);
    // });
  });

  return io;
};

export { initializeSocket };
