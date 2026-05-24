// server/socket/socket.js
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const Message    = require('../models/Message.model');
const User       = require('../models/User.model');
const { getConversationId } = require('../controllers/chat.controller');

let io;

// Track online users: Map of userId → socketId
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // ── Auth middleware for Socket.io ─────────────────────────────────
  // WHY? We need to know WHO is connecting via socket.
  // We read the JWT from the cookie and verify it — same as our
  // HTTP protect middleware but adapted for Socket.io.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.headers.cookie
        ?.split(';')
        .find(c => c.trim().startsWith('jwt='))
        ?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.userId).select('-password');

      if (!user) return next(new Error('User not found'));

      socket.user = user; // attach user to socket
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 ${socket.user.name} connected (${socket.id})`);

    // ── User comes online ─────────────────────────────────────────────
    onlineUsers.set(userId, socket.id);

    // Join a personal room using their userId
    // WHY? So we can send messages directly to a specific user
    // even if we don't have their current socket.id
    socket.join(userId);

    // Broadcast to everyone that this user is online
    io.emit('user_online', { userId });

    // Send the current online users list to the newly connected user
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // ── Send a message ────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, relatedListing, relatedOrder } = data;

        if (!receiverId || !content?.trim()) return;

        const conversationId = getConversationId(userId, receiverId);

        // Save message to MongoDB
        const message = await Message.create({
          conversationId,
          sender:   socket.user._id,
          receiver: receiverId,
          content:  content.trim(),
          relatedListing: relatedListing || null,
          relatedOrder:   relatedOrder   || null,
        });

        await message.populate('sender',   'name avatar');
        await message.populate('receiver', 'name avatar');

        // Send to receiver's personal room (delivers even if they're
        // on a different page — they'll get it when they open chat)
        io.to(receiverId).emit('receive_message', message);

        // Send back to sender as confirmation
        socket.emit('message_sent', message);

      } catch (err) {
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────
    socket.on('typing_start', ({ receiverId }) => {
      io.to(receiverId).emit('user_typing', {
        userId,
        name: socket.user.name,
      });
    });

    socket.on('typing_stop', ({ receiverId }) => {
      io.to(receiverId).emit('user_stop_typing', { userId });
    });

    // ── Mark messages as read ─────────────────────────────────────────
    socket.on('mark_read', async ({ senderId }) => {
      try {
        const conversationId = getConversationId(userId, senderId);
        await Message.updateMany(
          { conversationId, receiver: socket.user._id, isRead: false },
          { isRead: true }
        );
        // Notify sender their messages were read
        io.to(senderId).emit('messages_read', { by: userId });
      } catch (err) {
        console.error('mark_read error:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
      console.log(`🔌 ${socket.user.name} disconnected`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const getOnlineUsers = () => Array.from(onlineUsers.keys());

module.exports = { initSocket, getIO, getOnlineUsers };