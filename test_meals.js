const runMealsTest = async () => {
  try {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `test_meals_${randomSuffix}@gmail.com`;
    
    // 1. Register
    await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', name: 'Meal Tester' })
    });
    
    // 2. Login
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    // 3. Add Onboarding metrics
    await fetch('http://localhost:3000/users/onboarding', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        gender: 'male',
        dateOfBirth: '2000-01-01',
        heightCm: 180,
        weightKg: 75,
        cuisines: ['Vietnamese'],
        allergies: [],
        dietTags: []
      })
    });

    // 4. Search to get a food ID
    const searchRes = await fetch('http://localhost:3000/foods/search?q=ap', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    const foodId = searchData.data[0].id;
    console.log('Found food ID:', foodId);

    // 5. Add a Meal
    const todayStr = '2026-05-19';
    const scheduledAt = `${todayStr}T09:00:00.000Z`;
    const addRes = await fetch('http://localhost:3000/meals', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        foodId,
        scheduledAt,
        quantityG: 100
      })
    });
    const addData = await addRes.json();
    console.log('Add meal status:', addRes.status);
    console.log('Add meal response:', JSON.stringify(addData, null, 2));

    // 6. Get Meals for Today
    const getRes = await fetch(`http://localhost:3000/meals?date=${todayStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();
    console.log('Get meals response:', JSON.stringify(getData, null, 2));

  } catch (err) {
    console.error('Error in meals test:', err);
  }
};

runMealsTest();
