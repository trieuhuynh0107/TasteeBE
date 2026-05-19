// src/modules/auth/auth.service.js
const bcrypt = require('bcrypt');
const pool = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');

const register = async ({ name, email, password }) => {
  // Check if email exists
  const { rows: existingUsers } = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (existingUsers.length > 0) {
    throw new AppError('EMAIL_ALREADY_EXISTS', 'Email đã được đăng ký', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
    [name, email, hashedPassword]
  );
  
  return rows[0];
};

const login = async ({ email, password }) => {
  const { rows } = await pool.query('SELECT id, name, email, password FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (rows.length === 0) {
    throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401);
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401);
  }

  const payload = { id: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [hashedRefreshToken, user.id]);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken
  };
};

const refresh = async (token) => {
  if (!token) throw new AppError('VALIDATION_ERROR', 'Thiếu refresh token', 400);

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    throw new AppError('REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }

  const { rows } = await pool.query('SELECT id, email, refresh_token FROM users WHERE id = $1 AND deleted_at IS NULL', [payload.id]);
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404);
  }

  const user = rows[0];
  if (!user.refresh_token) {
    throw new AppError('REFRESH_TOKEN_INVALID', 'Token đã bị thu hồi', 401);
  }

  const isMatch = await bcrypt.compare(token, user.refresh_token);
  if (!isMatch) {
    throw new AppError('REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ', 401);
  }

  const newPayload = { id: user.id, email: user.email };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [hashedRefreshToken, user.id]);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logout = async (userId) => {
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
  return { success: true };
};

module.exports = { register, login, refresh, logout };
