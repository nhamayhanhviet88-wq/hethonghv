// ========== XUẤT VẢI ĐỂ CẮT (CÂY VẢI ĐANG CẮT) — Desktop Page ==========
var _xvc = {
    rolls: [],
    viewMode: 'grouped', // 'grouped' or 'list'
    search: '',
    soundEnabled: localStorage.getItem('_xvc_sound') !== 'false',
    activeRollIds: new Set(),
    autoRefreshInterval: null,
    autoRefreshEnabled: true
};

function renderXuatvaicatPage(content) {
    if (!content) content = document.getElementById('contentArea');
    if (!content) return;
    if (!document.getElementById('_xvcS')) {
        var st = document.createElement('style');
        st.id = '_xvcS';
        st.textContent = `
            .xvc-wrap { display: flex; flex-direction: column; gap: 20px; }
            .xvc-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 16px 20px; border-radius: var(--radius); box-shadow: var(--shadow); flex-wrap: wrap; gap: 15px; }
            .xvc-title-wrap { display: flex; align-items: center; gap: 12px; }
            .xvc-title-icon { font-size: 24px; background: rgba(18, 37, 70, 0.08); width: 45px; height: 45px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--navy); }
            .xvc-title-text h2 { font-size: 18px; font-weight: 800; color: var(--navy); }
            .xvc-title-text p { font-size: 12px; color: var(--gray-500); }
            .xvc-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
            .xvc-search-input { padding: 10px 16px 10px 38px; border: 1.5px solid var(--gray-200); border-radius: 10px; font-size: 13px; outline: none; width: 260px; transition: var(--transition); background: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%239ca3af" viewBox="0 0 16 16"%3E%3Cpath d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/%3E%3C/svg%3E') no-repeat 14px center; background-size: 14px; }
            .xvc-search-input:focus { border-color: var(--navy); box-shadow: 0 0 0 3px rgba(18, 37, 70, 0.1); }
            
            .xvc-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
            .xvc-stat-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px 20px; display: flex; align-items: center; gap: 15px; border-left: 4px solid var(--navy); position: relative; overflow: hidden; }
            .xvc-stat-card.navy { border-left-color: var(--navy); }
            .xvc-stat-card.gold { border-left-color: var(--gold); }
            .xvc-stat-card.success { border-left-color: var(--success); }
            .xvc-stat-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
            .xvc-stat-card.navy .xvc-stat-icon { background: rgba(18,37,70,0.08); color: var(--navy); }
            .xvc-stat-card.gold .xvc-stat-icon { background: rgba(250,210,76,0.15); color: var(--gold-dark); }
            .xvc-stat-card.success .xvc-stat-icon { background: rgba(16,185,129,0.1); color: var(--success); }
            .xvc-stat-info { display: flex; flex-direction: column; }
            .xvc-stat-val { font-size: 20px; font-weight: 800; color: var(--navy); }
            .xvc-stat-lbl { font-size: 11px; font-weight: 600; color: var(--gray-500); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; }
            
            .xvc-toggle-btn { background: var(--gray-100); border: 1.5px solid var(--gray-200); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; font-weight: 600; color: var(--navy); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: var(--transition); }
            .xvc-toggle-btn:hover { background: var(--gray-200); }
            .xvc-toggle-btn.active { background: var(--navy); color: #fff; border-color: var(--navy); }
            .xvc-toggle-btn.btn-sound.muted { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
            
            .xvc-ticket-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); border: 1px solid var(--gray-200); margin-bottom: 16px; overflow: hidden; transition: var(--transition); }
            .xvc-ticket-card:hover { box-shadow: var(--shadow-lg); border-color: rgba(18, 37, 70, 0.2); }
            .xvc-ticket-hdr { padding: 14px 20px; background: var(--gray-50); border-bottom: 1px solid var(--gray-200); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
            .xvc-ticket-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .xvc-ticket-title h4 { font-size: 14px; font-weight: 800; color: var(--navy); }
            .xvc-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
            .xvc-badge.cutter { background: #e0f2fe; color: #0369a1; }
            .xvc-badge.order { background: #fef3c7; color: #b45309; }
            .xvc-badge.cskh { background: #f3e8ff; color: #6b21a8; }
            .xvc-ticket-time { font-size: 12px; color: var(--gray-500); font-weight: 500; }
            
            .xvc-roll-list { padding: 15px 20px; display: flex; flex-direction: column; gap: 10px; }
            .xvc-roll-item { display: flex; align-items: center; justify-content: space-between; background: var(--gray-50); border: 1px dashed var(--gray-300); padding: 12px 16px; border-radius: 8px; flex-wrap: wrap; gap: 10px; }
            .xvc-roll-main { display: flex; align-items: center; gap: 12px; }
            .xvc-roll-code { font-family: monospace; font-size: 13px; font-weight: 800; color: var(--navy); background: var(--white); border: 1px solid var(--gray-200); padding: 4px 8px; border-radius: 6px; }
            .xvc-roll-fabric { display: flex; flex-direction: column; }
            .xvc-roll-fabric .name { font-size: 13px; font-weight: 700; color: var(--navy); }
            .xvc-roll-fabric .desc { font-size: 11px; color: var(--gray-500); margin-top: 1px; }
            .xvc-roll-meta { display: flex; align-items: center; gap: 20px; }
            
            /* Shelf location layout: highly highlighted badge */
            .xvc-location-badge { font-size: 13px; font-weight: 800; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: #fff; padding: 6px 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(13,148,136,0.3); border: 1px solid rgba(255,255,255,0.1); display: inline-flex; align-items: center; gap: 4px; }
            .xvc-location-badge.empty { background: var(--gray-200); color: var(--gray-500); box-shadow: none; border-color: var(--gray-300); }
            
            .xvc-weight-info { display: flex; flex-direction: column; align-items: flex-end; }
            .xvc-weight-info .current { font-size: 15px; font-weight: 800; color: var(--navy); }
            .xvc-weight-info .original { font-size: 10px; color: var(--gray-400); margin-top: 1px; }
            
            .xvc-new-pulse { animation: pulseFlash 1.5s infinite; }
            @keyframes pulseFlash {
                0%, 100% { border-color: var(--gray-200); box-shadow: var(--shadow); }
                50% { border-color: var(--success); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.02); }
            }
            
            .xvc-sound-toast { position: fixed; top: 80px; right: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 20px; border-radius: 10px; box-shadow: var(--shadow-lg); font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; z-index: 9999; animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            
            .xvc-tab-bar { display: flex; gap: 10px; border-bottom: 2px solid var(--gray-200); padding-bottom: 8px; margin-bottom: 16px; }
        `;
        document.head.appendChild(st);
    }

    content.innerHTML = `
        <div class="xvc-wrap">
            <div class="xvc-header">
                <div class="xvc-title-wrap">
                    <div class="xvc-title-icon">✂️</div>
                    <div class="xvc-title-text">
                        <h2>Xuất Vải Để Cắt</h2>
                        <p>Danh sách các cây vải đang được bộ phận cắt xử lý (tự động ẩn khi cắt xong)</p>
                    </div>
                </div>
                <div class="xvc-controls">
                    <input type="text" class="xvc-search-input" id="xvcSearch" placeholder="Tìm mã cây, thợ cắt, đơn hàng, kệ...">
                    <button class="xvc-toggle-btn btn-sound ${_xvc.soundEnabled ? '' : 'muted'}" id="xvcToggleSound">
                        ${_xvc.soundEnabled ? '🔊 Âm Báo: Bật' : '🔇 Âm Báo: Tắt'}
                    </button>
                    <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; user-select:none; color:var(--navy);">
                        <input type="checkbox" id="xvcAutoRefresh" ${_xvc.autoRefreshEnabled ? 'checked' : ''} style="accent-color:var(--navy); width:16px; height:16px;">
                        Tự động cập nhật (30s)
                    </label>
                    <button class="btn btn-secondary btn-sm" id="xvcRefreshBtn" style="border-radius:var(--radius-sm);">Làm Mới 🔄</button>
                </div>
            </div>
            
            <div class="xvc-stats-grid" id="xvcStats">
                <div class="xvc-stat-card navy">
                    <div class="xvc-stat-icon">📦</div>
                    <div class="xvc-stat-info">
                        <span class="xvc-stat-lbl">Đang Cắt</span>
                        <span class="xvc-stat-val" id="xvcStatRolls">0 cây</span>
                    </div>
                </div>
                <div class="xvc-stat-card gold">
                    <div class="xvc-stat-icon">⚖️</div>
                    <div class="xvc-stat-info">
                        <span class="xvc-stat-lbl">Tổng Khối Lượng</span>
                        <span class="xvc-stat-val" id="xvcStatWeight">0 kg</span>
                    </div>
                </div>
                <div class="xvc-stat-card success">
                    <div class="xvc-stat-icon">✂️</div>
                    <div class="xvc-stat-info">
                        <span class="xvc-stat-lbl">Số Thợ Cắt</span>
                        <span class="xvc-stat-val" id="xvcStatCutters">0 thợ</span>
                    </div>
                </div>
            </div>
            
            <div class="xvc-tab-bar">
                <button class="xvc-toggle-btn ${_xvc.viewMode === 'grouped' ? 'active' : ''}" onclick="_xvcSetViewMode('grouped')">📋 Xem Theo Phiếu Cắt (Nhóm)</button>
                <button class="xvc-toggle-btn ${_xvc.viewMode === 'list' ? 'active' : ''}" onclick="_xvcSetViewMode('list')">📍 Xem Theo Vị Trí Kệ (Chi Tiết)</button>
            </div>
            
            <div id="xvcListContainer">
                <div style="text-align:center; padding:60px 20px; color:var(--gray-400);">
                    <div class="spinner-border text-primary" role="status" style="width:2rem; height:2rem; margin-bottom:12px;"></div>
                    <div>Đang tải danh sách cây vải...</div>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('xvcSearch').addEventListener('input', function(e) {
        _xvc.search = e.target.value || '';
        _xvcRender();
    });

    document.getElementById('xvcToggleSound').addEventListener('click', function() {
        _xvc.soundEnabled = !_xvc.soundEnabled;
        localStorage.setItem('_xvc_sound', _xvc.soundEnabled);
        this.className = `xvc-toggle-btn btn-sound ${_xvc.soundEnabled ? '' : 'muted'}`;
        this.textContent = _xvc.soundEnabled ? '🔊 Âm Báo: Bật' : '🔇 Âm Báo: Tắt';
        
        // Play brief chime to let user test and unlock browser AudioContext
        if (_xvc.soundEnabled) {
            _xvcPlayChime();
            _xvcShowToast('🔊 Đã bật âm báo mới!');
        }
    });

    document.getElementById('xvcAutoRefresh').addEventListener('change', function(e) {
        _xvc.autoRefreshEnabled = e.target.checked;
        _xvcSetupAutoRefresh();
    });

    document.getElementById('xvcRefreshBtn').addEventListener('click', function() {
        _xvcLoadData(true);
    });

    // Start loading data
    _xvcLoadData(false);
    _xvcSetupAutoRefresh();
}

function _xvcSetupAutoRefresh() {
    if (_xvc.autoRefreshInterval) {
        clearInterval(_xvc.autoRefreshInterval);
        _xvc.autoRefreshInterval = null;
    }
    if (_xvc.autoRefreshEnabled) {
        _xvc.autoRefreshInterval = setInterval(function() {
            _xvcLoadData(false);
        }, 30000); // 30s
    }
}

async function _xvcLoadData(isManual) {
    try {
        var res = await apiCall('/api/cutting/active-rolls');
        var newRolls = res.rolls || [];
        
        // Sound and Flash notification triggers
        if (_xvc.rolls.length > 0 || isManual) {
            var currentIds = new Set(newRolls.map(r => r.roll_id));
            var newAdded = [];
            newRolls.forEach(r => {
                if (!_xvc.activeRollIds.has(r.roll_id)) {
                    newAdded.push(r);
                }
            });
            
            if (newAdded.length > 0) {
                if (_xvc.soundEnabled) {
                    _xvcPlayChime();
                }
                newAdded.forEach(r => {
                    _xvcShowToast(`🔔 Có cây vải mới cần xuất: ${r.roll_code} (Kệ: ${r.location || 'Chưa xếp'})`);
                    // Mark as new in model temporarily to add style
                    r._is_new = true;
                    setTimeout(function() {
                        delete r._is_new;
                    }, 5000);
                });
            }
        }
        
        // Update states
        _xvc.rolls = newRolls;
        _xvc.activeRollIds = new Set(newRolls.map(r => r.roll_id));
        
        _xvcRender();
    } catch(e) {
        console.error('[XuatVaiCat] Load Error:', e);
        var el = document.getElementById('xvcListContainer');
        if (el) {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="icon">⚠️</div>
                    <h3>Không thể tải dữ liệu</h3>
                    <p>${e.message || 'Vui lòng kiểm tra kết nối mạng và thử lại.'}</p>
                </div>
            `;
        }
    }
}

