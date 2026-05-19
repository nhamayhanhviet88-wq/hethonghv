// ========== SEED BGM DATA — Chạy 1 lần rồi xóa ==========
const db = require('./db/pool');

const DATA = [
    // [Tên, Nhóm, Phân quyền, Loại thêm, Giá NM, Giá GC]
    // === CỔ ===
    ['Cổ bẻ dệt', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 6000, 14000],
    ['Cổ bẻ vải', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 7000, 15000],
    ['Cổ tròn', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 6000, 10000],
    ['Cổ tim', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 7000, 11000],
    ['Cổ Tròn Raglan', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 6000, 10000],
    ['Cổ Bẻ Raglan', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 7000, 10000],
    ['Áo Sơ Mi Cổ Tròn', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 11000, 20000],
    ['Áo Sơ Mi Cổ Bẻ', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 14000, 23000],
    ['Cổ V Áo Lớp', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 7000, 16000],
    ['Cổ V Công Ty', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 6500, 10000],
    ['Cổ tàu', 'Cổ', ['giam_doc','quan_ly_xuong'], 'once', 6000, 14000],

    // === TẠP DỀ ===
    ['Tạp dề tẳng', 'Tạp Dề', ['giam_doc','quan_ly_xuong'], 'once', 3500, 5000],
    ['Tạp dề may ngắn', 'Tạp Dề', ['giam_doc','quan_ly_xuong'], 'once', 6000, 10000],
    ['Tạp dề may dài', 'Tạp Dề', ['giam_doc','quan_ly_xuong'], 'once', 7000, 11000],
    ['Tạp dề may dài khoá', 'Tạp Dề', ['giam_doc','quan_ly_xuong'], 'once', 8000, 14000],

    // === CỜI ===
    ['Cời', 'Cời', ['giam_doc','quan_ly_xuong'], 'once', 3000, 5000],

    // === MÁC ===
    ['May mác cao su', 'Mác', ['giam_doc','quan_ly_xuong'], 'once', 500, 1000],

    // === MẪU ===
    ['May mẫu', 'Mẫu', ['giam_doc','quan_ly_xuong'], 'once', 2000, 0],

    // === BO TAY ===
    ['Bo vải 2 tay', 'Bo Tay', ['giam_doc','quan_ly_xuong'], 'once', 1000, 1500],

    // === XẺ TÀ ===
    ['Xẻ tà', 'Xẻ tà', ['giam_doc','quan_ly_xuong','nhan_vien'], 'once', 1000, 1500],

    // === TÚI NGỰC ===
    ['Túi ngực', 'Túi ngực', ['giam_doc','quan_ly_xuong','nhan_vien'], 'once', 1000, 1500],

    // === DÀI TAY ===
    ['Áo Dài Tay', 'Dài Tay', ['giam_doc','quan_ly_xuong','nhan_vien'], 'once', 500, 1000],

    // === ĐIỀU ===
    ['Điều Bo Tay', 'Điều', ['giam_doc','quan_ly_xuong','nhan_vien'], 'multi', 500, 1000],
    ['Điều Vai', 'Điều', ['giam_doc','quan_ly_xuong','nhan_vien'], 'multi', 500, 1000],
    ['Điều Nách', 'Điều', ['giam_doc','quan_ly_xuong','nhan_vien'], 'multi', 500, 1000],

    // === LÉ TRỤ ===
    ['Lé Mí Trụ', 'Lé trụ', ['giam_doc','quan_ly_xuong'], 'once', 600, 1000],

    // === MÍ TRỤ ===
    ['Mí Xung Quanh Trụ', 'Mí trụ', ['giam_doc','quan_ly_xuong'], 'once', 600, 1000],

    // === LÉ TAY ===
    ['Lé mí ngắn 2 tay', 'Lé tay', ['giam_doc','quan_ly_xuong'], 'once', 1400, 2000],

    // === LÉ VAI ===
    ['Lé mí ngắn 2 vai', 'Lé vai', ['giam_doc','quan_ly_xuong'], 'once', 1000, 1500],

    // === LÉ VẢI ===
    ['Lé mí cổ bẻ vải', 'Lé Vải', ['giam_doc','quan_ly_xuong'], 'once', 700, 1000],

    // === LÉ DÀI ===
    ['1 lé dài', 'Lé dài', ['giam_doc','quan_ly_xuong'], 'once', 1000, 1500],
    ['2 lé dài', 'Lé dài', ['giam_doc','quan_ly_xuong'], 'once', 2000, 3000],
    ['3 lé dài', 'Lé dài', ['giam_doc','quan_ly_xuong'], 'once', 3000, 4500],
    ['4 lé dài', 'Lé dài', ['giam_doc','quan_ly_xuong'], 'once', 4000, 6000],
    ['5 lé dài', 'Lé dài', ['giam_doc','quan_ly_xuong'], 'once', 5000, 7500],

    // === LÉ NGẮN ===
    ['1 lé ngắn', 'Lé ngắn', ['giam_doc','quan_ly_xuong'], 'once', 500, 1000],
    ['2 lé ngắn', 'Lé ngắn', ['giam_doc','quan_ly_xuong'], 'once', 1000, 1500],
    ['3 lé ngắn', 'Lé ngắn', ['giam_doc','quan_ly_xuong'], 'once', 1500, 2000],
    ['4 lé ngắn', 'Lé ngắn', ['giam_doc','quan_ly_xuong'], 'once', 2000, 2500],
    ['5 lé ngắn', 'Lé ngắn', ['giam_doc','quan_ly_xuong'], 'once', 2500, 3000],

    // === MÍ DÀI ===
    ['1 mí dài', 'Mí dài', ['giam_doc','quan_ly_xuong'], 'once', 1000, 1500],
    ['2 mí dài', 'Mí dài', ['giam_doc','quan_ly_xuong'], 'once', 2000, 3000],
];

async function seed() {
    await db.init();
    console.log('🚀 Bắt đầu nhập Bảng Giá May...');

    // Get GĐ user id for created_by (user id=1 as default admin)
    const admin = await db.get("SELECT id FROM users WHERE role = 'giam_doc' LIMIT 1");
    const adminId = admin ? admin.id : 1;

    let inserted = 0, skipped = 0;
    for (let i = 0; i < DATA.length; i++) {
        const [name, group_name, roles, add_type, factory_price, processing_price] = DATA[i];

        // Check if already exists
        const existing = await db.get('SELECT id FROM bgm_items WHERE name = $1 AND is_active = true', [name]);
        if (existing) {
            console.log(`  ⏭️ [${i+1}] "${name}" đã tồn tại → bỏ qua`);
            skipped++;
            continue;
        }

        await db.run(`
            INSERT INTO bgm_items (name, group_name, allowed_roles, add_type, factory_price, processing_price, display_order, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [name, group_name, JSON.stringify(roles), add_type, factory_price, processing_price, i + 1, adminId]);

        console.log(`  ✅ [${i+1}] "${name}" → ${group_name} | ${factory_price.toLocaleString()}đ / ${processing_price.toLocaleString()}đ`);
        inserted++;
    }

    console.log(`\n📊 Kết quả: ${inserted} đã nhập, ${skipped} đã tồn tại (bỏ qua)`);
    console.log('✅ Hoàn thành! Có thể xóa file seed_bgm.js');
    await db.close();
    process.exit(0);
}

seed().catch(e => { console.error('❌ Lỗi:', e); process.exit(1); });
