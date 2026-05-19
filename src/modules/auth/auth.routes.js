// src/modules/auth/auth.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const authService = require('./auth.service');

router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu name, email hoặc password');
  }

  try {
    const user = await authService.register({ name, email, password });
    sendSuccess(res, user, 201, 'Đăng ký thành công');
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu email hoặc password');
  }

  try {
    const data = await authService.login({ email, password });
    sendSuccess(res, data, 200, 'Đăng nhập thành công');
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu refreshToken');
  }

  try {
    const data = await authService.refresh(refreshToken);
    sendSuccess(res, data, 200, 'Làm mới token thành công');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    sendSuccess(res, null, 200, 'Đăng xuất thành công');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
