const fs = require('fs');
const files = fs.readdirSync('public/js/pages');
console.log('All files in pages directory:');
console.log(files.filter(f => f.includes('in') || f.includes('print') || f.includes('pet') || f.includes('tem')));
