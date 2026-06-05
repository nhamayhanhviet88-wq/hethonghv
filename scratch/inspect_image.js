const fs = require('fs');
const path = require('path');

const filePath = 'd:\\0 - Google Antigravity\\11 - NHAN VIEN KINH DOANH - Copy\\uploads\\bill-nhap-hang\\payments\\pay_15_1780680593596.png';
if (!fs.existsSync(filePath)) {
    console.log('File does not exist');
    process.exit(1);
}

const buffer = fs.readFileSync(filePath);
console.log('File size:', buffer.length);
console.log('First 20 bytes:', buffer.slice(0, 20));
console.log('First 50 chars as string:', buffer.toString('utf8', 0, 50));
process.exit(0);
