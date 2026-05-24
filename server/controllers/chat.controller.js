// server/controllers/chat.controller.js
const Message = require('../models/Message.model');
const User    = require('../models/User.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ── Helper: generate consistent conversation ID ───────────────────────
// Sorting ensures farmer+buyer === buyer+farmer
const getConversationId = (userId1, userId2) =>
  [userId1.toString(), userId2.toString()].sort().join('_');

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all conversations for logged-in user
// @route   GET /api/chat/conversations
// @access  Private
// ─────────────────────────────────────────────────────────────────────
const getConversations = async (req, res, next) => {
  try {
    // Find all messages where this user is sender or receiver
    // Group by conversationId to get unique conversations
    // Get the latest message from each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender:   req.user._id },
            { receiver: req.user._id },
          ],
        },
      },
      // Sort by newest first before grouping
      { $sort: { createdAt: -1 } },
      // Group by conversationId — keep only the first (latest) message
      {
        $group: {
          _id:          '$conversationId',
          lastMessage:  { $first: '$content' },
          lastTime:     { $first: '$createdAt' },
          senderId:     { $first: '$sender' },
          receiverId:   { $first: '$receiver' },
          isRead:       { $first: '$isRead' },
        },
      },
      { $sort: { lastTime: -1 } },
    ]);

    // For each conversation, figure out who the OTHER person is
    // and fetch their profile
    const populated = await Promise.all(
      conversations.map(async (conv) => {
        const otherId =
          conv.senderId.toString() === req.user._id.toString()
            ? conv.receiverId
            : conv.senderId;

        const other = await User.findById(otherId).select('name avatar role');

        // Count unread messages in this conversation
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          receiver:       req.user._id,
          isRead:         false,
        });

        return {
          conversationId: conv._id,
          other,
          lastMessage:    conv.lastMessage,
          lastTime:       conv.lastTime,
          unreadCount,
        };
      })
    );

    return successResponse(res, 200, 'Conversations fetched', {
      conversations: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get messages in a conversation with a specific user
// @route   GET /api/chat/:userId
// @access  Private
// ─────────────────────────────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const otherUser  = await User.findById(userId);

    if (!otherUser) {
      return errorResponse(res, 404, 'User not found');
    }

    const conversationId = getConversationId(req.user._id, userId);

    // Fetch messages (paginated — last 50)
    const messages = await Message.find({ conversationId })
      .populate('sender',   'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: 1 }) // oldest first for chat display
      .limit(50);

    // Mark all received messages as read
    await Message.updateMany(
      {
        conversationId,
        receiver: req.user._id,
        isRead:   false,
      },
      { isRead: true }
    );

    return successResponse(res, 200, 'Messages fetched', {
      messages,
      conversationId,
      otherUser: {
        _id:    otherUser._id,
        name:   otherUser.name,
        avatar: otherUser.avatar,
        role:   otherUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Send a message (REST fallback — main sending is via Socket)
// @route   POST /api/chat/send
// @access  Private
// ─────────────────────────────────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, relatedListing, relatedOrder } = req.body;

    if (!receiverId || !content?.trim()) {
      return errorResponse(res, 400, 'Receiver and content are required');
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return errorResponse(res, 404, 'Receiver not found');
    }

    const conversationId = getConversationId(req.user._id, receiverId);

    const message = await Message.create({
      conversationId,
      sender:         req.user._id,
      receiver:       receiverId,
      content:        content.trim(),
      relatedListing: relatedListing || null,
      relatedOrder:   relatedOrder   || null,
    });

    await message.populate('sender',   'name avatar');
    await message.populate('receiver', 'name avatar');

    return successResponse(res, 201, 'Message sent', { message });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get unread message count for navbar badge
// @route   GET /api/chat/unread-count
// @access  Private
// ─────────────────────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead:   false,
    });
    return successResponse(res, 200, 'Unread count fetched', { count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  getConversationId,
};