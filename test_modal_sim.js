const fs = require('fs');
const content = fs.readFileSync('public/js/pages/kpimarketing.js', 'utf8');

class MockOption {
    constructor(val, text) { this.value = val; this.textContent = text; }
}
class MockSelect {
    constructor(id) {
        this.id = id;
        this.options = [];
        this.selectedIndex = -1;
        this.style = {};
        this.disabled = false;
    }
    get value() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
            return this.options[this.selectedIndex].value;
        }
        return '';
    }
    set value(v) {
        const idx = this.options.findIndex(o => o.value === v);
        if (idx >= 0) {
            this.selectedIndex = idx;
        }
    }
    set innerHTML(html) {
        this.options = [];
        const regex = /<option\s+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g;
        let m;
        while ((m = regex.exec(html)) !== null) {
            this.options.push(new MockOption(m[1], m[2]));
        }
        this.selectedIndex = this.options.length > 0 ? 0 : -1;
    }
    appendChild(opt) {
        this.options.push(opt);
    }
}

const elements = {
    'kpiMktAddCatModal': { style: {} },
    'kpiAddCatParent': new MockSelect('kpiAddCatParent'),
    'kpiAddCatSubSelect': new MockSelect('kpiAddCatSubSelect'),
    'kpiAddCatSubInput': { style: {}, value: '' },
    'kpiAddCatPageSelect': new MockSelect('kpiAddCatPageSelect'),
    'kpiAddCatPageInput': { style: {}, value: '' },
    'kpiAddCatHandlerSelect': new MockSelect('kpiAddCatHandlerSelect'),
    'kpiAddCatHandlerInput': { style: {}, value: '' }
};

global.document = {
    getElementById: (id) => elements[id],
    createElement: (tag) => ({ value: '', textContent: '' })
};

eval(content);

global._kpiMkt = {
    month: '2026-08',
    data: {
        categories: [
            { id: 1, parent_id: null, name: 'Facebook Ads' },
            { id: 11, parent_id: 1, name: 'Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng', pancake_page_name: 'Page Công Ty 2', ads_handler_name: 'Giám Đốc' }
        ],
        available_pages: ['Page Công Ty 2'],
        available_handlers: ['Giám Đốc']
    }
};

kpiMktOpenAddCatModal();

console.log('SubSelect value:', elements['kpiAddCatSubSelect'].value);
console.log('PageSelect value:', elements['kpiAddCatPageSelect'].value);
console.log('PageSelect options:', elements['kpiAddCatPageSelect'].options.map(o => o.value));
console.log('HandlerSelect value:', elements['kpiAddCatHandlerSelect'].value);
