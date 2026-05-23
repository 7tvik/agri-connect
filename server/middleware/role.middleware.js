// server/middleware/role.middleware.js
const { errorResponse } = require('../utils/apiResponse');

// Usage: authorizeRoles('farmer', 'admin')
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Role '${req.user.role}' is not allowed to access this route`
      );
    }
    next();
  };
};

module.exports = { authorizeRoles };