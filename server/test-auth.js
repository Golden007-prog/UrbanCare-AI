const http = require('http');

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {};
    let data = '';
    if (body) {
      data = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: chunks,
          })
        );
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== 1. Health Check ===');
  const health = await request('GET', '/');
  console.log('Status:', health.status);
  console.log('Body:', health.body);

  console.log('\n=== 2. Login with valid credentials ===');
  const login = await request('POST', '/auth/login', {
    email: 'dr.smith@urbancare.com',
    password: 'password123',
  });
  console.log('Status:', login.status);
  console.log('Body:', login.body);
  const setCookie = login.headers['set-cookie'];
  console.log('Set-Cookie:', setCookie);

  // Extract token cookie
  const tokenCookie = setCookie
    ? setCookie.find((c) => c.startsWith('token='))
    : null;
  const cookieValue = tokenCookie ? tokenCookie.split(';')[0] : '';
  console.log('Token cookie:', cookieValue ? 'PRESENT' : 'MISSING');

  console.log('\n=== 3. GET /auth/me (with token) ===');
  const me = await request('GET', '/auth/me', null, cookieValue);
  console.log('Status:', me.status);
  console.log('Body:', me.body);

  console.log('\n=== 4. GET /auth/me (no token — expect 401) ===');
  const noAuth = await request('GET', '/auth/me');
  console.log('Status:', noAuth.status);
  console.log('Body:', noAuth.body);

  console.log('\n=== 5. Login with wrong password ===');
  const badLogin = await request('POST', '/auth/login', {
    email: 'dr.smith@urbancare.com',
    password: 'wrongpassword',
  });
  console.log('Status:', badLogin.status);
  console.log('Body:', badLogin.body);

  console.log('\n=== 6. Logout ===');
  const logout = await request('POST', '/auth/logout', null, cookieValue);
  console.log('Status:', logout.status);
  console.log('Body:', logout.body);
  console.log('Set-Cookie after logout:', logout.headers['set-cookie']);

  console.log('\n✅ All tests completed!');
}

run().catch(console.error);
