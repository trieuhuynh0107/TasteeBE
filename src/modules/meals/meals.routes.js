// src/modules/meals/meals.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const mealsService = require('./meals.service');

router.use(authMiddleware);

// POST /meals – Thêm meal plan mới
router.post('/', async (req, res, next) => {
  const { foodId, scheduledAt, quantityG } = req.body;

  if (!foodId || !scheduledAt || !quantityG) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu foodId, scheduledAt hoặc quantityG');
  }

  if (quantityG <= 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'quantityG phải lớn hơn 0');
  }

  try {
    const meal = await mealsService.addMeal(req.user.id, { foodId, scheduledAt, quantityG });
    sendSuccess(res, meal, 201);
  } catch (err) {
    next(err);
  }
});

// GET /meals?date=2025-01-15 – Lấy meals theo ngày
router.get('/', async (req, res, next) => {
  const { date } = req.query;

  if (!date) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu query parameter: date (YYYY-MM-DD)');
  }

  // Validate date format cơ bản
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'date phải đúng format YYYY-MM-DD');
  }

  try {
    const meals = await mealsService.getMealsByDate(req.user.id, date);
    sendSuccess(res, meals);
  } catch (err) {
    next(err);
  }
});

// PATCH /meals/:id – Cập nhật meal plan
router.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { scheduledAt, quantityG } = req.body;

  // Phải có ít nhất 1 field để update
  if (scheduledAt === undefined && quantityG === undefined) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Cần ít nhất scheduledAt hoặc quantityG để cập nhật');
  }

  if (quantityG !== undefined && quantityG <= 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'quantityG phải lớn hơn 0');
  }

  try {
    const meal = await mealsService.updateMeal(req.user.id, id, { scheduledAt, quantityG });
    sendSuccess(res, meal);
  } catch (err) {
    next(err);
  }
});

// DELETE /meals/:id – Xóa meal plan (soft delete)
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    await mealsService.deleteMeal(req.user.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
