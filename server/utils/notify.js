// server/utils/notify.js
// WHY a separate utility? getIO() throws if called before socket init.
// This wrapper catches that safely so a notification failure never
// crashes an API response.

const notify = (userId, event, data) => {
  try {
    const { getIO } = require('../socket/socket');
    const io = getIO();
    io.to(userId.toString()).emit(event, {
      ...data,
      time: new Date(),
    });
  } catch (err) {
    // Socket not ready or user offline — fail silently
    console.warn(`[notify] Could not send ${event} to ${userId}:`, err.message);
  }
};

module.exports = notify;