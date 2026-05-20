// scripts/query_db_details.js
require('dotenv').config();
const pool = require('../src/config/db');

const run = async () => {
  try {
    console.log('--- Checking foods table sample rows ---');
    const sampleRes = await pool.query('SELECT name, ingredients, tags FROM foods LIMIT 5');
    console.log('Sample Foods:');
    console.log(JSON.stringify(sampleRes.rows, null, 2));

    console.log('\n--- Checking all unique tags and their counts ---');
    const tagsRes = await pool.query(`
      WITH unnested AS (
        SELECT unnest(tags) as tag
        FROM foods
      )
      SELECT tag, count(*) as count
      FROM unnested
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 100
    `);
    console.log('Top 100 Tags:');
    console.log(tagsRes.rows.map(r => `${r.tag}: ${r.count}`).join(', '));

    console.log('\n--- Checking common cuisines ---');
    // Let's filter tags that represent cuisines or common styles
    const potentialCuisines = [
      'american', 'italian', 'mexican', 'indian', 'greek', 'french', 'chinese', 
      'thai', 'spanish', 'japanese', 'vietnamese', 'korean', 'asian', 'mediterranean', 
      'european', 'african', 'middle-eastern', 'caribbean', 'cajun', 'south-american'
    ];
    const cuisinesRes = await pool.query(`
      WITH unnested AS (
        SELECT unnest(tags) as tag
        FROM foods
      )
      SELECT tag, count(*) as count
      FROM unnested
      WHERE tag = ANY($1::text[])
      GROUP BY tag
      ORDER BY count DESC
    `, [potentialCuisines]);
    console.log('Cuisine Tag Counts:');
    console.log(JSON.stringify(cuisinesRes.rows, null, 2));

    console.log('\n--- Checking common diet tags ---');
    const potentialDiets = [
      'vegetarian', 'vegan', 'low-carb', 'low-fat', 'gluten-free', 'dairy-free', 
      'healthy', 'high-protein', 'keto', 'paleo', 'very-low-carbs', 'halal', 'kosher'
    ];
    const dietsRes = await pool.query(`
      WITH unnested AS (
        SELECT unnest(tags) as tag
        FROM foods
      )
      SELECT tag, count(*) as count
      FROM unnested
      WHERE tag = ANY($1::text[])
      GROUP BY tag
      ORDER BY count DESC
    `, [potentialDiets]);
    console.log('Diet Tag Counts:');
    console.log(JSON.stringify(dietsRes.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

run();
