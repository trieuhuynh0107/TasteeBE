const pool = require('../../config/db');
const { AppError } = require('../../utils/errors');

// PL/pgSQL cosine similarity function definition
const initCosineSimilarityFunction = async () => {
  const sql = `
    CREATE OR REPLACE FUNCTION cosine_similarity(a float[], b float[])
    RETURNS float AS $$
    DECLARE
      dot_product float := 0;
      norm_a float := 0;
      norm_b float := 0;
      i integer;
    BEGIN
      IF a IS NULL OR b IS NULL THEN
        RETURN 0;
      END IF;
      IF array_length(a, 1) <> array_length(b, 1) THEN
        RETURN 0;
      END IF;
      FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + a[i] * b[i];
        norm_a := norm_a + a[i] * a[i];
        norm_b := norm_b + b[i] * b[i];
      END LOOP;
      IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
      END IF;
      RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `;
  await pool.query(sql);
};

let isInitialized = false;
const ensureFunctionInitialized = async () => {
  if (!isInitialized) {
    await initCosineSimilarityFunction();
    isInitialized = true;
  }
};

const getRecommendations = async (userId, date, ingredients) => {
  // 1. Khởi tạo function cosine_similarity trong PostgreSQL nếu chưa có
  await ensureFunctionInitialized();

  // 2. Lấy thông tin user profile
  const profileRes = await pool.query(
    `SELECT is_onboarding_complete, allergies, cuisines, diet_tags 
     FROM user_profiles 
     WHERE user_id = $1`,
    [userId]
  );

  if (!profileRes.rows.length || !profileRes.rows[0].is_onboarding_complete) {
    throw new AppError('ONBOARDING_REQUIRED', 'Chưa hoàn thành onboarding', 400);
  }

  const { allergies, cuisines, diet_tags: dietTags } = profileRes.rows[0];

  // 3. Lấy lịch sử meal plans để tính User Embedding Centroid
  // Lấy các bữa ăn của user cho tới ngày yêu cầu để làm lịch sử
  const mealsRes = await pool.query(
    `SELECT f.embedding
     FROM meal_plans mp
     JOIN foods f ON mp.food_id = f.id
     WHERE mp.user_id = $1 
       AND mp.scheduled_at <= $2 
       AND mp.deleted_at IS NULL 
       AND f.embedding IS NOT NULL`,
    [userId, `${date}T23:59:59.999Z`]
  );

  let userEmbedding = null;
  if (mealsRes.rows.length > 0) {
    const dim = mealsRes.rows[0].embedding.length;
    userEmbedding = new Array(dim).fill(0);
    for (const row of mealsRes.rows) {
      for (let i = 0; i < dim; i++) {
        userEmbedding[i] += row.embedding[i];
      }
    }
    // Chia trung bình để ra centroid
    for (let i = 0; i < dim; i++) {
      userEmbedding[i] /= mealsRes.rows.length;
    }
  }

  // 4. Tìm kiếm các ứng viên foods (loại bỏ món chứa chất gây dị ứng và lọc theo nguyên liệu nếu có)
  let candidates = [];
  const allergyArray = allergies && allergies.length ? allergies : null;

  // Trích xuất regex pattern cho ingredients
  const escapeRegex = (string) => string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  const ingredientsPattern = ingredients
    ? ingredients.split(',').map(i => escapeRegex(i.trim())).filter(Boolean).join('|')
    : null;

  if (userEmbedding) {
    // Nếu có lịch sử, tính similarity bằng SQL
    const candidatesRes = await pool.query(
      `SELECT id, name, name_vi, ingredients, image_url, calories, protein, carbs, fat, tags,
              cosine_similarity(embedding, $1::float[]) AS similarity
       FROM foods
       WHERE embedding IS NOT NULL
         AND ($2::text[] IS NULL OR NOT (tags && $2::text[]))
         AND ($3::text IS NULL OR ingredients ~* $3)
       ORDER BY similarity DESC
       LIMIT 200`,
      [userEmbedding, allergyArray, ingredientsPattern]
    );
    candidates = candidatesRes.rows;
  } else {
    // Nếu không có lịch sử, lấy ngẫu nhiên/theo ID các món không gây dị ứng
    const candidatesRes = await pool.query(
      `SELECT id, name, name_vi, ingredients, image_url, calories, protein, carbs, fat, tags,
              0.0 AS similarity
       FROM foods
       WHERE embedding IS NOT NULL
         AND ($1::text[] IS NULL OR NOT (tags && $1::text[]))
         AND ($2::text IS NULL OR ingredients ~* $2)
       ORDER BY id
       LIMIT 200`,
      [allergyArray, ingredientsPattern]
    );
    candidates = candidatesRes.rows;
  }

  // 5. Tính Hybrid Score trong JS (similarity + tag boost)
  const recommendations = candidates.map(food => {
    const foodTags = food.tags || [];
    let tagBoost = 0;

    // Cộng điểm cho diet_tags trùng khớp (+0.2 mỗi tag)
    if (dietTags && dietTags.length) {
      const dietMatches = foodTags.filter(t => dietTags.includes(t)).length;
      tagBoost += dietMatches * 0.2;
    }

    // Cộng điểm cho cuisines trùng khớp (+0.2 mỗi cuisine)
    if (cuisines && cuisines.length) {
      const cuisineMatches = foodTags.filter(t => cuisines.includes(t)).length;
      tagBoost += cuisineMatches * 0.2;
    }

    const similarity = parseFloat(food.similarity) || 0;
    const score = similarity + tagBoost;

    // Không trả về embedding thô để response nhẹ hơn
    const { embedding, ...foodData } = food;

    return {
      ...foodData,
      similarity: +similarity.toFixed(4),
      score: +score.toFixed(4)
    };
  });

  // Sắp xếp theo score giảm dần, lấy top 20
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, 20);
};

module.exports = { getRecommendations };
