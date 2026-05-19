// src/middlewares/error.js
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Lỗi server';

  // 1. Map PostgreSQL Errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation (ví dụ: trùng email)
        statusCode = 400;
        code = 'EMAIL_ALREADY_EXISTS';
        message = 'Email đã tồn tại trong hệ thống';
        break;
      case '23503': // foreign_key_violation (ví dụ: food_id không tồn tại)
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Dữ liệu liên quan không tồn tại trong hệ thống';
        break;
      case '22P02': // invalid_text_representation (ví dụ: UUID sai format)
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Định dạng dữ liệu không hợp lệ (ví dụ: ID không đúng định dạng UUID)';
        break;
    }
  }

  // 2. Map JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'TOKEN_INVALID';
    message = 'Token không hợp lệ hoặc chữ ký bị sai';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token đã hết hạn';
  }

  if (statusCode === 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({ success: false, error: { code, message } });
};

module.exports = { errorMiddleware };
