// src/modules/summary/summary.service.js
const pool = require('../../config/db');
const { AppError } = require('../../utils/errors');

/**
 * Lấy tổng hợp dinh dưỡng trong ngày so với target
 * - Sum calories/protein/carbs/fat từ meal_plans của ngày đó
 * - Lấy target từ user_profiles
 * - Trả về actual vs target + remaining + phần trăm
 */
const getDailySummary = async (userId, date) => {
  // 1. Lấy targets từ user_profiles
  const { rows: profileRows } = await pool.query(
    `SELECT daily_calories, daily_protein, daily_carbs, daily_fat, is_onboarding_complete
     FROM user_profiles
     WHERE user_id = $1`,
    [userId]
  );

  if (!profileRows.length || !profileRows[0].is_onboarding_complete) {
    throw new AppError('ONBOARDING_REQUIRED', 'Vui lòng hoàn thành onboarding trước khi xem summary', 400);
  }

  const targets = profileRows[0];

  // 2. Sum nutrition từ meal_plans trong ngày (loại bỏ soft-deleted)
  const { rows: sumRows } = await pool.query(
    `SELECT
       COALESCE(SUM(calories_snap), 0) AS total_calories,
       COALESCE(SUM(protein_snap), 0)  AS total_protein,
       COALESCE(SUM(carbs_snap), 0)    AS total_carbs,
       COALESCE(SUM(fat_snap), 0)      AS total_fat,
       COUNT(*)::integer               AS meal_count
     FROM meal_plans
     WHERE user_id = $1
       AND scheduled_at::date = $2
       AND deleted_at IS NULL`,
    [userId, date]
  );

  const actual = sumRows[0];

  // 3. Tính remaining và percentage
  const totalCalories = parseFloat(actual.total_calories);
  const totalProtein  = parseFloat(actual.total_protein);
  const totalCarbs    = parseFloat(actual.total_carbs);
  const totalFat      = parseFloat(actual.total_fat);

  const targetCalories = parseFloat(targets.daily_calories);
  const targetProtein  = parseFloat(targets.daily_protein);
  const targetCarbs    = parseFloat(targets.daily_carbs);
  const targetFat      = parseFloat(targets.daily_fat);

  return {
    date,
    mealCount: actual.meal_count,
    actual: {
      calories: +totalCalories.toFixed(1),
      protein:  +totalProtein.toFixed(1),
      carbs:    +totalCarbs.toFixed(1),
      fat:      +totalFat.toFixed(1),
    },
    target: {
      calories: +targetCalories.toFixed(1),
      protein:  +targetProtein.toFixed(1),
      carbs:    +targetCarbs.toFixed(1),
      fat:      +targetFat.toFixed(1),
    },
    remaining: {
      calories: +(targetCalories - totalCalories).toFixed(1),
      protein:  +(targetProtein  - totalProtein).toFixed(1),
      carbs:    +(targetCarbs    - totalCarbs).toFixed(1),
      fat:      +(targetFat      - totalFat).toFixed(1),
    },
    percentage: {
      calories: targetCalories > 0 ? +((totalCalories / targetCalories) * 100).toFixed(1) : 0,
      protein:  targetProtein  > 0 ? +((totalProtein  / targetProtein)  * 100).toFixed(1) : 0,
      carbs:    targetCarbs    > 0 ? +((totalCarbs    / targetCarbs)    * 100).toFixed(1) : 0,
      fat:      targetFat      > 0 ? +((totalFat      / targetFat)      * 100).toFixed(1) : 0,
    },
  };
};

module.exports = { getDailySummary };
