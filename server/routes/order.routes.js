// server/routes/order.routes.js
const express = require('express');
const router  = express.Router();
const {
  createOrder, getMyOrders, getOrderById,
  updateOrderStatus, cancelOrder, getIncomingOrders,
} = require('../controllers/order.controller');
const { protect }        = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { verifyOrderOwnership } = require('../middleware/role.middleware');

// All order routes require authentication
router.use(protect);

router.post('/',    authorizeRoles('buyer'),  createOrder);   // buyer places order
router.get('/', getMyOrders);   // buyer or farmer sees their orders
router.get('/:id', verifyOrderOwnership, getOrderById); // buyer or farmer sees specific order details

router.patch('/:id/status', authorizeRoles('farmer'), updateOrderStatus); // farmer updates status
router.patch('/:id/cancel', authorizeRoles('buyer'),  cancelOrder);       // buyer cancels

// Farmer sees all incoming orders for their listings
router.get(
  '/farmer/incoming',
  authorizeRoles('farmer'),
  getIncomingOrders
);

module.exports = router;