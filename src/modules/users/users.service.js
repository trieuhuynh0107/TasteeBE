// src/modules/users/users.service.js
const pool = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { calcBMR, calcTDEE, calcMacroTargets, calcAgeFromDOB } = require('../../utils/nutrition');

const getProfile = async (userId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, p.gender, p.date_of_birth, p.height_cm, p.weight_kg,
            p.daily_calories, p.daily_protein, p.daily_carbs, p.daily_fat,
            p.cuisines, p.allergies, p.diet_tags, p.is_onboarding_complete
     FROM users u
     LEFT JOIN user_profiles p ON u.id = p.user_id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );
  
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404);
  return rows[0];
};

const onboarding = async (userId, payload) => {
  const { gender, dateOfBirth, heightCm, weightKg, cuisines = [], allergies = [], dietTags = [] } = payload;
  
  const ageYears = calcAgeFromDOB(dateOfBirth);
  const bmr = calcBMR({ weightKg, heightCm, ageYears, gender });
  const tdee = calcTDEE(bmr);
  const macros = calcMacroTargets(tdee);
  
  const { rows } = await pool.query(
    `INSERT INTO user_profiles (
      user_id, gender, date_of_birth, height_cm, weight_kg,
      daily_calories, daily_protein, daily_carbs, daily_fat,
      cuisines, allergies, diet_tags, is_onboarding_complete
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
    ON CONFLICT (user_id) DO UPDATE SET
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      height_cm = EXCLUDED.height_cm,
      weight_kg = EXCLUDED.weight_kg,
      daily_calories = EXCLUDED.daily_calories,
      daily_protein = EXCLUDED.daily_protein,
      daily_carbs = EXCLUDED.daily_carbs,
      daily_fat = EXCLUDED.daily_fat,
      cuisines = EXCLUDED.cuisines,
      allergies = EXCLUDED.allergies,
      diet_tags = EXCLUDED.diet_tags,
      is_onboarding_complete = true
    RETURNING *`,
    [
      userId, gender, dateOfBirth, heightCm, weightKg,
      macros.dailyCalories, macros.dailyProtein, macros.dailyCarbs, macros.dailyFat,
      cuisines, allergies, dietTags
    ]
  );
  
  return rows[0];
};

const updateProfile = async (userId, payload) => {
  const { name, gender, dateOfBirth, heightCm, weightKg, cuisines, allergies, dietTags } = payload;
  
  // Update name in users table if provided
  if (name) {
    await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name, userId]);
  }

  // Get current profile
  const { rows: currentProfileRows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  if (currentProfileRows.length === 0) {
    throw new AppError('ONBOARDING_REQUIRED', 'Vui lòng hoàn thành onboarding trước', 400);
  }
  
  const currentProfile = currentProfileRows[0];
  
  const newGender = gender !== undefined ? gender : currentProfile.gender;
  const newDob = dateOfBirth !== undefined ? dateOfBirth : currentProfile.date_of_birth;
  const newHeight = heightCm !== undefined ? heightCm : currentProfile.height_cm;
  const newWeight = weightKg !== undefined ? weightKg : currentProfile.weight_kg;
  
  let calories = currentProfile.daily_calories;
  let protein = currentProfile.daily_protein;
  let carbs = currentProfile.daily_carbs;
  let fat = currentProfile.daily_fat;
  
  // Re-calculate macros if body metrics changed
  if (gender !== undefined || dateOfBirth !== undefined || heightCm !== undefined || weightKg !== undefined) {
    const ageYears = calcAgeFromDOB(newDob);
    const bmr = calcBMR({ weightKg: newWeight, heightCm: newHeight, ageYears, gender: newGender });
    const tdee = calcTDEE(bmr);
    const macros = calcMacroTargets(tdee);
    
    calories = macros.dailyCalories;
    protein = macros.dailyProtein;
    carbs = macros.dailyCarbs;
    fat = macros.dailyFat;
  }
  
  const newCuisines = cuisines !== undefined ? cuisines : currentProfile.cuisines;
  const newAllergies = allergies !== undefined ? allergies : currentProfile.allergies;
  const newDietTags = dietTags !== undefined ? dietTags : currentProfile.diet_tags;

  const { rows: updatedProfile } = await pool.query(
    `UPDATE user_profiles SET
      gender = $1, date_of_birth = $2, height_cm = $3, weight_kg = $4,
      daily_calories = $5, daily_protein = $6, daily_carbs = $7, daily_fat = $8,
      cuisines = $9, allergies = $10, diet_tags = $11, updated_at = NOW()
     WHERE user_id = $12
     RETURNING *`,
    [
      newGender, newDob, newHeight, newWeight,
      calories, protein, carbs, fat,
      newCuisines, newAllergies, newDietTags, userId
    ]
  );
  
  return getProfile(userId); // Return merged profile
};

module.exports = { getProfile, onboarding, updateProfile };
