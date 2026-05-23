// src/modules/foods/foods.service.js
const pool = require('../../config/db');

const searchFoods = async ({ q, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  let query, countQuery, values, countValues;

  if (q) {
    // Sử dụng ILIKE để hỗ trợ tìm kiếm từng ký tự động (Search-as-you-type)
    query = `
      SELECT id, name, name_vi, ingredients, image_url, calories, protein, carbs, fat, tags
      FROM foods
      WHERE name ILIKE $1 OR name_vi ILIKE $1
      ORDER BY id
      LIMIT $2 OFFSET $3
    `;
    values = [`%${q}%`, limit, offset];
    
    countQuery = `
      SELECT COUNT(*)
      FROM foods
      WHERE name ILIKE $1 OR name_vi ILIKE $1
    `;
    countValues = [`%${q}%`];
  } else {
    query = `
      SELECT id, name, name_vi, ingredients, image_url, calories, protein, carbs, fat, tags
      FROM foods
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;
    values = [limit, offset];
    
    countQuery = `SELECT COUNT(*) FROM foods`;
    countValues = [];
  }

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, values),
    pool.query(countQuery, countValues)
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count)
  };
};

const getFoodById = async (id) => {
  const query = `
    SELECT id, name, name_vi, ingredients, image_url, calories, protein, carbs, fat, fiber, sugar, sodium, tags
    FROM foods
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = { searchFoods, getFoodById };

