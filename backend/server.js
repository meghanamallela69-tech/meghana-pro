import app from "./app.js";
import { Server } from "socket.io";
import { startScheduledTasks } from "./services/scheduledTasks.js";
import { setIO } from "./util/socketIO.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isPrivate = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);
      callback(null, isLocal || isPrivate);
    },
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
setIO(io);
startScheduledTasks();
