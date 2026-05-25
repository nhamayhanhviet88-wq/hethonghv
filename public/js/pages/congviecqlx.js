// ========== CÔNG VIỆC QUẢN LÝ XƯỞNG — Hub Page with 3 Tabs ==========
// Tabs: Phiếu Yêu Cầu Xử Lý | Chuẩn Bị QLX | Đơn Hàng Hôm Nay QLX
// Each tab delegates rendering to the existing page functions

var _cvqlxActiveTab = sessionStorage.getItem('_cvqlxActiveTab') || 'phieuyeucau';

function renderCongviecqlxPage(content) {
    // Inject tab styles
    if (!document.getElementById('_cvqlxStyles')) {
        var st = document.createElement('style'); st.id = '_cvqlxStyles';
        st.textContent = ''
        +'.cvqlx-header{background:linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7);padding:20px 24px 0;border-radius:16px 16px 0 0;margin:-16px -16px 0;position:relative;overflow:hidden}'
        +'.cvqlx-header::before{content:"";position:absolute;top:0;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.06) 50%,transparent 70%);animation:cvqlxShimmer 4s infinite}'
        +'@keyframes cvqlxShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'
        +'.cvqlx-title{color:#fff;font-size:18px;font-weight:900;letter-spacing:0.5px;display:flex;align-items:center;gap:10px}'
        +'.cvqlx-title-badge{background:rgba(255,255,255,0.15);padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;color:#bae6fd}'
        +'.cvqlx-tabs{display:flex;gap:2px;margin-top:16px;position:relative;z-index:1}'
        +'.cvqlx-tab{padding:10px 22px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.65);cursor:pointer;border-radius:10px 10px 0 0;transition:all .25s;display:flex;align-items:center;gap:6px;position:relative;border:none;background:rgba(255,255,255,0.06)}'
        +'.cvqlx-tab:hover{color:#fff;background:rgba(255,255,255,0.12)}'
        +'.cvqlx-tab.active{color:#0369a1;background:#fff;font-weight:800;box-shadow:0 -2px 8px rgba(0,0,0,0.08)}'
        +'.cvqlx-tab .tab-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:0.5}'
        +'.cvqlx-tab.active .tab-dot{background:#0369a1;opacity:1;animation:cvqlxPulse 2s infinite}'
        +'@keyframes cvqlxPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}'
        +'.cvqlx-body{background:#fff;border-radius:0 0 16px 16px;min-height:calc(100vh - 200px);margin:0 -16px;padding:0}'
        +'.cvqlx-tab-content{padding:16px}'
        +'@media(max-width:768px){.cvqlx-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}.cvqlx-tab{white-space:nowrap;padding:8px 14px;font-size:11px}}';
        document.head.appendChild(st);
    }

    content.innerHTML = ''
        +'<div class="cvqlx-header">'
        +'  <div class="cvqlx-title">📋 Công Việc Quản Lý Xưởng <span class="cvqlx-title-badge">QLX Hub</span></div>'
        +'  <div class="cvqlx-tabs" id="cvqlxTabs">'
        +'    <button class="cvqlx-tab' + (_cvqlxActiveTab === 'phieuyeucau' ? ' active' : '') + '" data-tab="phieuyeucau" onclick="_cvqlxSwitchTab(\'phieuyeucau\')">'
        +'      <span class="tab-dot"></span> 📝 Phiếu Yêu Cầu Xử Lý'
        +'    </button>'
        +'    <button class="cvqlx-tab' + (_cvqlxActiveTab === 'chuanbi' ? ' active' : '') + '" data-tab="chuanbi" onclick="_cvqlxSwitchTab(\'chuanbi\')">'
        +'      <span class="tab-dot"></span> 🏭 Chuẩn Bị QLX'
        +'    </button>'
        +'    <button class="cvqlx-tab' + (_cvqlxActiveTab === 'donhanghomnay' ? ' active' : '') + '" data-tab="donhanghomnay" onclick="_cvqlxSwitchTab(\'donhanghomnay\')">'
        +'      <span class="tab-dot"></span> 🚀 Đơn Hàng Hôm Nay QLX'
        +'    </button>'
        +'  </div>'
        +'</div>'
        +'<div class="cvqlx-body">'
        +'  <div class="cvqlx-tab-content" id="cvqlxTabContent"></div>'
        +'</div>';

    // Reset tab if it was the old 'lichradonhang' tab
    if (_cvqlxActiveTab === 'lichradonhang') {
        _cvqlxActiveTab = 'phieuyeucau';
        sessionStorage.setItem('_cvqlxActiveTab', _cvqlxActiveTab);
    }

    // Load the active tab
    _cvqlxRenderActiveTab();
}

function _cvqlxSwitchTab(tabId) {
    _cvqlxActiveTab = tabId;
    sessionStorage.setItem('_cvqlxActiveTab', tabId);

    // Update tab button active states
    var tabs = document.querySelectorAll('.cvqlx-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tabId);
    }

    _cvqlxRenderActiveTab();
}

function _cvqlxRenderActiveTab() {
    var container = document.getElementById('cvqlxTabContent');
    if (!container) return;

    // Show loading
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8;font-size:14px"><div style="font-size:32px;margin-bottom:12px;animation:cvqlxPulse 1s infinite">⏳</div>Đang tải...</div>';

    // Delegate to existing render functions
    switch (_cvqlxActiveTab) {
        case 'phieuyeucau':
            _qlxWtInit(container);
            break;

        case 'chuanbi':
            // Chuẩn Bị QLX — uses renderQuanlyxuongqlxPage
            if (typeof renderQuanlyxuongqlxPage === 'function') {
                renderQuanlyxuongqlxPage(container);
            } else {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8"><div style="font-size:48px;margin-bottom:12px">🏭</div><h3 style="color:#334155">Chuẩn Bị QLX</h3><p>Trang đang được tải...</p></div>';
            }
            break;

        case 'donhanghomnay':
            // Đơn Hàng Hôm Nay QLX — uses renderDonhanghomnayqlxPage if exists
            if (typeof renderDonhanghomnayqlxPage === 'function') {
                renderDonhanghomnayqlxPage(container);
            } else {
                container.innerHTML = '<div style="text-align:center;padding:80px 20px">'
                    +'<div style="font-size:56px;margin-bottom:16px">🚀</div>'
                    +'<h3 style="color:#0c4a6e;font-size:20px;font-weight:800;margin:0 0 8px">Đơn Hàng Hôm Nay QLX</h3>'
                    +'<p style="color:#64748b;font-size:13px;max-width:400px;margin:0 auto">Module đang được phát triển.</p>'
                    +'<div style="margin-top:20px;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);padding:10px 20px;border-radius:10px;border:1px solid #bae6fd">'
                    +'<span style="font-size:14px">🔧</span>'
                    +'<span style="font-size:12px;font-weight:700;color:#0369a1">Đang phát triển</span>'
                    +'</div>'
                    +'</div>';
            }
            break;

        default:
            container.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8">Tab không hợp lệ</div>';
    }
}
