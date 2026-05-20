const runTest = async () => {
  try {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `test_ob_${randomSuffix}@gmail.com`;
    
    console.log(`1. Registering user with email: ${email}`);
    const regRes = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
        name: 'Test Onboarding'
      })
    });
    
    const regData = await regRes.json();
    console.log('Registration Response Status:', regRes.status);
    console.log('Registration Response Body:', JSON.stringify(regData, null, 2));
    
    if (!regRes.ok) {
      console.error('Registration failed!');
      return;
    }
    
    const token = regData.data.accessToken;
    console.log('2. Sending onboarding request with token:', token);
    
    const obRes = await fetch('http://localhost:3000/users/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        gender: 'male',
        dateOfBirth: '2000-01-01',
        heightCm: 170,
        weightKg: 60,
        cuisines: [],
        allergies: [],
        dietTags: []
      })
    });
    
    const obData = await obRes.json();
    console.log('Onboarding Response Status:', obRes.status);
    console.log('Onboarding Response Body:', JSON.stringify(obData, null, 2));
  } catch (err) {
    console.error('Error during test:', err);
  }
};

runTest();
