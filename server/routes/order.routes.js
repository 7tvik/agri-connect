// server/routes/order.routes.js
const express = require('express');
const router  = express.Router();
const {
  createOrder, getMyOrders, getOrderById,
  updateOrderStatus, cancelOrder,
} = require('../controllers/order.controller');
const { protect }        = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

// All order routes require authentication
router.use(protect);

router.post('/',    authorizeRoles('buyer'),  createOrder);   // buyer places order
router.get('/',                               getMyOrders);   // buyer or farmer sees their orders
router.get('/:id',                            getOrderById);  // single order detail

router.patch('/:id/status', authorizeRoles('farmer'), updateOrderStatus); // farmer updates status
router.patch('/:id/cancel', authorizeRoles('buyer'),  cancelOrder);       // buyer cancels

module.exports = router;