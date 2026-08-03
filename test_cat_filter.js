const fs = require('fs');

const categories = [
  { id: 1, parent_id: null, name: 'Facebook Ads' },
  { id: 2, parent_id: null, name: 'Tiktok Ads' },
  { id: 3, parent_id: null, name: 'Google Ads' },
  { id: 11, parent_id: 1, name: 'Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng', linked_source_name: 'Page Công Ty 2', ads_handler_name: 'Giám Đốc' },
  { id: 12, parent_id: 1, name: 'Xưởng In HV - Xưởng In Pet , In Tem Eco Gia Công', linked_source_name: 'Page TEMVN', ads_handler_name: 'Giám Đốc' },
  { id: 14, parent_id: 3, name: 'Seo Web', linked_source_name: 'Seo Web HV.VN', ads_handler_name: 'Giám Đốc' }
];

function testFilter(parentId) {
    const pIdNum = Number(parentId);
    const subCats = categories.filter(c => c.parent_id !== null && (Number(c.parent_id) === pIdNum || String(c.parent_id) === String(parentId)));
    return subCats;
}

console.log('Subcats for Facebook Ads (1):', testFilter(1).map(c => c.name));
console.log('Subcats for Google Ads (3):', testFilter(3).map(c => c.name));
console.log('Subcats for Tiktok Ads (2):', testFilter(2).map(c => c.name));
