// scripts/query_top_ingredients.js
require('dotenv').config();
const pool = require('../src/config/db');

const run = async () => {
  try {
    console.log('--- Querying top ingredients ---');
    
    // We can query a larger sample of foods or do a query. 
    // Since there are 230,000+ foods, let's query the database to extract all distinct ingredient terms.
    // In PostgreSQL, we can split the string by comma, trim, and aggregate.
    
    const res = await pool.query(`
      WITH split_ingredients AS (
        SELECT regexp_split_to_table(ingredients, '\\s*,\\s*') AS ingredient
        FROM foods
        WHERE ingredients IS NOT NULL AND ingredients <> ''
      )
      SELECT TRIM(LOWER(ingredient)) as ingredient, COUNT(*) as count
      FROM split_ingredients
      GROUP BY TRIM(LOWER(ingredient))
      ORDER BY count DESC
      LIMIT 100
    `);
    
    console.log('Top 100 Ingredients in DB:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

run();
