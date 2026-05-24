// server/controllers/chat.controller.js
const Message = require('../models/Message.model');
const User    = require('../models/User.model');
const notify = require('../utils/notify');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Always converts both IDs to plain strings before sorting
// This guarantees A+B and B+A always produce identical results
const getConversationId = (id1, id2) => {
  const str1 = id1.toString().trim();
  const str2 = id2.toString().trim();
  return [str1, str2].sort().join('_');
};

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
// @desc    Get messages in a conversation
// @route   GET /api/chat/:userId
// @access  Private — ONLY the two participants can read this
// ─────────────────────────────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // ── SECURITY: Verify the requester is one of the two participants ─
    // conversationId = sorted join of BOTH user IDs
    // If the logged-in user's ID is not in the conversationId, they
    // are not a participant and cannot read these messages
    const myId    = req.user._id.toString();
    const otherId = userId.toString();

    // Prevent reading your own "conversation" with yourself
    if (myId === otherId) {
      return errorResponse(res, 400, 'Invalid conversation');
    }

    const conversationId = getConversationId(myId, otherId);

    // The conversationId is built from BOTH IDs sorted
    // So we can verify: both IDs must be inside it
    if (!conversationId.includes(myId) || !conversationId.includes(otherId)) {
      return errorResponse(res, 403, 'Not authorized to view this conversation');
    }

    const otherUser = await User.findById(otherId).select('name avatar role');
    if (!otherUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // ── Verify at least one message exists between these two ──────────
    // This prevents user enumeration — someone probing random user IDs
    // to see if a conversation exists
    const messageCount = await Message.countDocuments({ conversationId });

    // Fetch messages
    const messages = await Message.find({ conversationId })
      .populate('sender',   'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(50);

    // Mark received messages as read
    await Message.updateMany(
      { conversationId, receiver: req.user._id, isRead: false },
      { isRead: true }
    );

    // After fetching messages, normalize all IDs to strings
    const normalizedMessages = messages.map((msg) => {
      const obj = msg.toObject();
      obj._id            = obj._id.toString();
      obj.sender._id     = obj.sender._id.toString();
      obj.receiver._id   = obj.receiver._id.toString();
      obj.conversationId = obj.conversationId;
      return obj;
    });

    return successResponse(res, 200, 'Messages fetched', {
      messages: normalizedMessages,
      conversationId,
      otherUser: {
        _id:    otherUser._id.toString(),
        name:   otherUser.name,
        avatar: otherUser.avatar,
        role:   otherUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, relatedListing, relatedOrder } = req.body;

    if (!receiverId || !content?.trim()) {
      return errorResponse(res, 400, 'Receiver and content are required');
    }

    // ── SECURITY: Sender must be the logged-in user ───────────────────
    // Never trust a senderId from the request body
    // req.user._id comes from the verified JWT — this is the only
    // trusted identity source
    const senderId = req.user._id;

    if (senderId.toString() === receiverId.toString()) {
      return errorResponse(res, 400, 'Cannot send a message to yourself');
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return errorResponse(res, 404, 'Receiver not found');
    }

    const conversationId = getConversationId(senderId, receiverId);

    const message = await Message.create({
      conversationId,
      sender:         senderId,   // always from JWT, never from body
      receiver:       receiverId,
      content:        content.trim(),
      relatedListing: relatedListing || null,
      relatedOrder:   relatedOrder   || null,
    });

    await message.populate('sender',   'name avatar');
    await message.populate('receiver', 'name avatar');

    // Notify receiver
    notify(receiverId, 'new_notification', {
      type:   'new_message',
      title:  'New message 💬',
      message: `${req.user.name}: ${content.trim().slice(0, 60)}`,
      fromId: senderId,
    });

    // After populate, before return:
    const messageObj       = message.toObject();
    messageObj._id         = messageObj._id.toString();
    messageObj.sender._id  = messageObj.sender._id.toString();
    messageObj.receiver._id = messageObj.receiver._id.toString();

    return successResponse(res, 201, 'Message sent', { message: messageObj });
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