import app from "./app.js";
import { Server } from "socket.io";
import { startScheduledTasks } from "./services/scheduledTasks.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://192.168.1.16:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  socket.on('joinUserRoom', (userId) => socket.join(`user_${userId}`));
  socket.on('leaveUserRoom', (userId) => socket.leave(`user_${userId}`));
  socket.on('joinChat', (chatId) => socket.join(chatId));
  socket.on('leaveChat', (chatId) => socket.leave(chatId));
  socket.on('typing', (data) => socket.to(data.chatId).emit('userTyping', data));
  socket.on('stopTyping', (data) => socket.to(data.chatId).emit('userStoppedTyping', data));
});

app.set('io', io);
startScheduledTasks();
