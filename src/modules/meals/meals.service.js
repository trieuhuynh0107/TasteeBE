// src/modules/meals/meals.service.js
const pool = require('../../config/db');
const { AppError } = require('../../utils/errors');

/**
 * Thêm meal plan mới
 * - Kiểm tra food tồn tại
 * - Tính nutrition snapshot = food nutrition * (quantityG / 100)
 */
const addMeal = async (userId, { foodId, scheduledAt, quantityG }) => {
  // 1. Kiểm tra food tồn tại
  const { rows } = await pool.query(
    'SELECT calories, protein, carbs, fat FROM foods WHERE id = $1',
    [foodId]
  );
  if (!rows.length) throw new AppError('NOT_FOUND', 'Món ăn không tồn tại', 404);

  const food = rows[0];
  const ratio = quantityG / 100;

  // 2. Insert với nutrition snapshot
  const result = await pool.query(
    `INSERT INTO meal_plans
      (user_id, food_id, scheduled_at, quantity_g,
       calories_snap, protein_snap, carbs_snap, fat_snap)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId, foodId, scheduledAt, quantityG,
      +(food.calories * ratio).toFixed(1),
      +(food.protein  * ratio).toFixed(1),
      +(food.carbs    * ratio).toFixed(1),
      +(food.fat      * ratio).toFixed(1),
    ]
  );

  return result.rows[0];
};

/**
 * Lấy danh sách meals theo ngày
 * - Filter theo user_id + date (ngày của scheduled_at)
 * - Không lấy soft-deleted records
 * - JOIN với foods để lấy tên + image
 */
const getMealsByDate = async (userId, date) => {
  const result = await pool.query(
    `SELECT
       mp.id, mp.food_id, mp.scheduled_at, mp.quantity_g,
       mp.calories_snap, mp.protein_snap, mp.carbs_snap, mp.fat_snap,
       mp.created_at, mp.updated_at,
       f.name AS food_name, f.image_url AS food_image_url
     FROM meal_plans mp
     JOIN foods f ON f.id = mp.food_id
     WHERE mp.user_id = $1
       AND mp.scheduled_at::date = $2
       AND mp.deleted_at IS NULL
     ORDER BY mp.scheduled_at ASC`,
    [userId, date]
  );

  return result.rows;
};

/**
 * Cập nhật meal plan
 * - Chỉ chủ sở hữu mới được sửa
 * - Nếu đổi quantityG → tính lại nutrition snapshot
 * - Nếu đổi scheduledAt → cập nhật thời gian lên lịch
 */
const updateMeal = async (userId, mealId, { scheduledAt, quantityG }) => {
  // 1. Kiểm tra meal tồn tại + thuộc về user
  const { rows: mealRows } = await pool.query(
    `SELECT mp.id, mp.food_id, mp.quantity_g, mp.scheduled_at,
            f.calories, f.protein, f.carbs, f.fat
     FROM meal_plans mp
     JOIN foods f ON f.id = mp.food_id
     WHERE mp.id = $1 AND mp.user_id = $2 AND mp.deleted_at IS NULL`,
    [mealId, userId]
  );

  if (!mealRows.length) throw new AppError('NOT_FOUND', 'Meal plan không tồn tại', 404);

  const meal = mealRows[0];

  // 2. Xác định giá trị mới
  const newScheduledAt = scheduledAt !== undefined ? scheduledAt : meal.scheduled_at;
  const newQuantityG = quantityG !== undefined ? quantityG : meal.quantity_g;

  // 3. Tính lại nutrition snapshot nếu quantity thay đổi
  const ratio = newQuantityG / 100;
  const caloriesSnap = +(meal.calories * ratio).toFixed(1);
  const proteinSnap  = +(meal.protein  * ratio).toFixed(1);
  const carbsSnap    = +(meal.carbs    * ratio).toFixed(1);
  const fatSnap      = +(meal.fat      * ratio).toFixed(1);

  // 4. Update
  const result = await pool.query(
    `UPDATE meal_plans
     SET scheduled_at = $1,
         quantity_g = $2,
         calories_snap = $3,
         protein_snap = $4,
         carbs_snap = $5,
         fat_snap = $6,
         updated_at = NOW()
     WHERE id = $7 AND user_id = $8 AND deleted_at IS NULL
     RETURNING *`,
    [newScheduledAt, newQuantityG, caloriesSnap, proteinSnap, carbsSnap, fatSnap, mealId, userId]
  );

  return result.rows[0];
};

/**
 * Xóa meal plan (soft delete)
 * - Chỉ chủ sở hữu mới được xóa
 */
const deleteMeal = async (userId, mealId) => {
  const result = await pool.query(
    `UPDATE meal_plans
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [mealId, userId]
  );

  if (!result.rows.length) throw new AppError('NOT_FOUND', 'Meal plan không tồn tại', 404);
};

module.exports = { addMeal, getMealsByDate, updateMeal, deleteMeal };
