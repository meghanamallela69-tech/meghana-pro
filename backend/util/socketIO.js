let _io = null;

export const setIO = (io) => { _io = io; };
export const getIO = () => _io;

/**
 * Emit a real-time event to a specific user room
 */
export const emitToUser = (userId, event, data = {}) => {
  const io = getIO();
  if (io && userId) io.to(`user_${userId}`).emit(event, data);
};

/**
 * Emit to all connected admin clients
 */
export const emitToAdmins = async (event, data = {}) => {
  const io = getIO();
  if (!io) return;
  try {
    const { User } = await import('../models/userSchema.js');
    const admins = await User.find({ role: 'admin' }).select('_id');
    admins.forEach(a => io.to(`user_${a._id}`).emit(event, data));
  } catch {}
};

/**
 * Emit to all connected merchant clients
 */
export const emitToMerchant = (merchantId, event, data = {}) => {
  const io = getIO();
  if (io && merchantId) io.to(`user_${merchantId}`).emit(event, data);
};

/**
 * Broadcast to all connected clients (e.g. new public event)
 */
export const emitBroadcast = (event, data = {}) => {
  const io = getIO();
  if (io) io.emit(event, data);
};
