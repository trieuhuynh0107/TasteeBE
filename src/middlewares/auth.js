// src/middlewares/auth.js
const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/errors');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('TOKEN_INVALID', 'Thiếu token xác thực', 401));
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    next(new AppError(code, 'Token không hợp lệ hoặc đã hết hạn', 401));
  }
};

module.exports = { authMiddleware };
