// src/modules/summary/summary.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const summaryService = require('./summary.service');

router.use(authMiddleware);

// GET /summary/daily?date=2025-01-15
router.get('/daily', async (req, res, next) => {
  const { date } = req.query;

  if (!date) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu query parameter: date (YYYY-MM-DD)');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'date phải đúng format YYYY-MM-DD');
  }

  try {
    const summary = await summaryService.getDailySummary(req.user.id, date);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
