// src/modules/foods/foods.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const foodsService = require('./foods.service');

router.use(authMiddleware);

router.get('/search', async (req, res, next) => {
  const q = req.query.q || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1 || limit < 1 || limit > 100) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Page và limit không hợp lệ (limit tối đa 100)');
  }

  try {
    const { data, total } = await foodsService.searchFoods({ q, page, limit });
    sendPaginated(res, data, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const food = await foodsService.getFoodById(req.params.id);
    if (!food) {
      return sendError(res, 404, 'NOT_FOUND', 'Món ăn không tồn tại');
    }
    sendSuccess(res, food);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

