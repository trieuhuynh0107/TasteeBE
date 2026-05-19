// src/middlewares/error.js
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Lỗi server';

  if (statusCode === 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({ success: false, error: { code, message } });
};

module.exports = { errorMiddleware };
