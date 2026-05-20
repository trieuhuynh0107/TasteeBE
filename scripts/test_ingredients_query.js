// scripts/test_ingredients_query.js
require('dotenv').config();
const pool = require('../src/config/db');

const run = async () => {
  try {
    const ingredients = 'chicken, garlic';
    const escapeRegex = (string) => string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const ingredientsPattern = ingredients
      ? ingredients.split(',').map(i => escapeRegex(i.trim())).filter(Boolean).join('|')
      : null;

    console.log('Ingredients pattern:', ingredientsPattern);

    const res = await pool.query(`
      SELECT name, ingredients 
      FROM foods 
      WHERE embedding IS NOT NULL 
        AND ($1::text IS NULL OR ingredients ~* $1)
      LIMIT 5
    `, [ingredientsPattern]);

    console.log('Query results:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
};

run();
