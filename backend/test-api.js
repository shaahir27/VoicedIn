import http from 'http';

const name = 'Test User';
const email = `test-${Date.now()}@test.com`;
const password = 'password123';

const options = {
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/auth/signup',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const result = JSON.parse(data);
        console.log('Signup status:', res.statusCode);


        if (!result.token) {
            console.log('No token! Data:', result);
            return;
        }

        const token = result.token;
        console.log('Got token. Testing endpoints...');

        const endpoints = ['/api/invoices', '/api/clients', '/api/payments', '/api/dashboard'];

        endpoints.forEach(ep => {
            http.get(`http://localhost:5000${ep}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }, res2 => {
                let body = '';
                res2.on('data', c => body += c);
                res2.on('end', () => {
                    console.log(`GET ${ep} status: ${res2.statusCode}`);
                    if (res2.statusCode !== 200) {
                        console.log(`GET ${ep} error body:`, body);
                    }
                });
            });
        });
    });
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({ name, email, password }));
req.end();
