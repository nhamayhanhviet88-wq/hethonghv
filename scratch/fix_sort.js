const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'routes', 'bophanin.js');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find and replace line 461 (0-indexed: 460) - default orderBy
const line461 = lines[460].trim();
console.log('Current line 461:', line461.substring(0, 80) + '...');

// Replace with window function version
lines[460] = "        let orderBy = `ORDER BY \n                MAX(up.print_date) OVER (PARTITION BY COALESCE(up.order_code, up.id::text)) DESC NULLS LAST,\n                COALESCE(up.order_code, ''),\n                up.order_item_id ASC NULLS FIRST,\n                up.created_at DESC`;";

// Find and replace line 463 (0-indexed: 462) - done orderBy
const line463 = lines[462].trim();
console.log('Current line 463:', line463.substring(0, 80) + '...');

lines[462] = "            orderBy = `ORDER BY \n                MAX(COALESCE(up.print_done_at, up.print_date)) OVER (PARTITION BY COALESCE(up.order_code, up.id::text)) DESC NULLS LAST,\n                COALESCE(up.order_code, ''),\n                up.order_item_id ASC NULLS FIRST,\n                up.created_at DESC`;";

content = lines.join('\n');
fs.writeFileSync(filePath, content);
console.log('File updated successfully!');
