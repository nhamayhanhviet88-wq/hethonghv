function _filterSalaryLines(text) {
    if (!text) return text;
    return text.split('\n').filter(line => {
        const l = line.toLowerCase().replace(/[\s]+/g, ' ').trim();
        if (!l) return true;
        if (/l[uư][oơ]ng/.test(l)) return false;
        if (/thu nh[aậ]p/.test(l)) return false;
        if (/m[uứ]c l[uư][oơ]ng/.test(l)) return false;
        if (/lcb/.test(l)) return false;
        if (/bao ti[eề]n/.test(l)) return false;
        if (/\d+[.,]?\d*\s*(tri[eệ]u|tr)(?:\b|[/\s])/.test(l)) return false;
        if (/\d{1,3}([.]\d{3}){1,}\s*(vn[dđ]|đ[oồ]ng|đ\b)/i.test(l)) return false;
        if (/\d{1,3}([.]\d{3}){2,}/.test(l) && /vn[dđ]|đ[oồ]ng|l[uư][oơ]ng|thu nh|tr\b|tri[eệ]u/.test(l)) return false;
        if (/\d+[.,]?\d*k\s*[\/]/.test(l)) return false;
        if (/\d+[.,]?\d*k\b/.test(l) && /th[uư][oởỏõóọả]?ng|t[aă]ng ca|ph[uụ]\s*c[aấ]p/.test(l)) return false;
        if (/\d{2,3}[.]\d{3}\s*[\/]\s*\d*\s*h/.test(l)) return false;
        if (/\d{2,3}[.]\d{3}\s*[\/]\s*(gi[oờ]|ca|ng[aà]y|th[aá]ng)/.test(l)) return false;
        if (/th[uư][oởỏõóọả]?ng/.test(l) && /\d+[.,]?\d*\s*k\b|\d+[.,]?\d*\s*(tri[eệ]u|tr\b|đ\b|vn[dđ])/.test(l)) return false;
        if (/th[uư][oởỏõóọả]?ng/.test(l) && /(cu[oố]i n[aă]m|l[eễ]|t[eế]t|th[aá]ng\s*1[3-9]|kpi|doanh s[oố])/.test(l)) return false;
        return true;
    }).join('\n');
}

const tests = [
    ['- THƯỞNG CHUYÊN CẦN:', true],        // header only, no money
    ['• 300k/1 tháng (đi làm đủ công)', false],
    ['- TĂNG CA:', true],                     // header only
    ['• Tăng ca TRƯỚC 22h: 45.000/1h', false],
    ['• Tăng ca SAU 22h: 52.000k/1h', false],
    ['• Tăng ca chủ nhật: 60.000/1h', false],
    ['- Làm việc T2-T7, chủ nhật được nghỉ', true],
    ['+ 2 TUẦN XOAY CA 1 LẦN', true],
    ['- CA 1: 06h00-14h00 (nghỉ 40p)', true],
    ['- CA 2: 14h00-22h00 (nghỉ 40p)', true],
    ['+ CƠM TỰ TÚC', true],
    ['🏢 CÔNG TY TNHH HOA QUẢ', true],
    ['⏰ Time: 8 tiếng/ ngày', true],
    ['📍 Văn phòng tại: số 20 ngõ 302', true],
    ['😍 Hưởng các chế độ phúc lợi', true],
    ['Lương cứng 7 triệu + hoa hồng', false],
    ['Thu nhập trung bình không dưới 50tr/tháng', false],
    ['Thưởng 500k khi đạt KPI', false],
    ['Thưởng cuối năm theo doanh số', false],
    ['+ MÔ TẢ CÔNG VIỆC: Soạn hàng', true],
    ['Zalo: 0986.841.758 (Mai Chi)', true],
    ['Lương tháng 13 + thưởng lễ, Tết', false],
    ['3km từ trung tâm', true],
    ['10kg đường', true],
];

let pass = 0, fail = 0;
tests.forEach(([line, expected]) => {
    const result = _filterSalaryLines(line);
    const kept = result.trim().length > 0;
    const ok = kept === expected;
    if (ok) pass++; else fail++;
    console.log(`${ok ? '✅' : '❌'} ${kept ? 'KEEP' : 'HIDE'}: ${line}`);
});
console.log(`\n${pass}/${tests.length} passed, ${fail} failed`);
