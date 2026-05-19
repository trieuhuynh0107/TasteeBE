// scripts/test_phase8.js
// Automated verification script for Phase 8: Polish
// Run: node scripts/test_phase8.js

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
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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
  console.log('║             TASTEE BACKEND – PHASE 8 TEST (POLISH)       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Verify Swagger Documentation Endpoint
  console.log('1. Kiểm tra tài liệu Swagger tại /docs...');
  const swagger = await request('GET', '/docs/');
  assert('GET /docs/ trả về 200 OK', swagger.status === 200, swagger);
  assert('Header chứa content-type text/html', swagger.headers['content-type']?.includes('text/html'), swagger.headers);

  // 2. Verify Rate Limit Headers
  console.log('\n2. Kiểm tra Rate Limit Headers...');
  const health = await request('GET', '/health');
  assert('GET /health trả về 200 OK', health.status === 200, health);
  assert('Response header chứa ratelimit-limit', health.headers['ratelimit-limit'] !== undefined, health.headers);
  assert('Response header chứa ratelimit-remaining', health.headers['ratelimit-remaining'] !== undefined, health.headers);

  // 3. Verify Error Mapping - Duplicate Email (PostgreSQL 23505 Unique Violation)
  console.log('\n3. Đăng ký tài khoản và kiểm tra trùng email (Postgres 23505)...');
  const reg1 = await request('POST', '/auth/register', {
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('Register lần đầu thành công (201 Created)', reg1.status === 201, reg1);

  const reg2 = await request('POST', '/auth/register', {
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert('Register trùng email bị chặn với mã 400', reg2.status === 400, reg2);
  assert('Mã lỗi trả về đúng định dạng EMAIL_ALREADY_EXISTS', reg2.body.error?.code === 'EMAIL_ALREADY_EXISTS', reg2);

  // 4. Verify Error Mapping - Malformed UUID (PostgreSQL 22P02 Invalid Text Representation)
  console.log('\n4. Gửi yêu cầu với UUID sai định dạng để kiểm tra Postgres 22P02...');
  // Đăng nhập để có token
  const login = await request('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  accessToken = login.body.data?.accessToken || '';

  const badUuidRes = await request('DELETE', '/meals/sai-dinh-dang-uuid');
  assert('Yêu cầu với UUID sai định dạng trả về 400 Bad Request', badUuidRes.status === 400, badUuidRes);
  assert('Mã lỗi trả về là VALIDATION_ERROR', badUuidRes.body.error?.code === 'VALIDATION_ERROR', badUuidRes);
  assert('Thông báo lỗi thân thiện được map', badUuidRes.body.error?.message?.includes('ID không đúng định dạng UUID'), badUuidRes);

  // 5. Verify Auth Rate Limiter (Stricter Limits)
  console.log('\n5. Kiểm tra Auth Rate Limiting (gửi liên tiếp 16 request auth)...');
  let rateLimited = false;
  let finalRes = null;

  // Thực hiện spam login
  for (let i = 0; i < 16; i++) {
    const res = await request('POST', '/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword' // mật khẩu sai để tránh spam thành công, nhưng quan trọng là bị rate limit
    });
    if (res.status === 429) {
      rateLimited = true;
      finalRes = res;
      break;
    }
  }

  assert('IP bị giới hạn tần suất gửi yêu cầu và trả về 429 Too Many Requests', rateLimited, finalRes);
  if (finalRes) {
    assert('Mã lỗi trả về là TOO_MANY_REQUESTS', finalRes.body.error?.code === 'TOO_MANY_REQUESTS', finalRes);
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
    console.log('\n🎉 Tất cả các kiểm thử của Phase 8 đã PASS hoàn hảo!');
    process.exit(0);
  }
};

run().catch((err) => {
  console.error('\n💥 Test script crashed:', err.message);
  process.exit(1);
});
