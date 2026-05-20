const runSearchTest = async () => {
  try {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `test_search_${randomSuffix}@gmail.com`;
    
    // 1. Register
    const regRes = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
        name: 'Search Tester'
      })
    });
    
    // 2. Login
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    console.log('Testing search for partial word "ap" with token:', token.substring(0, 15) + '...');
    const resAp = await fetch('http://localhost:3000/foods/search?q=ap', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataAp = await resAp.json();
    console.log('Search "ap" Status:', resAp.status);
    console.log('Search "ap" Results Count:', dataAp.data ? dataAp.data.length : 0);
    if (dataAp.data && dataAp.data.length > 0) {
      console.log('First search result for "ap":', dataAp.data[0].name, '|', dataAp.data[0].name_vi);
    }

    console.log('\nTesting search for "apple"');
    const resApple = await fetch('http://localhost:3000/foods/search?q=apple', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataApple = await resApple.json();
    console.log('Search "apple" Status:', resApple.status);
    console.log('Search "apple" Results Count:', dataApple.data ? dataApple.data.length : 0);
    if (dataApple.data && dataApple.data.length > 0) {
      console.log('First search result for "apple":', dataApple.data[0].name, '|', dataApple.data[0].name_vi);
    }
  } catch (err) {
    console.error('Error in search test:', err);
  }
};

runSearchTest();
