// scripts/test_all_phases.js
// Comprehensive test cho Phase 1 → 5
// Chạy: node scripts/test_all_phases.js

const http = require('http');

const BASE = 'http://localhost:3000';
let accessToken = '';
let refreshToken = '';
let userId = '';
const TEST_EMAIL = `testall_${Date.now()}@tastee.com`;
const TEST_PASSWORD = 'TestAll123456';
const TEST_NAME = 'TestAll User';

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
  console.log('║       TASTEE BACKEND – COMPREHENSIVE TEST (P1→P5)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n📧 Test account: ${TEST_EMAIL}\n`);

  // ═══════════════════════════════════════════════════════════
  // PHASE 0 – Health Check
  // ═══════════════════════════════════════════════════════════
  console.log('━━━ Phase 0 – Health Check ━━━');

  const health = await request('GET', '/health');
  assert('GET /health returns 200', health.status === 200 && health.body.success === true, health);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 – Authentication
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 1 – Authentication ━━━');

  // 1.1 Register
  const reg = await request('POST', '/auth/register', {
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('POST /auth/register – tạo account mới', reg.status === 201 && reg.body.data?.id, reg);
  userId = reg.body.data?.id;

  // 1.2 Register duplicate email
  const regDup = await request('POST', '/auth/register', {
    name: 'Dup',
    email: TEST_EMAIL,
    password: 'Abc123456',
  });
  assert('POST /auth/register – duplicate email → 400', regDup.status === 400 && regDup.body.error?.code === 'EMAIL_ALREADY_EXISTS', regDup);

  // 1.3 Register missing fields
  const regMissing = await request('POST', '/auth/register', { email: TEST_EMAIL });
  assert('POST /auth/register – missing fields → 400', regMissing.status === 400, regMissing);

  // 1.4 Login
  const login = await request('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('POST /auth/login – đăng nhập thành công', login.status === 200 && login.body.data?.accessToken, login);
  accessToken = login.body.data?.accessToken || '';
  refreshToken = login.body.data?.refreshToken || '';

  // 1.5 Login wrong password
  const loginBad = await request('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: 'WrongPassword',
  });
  assert('POST /auth/login – sai password → 401', loginBad.status === 401, loginBad);

  // 1.6 Login non-existent email
  const loginNoEmail = await request('POST', '/auth/login', {
    email: 'nonexistent@tastee.com',
    password: TEST_PASSWORD,
  });
  assert('POST /auth/login – email không tồn tại → 401', loginNoEmail.status === 401, loginNoEmail);

  // 1.7 Refresh token
  const oldAccessToken = accessToken;
  const ref = await request('POST', '/auth/refresh', { refreshToken });
  assert('POST /auth/refresh – đổi token mới', ref.status === 200 && ref.body.data?.accessToken, ref);
  if (ref.body.data?.accessToken) {
    accessToken = ref.body.data.accessToken;
    refreshToken = ref.body.data.refreshToken;
  }

  // 1.8 Refresh with invalid token
  const refBad = await request('POST', '/auth/refresh', { refreshToken: 'invalid.token.here' });
  assert('POST /auth/refresh – invalid token → 401', refBad.status === 401, refBad);

  // 1.9 Access protected route without token
  const savedToken = accessToken;
  accessToken = '';
  const noAuth = await request('GET', '/users/me');
  assert('GET /users/me – no token → 401', noAuth.status === 401, noAuth);
  accessToken = savedToken;

  // 1.10 Access protected route with expired/bad token
  const savedToken2 = accessToken;
  accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJlbWFpbCI6ImZha2VAZmFrZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalidSignature';
  const badAuth = await request('GET', '/users/me');
  assert('GET /users/me – bad token → 401', badAuth.status === 401, badAuth);
  accessToken = savedToken2;

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 – Onboarding & Profile
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 2 – Onboarding & Profile ━━━');

  // 2.1 Get profile before onboarding
  const profileBefore = await request('GET', '/users/me');
  assert('GET /users/me – trước onboarding (is_onboarding_complete = null/false)',
    profileBefore.status === 200 && !profileBefore.body.data?.is_onboarding_complete, profileBefore);

  // 2.2 Onboarding missing fields
  const onbMissing = await request('POST', '/users/onboarding', { gender: 'male' });
  assert('POST /users/onboarding – thiếu field → 400', onbMissing.status === 400, onbMissing);

  // 2.3 Onboarding thành công
  const onb = await request('POST', '/users/onboarding', {
    gender: 'male',
    dateOfBirth: '1995-06-15',
    heightCm: 175,
    weightKg: 70,
    cuisines: ['vietnamese', 'italian'],
    allergies: ['peanut'],
    dietTags: ['high-protein'],
  });
  assert('POST /users/onboarding – thành công', onb.status === 201 && onb.body.data?.is_onboarding_complete === true, onb);

  // 2.4 Verify daily targets đã được tính
  const profileAfter = await request('GET', '/users/me');
  assert('GET /users/me – sau onboarding có daily_calories', 
    profileAfter.status === 200 && parseFloat(profileAfter.body.data?.daily_calories) > 0, profileAfter);
  assert('GET /users/me – cuisines array lưu đúng',
    Array.isArray(profileAfter.body.data?.cuisines) && profileAfter.body.data.cuisines.includes('vietnamese'), profileAfter);

  // 2.5 Re-onboarding (upsert)
  const reOnb = await request('POST', '/users/onboarding', {
    gender: 'male',
    dateOfBirth: '1995-06-15',
    heightCm: 180,
    weightKg: 75,
    cuisines: ['korean'],
    allergies: [],
    dietTags: [],
  });
  assert('POST /users/onboarding – re-onboarding (upsert) thành công', reOnb.status === 201, reOnb);

  // 2.6 Update profile – đổi tên
  const updateName = await request('PATCH', '/users/me', { name: 'Updated Name' });
  assert('PATCH /users/me – đổi tên', updateName.status === 200 && updateName.body.data?.name === 'Updated Name', updateName);

  // 2.7 Update profile – đổi weightKg → recalc macros
  const oldCalories = parseFloat(profileAfter.body.data?.daily_calories);
  const updateWeight = await request('PATCH', '/users/me', { weightKg: 85 });
  assert('PATCH /users/me – đổi weight → recalc daily_calories',
    updateWeight.status === 200 && parseFloat(updateWeight.body.data?.daily_calories) !== oldCalories, updateWeight);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 – Food Search
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 3 – Food Search ━━━');

  // 3.1 Search with keyword
  const search = await request('GET', '/foods/search?q=chicken&limit=5');
  assert('GET /foods/search?q=chicken – có kết quả', search.status === 200 && search.body.data?.length > 0, search);
  assert('GET /foods/search – có pagination', search.body.pagination?.total > 0 && search.body.pagination?.totalPages > 0, search);

  const foodId = search.body.data?.[0]?.id;
  assert('GET /foods/search – food có đủ nutrition fields',
    search.body.data?.[0]?.calories !== undefined && search.body.data?.[0]?.protein !== undefined, search);

  // 3.2 Search without keyword (browse all)
  const searchAll = await request('GET', '/foods/search?limit=3&page=1');
  assert('GET /foods/search – không có q → trả all foods', searchAll.status === 200 && searchAll.body.data?.length > 0, searchAll);

  // 3.3 Pagination validation
  const searchBadLimit = await request('GET', '/foods/search?limit=999');
  assert('GET /foods/search – limit > 100 → 400', searchBadLimit.status === 400, searchBadLimit);

  // 3.4 Search with no results
  const searchNone = await request('GET', '/foods/search?q=xyznonexistent99999');
  assert('GET /foods/search – no results → empty array', searchNone.status === 200 && searchNone.body.data?.length === 0, searchNone);

  // ═══════════════════════════════════════════════════════════
  // PHASE 4 – Meal Planning
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 4 – Meal Planning ━━━');

  const today = new Date().toISOString().slice(0, 10);

  // 4.1 Add meal – missing fields
  const mealMissing = await request('POST', '/meals', {});
  assert('POST /meals – thiếu fields → 400', mealMissing.status === 400, mealMissing);

  // 4.2 Add meal – negative quantity
  const mealNeg = await request('POST', '/meals', { foodId, scheduledAt: `${today}T08:00:00Z`, quantityG: -10 });
  assert('POST /meals – negative quantity → 400', mealNeg.status === 400, mealNeg);

  // 4.3 Add meal – non-existent food
  const mealBadFood = await request('POST', '/meals', {
    foodId: '00000000-0000-0000-0000-000000000000',
    scheduledAt: `${today}T08:00:00Z`,
    quantityG: 100,
  });
  assert('POST /meals – food không tồn tại → 404', mealBadFood.status === 404, mealBadFood);

  // 4.4 Add meal successfully (breakfast)
  const meal1 = await request('POST', '/meals', { foodId, scheduledAt: `${today}T07:00:00Z`, quantityG: 200 });
  assert('POST /meals – thêm bữa sáng (200g)', meal1.status === 201 && meal1.body.data?.id, meal1);
  const mealId1 = meal1.body.data?.id;

  // 4.5 Verify nutrition snapshot
  if (meal1.body.data && search.body.data?.[0]) {
    const expectedCals = +(parseFloat(search.body.data[0].calories) * 2).toFixed(1);
    assert('POST /meals – nutrition snapshot = food × (200/100)',
      parseFloat(meal1.body.data.calories_snap) === expectedCals, {
        expected: expectedCals,
        got: meal1.body.data.calories_snap,
      });
  }

  // 4.6 Add second meal (lunch)
  const meal2 = await request('POST', '/meals', { foodId, scheduledAt: `${today}T12:00:00Z`, quantityG: 150 });
  assert('POST /meals – thêm bữa trưa (150g)', meal2.status === 201, meal2);
  const mealId2 = meal2.body.data?.id;

  // 4.7 Add third meal (dinner)
  const meal3 = await request('POST', '/meals', { foodId, scheduledAt: `${today}T18:30:00Z`, quantityG: 250 });
  assert('POST /meals – thêm bữa tối (250g)', meal3.status === 201, meal3);

  // 4.8 Get meals by date
  const mealsToday = await request('GET', `/meals?date=${today}`);
  assert('GET /meals?date – 3 meals trả về', mealsToday.status === 200 && mealsToday.body.data?.length === 3, mealsToday);
  assert('GET /meals – kèm food_name', mealsToday.body.data?.[0]?.food_name !== undefined, mealsToday);
  assert('GET /meals – sắp xếp theo scheduled_at ASC',
    mealsToday.body.data?.length === 3 &&
    mealsToday.body.data[0].scheduled_at <= mealsToday.body.data[1].scheduled_at, mealsToday);

  // 4.9 Get meals – missing date
  const mealsNoDate = await request('GET', '/meals');
  assert('GET /meals – thiếu date → 400', mealsNoDate.status === 400, mealsNoDate);

  // 4.10 Get meals – bad date format
  const mealsBadDate = await request('GET', '/meals?date=2025/01/15');
  assert('GET /meals – bad date format → 400', mealsBadDate.status === 400, mealsBadDate);

  // 4.11 Get meals – empty day
  const mealsEmpty = await request('GET', '/meals?date=2000-01-01');
  assert('GET /meals – ngày trống → empty array', mealsEmpty.status === 200 && mealsEmpty.body.data?.length === 0, mealsEmpty);

  // 4.12 Update meal quantity
  if (mealId1) {
    const patchQ = await request('PATCH', `/meals/${mealId1}`, { quantityG: 300 });
    assert('PATCH /meals/:id – đổi quantity → recalc snapshot', patchQ.status === 200 && patchQ.body.data?.quantity_g === '300.0', patchQ);
  }

  // 4.13 Update meal scheduledAt
  if (mealId1) {
    const patchS = await request('PATCH', `/meals/${mealId1}`, { scheduledAt: `${today}T07:30:00Z` });
    assert('PATCH /meals/:id – đổi scheduledAt', patchS.status === 200, patchS);
  }

  // 4.14 Update meal – nothing to update
  const patchEmpty = await request('PATCH', `/meals/${mealId1}`, {});
  assert('PATCH /meals/:id – no fields → 400', patchEmpty.status === 400, patchEmpty);

  // 4.15 Update non-existent meal
  const patchNotFound = await request('PATCH', '/meals/00000000-0000-0000-0000-000000000000', { quantityG: 100 });
  assert('PATCH /meals/:id – not found → 404', patchNotFound.status === 404, patchNotFound);

  // 4.16 Delete meal
  if (mealId2) {
    const del = await request('DELETE', `/meals/${mealId2}`);
    assert('DELETE /meals/:id – soft delete → 204', del.status === 204, del);
  }

  // 4.17 Verify deleted meal gone from list
  const mealsAfterDel = await request('GET', `/meals?date=${today}`);
  assert('GET /meals – sau delete còn 2 meals', mealsAfterDel.status === 200 && mealsAfterDel.body.data?.length === 2, mealsAfterDel);

  // 4.18 Delete already-deleted meal
  if (mealId2) {
    const delAgain = await request('DELETE', `/meals/${mealId2}`);
    assert('DELETE /meals/:id – đã xóa rồi → 404', delAgain.status === 404, delAgain);
  }

  // 4.19 Delete non-existent meal
  const delNotFound = await request('DELETE', '/meals/00000000-0000-0000-0000-000000000000');
  assert('DELETE /meals/:id – not found → 404', delNotFound.status === 404, delNotFound);

  // ═══════════════════════════════════════════════════════════
  // PHASE 5 – Daily Summary
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 5 – Daily Summary ━━━');

  // 5.1 Get daily summary
  const summary = await request('GET', `/summary/daily?date=${today}`);
  assert('GET /summary/daily – trả về summary', summary.status === 200 && summary.body.data, summary);
  assert('GET /summary/daily – date khớp', summary.body.data?.date === today, summary);
  assert('GET /summary/daily – mealCount = 2 (sau delete)', summary.body.data?.mealCount === 2, summary);

  // 5.2 Verify actual nutrition
  if (summary.body.data?.actual) {
    assert('GET /summary/daily – actual.calories > 0', summary.body.data.actual.calories > 0, summary);
    assert('GET /summary/daily – actual.protein > 0', summary.body.data.actual.protein > 0, summary);
  }

  // 5.3 Verify target nutrition
  if (summary.body.data?.target) {
    assert('GET /summary/daily – target.calories > 0', summary.body.data.target.calories > 0, summary);
  }

  // 5.4 Verify remaining calculation
  if (summary.body.data?.remaining && summary.body.data?.target && summary.body.data?.actual) {
    const expected = +(summary.body.data.target.calories - summary.body.data.actual.calories).toFixed(1);
    assert('GET /summary/daily – remaining = target - actual',
      summary.body.data.remaining.calories === expected, {
        expected,
        got: summary.body.data.remaining.calories,
      });
  }

  // 5.5 Verify percentage calculation
  if (summary.body.data?.percentage && summary.body.data?.target && summary.body.data?.actual) {
    const expected = +((summary.body.data.actual.calories / summary.body.data.target.calories) * 100).toFixed(1);
    assert('GET /summary/daily – percentage tính đúng',
      summary.body.data.percentage.calories === expected, {
        expected,
        got: summary.body.data.percentage.calories,
      });
  }

  // 5.6 Summary for empty day
  const summaryEmpty = await request('GET', '/summary/daily?date=2000-01-01');
  assert('GET /summary/daily – ngày trống → actual = 0', summaryEmpty.status === 200 && summaryEmpty.body.data?.actual?.calories === 0, summaryEmpty);
  assert('GET /summary/daily – ngày trống → mealCount = 0', summaryEmpty.body.data?.mealCount === 0, summaryEmpty);
  assert('GET /summary/daily – ngày trống → remaining = target', 
    summaryEmpty.body.data?.remaining?.calories === summaryEmpty.body.data?.target?.calories, summaryEmpty);

  // 5.7 Summary validation – missing date
  const summaryNoDate = await request('GET', '/summary/daily');
  assert('GET /summary/daily – thiếu date → 400', summaryNoDate.status === 400, summaryNoDate);

  // 5.8 Summary validation – bad date format
  const summaryBadDate = await request('GET', '/summary/daily?date=abc');
  assert('GET /summary/daily – bad date → 400', summaryBadDate.status === 400, summaryBadDate);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 (cont) – Logout
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━ Phase 1 (cont) – Logout ━━━');

  // Logout
  const logout = await request('POST', '/auth/logout');
  assert('POST /auth/logout – thành công', logout.status === 200, logout);

  // Old refresh token should not work after logout
  const refAfterLogout = await request('POST', '/auth/refresh', { refreshToken });
  assert('POST /auth/refresh – sau logout → 401', refAfterLogout.status === 401, refAfterLogout);

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n⚠️  Có test bị fail! Kiểm tra lại output ở trên.');
    process.exit(1);
  } else {
    console.log('\n🎉 Tất cả tests đều PASS!');
  }
};

run().catch((err) => {
  console.error('\n💥 Test script crashed:', err.message);
  process.exit(1);
});
