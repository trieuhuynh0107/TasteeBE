// scripts/test_phase7.js
// Test script for Phase 7 Recommendation Engine
// Chạy: node scripts/test_phase7.js

const http = require('http');

const BASE = 'http://localhost:3000';
let accessToken = '';
const TEST_EMAIL = `testrec_${Date.now()}@tastee.com`;
const TEST_PASSWORD = 'TestAll123456';
const TEST_NAME = 'TestRec User';

const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

let passed = 0;
let failed = 0;

const assert = (label, condition, result) => {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    console.log(`     Response: ${JSON.stringify(result?.body || result, null, 2).substring(0, 300)}`);
    failed++;
  }
};

const run = async () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           TASTEE BACKEND – PHASE 7 TEST (RECOMMEND)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n📧 Test account: ${TEST_EMAIL}\n`);

  // 1. Register
  console.log('1. Đăng ký tài khoản...');
  const reg = await request('POST', '/auth/register', {
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('Register thành công', reg.status === 201 && reg.body.data?.id, reg);

  // 2. Login
  console.log('\n2. Đăng nhập...');
  const login = await request('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('Login thành công', login.status === 200 && login.body.data?.accessToken, login);
  accessToken = login.body.data?.accessToken || '';

  // 3. Test recommend trước onboarding -> Phải lỗi ONBOARDING_REQUIRED
  console.log('\n3. Gọi recommend trước khi onboarding...');
  const recBefore = await request('GET', '/recommend?date=2025-01-15');
  assert('Recommend trước onboarding bị chặn với mã 400', recBefore.status === 400 && recBefore.body.error?.code === 'ONBOARDING_REQUIRED', recBefore);

  // 4. Onboarding
  console.log('\n4. Tiến hành Onboarding (Allergies: peanut, Cuisines: vietnamese, italian)...');
  const onb = await request('POST', '/users/onboarding', {
    gender: 'male',
    dateOfBirth: '1995-06-15',
    heightCm: 175,
    weightKg: 70,
    cuisines: ['vietnamese', 'italian'],
    allergies: ['peanut'],
    dietTags: ['high-protein'],
  });
  assert('Onboarding thành công', onb.status === 201, onb);

  // 5. Test recommend sau onboarding (chưa có meal history)
  console.log('\n5. Gọi recommend sau onboarding (chưa có meal history)...');
  const recAfter = await request('GET', '/recommend?date=2025-01-15');
  assert('Recommend thành công (200 OK)', recAfter.status === 200, recAfter);
  assert('Trả về đúng 200 hoặc dưới 20 món ăn', recAfter.body.data?.length > 0 && recAfter.body.data?.length <= 20, recAfter);

  if (recAfter.body.data && recAfter.body.data.length > 0) {
    const hasPeanut = recAfter.body.data.some(food => food.tags?.includes('peanut'));
    assert('Không chứa món ăn gây dị ứng (peanut)', !hasPeanut, recAfter.body.data.map(f => f.tags));
    
    const firstFood = recAfter.body.data[0];
    assert('Món ăn gợi ý có chứa các trường calo, macro, score', 
      firstFood.calories !== undefined && firstFood.score !== undefined && firstFood.similarity !== undefined, firstFood);
  }

  // 6. Lấy 1 món ăn từ danh sách gợi ý trước đó để tạo lịch sử...
  console.log('\n6. Lấy 1 món ăn từ danh sách gợi ý trước đó để tạo lịch sử...');
  const testFood = recAfter.body.data?.[0];
  
  if (testFood) {
    console.log(`   Sử dụng món ăn: "${testFood.name}" (ID: ${testFood.id}) làm lịch sử`);
    const addMeal = await request('POST', '/meals', {
      foodId: testFood.id,
      scheduledAt: '2025-01-14T08:00:00Z',
      quantityG: 150
    });
    assert('Thêm bữa ăn lịch sử thành công', addMeal.status === 201, addMeal);

    // 7. Gọi recommend lại (đã có meal history)
    console.log('\n7. Gọi recommend khi đã có lịch sử ăn uống...');
    const recWithHistory = await request('GET', '/recommend?date=2025-01-15');
    assert('Recommend với history thành công', recWithHistory.status === 200, recWithHistory);
    assert('Độ tương đồng (similarity) của một số món phải lớn hơn 0 hoặc khác 0 do có embedding comparison', 
      recWithHistory.body.data?.some(f => f.similarity !== 0), recWithHistory.body.data?.slice(0, 3));
  } else {
    console.log('   ❌ Không tìm thấy món ăn nào trong DB để test history!');
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n⚠️  Có test bị fail!');
    process.exit(1);
  } else {
    console.log('\n🎉 Tất cả tests Phase 7 đều PASS!');
    process.exit(0);
  }
};

run().catch((err) => {
  console.error('\n💥 Test script crashed:', err.message);
  process.exit(1);
});
