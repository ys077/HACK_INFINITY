import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket.auth.js';
import { handleSocketEvents } from './socket.events.js';
import { RealtimeService } from '../services/realtime.service.js';

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  RealtimeService.initialize(io);

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    // Client connected successfully (authenticated)
    handleSocketEvents(socket);

    socket.on('disconnect', () => {
      // Disconnection does not mutate presence state in database
    });
  });

  return io;
};
