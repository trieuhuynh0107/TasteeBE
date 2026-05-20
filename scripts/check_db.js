// scripts/check_db.js
require('dotenv').config();
const pool = require('../src/config/db');

const run = async () => {
  try {
    console.log('Querying count for specific allergen-related tags...');

    const tags = ["seafood", "fish", "nuts", "shellfish", "shrimp", "crab", "eggs", "eggs-dairy", "peanut-butter", "soy-tofu"];

    const res = await pool.query(`
      WITH unnested AS (
        SELECT unnest(tags) as tag
        FROM foods
      )
      SELECT tag, count(*) as count
      FROM unnested
      WHERE tag = ANY($1::text[])
      GROUP BY tag
      ORDER BY count DESC
    `, [tags]);
    
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error running check_db:', err);
  } finally {
    await pool.end();
  }
};

run();
