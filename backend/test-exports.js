import http from 'http';
import fs from 'fs';
import path from 'path';

http.get('http://localhost:5000/api/invoices', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('GET /api/invoices returned status:', res.statusCode));
});

// Also check if backend/uploads/exports has anything
const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
if (fs.existsSync(exportsDir)) {
    console.log('Exports directory contents:', fs.readdirSync(exportsDir));
} else {
    console.log('Exports directory missing!');
}
