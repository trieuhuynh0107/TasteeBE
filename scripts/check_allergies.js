// scripts/check_allergies.js
require('dotenv').config();
const pool = require('../src/config/db');

const run = async () => {
  try {
    const allergyTags = [
      'peanut', 'peanuts', 'milk', 'dairy', 'egg', 'eggs', 'eggs-dairy', 'soy', 'soy-tofu', 'wheat', 'sesame', 
      'fish', 'shrimp', 'crab', 'shellfish', 'seafood', 'nuts', 'peanut-butter', 'gluten'
    ];
    
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
    `, [allergyTags]);
    
    console.log('Allergy Tag Counts in DB:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
};

run();
