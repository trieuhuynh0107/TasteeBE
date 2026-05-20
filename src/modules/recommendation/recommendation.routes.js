// src/modules/recommendation/recommendation.routes.js
const router = require('express').Router();
const { authMiddleware } = require('../../middlewares/auth');
const { sendSuccess, sendError } = require('../../utils/response');
const recommendationService = require('./recommendation.service');

router.use(authMiddleware);

// GET /recommend-options (also handles GET /metadata/recommend-options when mounted under /metadata)
router.get('/recommend-options', async (req, res) => {
  try {
    const options = {
      version: 101, // Incremented version to ensure it takes precedence over client defaults
      cuisines: [
        "american", "asian", "italian", "mexican", "indian", "greek", "french", "chinese", "thai", "spanish", "japanese", "vietnamese", "korean"
      ],
      allergies: [
        "seafood", "fish", "nuts", "shellfish", "shrimp", "crab", "eggs", "eggs-dairy", "soy-tofu", "peanut-butter"
      ],
      dietTags: [
        "low-carb", "healthy", "vegetarian", "low-fat", "vegan", "very-low-carbs", "high-protein", "gluten-free"
      ],
      popularIngredients: [
        "Chicken", "Beef", "Pork", "Egg", "Rice", "Onion", "Garlic", "Tomato", "Potato", 
        "Carrot", "Shrimp", "Fish", "Tofu", "Mushroom", "Cheese", "Milk", "Cabbage", 
        "Spinach", "Cucumber", "Ginger", "Chili", "Bell Pepper", "Lemon", "Butter", 
        "Noodle", "Pork Belly", "Salmon", "Broccoli", "Sausage", "Bacon"
      ]
    };
    sendSuccess(res, options, 200, 'Fetch recommend options from static cache successfully');
  } catch (err) {
    sendError(res, 500, 'SERVER_ERROR', err.message);
  }
});

// GET /recommend?date=2025-01-15&ingredients=chicken,garlic
router.get('/', async (req, res, next) => {
  const { date, ingredients } = req.query;

  if (!date) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Thiếu query parameter: date (YYYY-MM-DD)');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'date phải đúng format YYYY-MM-DD');
  }

  try {
    const recommendations = await recommendationService.getRecommendations(req.user.id, date, ingredients);
    sendSuccess(res, recommendations);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
