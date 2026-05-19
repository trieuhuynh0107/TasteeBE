// scripts/import-foods.js
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../src/config/db');

const CSV_FILE = 'D:\\ingredients\\Foodcom\\RAW_recipes.csv';

const parsePythonList = (str) => {
  if (!str) return [];
  const regex = /'(.*?)'/g;
  let match;
  const result = [];
  while ((match = regex.exec(str)) !== null) {
    result.push(match[1]);
  }
  return result;
};

const importData = async () => {
  console.log('Bắt đầu import dữ liệu...');
  
  const results = [];
  let count = 0;
  
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => {
      let nutrition = [0,0,0,0,0,0,0];
      try {
        nutrition = JSON.parse(data.nutrition || '[0,0,0,0,0,0,0]');
      } catch (e) {}
      
      const record = {
        external_id: parseInt(data.id),
        name: data.name,
        ingredients: parsePythonList(data.ingredients).join(', '),
        calories: nutrition[0] || 0,
        fat: nutrition[1] || 0,
        sugar: nutrition[2] || 0,
        sodium: nutrition[3] || 0,
        protein: nutrition[4] || 0,
        carbs: nutrition[6] || 0,
        tags: parsePythonList(data.tags)
      };
      
      results.push(record);
      count++;
      
      if (count % 50000 === 0) {
        console.log(`Đã đọc ${count} dòng...`);
      }
    })
    .on('end', async () => {
      console.log(`Đọc xong file CSV. Tổng cộng ${results.length} món ăn. Tiến hành insert vào Database...`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const batchSize = 1000;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          
          let query = 'INSERT INTO foods (external_id, name, ingredients, calories, fat, sugar, sodium, protein, carbs, tags) VALUES ';
          const values = [];
          
          batch.forEach((row, index) => {
            const offset = index * 10;
            query += `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}),`;
            values.push(row.external_id, row.name, row.ingredients, row.calories, row.fat, row.sugar, row.sodium, row.protein, row.carbs, row.tags);
          });
          
          query = query.slice(0, -1) + ' ON CONFLICT (external_id) DO NOTHING';
          
          await client.query(query, values);
          if ((i + batchSize) % 50000 === 0 || i + batchSize >= results.length) {
            console.log(`Đã insert ${Math.min(i + batchSize, results.length)}/${results.length} records...`);
          }
        }
        
        await client.query('COMMIT');
        console.log('Import hoàn tất!');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi khi insert vào database:', err);
      } finally {
        client.release();
        pool.end();
      }
    });
};

importData();
