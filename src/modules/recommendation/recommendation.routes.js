// src/modules/recommendation/recommendation.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const recommendationService = require('./recommendation.service');

router.use(authMiddleware);

// GET /recommend?date=2025-01-15
router.get('/', async (req, res, next) => {
  const { date } = req.query;

  if (!date) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu query parameter: date (YYYY-MM-DD)');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'date phải đúng format YYYY-MM-DD');
  }

  try {
    const recommendations = await recommendationService.getRecommendations(req.user.id, date);
    sendSuccess(res, recommendations);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
