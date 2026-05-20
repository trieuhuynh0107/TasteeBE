// scripts/test_new_recommend.js
require('dotenv').config();
const pool = require('../src/config/db');
const recommendationService = require('../src/modules/recommendation/recommendation.service');

const run = async () => {
  try {
    console.log('--- Testing Recommendations Service Direct Integration ---');

    // 1. Find a user who has completed onboarding
    const userRes = await pool.query('SELECT user_id FROM user_profiles WHERE is_onboarding_complete = true LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No user profiles found. Let\'s check if any user exists...');
      const allUsers = await pool.query('SELECT id FROM users LIMIT 1');
      if (allUsers.rows.length === 0) {
        console.error('No users found in database to test with.');
        return;
      }
      const userId = allUsers.rows[0].id;
      console.log(`Setting up profile for user: ${userId}`);
      await pool.query(`
        INSERT INTO user_profiles (user_id, gender, date_of_birth, height_cm, weight_kg, cuisines, allergies, diet_tags, is_onboarding_complete)
        VALUES ($1, 'male', '2000-01-01', 170.0, 60.0, ARRAY['american', 'italian']::text[], ARRAY['fish']::text[], ARRAY['low-carb']::text[], true)
        ON CONFLICT (user_id) DO UPDATE SET is_onboarding_complete = true
      `, [userId]);
      userRes.rows.push({ user_id: userId });
    }

    const userId = userRes.rows[0].user_id;
    console.log(`Testing using User ID: ${userId}`);

    // 2. Fetch recommendations WITHOUT ingredients filter
    console.log('\n2. Fetching recommendations without ingredient filter:');
    const recsNoIngredients = await recommendationService.getRecommendations(userId, '2026-05-20');
    console.log(`Fetched ${recsNoIngredients.length} items successfully.`);
    if (recsNoIngredients.length > 0) {
      console.log('Sample item:', recsNoIngredients[0].name, 'Tags:', recsNoIngredients[0].tags);
    }

    // 3. Fetch recommendations WITH ingredients filter
    console.log('\n3. Fetching recommendations WITH ingredients filter "chicken":');
    const recsWithChicken = await recommendationService.getRecommendations(userId, '2026-05-20', 'chicken');
    console.log(`Fetched ${recsWithChicken.length} items containing "chicken".`);
    if (recsWithChicken.length > 0) {
      console.log('Sample item:', recsWithChicken[0].name, 'Ingredients:', recsWithChicken[0].ingredients);
      const allContainChicken = recsWithChicken.every(item => item.ingredients.toLowerCase().includes('chicken'));
      console.log(`Validation - All returned items contain "chicken"?`, allContainChicken);
    }

    // 4. Fetch recommendations with multiple ingredients "butter, bacon"
    console.log('\n4. Fetching recommendations with ingredients filter "butter, bacon":');
    const recsMultiple = await recommendationService.getRecommendations(userId, '2026-05-20', 'butter, bacon');
    console.log(`Fetched ${recsMultiple.length} items.`);
    if (recsMultiple.length > 0) {
      console.log('Sample item 1:', recsMultiple[0].name, 'Ingredients:', recsMultiple[0].ingredients);
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await pool.end();
  }
};

run();
