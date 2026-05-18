// ========== CÀI ĐẶT SẢN XUẤT PAGE — Central Hub ==========

let _cdsxCurrentTab = 'sp-qt';

async function renderCaidatsanxuatPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>🏭 Cài Đặt Sản Xuất</h3>
            </div>
            <div class="card-body">
                <div class="tabs" style="flex-wrap:wrap;" id="cdsxTabs">
                    <div class="tab active" data-tab="sp-qt" onclick="switchCdsxTab('sp-qt', this)">📦 Sản Phẩm & Quy Trình</div>
                    <div class="tab" data-tab="kho-vai" onclick="switchCdsxTab('kho-vai', this)">🏬 Kho Vải</div>
                    <div class="tab" data-tab="luong-sx" onclick="switchCdsxTab('luong-sx', this)">💰 Lương Sản Xuất</div>
                    <div class="tab" data-tab="bang-gia" onclick="switchCdsxTab('bang-gia', this)">💲 Bảng Giá May</div>
                    <div class="tab" data-tab="thong-so" onclick="switchCdsxTab('thong-so', this)">📐 Thông Số Mẫu Áo</div>
                </div>
                <div id="cdsxContent">
                    <div class="text-center text-muted" style="padding:30px;">Đang tải...</div>
                </div>
            </div>
        </div>
    `;

    // Restore saved tab
    var savedTab = localStorage.getItem('cdsxActiveTab') || 'sp-qt';
    _cdsxCurrentTab = savedTab;
    var tabEl = document.querySelector('#cdsxTabs .tab[data-tab="' + savedTab + '"]');
    if (tabEl) {
        document.querySelectorAll('#cdsxTabs .tab').forEach(function(t) { t.classList.remove('active'); });
        tabEl.classList.add('active');
    }
    await switchCdsxTab(savedTab, tabEl || document.querySelector('#cdsxTabs .tab'));
}

async function switchCdsxTab(tab, el) {
    _cdsxCurrentTab = tab;
    localStorage.setItem('cdsxActiveTab', tab);
    document.querySelectorAll('#cdsxTabs .tab').forEach(function(t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');

    var content = document.getElementById('cdsxContent');
    if (!content) return;

    // Tab routing
    switch (tab) {
        case 'sp-qt':
            await _cdsxLoadSpQt(content);
            break;
        case 'kho-vai':
            await _cdsxLoadKhoVai(content);
            break;
        case 'luong-sx':
            _cdsxLoadShell(content, '💰', 'Lương Sản Xuất', 'Cấu hình bảng lương cho công nhân sản xuất');
            break;
        case 'bang-gia':
            _cdsxLoadShell(content, '💲', 'Bảng Giá May', 'Cấu hình bảng giá may cho từng loại sản phẩm');
            break;
        case 'thong-so':
            _cdsxLoadShell(content, '📐', 'Thông Số Mẫu Áo', 'Cấu hình thông số kỹ thuật cho các mẫu áo');
            break;
        default:
            _cdsxLoadShell(content, '🔧', tab, 'Tab chưa được cấu hình');
    }
}

// ===== SP & QT Tab — reuses all functions from caidatspqt.js =====
async function _cdsxLoadSpQt(content) {
    content.innerHTML = '<div style="max-width:1100px;margin:0 auto;padding:16px 0">'
        + '<div style="display:grid;grid-template-columns:280px 1fr;gap:16px" id="_spqtMain">'
        + '<div id="_spqtSidebar" style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);max-height:70vh;overflow-y:auto"></div>'
        + '<div id="_spqtContent" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.06);min-height:400px"></div>'
        + '</div></div>';

    await _spqtLoadAll();
    _spqtRenderSidebar();
    _spqtRenderWelcome();
}

// ===== Kho Vải Tab — reuses all functions from caidatkhovai.js =====
async function _cdsxLoadKhoVai(content) {
    // Inject styles if not present
    if (!document.getElementById('cdkStyles')) {
        var st = document.createElement('style'); st.id = 'cdkStyles';
        st.textContent = [
            '.cdk-wrap{display:flex;height:calc(100vh - 180px);overflow:hidden;background:#f8fafc}',
            '.cdk-col{flex:1;min-width:0;border-right:1px solid var(--gray-200);display:flex;flex-direction:column;background:#fff}',
            '.cdk-col:last-child{border-right:none}',
            '.cdk-col-head{padding:14px 16px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center}',
            '.cdk-col-head.col2{background:linear-gradient(135deg,#7c3aed,#6d28d9)}',
            '.cdk-col-head.col3{background:linear-gradient(135deg,#2563eb,#1d4ed8)}',
            '.cdk-col-body{flex:1;overflow-y:auto;padding:8px 0}',
            '.cdk-item{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s}',
            '.cdk-item:hover{background:#f0fdfa}',
            '.cdk-item.active{background:#ccfbf1;border-left:3px solid #0d9488}',
            '.cdk-item.inactive{opacity:0.5}',
            '.cdk-item-name{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}',
            '.cdk-item-actions{display:flex;gap:4px;align-items:center}',
            '.cdk-toggle{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:background .2s}',
            '.cdk-toggle.on{background:#0d9488}',
            '.cdk-toggle.off{background:#cbd5e1}',
            '.cdk-toggle::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
            '.cdk-toggle.on::after{left:18px}',
            '.cdk-toggle.off::after{left:2px}',
            '.cdk-btn-sm{border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:700}',
            '.cdk-add-form{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#f0fdfa}',
            '.cdk-empty{text-align:center;padding:30px;color:var(--gray-400);font-size:12px}',
            '.cdk-bulk-area{padding:12px 16px;border-bottom:2px solid var(--gray-200);background:#eff6ff}',
            '.cdk-badge{font-size:9px;padding:1px 6px;border-radius:8px;font-weight:700}',
            '@media(max-width:768px){.cdk-wrap{flex-direction:column;height:auto}.cdk-col{min-height:200px;border-right:none;border-bottom:1px solid var(--gray-200)}}'
        ].join('');
        document.head.appendChild(st);
    }

    content.innerHTML = '<div class="cdk-wrap" id="cdkWrap">'
        + '<div class="cdk-col" id="cdkCol1"></div>'
        + '<div class="cdk-col" id="cdkCol2"></div>'
        + '<div class="cdk-col" id="cdkCol3"></div>'
        + '</div>';

    _cdk.selWid = null; _cdk.selMid = null;
    await _cdkLoadWarehouses();
}

// ===== Shell for tabs not yet implemented =====
function _cdsxLoadShell(content, icon, title, desc) {
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
        + '<div style="font-size:48px;margin-bottom:16px;">' + icon + '</div>'
        + '<h3 style="color:var(--navy,#1e293b);margin-bottom:8px;">' + title + '</h3>'
        + '<p style="color:var(--gray-500,#64748b);font-size:14px;">' + desc + '</p>'
        + '<p style="color:var(--gray-400,#9ca3af);font-size:12px;margin-top:12px;">Nội dung sẽ được bổ sung sau</p></div>';
}
