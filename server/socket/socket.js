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

        // Convert BOTH to plain strings before ANY comparison or ID generation
        const senderIdStr   = socket.user._id.toString();
        const receiverIdStr = receiverId.toString();

        // Prevent self-messaging
        if (senderIdStr === receiverIdStr) return;

        // Generate conversationId from plain strings — consistent every time
        const conversationId = getConversationId(senderIdStr, receiverIdStr);

        // Save to DB
        const message = await Message.create({
          conversationId,
          sender:         socket.user._id,
          receiver:       receiverIdStr,
          content:        content.trim(),
          relatedListing: relatedListing || null,
          relatedOrder:   relatedOrder   || null,
        });

        await message.populate('sender',   '_id name avatar');
        await message.populate('receiver', '_id name avatar');

        // Convert to plain JS object so _id fields are plain strings
        const messageObj = message.toObject();
        // Ensure _id fields are strings for frontend comparison
        messageObj._id              = messageObj._id.toString();
        messageObj.sender._id       = messageObj.sender._id.toString();
        messageObj.receiver._id     = messageObj.receiver._id.toString();
        messageObj.conversationId   = conversationId;

        // Send to receiver's private room
        io.to(receiverIdStr).emit('receive_message', messageObj);

        // Confirm to sender
        socket.emit('message_sent', messageObj);

        // Notify receiver
        notify(receiverIdStr, 'new_notification', {
          type:    'new_message',
          title:   'New message 💬',
          message: `${socket.user.name}: ${content.trim().slice(0, 60)}`,
          fromId:  senderIdStr,
        });

      } catch (err) {
        console.error('send_message error:', err);
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