const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 100, // Giới hạn 100 requests mỗi window cho mỗi IP
  standardHeaders: true, // Trả về rate limit info ở các header RateLimit-*
  legacyHeaders: false, // Tắt các header cũ X-RateLimit-*
  handler: (req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.');
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 15, // Giới hạn 15 requests cho đăng nhập/đăng ký
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Yêu cầu đăng nhập/đăng ký quá nhiều lần, vui lòng thử lại sau 15 phút.');
  }
});

module.exports = { globalRateLimiter, authRateLimiter };
