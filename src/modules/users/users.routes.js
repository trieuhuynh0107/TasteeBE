// src/modules/users/users.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const usersService = require('./users.service');

router.use(authMiddleware);

router.post('/onboarding', async (req, res, next) => {
  const { gender, dateOfBirth, heightCm, weightKg, cuisines, allergies, dietTags } = req.body;
  
  if (!gender || !dateOfBirth || !heightCm || !weightKg) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu gender, dateOfBirth, heightCm, hoặc weightKg');
  }

  try {
    const profile = await usersService.onboarding(req.user.id, req.body);
    sendSuccess(res, profile, 201, 'Onboarding thành công');
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const profile = await usersService.getProfile(req.user.id);
    sendSuccess(res, profile, 200);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', async (req, res, next) => {
  try {
    const profile = await usersService.updateProfile(req.user.id, req.body);
    sendSuccess(res, profile, 200, 'Cập nhật profile thành công');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
