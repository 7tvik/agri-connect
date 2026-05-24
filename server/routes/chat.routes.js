// server/routes/chat.routes.js
const express = require('express');
const router  = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect); // all chat routes require auth

router.get('/conversations', getConversations);
router.get('/unread-count',  getUnreadCount);
router.get('/:userId',       getMessages);
router.post('/send',         sendMessage);

module.exports = router;