function _xvcSetViewMode(mode) {
    _xvc.viewMode = mode;
    var tabs = document.querySelectorAll('.xvc-tab-bar .xvc-toggle-btn');
    tabs[0].className = `xvc-toggle-btn ${mode === 'grouped' ? 'active' : ''}`;
    tabs[1].className = `xvc-toggle-btn ${mode === 'list' ? 'active' : ''}`;
    _xvcRender();
}

function _xvcPlayChime() {
    try {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        var ctx = new AudioContext();
        var now = ctx.currentTime;
        
        // Chime note 1: E5
        var osc1 = ctx.createOscillator();
        var gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);
        
        // Chime note 2: A5 starting shortly after
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.12);
        gain2.gain.setValueAtTime(0.2, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.5);
    } catch(e) {
        console.warn('AudioContext autoplay blocked or unsupported:', e);
    }
}

function _xvcShowToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'xvc-sound-toast';
    toast.innerHTML = `<span>🔊</span> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(function() { toast.remove(); }, 300);
    }, 4500);
}

function _xvcRender() {
    var listEl = document.getElementById('xvcListContainer');
    if (!listEl) return;
    
    // Filter rolls
    var filtered = _xvc.rolls.slice();
    if (_xvc.search) {
        var q = _xvc.search.toLowerCase().trim();
        filtered = filtered.filter(function(r) {
            return (r.roll_code || '').toLowerCase().includes(q) ||
                   (r.cutter_name || '').toLowerCase().includes(q) ||
                   (r.material_name || '').toLowerCase().includes(q) ||
                   (r.color_name || '').toLowerCase().includes(q) ||
                   (r.location || '').toLowerCase().includes(q) ||
                   (r.order_code || '').toLowerCase().includes(q) ||
                   (r.product_name || '').toLowerCase().includes(q);
        });
    }

    // Update stats
    var totalWeight = filtered.reduce((sum, r) => sum + (Number(r.roll_weight) || 0), 0);
    var uniqueCutters = new Set(filtered.map(r => r.cutter_name).filter(Boolean));
    
    document.getElementById('xvcStatRolls').textContent = `${filtered.length} cây`;
    document.getElementById('xvcStatWeight').textContent = `${totalWeight.toFixed(1)} kg`;
    document.getElementById('xvcStatCutters').textContent = `${uniqueCutters.size} thợ`;

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="icon">✂️</div>
                        <h3>Không có cây vải nào đang cắt</h3>
                        <p>Khi tổ cắt nhận đơn và bắt đầu cắt, các cây vải bị khóa sẽ hiển thị tại đây.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (_xvc.viewMode === 'grouped') {
        // Group by cutting ticket
        var groups = {};
        filtered.forEach(r => {
            if (!groups[r.cutting_id]) {
                groups[r.cutting_id] = {
                    cutting_id: r.cutting_id,
                    product_name: r.product_name,
                    order_quantity: r.order_quantity,
                    cutter_name: r.cutter_name,
                    cutting_at: r.cutting_at,
                    order_code: r.order_code,
                    cskh_name: r.cskh_name,
                    rolls: [],
                    _is_new: false
                };
            }
            if (r._is_new) groups[r.cutting_id]._is_new = true;
            groups[r.cutting_id].rolls.push(r);
        });

        // Convert to array and sort by cutting_at desc
        var groupedArray = Object.values(groups).sort((a,b) => new Date(b.cutting_at) - new Date(a.cutting_at));
        
        listEl.innerHTML = groupedArray.map(g => {
            var startDt = g.cutting_at ? new Date(g.cutting_at) : null;
            var timeStr = '—';
            if (startDt) {
                var diffMin = Math.round((new Date() - startDt) / 60000);
                timeStr = diffMin < 60 ? `${diffMin} phút trước` : startDt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + startDt.toLocaleDateString('vi-VN');
            }
            
            var totalGrpWeight = g.rolls.reduce((sum, r) => sum + Number(r.roll_weight), 0);
            var pulseClass = g._is_new ? 'xvc-new-pulse' : '';

            var rollsHtml = g.rolls.map(r => {
                var locBadge = r.location ? `<span class="xvc-location-badge">📍 ${r.location}</span>` : `<span class="xvc-location-badge empty">📍 Chưa có kệ</span>`;
                var imgHtml = '';
                if (r.image_path) {
                    imgHtml = `<img src="${r.image_path}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;cursor:pointer;margin-right:8px" onclick="event.preventDefault(); event.stopPropagation(); window.open('${r.image_path}', '_blank')">`;
                }
                return `
                    <div class="xvc-roll-item">
                        <div class="xvc-roll-main">
                            ${imgHtml}
                            <span class="xvc-roll-code" title="Cây ID: ${r.roll_id}">${r.roll_code}</span>
                            <div class="xvc-roll-fabric">
                                <span class="name">${r.material_name} — ${r.color_name}</span>
                                <span class="desc">Khối lượng ban đầu: ${Number(r.original_weight).toFixed(1)} kg</span>
                            </div>
                        </div>
                        <div class="xvc-roll-meta">
                            ${locBadge}
                            <div class="xvc-weight-info">
                                <span class="current">${Number(r.roll_weight).toFixed(1)} kg</span>
                                <span class="original">Đang cắt</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="xvc-ticket-card ${pulseClass}">
                    <div class="xvc-ticket-hdr">
                        <div class="xvc-ticket-title">
                            <span class="xvc-badge cutter">✂️ Thợ: ${g.cutter_name || 'Chưa gán'}</span>
                            <span class="xvc-badge order">📦 Đơn: ${g.order_code || '—'}</span>
                            <h4>${g.product_name || '—'} (SL: ${g.order_quantity || 0} cái)</h4>
                            ${g.cskh_name ? `<span class="xvc-badge cskh">👤 CSKH: ${g.cskh_name}</span>` : ''}
                        </div>
                        <div class="xvc-ticket-time">
                            ⏱️ Bắt đầu: ${timeStr}
                        </div>
                    </div>
                    <div class="xvc-roll-list">
                        ${rollsHtml}
                    </div>
                    <div style="background:var(--gray-50); padding:10px 20px; font-size:12px; font-weight:700; color:var(--navy); display:flex; justify-content:space-between; border-top:1px solid var(--gray-200);">
                        <span>Cần xuất: ${g.rolls.length} cây vải</span>
                        <span>Tổng trọng lượng đơn cắt: ${totalGrpWeight.toFixed(1)} kg</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // List Mode sorted by Shelf Location
        var listArray = filtered.slice().sort((a, b) => {
            var locA = a.location || 'ZZZZ';
            var locB = b.location || 'ZZZZ';
            return locA.localeCompare(locB);
        });

        var tableRows = listArray.map((r, i) => {
            var locBadge = r.location ? `<span class="xvc-location-badge">📍 ${r.location}</span>` : `<span class="xvc-location-badge empty">📍 Chưa kệ</span>`;
            var pulseClass = r._is_new ? 'style="background:rgba(16,185,129,0.08);"' : '';
            var imgHtml = '';
            if (r.image_path) {
                imgHtml = `<img src="${r.image_path}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;cursor:pointer;vertical-align:middle;margin-right:6px" onclick="event.preventDefault(); event.stopPropagation(); window.open('${r.image_path}', '_blank')">`;
            }
            return `
                <tr ${pulseClass}>
                    <td style="font-weight:700; text-align:center; color:var(--gray-400);">${i + 1}</td>
                    <td>${locBadge}</td>
                    <td>${imgHtml}<span class="xvc-roll-code">${r.roll_code}</span></td>
                    <td style="font-weight:700; color:var(--navy);">${r.material_name} — ${r.color_name}</td>
                    <td style="font-weight:800; color:var(--navy); text-align:right;">${Number(r.roll_weight).toFixed(1)} kg</td>
                    <td style="color:var(--gray-400); text-align:right;">${Number(r.original_weight).toFixed(1)} kg</td>
                    <td><span class="xvc-badge cutter">✂️ ${r.cutter_name || 'Chưa gán'}</span></td>
                    <td><span class="xvc-badge order">📦 ${r.order_code || '—'}</span></td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.product_name}">${r.product_name || '—'}</td>
                </tr>
            `;
        }).join('');

        listEl.innerHTML = `
            <div class="card">
                <div class="card-body" style="padding:0; overflow-x:auto;">
                    <table class="table" style="margin:0; font-size:12px;">
                        <thead>
                            <tr style="background:var(--navy);">
                                <th style="width:50px; text-align:center;">STT</th>
                                <th style="width:140px;">Vị Trí Kệ</th>
                                <th style="width:120px;">Mã Cây</th>
                                <th>Chất Liệu & Màu</th>
                                <th style="width:110px; text-align:right;">KL Hiện Tại</th>
                                <th style="width:110px; text-align:right;">KL Ban Đầu</th>
                                <th style="width:130px;">Thợ Cắt</th>
                                <th style="width:120px;">Mã Đơn</th>
                                <th>Chi Tiết Sản Phẩm</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
