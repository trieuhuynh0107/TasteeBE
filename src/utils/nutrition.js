// src/utils/nutrition.js

// BMR theo công thức Mifflin-St Jeor
const calcBMR = ({ weightKg, heightCm, ageYears, gender }) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return gender === 'male' ? base + 5 : base - 161;
};

// App không hỏi activity level → dùng mặc định moderately_active (x1.55)
const calcTDEE = (bmr) => Math.round(bmr * 1.55);

// Macro targets chuẩn: protein 25% | carbs 50% | fat 25%
const calcMacroTargets = (dailyCalories) => ({
  dailyCalories,
  dailyProtein: Math.round((dailyCalories * 0.25) / 4),  // 4 kcal/g
  dailyCarbs:   Math.round((dailyCalories * 0.50) / 4),  // 4 kcal/g
  dailyFat:     Math.round((dailyCalories * 0.25) / 9),  // 9 kcal/g
});

const calcAgeFromDOB = (dateOfBirth) => {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

module.exports = { calcBMR, calcTDEE, calcMacroTargets, calcAgeFromDOB };
