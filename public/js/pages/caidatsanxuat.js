// ========== CÀI ĐẶT SẢN XUẤT PAGE ==========

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
    if (tab === 'sp-qt') {
        await _cdsxLoadSpQt(content);
    } else {
        content.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
            + '<div style="font-size:48px;margin-bottom:16px;">🔧</div>'
            + '<h3 style="color:var(--navy);margin-bottom:8px;">Tab: ' + tab + '</h3>'
            + '<p style="color:var(--gray-500);font-size:14px;">Nội dung tab sẽ được cấu hình sau.</p></div>';
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
