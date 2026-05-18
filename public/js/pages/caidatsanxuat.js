// ========== CÀI ĐẶT SẢN XUẤT PAGE ==========

let _cdsxCurrentTab = 'tab1';

async function renderCaidatsanxuatPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>🏭 Cài Đặt Sản Xuất</h3>
            </div>
            <div class="card-body">
                <div class="tabs" style="flex-wrap:wrap;" id="cdsxTabs">
                    <!-- Tabs will be added later by user -->
                </div>
                <div id="cdsxContent">
                    <div style="text-align:center;padding:60px 20px;">
                        <div style="font-size:48px;margin-bottom:16px;">🏭</div>
                        <h3 style="color:var(--navy);margin-bottom:8px;">Cài Đặt Sản Xuất</h3>
                        <p style="color:var(--gray-500);font-size:14px;">Trang cài đặt cho bộ phận sản xuất. Các tab sẽ được bổ sung sau.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Restore saved tab if any
    var savedTab = localStorage.getItem('cdsxActiveTab') || _cdsxCurrentTab;
    _cdsxCurrentTab = savedTab;
    var tabEl = document.querySelector('#cdsxTabs .tab[data-tab="' + savedTab + '"]');
    if (tabEl) {
        document.querySelectorAll('#cdsxTabs .tab').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
        switchCdsxTab(savedTab, tabEl);
    }
}

function switchCdsxTab(tab, el) {
    _cdsxCurrentTab = tab;
    localStorage.setItem('cdsxActiveTab', tab);
    document.querySelectorAll('#cdsxTabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const content = document.getElementById('cdsxContent');
    if (!content) return;

    // Tab routing — add cases here as tabs are added
    content.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:16px;">🔧</div>
            <h3 style="color:var(--navy);margin-bottom:8px;">Tab: ${tab}</h3>
            <p style="color:var(--gray-500);font-size:14px;">Nội dung tab sẽ được cấu hình sau.</p>
        </div>
    `;
}
