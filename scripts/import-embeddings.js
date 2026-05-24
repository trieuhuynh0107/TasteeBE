// scripts/import-embeddings.js
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../src/config/db');

const PP_RECIPES_CSV = process.env.PP_RECIPES_CSV || 'data/PP_recipes.csv';
const EMBEDDINGS_JSON = 'scripts/item_embeddings.json';

const importEmbeddings = async () => {
  console.log('Bắt đầu load file JSON embeddings...');
  
  if (!fs.existsSync(EMBEDDINGS_JSON)) {
    console.error(`File không tồn tại: ${EMBEDDINGS_JSON}`);
    console.log('Vui lòng chạy python scripts/extract_embeddings.py trước.');
    process.exit(1);
  }
  
  const embeddingsData = JSON.parse(fs.readFileSync(EMBEDDINGS_JSON, 'utf8'));
  console.log(`Đã load ${Object.keys(embeddingsData).length} embeddings.`);

  console.log('Bắt đầu map item_index -> external_id từ PP_recipes.csv...');
  const mapping = {};
  
  fs.createReadStream(PP_RECIPES_CSV)
    .pipe(csv())
    .on('data', (data) => {
      const i = parseInt(data.i);
      const externalId = parseInt(data.id);
      
      // Chúng ta chỉ quan tâm đến các item có trong model (i < 32983)
      if (!isNaN(i) && !isNaN(externalId) && i < 32983) {
        mapping[i] = externalId;
      }
    })
    .on('end', async () => {
      console.log(`Đã map xong ${Object.keys(mapping).length} items.`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        console.log('Bắt đầu cập nhật embeddings vào database...');
        let updatedCount = 0;
        let notFoundCount = 0;
        
        // Cập nhật từng batch để theo dõi tiến độ
        const entries = Object.entries(embeddingsData);
        for (const [indexStr, vector] of entries) {
          const index = parseInt(indexStr);
          const externalId = mapping[index];
          
          if (externalId) {
            // Chuyển mảng JS thành mảng PostgreSQL
            // pg library tự động parse mảng JS thành mảng SQL khi truyền vào parameter array
            const result = await client.query(
              'UPDATE foods SET embedding = $1 WHERE external_id = $2',
              [vector, externalId]
            );
            
            if (result.rowCount > 0) {
              updatedCount++;
            } else {
              notFoundCount++;
            }
          } else {
            notFoundCount++;
          }
          
          if ((updatedCount + notFoundCount) % 5000 === 0) {
            console.log(`Đã xử lý ${updatedCount + notFoundCount}/${entries.length}...`);
          }
        }
        
        await client.query('COMMIT');
        console.log(`Cập nhật hoàn tất!`);
        console.log(`- Số record update thành công: ${updatedCount}`);
        console.log(`- Số record không tìm thấy trong DB: ${notFoundCount}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi khi update database:', err);
      } finally {
        client.release();
        pool.end();
      }
    });
};

importEmbeddings();
