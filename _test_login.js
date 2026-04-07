const http = require('http');
const postData = 'username=quanly1&password=123456';
const opts = {
    hostname: 'localhost', port: 11000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
};
const req = http.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const data = JSON.parse(d);
        console.log('Status:', res.statusCode);
        console.log('Locked:', data.locked);
        console.log('TotalFine:', data.totalFine?.toLocaleString() + 'đ');
        console.log('Penalty groups:');
        if (data.penaltyGroups) {
            console.log('  Khóa:', data.penaltyGroups.khoa?.length || 0, 'items');
            console.log('  Điểm:', data.penaltyGroups.diem?.length || 0, 'items');
            console.log('  Support:', data.penaltyGroups.support?.length || 0, 'items');
        }
        if (data.penaltyGroups?.khoa) {
            data.penaltyGroups.khoa.forEach(p => console.log(`    ${p.task_date} | ${p.task_name} | ${p.penalty_amount?.toLocaleString()}đ`));
        }
    });
});
req.write(postData);
req.end();
