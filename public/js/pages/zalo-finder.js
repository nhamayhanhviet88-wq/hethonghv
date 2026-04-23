// ========== ZALO GROUP FINDER — CUSTOM UI ==========
let _zlTasks = [], _zlStats = {}, _zlPoolStats = {}, _zlSpamImg = null;
let _zlViewUserId = null, _zlViewDeptId = null, _zlCachedDepts = [], _zlFilter = 'pending';
let _zlDateFilter = 'all'; // today, yesterday, 7days, month, prev_month, all, custom
let _zlCustomFrom = '', _zlCustomTo = '';
const _ZL_GRAD = 'linear-gradient(135deg,#0284c7,#0369a1)';
const _ZL_ACCENT = '#0284c7';

function _zlInit() {
    const area = document.getElementById('contentArea');
    if (!area) return;
    // Restore state from localStorage
    _zlViewUserId = localStorage.getItem('zl_userId') ? Number(localStorage.getItem('zl_userId')) : null;
    _zlViewDeptId = localStorage.getItem('zl_deptId') ? Number(localStorage.getItem('zl_deptId')) : null;
    _zlFilter = localStorage.getItem('zl_filter') || 'pending';
    const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="zlSidebar" style="width:240px;min-width:240px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="zlGuide"></div>
            <div id="zlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div id="zlLockBanner"></div>
            <div id="zlDateBar" style="margin-bottom:12px;"></div>
            <div id="zlToolbar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;"></div>
            <div id="zlProgress" style="margin-bottom:16px;"></div>
            <div id="zlTaskList"></div>
        </div>
    </div>`;
    _zlLoadSidebar();
    if (typeof _dlLoadGuide === 'function') _dlLoadGuide();
    _zlRenderDateBar();
    _zlLoadTasks();
    _zlLoadLockTaskStatus();
}

async function _zlLoadSidebar() {
    try {
        const res = await apiCall('/api/dailylinks/members');
        _zlCachedDepts = res.departments || [];
        _zlRenderSidebar();
    } catch(e) { console.error(e); }
}

function _zlSaveState() {
    if (_zlViewUserId) localStorage.setItem('zl_userId', _zlViewUserId); else localStorage.removeItem('zl_userId');
    if (_zlViewDeptId) localStorage.setItem('zl_deptId', _zlViewDeptId); else localStorage.removeItem('zl_deptId');
    localStorage.setItem('zl_filter', _zlFilter);
}
function _zlSelAll() { _zlViewUserId = null; _zlViewDeptId = null; _zlFilter = 'pending'; _zlSaveState(); _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSelDept(id) { _zlViewDeptId = id; _zlViewUserId = null; _zlFilter = 'pending'; _zlSaveState(); _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSelUser(id) { _zlViewUserId = id; _zlViewDeptId = null; _zlFilter = 'pending'; _zlSaveState(); _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSetFilter(f) { _zlFilter = f; _zlSaveState(); const done = _zlTasks.filter(t => t.status==='done'||t.status==='no_result').length; _zlRenderToolbar(); _zlRenderTasks({done, quota: _zlTasks.length||25}); }

function _zlRenderSidebar() {
    const sb = document.getElementById('zlSidebar');
    if (!sb) return;
    const isAll = !_zlViewUserId && !_zlViewDeptId;
    let h = `<div style="margin-bottom:12px;">
        <div onclick="_zlSelAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;
            background:${isAll ? _ZL_GRAD : '#e0f2fe'};color:${isAll ? 'white' : '#0369a1'};
            box-shadow:${isAll ? '0 3px 12px rgba(2,132,199,0.3)' : 'none'};transition:all 0.2s;">📊 Tất cả nhân viên</div>
    </div>
    <div style="height:1px;background:linear-gradient(to right,transparent,#e2e8f0,transparent);margin:10px 0;"></div>`;
    (_zlCachedDepts||[]).forEach(d => {
        const isDeptSel = _zlViewDeptId==d.id && !_zlViewUserId;
        const memberCount = d.members?.length || 0;
        h += `<div style="margin-bottom:6px;">
            <div onclick="_zlSelDept(${d.id})" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
                background:${isDeptSel ? _ZL_GRAD : '#f1f5f9'};color:${isDeptSel ? 'white' : '#334155'};transition:all .2s;border:1px solid ${isDeptSel?'transparent':'#e2e8f0'};">
                🏢 ${d.name} <span style="font-size:10px;opacity:0.6;">(${memberCount})</span>
            </div>`;
        (d.members||[]).forEach(m => {
            const isSel = _zlViewUserId == m.id;
            const initials = (m.full_name||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            h += `<div onclick="_zlSelUser(${m.id})" style="padding:6px 10px 6px 22px;cursor:pointer;display:flex;align-items:center;gap:8px;border-radius:6px;margin:2px 0;
                background:${isSel ? _ZL_GRAD : 'transparent'};color:${isSel ? 'white' : '#475569'};transition:all .15s;"
                onmouseover="if(!${isSel})this.style.background='#e0f2fe'" onmouseout="if(!${isSel})this.style.background='transparent'">
                <div style="width:24px;height:24px;border-radius:50%;background:${isSel?'rgba(255,255,255,0.25)':'#e2e8f0'};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:${isSel?'white':'#64748b'};flex-shrink:0;">${initials}</div>
                <span style="font-size:12px;font-weight:${isSel?'700':'500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name}</span>
            </div>`;
        });
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _zlRenderToolbar() {
    const tb = document.getElementById('zlToolbar');
    if (!tb) return;
    const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
    const cPending = _zlTasks.filter(t => t.status === 'pending').length;
    // Count per-RESULT, not per-task
    const allResults = _zlTasks.flatMap(t => (t.results || []));
    const cHasZalo = allResults.filter(r => !r.spam_eligible && !r.spam_not_eligible && r.spam_status !== 'done').length;
    const cSpamOk = allResults.filter(r => r.spam_eligible && r.spam_status !== 'done').length;
    const cSpamNo = allResults.filter(r => r.spam_not_eligible && r.spam_status !== 'done').length;
    const cSpamDone = allResults.filter(r => r.spam_status === 'done').length;
    const cNoZalo = _zlTasks.filter(t => t.status === 'no_result').length;
    const btn = (f, label, icon, count) => {
        const active = _zlFilter === f;
        return `<button onclick="_zlSetFilter('${f}')" style="padding:6px 14px;border:2px solid ${active?_ZL_ACCENT:'#d1d5db'};border-radius:8px;background:${active?'#e0f2fe':'white'};color:${active?_ZL_ACCENT:'#6b7280'};cursor:pointer;font-weight:700;font-size:11px;transition:all .2s;white-space:nowrap;">${icon} ${label} (${count})</button>`;
    };
    let h = '<div style="display:flex;gap:6px;flex-wrap:wrap;flex:1;align-items:center;">';
    h += btn('pending', 'Link Group Chưa Tìm', '🔍', cPending);
    h += btn('has_zalo', 'Group Có Zalo', '✅', cHasZalo);
    h += btn('spam_ok', 'Zalo Spam Được', '🎯', cSpamOk);
    h += btn('spam_no', 'KHÔNG SPAM ĐƯỢC', '🚫', cSpamNo);
    h += btn('spam_done', 'QUẢN LÝ ĐÃ SPAM', '📣', cSpamDone);
    h += btn('no_zalo', 'Group K Có Zalo', '❌', cNoZalo);
    h += '</div>';
    if (_zlViewUserId && isManager && _zlFilter === 'pending') {
        h += `<button onclick="_zlPoolModal()" style="padding:8px 18px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(2,132,199,0.3);white-space:nowrap;flex-shrink:0;">📥 Bơm Link</button>`;
    }
    tb.innerHTML = h;
}

function _vnTodayFE() {
    const now = new Date(Date.now() + 7 * 3600000);
    return now.toISOString().split('T')[0];
}

function _zlRenderDateBar() {
    const el = document.getElementById('zlDateBar');
    if (!el) return;
    const btns = [
        { key: 'today', label: 'Hôm nay', icon: '📅' },
        { key: 'yesterday', label: 'Hôm qua', icon: '📅' },
        { key: '7days', label: '7 ngày', icon: '📅' },
        { key: 'month', label: 'Tháng này', icon: '📅' },
        { key: 'prev_month', label: 'Tháng trước', icon: '📅' },
        { key: 'all', label: 'Tất cả', icon: '♾️' },
        { key: 'custom', label: 'Tùy chọn', icon: '📅' },
    ];
    let h = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:#f1f5f9;padding:8px 12px;border-radius:10px;border:1px solid #e2e8f0;">';
    btns.forEach(b => {
        const active = _zlDateFilter === b.key;
        h += `<button onclick="_zlSetDateFilter('${b.key}')" style="padding:6px 14px;border:2px solid ${active ? '#3b82f6' : '#d1d5db'};border-radius:8px;background:${active ? '#3b82f6' : 'white'};color:${active ? 'white' : '#6b7280'};cursor:pointer;font-weight:700;font-size:11px;transition:all .2s;white-space:nowrap;">${b.icon} ${b.label}</button>`;
    });
    if (_zlDateFilter === 'custom') {
        h += `<input type="date" id="zlDateFrom" value="${_zlCustomFrom}" onchange="_zlCustomFrom=this.value;_zlLoadTasks()" style="padding:5px 8px;border:2px solid #d1d5db;border-radius:8px;font-size:11px;font-weight:600;">`;
        h += `<span style="color:#6b7280;font-size:12px;font-weight:700;">→</span>`;
        h += `<input type="date" id="zlDateTo" value="${_zlCustomTo}" onchange="_zlCustomTo=this.value;_zlLoadTasks()" style="padding:5px 8px;border:2px solid #d1d5db;border-radius:8px;font-size:11px;font-weight:600;">`;
    }
    h += '</div>';
    el.innerHTML = h;
}

function _zlSetDateFilter(key) {
    _zlDateFilter = key;
    _zlRenderDateBar();
    _zlLoadTasks();
}

function _zlGetDateParams() {
    const today = _vnTodayFE();
    const d = new Date(Date.now() + 7 * 3600000);
    switch (_zlDateFilter) {
        case 'today': return { date: today };
        case 'yesterday': {
            const y = new Date(d); y.setDate(y.getDate() - 1);
            return { date: y.toISOString().split('T')[0] };
        }
        case '7days': {
            const from = new Date(d); from.setDate(from.getDate() - 6);
            return { date_from: from.toISOString().split('T')[0], date_to: today };
        }
        case 'month': {
            const from = new Date(d.getFullYear(), d.getMonth(), 1);
            return { date_from: from.toISOString().split('T')[0], date_to: today };
        }
        case 'prev_month': {
            const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
            const to = new Date(d.getFullYear(), d.getMonth(), 0);
            return { date_from: from.toISOString().split('T')[0], date_to: to.toISOString().split('T')[0] };
        }
        case 'all': return { date: 'all' };
        case 'custom': {
            if (_zlCustomFrom && _zlCustomTo) return { date_from: _zlCustomFrom, date_to: _zlCustomTo };
            return { date: today };
        }
        default: return { date: today };
    }
}

async function _zlLoadTasks() {
    try {
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
        let taskRes, statsRes;
        const dateParams = _zlGetDateParams();
        let url = '/api/zalo-tasks/team?';
        if (dateParams.date_from && dateParams.date_to) {
            url += 'date_from=' + dateParams.date_from + '&date_to=' + dateParams.date_to;
        } else {
            url += 'date=' + (dateParams.date || _vnTodayFE());
        }
        // Also fetch today-only data for the "Hôm Nay" card
        let todayUrl = '/api/zalo-tasks/team?date=' + _vnTodayFE();
        let statsUrl = '/api/zalo-tasks/stats';
        if (isManager) {
            if (_zlViewUserId) { url += '&user_id=' + _zlViewUserId; todayUrl += '&user_id=' + _zlViewUserId; statsUrl += '?user_id=' + _zlViewUserId; }
            else if (_zlViewDeptId) { url += '&dept_id=' + _zlViewDeptId; todayUrl += '&dept_id=' + _zlViewDeptId; }
        } else {
            url += '&user_id=' + currentUser.id;
            todayUrl += '&user_id=' + currentUser.id;
            statsUrl += '?user_id=' + currentUser.id;
        }
        let todayRes;
        [taskRes, statsRes, todayRes] = await Promise.all([apiCall(url), apiCall(statsUrl), apiCall(todayUrl)]);
        taskRes.tasks = taskRes.tasks || [];
        todayRes.tasks = todayRes.tasks || [];
        const todayDone = todayRes.tasks.filter(t => t.status === 'done' || t.status === 'no_result').length;
        const realTarget = statsRes?.target || 25;
        const doneCount = taskRes.tasks.filter(t => t.status === 'done' || t.status === 'no_result').length;
        taskRes.done = doneCount;
        taskRes.quota = realTarget;
        _zlTasks = taskRes.tasks;
        // Count QL chưa spam: spam_eligible=true but spam_status != 'done'
        const allResults = _zlTasks.flatMap(t => (t.results || []));
        const qlChuaSpam = allResults.filter(r => r.spam_eligible && r.spam_status !== 'done').length;
        const qlDaSpam = allResults.filter(r => r.spam_status === 'done').length;
        _zlStats = { today: todayDone, target: realTarget, qlChuaSpam, qlDaSpam };
        _zlRenderStats();
        _zlRenderToolbar();
        _zlRenderProgress({ done: todayDone, quota: realTarget });
        _zlRenderTasks(taskRes);
    } catch(e) {
        console.error('[Zalo] _zlLoadTasks error:', e);
        _zlTasks = [];
        _zlStats = { today: 0, target: 25, qlChuaSpam: 0, qlDaSpam: 0 };
        _zlRenderStats();
        _zlRenderToolbar();
        _zlRenderProgress({ done: 0, quota: 25 });
        _zlRenderTasks({ done: 0, quota: 25 });
    }
}
function _zlRenderStats() {
    const s = _zlStats, el = document.getElementById('zlStats');
    if (!el) return;
    // Inject sparkle animation CSS if not already
    if (!document.getElementById('zlSparkleCSS')) {
        const style = document.createElement('style'); style.id = 'zlSparkleCSS';
        style.textContent = `
            @keyframes zlSparkle { 0%,100%{box-shadow:0 0 8px rgba(255,255,255,0.3),0 4px 15px rgba(0,0,0,0.15)} 50%{box-shadow:0 0 20px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.2),0 4px 20px rgba(0,0,0,0.2)} }
            @keyframes zlPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
            @keyframes zlGlow { 0%,100%{text-shadow:0 0 6px rgba(255,255,255,0.3)} 50%{text-shadow:0 0 16px rgba(255,255,255,0.7),0 0 30px rgba(255,255,255,0.3)} }
        `;
        document.head.appendChild(style);
    }
    el.innerHTML = `
        <div onclick="_zlSetFilter('pending')" style="flex:1;min-width:180px;background:${_ZL_GRAD};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);cursor:pointer;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:28px;margin-bottom:4px;">📊</div>
            <div style="font-size:28px;font-weight:900;font-family:'Segoe UI',sans-serif;">${s.today||0}/${s.target||25}</div>
            <div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">Hôm Nay</div>
        </div>
        <div onclick="_zlSetFilter('spam_ok')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#ef4444,#b91c1c);border-radius:14px;padding:18px 20px;color:white;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:28px;margin-bottom:4px;">🔥</div>
            <div style="font-size:32px;font-weight:900;font-family:'Segoe UI',sans-serif;">${s.qlChuaSpam||0}</div>
            <div style="font-size:13px;font-weight:800;margin-top:4px;letter-spacing:0.5px;opacity:0.95;">QL CHƯA SPAM</div>
        </div>
        <div onclick="_zlSetFilter('spam_done')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;padding:18px 20px;color:white;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite .5s;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:28px;margin-bottom:4px;">📣</div>
            <div style="font-size:32px;font-weight:900;font-family:'Segoe UI',sans-serif;">${s.qlDaSpam||0}</div>
            <div style="font-size:13px;font-weight:800;margin-top:4px;letter-spacing:0.5px;opacity:0.95;">QL ĐÃ SPAM</div>
        </div>
    `;
}

function _zlRenderProgress(res) {
    const el = document.getElementById('zlProgress');
    if (!el) return;
    const done = res.done || 0, quota = res.quota || 25;
    const pct = quota > 0 ? Math.min(100, Math.round(done/quota*100)) : 0;
    el.innerHTML = `
    <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:700;font-size:15px;color:#0c4a6e;font-family:'Segoe UI',sans-serif;">🔍 Tiến độ hôm nay: <span style="color:${_ZL_ACCENT};">${done}/${quota}</span> đã xử lý</span>
            ${res.pool_empty ? '<span style="background:#fef2f2;color:#dc2626;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">⚠️ Pool đã hết link!</span>' : ''}
        </div>
        <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${_ZL_GRAD};border-radius:4px;transition:width .5s;"></div>
        </div>
    </div>`;
}

function _zlRenderTasks(res) {
    const el = document.getElementById('zlTaskList');
    if (!el) return;
    // Filter tasks first, then sub-filter results within each task
    let filtered = _zlTasks;
    let resultFilter = null; // function to filter individual results
    if (_zlFilter === 'pending') filtered = filtered.filter(t => t.status === 'pending');
    else if (_zlFilter === 'has_zalo') {
        resultFilter = r => !r.spam_eligible && !r.spam_not_eligible && r.spam_status !== 'done';
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'spam_ok') {
        resultFilter = r => r.spam_eligible && r.spam_status !== 'done';
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'spam_no') {
        resultFilter = r => r.spam_not_eligible && r.spam_status !== 'done';
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'spam_done') {
        resultFilter = r => r.spam_status === 'done';
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'no_zalo') filtered = filtered.filter(t => t.status === 'no_result');
    if (filtered.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#9ca3af;font-size:15px;">
            ${_zlFilter !== 'all' ? 'Không có group nào trong bộ lọc này.' : (res.pool_empty ? '⚠️ Pool đã hết link. Vui lòng liên hệ quản lý để bơm thêm link.' : 'Chưa có công việc hôm nay.')}
        </div>`;
        return;
    }
    // Build table rows: each zalo result = 1 row, tasks without results get 1 row too
    let rows = [];
    filtered.forEach((t, i) => {
        const isNoResult = t.status === 'no_result';
        const shortFbUrl = t.pool_url.length > 40 ? t.pool_url.substring(0,40)+'...' : t.pool_url;
        if (t.results && t.results.length > 0) {
            // Sub-filter results if a result-level filter is active
            const displayResults = resultFilter ? t.results.filter(resultFilter) : t.results;
            if (displayResults.length === 0) return;
            displayResults.forEach((r, ri) => {
                const shortZalo = r.zalo_link.length > 35 ? r.zalo_link.substring(0,35)+'...' : r.zalo_link;
                const joinBtn = r.join_status
                    ? `<span style="font-size:11px;font-weight:600;color:#334155;">Đã Join</span>`
                    : `<button onclick="_zlToggleJoin(${r.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">❌ Chưa Join</button>`;
                const spamBtn = r.spam_status === 'done'
                    ? `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ Đã Spam</span>`
                    : r.spam_eligible
                        ? `<button onclick="_zlToggleSpamEligible(${r.id})" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🎯 Spam Được</button>`
                        : r.spam_not_eligible
                            ? `<button onclick="_zlSpamChoose(${r.id})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🚫 KHÔNG SPAM ĐƯỢC</button>`
                            : !r.join_status
                                ? `<span style="background:#f1f5f9;color:#9ca3af;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px dashed #d1d5db;" title="Cần ấn Đã Join trước">🔒 Cần Join trước</span>`
                                : r.pending_join
                                    ? `<button onclick="_zlSpamChoose(${r.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">⏳ Chưa tham gia được</button>`
                                    : `<button onclick="_zlSpamChoose(${r.id})" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Đánh dấu</button>`;
                const copyBtn = (text) => `<button onclick="navigator.clipboard.writeText('${text.replace(/'/g,"\\'")}');this.textContent='✅';setTimeout(()=>this.textContent='📋',1000)" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 3px;vertical-align:middle;" title="Copy">📋</button>`;
                rows.push(`<tr style="border-bottom:1px solid #e5e7eb;">
                    ${ri===0 ? `<td rowspan="${displayResults.length}" style="padding:10px 12px;font-size:13px;font-weight:800;color:#0f172a;vertical-align:top;border-right:1px solid #e5e7eb;white-space:nowrap;">${t.user_name || ''}</td>` : ''}
                    <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#334155;border-right:1px solid #e5e7eb;">${r.zalo_name || '—'}${r.zalo_name ? copyBtn(r.zalo_name) : ''}</td>
                    <td style="padding:8px 12px;"><a href="${r.zalo_link}" target="_blank" style="color:#0284c7;font-size:12px;text-decoration:none;font-weight:500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${shortZalo}</a>${copyBtn(r.zalo_link)}
                        ${currentUser.role === 'giam_doc' ? `<button onclick="_zlDelResult(${r.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:10px;padding:0 4px;vertical-align:middle;">🗑️</button>` : ''}</td>
                    ${ri===0 ? `<td rowspan="${displayResults.length}" style="padding:8px 12px;vertical-align:top;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;"><a href="${t.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;" onmouseover="this.style.color='#0284c7'" onmouseout="this.style.color='#6b7280'">${shortFbUrl}</a></td>` : ''}
                    <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151;">${r.member_count || '—'}</td>
                    <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">${joinBtn}</td>
                    <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">${spamBtn}</td>
                    ${(_zlFilter === 'spam_ok' || _zlFilter === 'spam_no' || _zlFilter === 'spam_done') ? `
                    <td style="padding:6px 8px;text-align:center;border-left:1px solid #e5e7eb;">${r.spam_image ? `<img src="${r.spam_image}" onclick="window.open('${r.spam_image}','_blank')" style="max-width:60px;max-height:45px;border-radius:6px;cursor:pointer;border:1px solid #e5e7eb;transition:transform .2s;" onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"/>` : '<span style="color:#9ca3af;font-size:10px;">—</span>'}</td>
                    <td style="padding:6px 8px;text-align:left;border-left:1px solid #e5e7eb;font-size:11px;color:#374151;max-width:180px;word-break:break-word;">${r.spam_reason || '<span style="color:#9ca3af;">—</span>'}</td>
                    ` : ''}
                    <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;font-size:10px;color:#6b7280;white-space:nowrap;">${r.marked_at ? new Date(r.marked_at).toLocaleDateString('vi-VN') + '<br>' + new Date(r.marked_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    ${(_zlFilter === 'spam_ok' || _zlFilter === 'spam_no' || _zlFilter === 'spam_done') ? `
                    <td style="padding:6px 8px;text-align:center;border-left:1px solid #e5e7eb;">${r.spam_screenshot ? `<img src="${r.spam_screenshot}" onclick="window.open('${r.spam_screenshot}','_blank')" style="max-width:60px;max-height:45px;border-radius:6px;cursor:pointer;border:1px solid #e5e7eb;" onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"/>` : '<span style="color:#9ca3af;font-size:10px;">—</span>'}</td>
                    ` : ''}
                </tr>`);
            });
        } else {
            const statusLabel = isNoResult
                ? '<span style="color:#92400e;font-size:11px;font-weight:600;">❌ Không tìm thấy</span>'
                : `<div style="display:flex;gap:4px;">
                    <button onclick="_zlAddResultModal(${t.id})" style="padding:4px 10px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-weight:700;font-size:10px;">➕ Thêm Zalo</button>
                    <button onclick="_zlNoResult(${t.id})" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#6b7280;cursor:pointer;font-weight:600;font-size:10px;">❌ K tìm thấy</button>
                  </div>`;
            rows.push(`<tr style="border-bottom:1px solid #e5e7eb;background:${isNoResult ? '#fef3c7' : '#f0f9ff'};">
                <td style="padding:10px 12px;font-size:13px;font-weight:800;color:#0f172a;border-right:1px solid #e5e7eb;white-space:nowrap;">${t.user_name || ''}</td>
                <td style="padding:8px 12px;font-size:12px;color:#9ca3af;" colspan="3">${statusLabel}
                    <a href="${t.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;margin-left:8px;">${shortFbUrl}</a></td>
                <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;font-size:10px;color:#6b7280;white-space:nowrap;">${t.updated_at ? new Date(t.updated_at).toLocaleDateString('vi-VN') + '<br>' + new Date(t.updated_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
            </tr>`);
        }
    });
    const showSpamCols = (_zlFilter === 'spam_ok' || _zlFilter === 'spam_no' || _zlFilter === 'spam_done');
    el.innerHTML = `<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',sans-serif;">
            <thead><tr style="background:linear-gradient(135deg,#0c4a6e,#0369a1);color:white;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;white-space:nowrap;">TÊN NHÂN VIÊN</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;white-space:nowrap;">TÊN NHÓM</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK NHÓM ZALO</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK GROUP</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">THÀNH VIÊN</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">JOIN NHÓM</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">SPAM ĐƯỢC HAY KHÔNG ?</th>
                ${showSpamCols ? '<th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">ẢNH NV</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">LÝ DO</th>' : ''}
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">TIME</th>
                ${showSpamCols ? '<th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">ẢNH QL</th>' : ''}
            </tr></thead>
            <tbody>${rows.join('')}</tbody>
        </table>
    </div>`;
}

// Add result modal — 4 column table: Link, Tên, Thành Viên, Đã Tham Gia
function _zlAddResultModal(taskId) {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    _zlLinkCount = 0;
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(750px,95vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:90vh;display:flex;flex-direction:column;">
        <div style="background:${_ZL_GRAD};padding:16px 24px;border-radius:16px 16px 0 0;color:white;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;font-family:'Segoe UI',sans-serif;">➕ Thêm nhóm Zalo</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1;">
            <div id="zlDupError"></div>
            <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',sans-serif;">
                <thead><tr style="background:linear-gradient(135deg,#0c4a6e,#0369a1);">
                    <th style="padding:10px 6px;font-size:11px;font-weight:700;color:white;text-align:center;width:36px;">STT</th>
                    <th style="padding:10px 8px;font-size:11px;font-weight:700;color:white;text-align:left;">LINK NHÓM ZALO</th>
                    <th style="padding:10px 4px;font-size:11px;font-weight:700;color:white;text-align:center;width:28px;">🔗</th>
                    <th style="padding:10px 8px;font-size:11px;font-weight:700;color:white;text-align:left;width:140px;">TÊN NHÓM</th>
                    <th style="padding:10px 8px;font-size:11px;font-weight:700;color:white;text-align:center;width:80px;">THÀNH VIÊN</th>
                    <th style="padding:10px 8px;font-size:11px;font-weight:700;color:white;text-align:center;width:80px;">ĐÃ THAM GIA</th>
                    <th style="width:28px;"></th>
                </tr></thead>
                <tbody id="zlLinkInputs"></tbody>
            </table>
            <button onclick="_zlAddLinkInput()" style="margin-top:8px;padding:6px 14px;border:1px dashed #93c5fd;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:12px;width:100%;">
                ➕ Thêm link Zalo
            </button>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
                <button onclick="_zlSubmitResult(${taskId})" style="padding:10px 20px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
    _zlAddLinkInput();
}

let _zlLinkCount = 0;
function _zlAddLinkInput() {
    const container = document.getElementById('zlLinkInputs');
    if (!container) return;
    const idx = _zlLinkCount++;
    const tr = document.createElement('tr');
    tr.className = 'zlRow';
    tr.style.cssText = 'border-bottom:1px solid #e5e7eb;';
    tr.innerHTML = `
        <td class="zlStt" style="padding:6px 4px;text-align:center;font-weight:800;font-size:13px;color:#0369a1;"></td>
        <td style="padding:6px 4px;"><input class="zlLink" data-idx="${idx}" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;box-sizing:border-box;" placeholder="https://zalo.me/g/..." oninput="_zlOnLinkInput(this)"></td>
        <td style="padding:6px 2px;text-align:center;"><a class="zlOpenLink" href="#" target="_blank" style="font-size:16px;text-decoration:none;opacity:0.3;pointer-events:none;" title="Click để tham gia nhóm">🔗</a></td>
        <td style="padding:6px 4px;"><input class="zlName" style="width:100%;padding:8px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;box-sizing:border-box;" placeholder="Tên nhóm..." disabled></td>
        <td style="padding:6px 4px;"><input class="zlMembers" type="number" min="0" max="999" style="width:100%;padding:8px 6px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;box-sizing:border-box;text-align:center;" placeholder="0" disabled oninput="if(this.value>999)this.value=999"></td>
        <td style="padding:6px 4px;text-align:center;"><input type="checkbox" class="zlJoined" style="width:18px;height:18px;cursor:pointer;" disabled title="Xác nhận đã tham gia nhóm"></td>
        <td style="padding:6px 2px;"><button onclick="this.closest('tr').remove();_zlUpdateStt()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;padding:2px;">🗑️</button></td>
    `;
    container.appendChild(tr);
    _zlUpdateStt();
    tr.querySelector('.zlLink')?.focus();
}
function _zlUpdateStt() {
    const rows = document.querySelectorAll('#zlLinkInputs .zlRow');
    rows.forEach((tr, i) => { const stt = tr.querySelector('.zlStt'); if (stt) stt.textContent = i + 1; });
}

let _zlFetchTimer = {};
function _zlOnLinkInput(input) {
    const tr = input.closest('tr');
    const link = input.value.trim();
    const openLink = tr.querySelector('.zlOpenLink');
    const nameInput = tr.querySelector('.zlName');
    const membersInput = tr.querySelector('.zlMembers');
    const joinedCb = tr.querySelector('.zlJoined');
    if (link.length > 10) {
        openLink.href = link;
        openLink.style.opacity = '1';
        openLink.style.pointerEvents = 'auto';
        nameInput.disabled = false;
        membersInput.disabled = false;
        joinedCb.disabled = false;
    } else {
        openLink.style.opacity = '0.3';
        openLink.style.pointerEvents = 'none';
        nameInput.disabled = true;
        membersInput.disabled = true;
        joinedCb.disabled = true;
    }
}

async function _zlSubmitResult(taskId) {
    const rows = document.querySelectorAll('#zlLinkInputs .zlRow');
    const items = [];
    let errors = [];
    rows.forEach((tr, idx) => {
        const sttNum = idx + 1;
        const link = tr.querySelector('.zlLink')?.value?.trim() || '';
        const name = tr.querySelector('.zlName')?.value?.trim() || '';
        const members = tr.querySelector('.zlMembers')?.value?.trim() || '';
        const joined = tr.querySelector('.zlJoined')?.checked || false;
        if (!link) return;
        if (!name) errors.push('STT ' + sttNum + ': Chưa nhập tên nhóm');
        if (!members || members === '0') errors.push('STT ' + sttNum + ': Chưa nhập số thành viên');
        if (!joined) errors.push('STT ' + sttNum + ': Chưa xác nhận đã tham gia');
        items.push({ link, name, members: parseInt(members) || 0, stt: sttNum });
    });
    if (items.length === 0) { showToast('Vui lòng nhập ít nhất 1 link nhóm Zalo!', 'error'); return; }
    if (errors.length > 0) { showToast('⚠️ ' + errors[0], 'error'); return; }
    const errDiv = document.getElementById('zlDupError');
    if (errDiv) errDiv.innerHTML = '';
    try {
        const res = await apiCall('/api/zalo-tasks/' + taskId + '/results-bulk', 'POST', { items });
        if (res.error && res.duplicateLinks) {
            const errDiv = document.getElementById('zlDupError');
            if (errDiv) {
                errDiv.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:10px;';
                const dupItems = res.duplicateLinks.map(d => {
                    const matchItem = items.find(it => it.link === d.link);
                    const sttLabel = matchItem ? 'STT ' + matchItem.stt + ': ' : '';
                    return `<div style="font-size:11px;color:#991b1b;padding:2px 0;">• ${sttLabel}${d.link.substring(0,40)}... <span style="color:#6b7280;">(đã nhập bởi ${d.owner})</span></div>`;
                }).join('');
                errDiv.innerHTML = `<div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:6px;">❌ Các link Zalo bị trùng — Xóa đi để lưu được:</div>${dupItems}`;
            }
            return;
        }
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        document.getElementById('zlModal')?.remove();
        showToast('✅ Đã thêm ' + (res.added || 0) + ' nhóm Zalo!');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlNoResult(taskId) {
    if (!confirm('Đánh dấu không tìm thấy nhóm Zalo cho link này?')) return;
    try {
        await apiCall('/api/zalo-tasks/' + taskId + '/no-result', 'POST');
        showToast('✅ Đã đánh dấu!');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlDelResult(resultId) {
    if (!confirm('Xóa kết quả này?')) return;
    try {
        await apiCall('/api/zalo-results/' + resultId, 'DELETE');
        showToast('✅ Đã xóa!');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlToggleSpamEligible(resultId) {
    try {
        const res = await apiCall('/api/zalo-results/' + resultId + '/spam-eligible', 'POST');
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        showToast(res.spam_eligible ? '🎯 Đã đánh dấu Spam Được!' : '↩️ Đã bỏ đánh dấu');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

function _zlSpamChoose(resultId) {
    let old = document.getElementById('zlSpamPopup');
    if (old) old.remove();
    const d = document.createElement('div'); d.id = 'zlSpamPopup';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(380px,90vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${_ZL_GRAD};padding:16px 20px;border-radius:16px 16px 0 0;color:white;">
            <div style="font-size:15px;font-weight:800;font-family:'Segoe UI',sans-serif;">Nhóm Zalo này spam được không?</div>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:10px;">
            <button onclick="_zlOpenSpamForm(${resultId},'yes')" style="padding:14px;border:2px solid #16a34a;border-radius:10px;background:#f0fdf4;color:#166534;cursor:pointer;font-weight:800;font-size:14px;font-family:'Segoe UI',sans-serif;transition:all .2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">🎯 Zalo Spam Được</button>
            <button onclick="_zlOpenSpamForm(${resultId},'no')" style="padding:14px;border:2px solid #dc2626;border-radius:10px;background:#fef2f2;color:#991b1b;cursor:pointer;font-weight:800;font-size:14px;font-family:'Segoe UI',sans-serif;transition:all .2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fef2f2'">🚫 KHÔNG SPAM ĐƯỢC</button>
            <button onclick="_zlSetPendingJoin(${resultId})" style="padding:14px;border:2px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#92400e;cursor:pointer;font-weight:800;font-size:14px;font-family:'Segoe UI',sans-serif;transition:all .2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'">⏳ CHƯА THAM GIA ĐƯỢC NHÓM</button>
            <button onclick="document.getElementById('zlSpamPopup').remove()" style="padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#6b7280;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
        </div>
    </div>`;
    document.body.appendChild(d);
}

function _zlOpenSpamForm(resultId, choice) {
    document.getElementById('zlSpamPopup')?.remove();
    let old = document.getElementById('zlSpamFormPopup');
    if (old) old.remove();
    const isYes = choice === 'yes';
    const title = isYes ? '🎯 Báo cáo: Zalo Spam Được' : '🚫 Báo cáo: KHÔNG SPAM ĐƯỢC';
    const accentColor = isYes ? '#16a34a' : '#dc2626';
    const bgColor = isYes ? '#f0fdf4' : '#fef2f2';
    const d = document.createElement('div'); d.id = 'zlSpamFormPopup';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(440px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${isYes ? 'linear-gradient(135deg,#16a34a,#059669)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};padding:16px 20px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:15px;font-weight:800;font-family:'Segoe UI',sans-serif;">${title}</div>
            <button onclick="document.getElementById('zlSpamFormPopup').remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;font-weight:700;">✕</button>
        </div>
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">
            <div>
                <label style="font-size:13px;font-weight:700;color:#334155;display:block;margin-bottom:6px;">📝 Lý do <span style="color:red;">*</span></label>
                <textarea id="zlSpamReason" rows="3" placeholder="${isYes ? 'VD: Nhóm hoạt động, có nhiều thành viên tương tác...' : 'VD: Nhóm bị khóa, không cho đăng bài...'}" style="width:100%;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:'Segoe UI',sans-serif;resize:vertical;box-sizing:border-box;transition:border .2s;" onfocus="this.style.borderColor='${accentColor}'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
            </div>
            <div>
                <label style="font-size:13px;font-weight:700;color:#334155;display:block;margin-bottom:6px;">📷 Hình ảnh minh chứng <span style="color:red;">*</span></label>
                <div id="zlSpamImgPreview" style="display:none;margin-bottom:8px;text-align:center;">
                    <img id="zlSpamImgTag" src="" style="max-width:100%;max-height:200px;border-radius:10px;border:2px solid ${accentColor};"/>
                </div>
                <div id="zlSpamPasteZone" style="width:100%;padding:16px 12px;border:2px dashed #cbd5e1;border-radius:10px;background:#f8fafc;color:#64748b;font-weight:700;font-size:13px;text-align:center;box-sizing:border-box;">
                    <div>📋 Dán ảnh bằng <strong style="color:#3b82f6;">Ctrl+V</strong></div>
                    <div style="font-size:11px;font-weight:500;color:#94a3b8;margin-top:4px;">Copy ảnh rồi nhấn Ctrl+V tại đây</div>
                </div>
            </div>
            <button onclick="_zlSubmitSpamForm(${resultId},'${choice}')" style="padding:14px;border:none;border-radius:10px;background:${isYes ? 'linear-gradient(135deg,#16a34a,#059669)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};color:white;cursor:pointer;font-weight:800;font-size:14px;font-family:'Segoe UI',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:all .2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">✅ Xác nhận báo cáo</button>
        </div>
    </div>`;
    document.body.appendChild(d);
    // Add paste listener for Ctrl+V
    d.addEventListener('paste', function(e) {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = function(ev) {
                    _zlSpamImgData = ev.target.result;
                    const imgTag = document.getElementById('zlSpamImgTag');
                    const preview = document.getElementById('zlSpamImgPreview');
                    const pasteZone = document.getElementById('zlSpamPasteZone');
                    if (imgTag) imgTag.src = _zlSpamImgData;
                    if (preview) preview.style.display = 'block';
                    if (pasteZone) {
                        pasteZone.innerHTML = '<div>✅ Đã dán ảnh — Nhấn để đổi</div><div style="font-size:11px;font-weight:500;color:#94a3b8;margin-top:4px;">hoặc <strong style="color:#3b82f6;">Ctrl+V</strong> để dán ảnh khác</div>';
                    }
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    // Make modal focusable for paste events
    d.setAttribute('tabindex', '-1');
    d.focus();
}

let _zlSpamImgData = null;

async function _zlSubmitSpamForm(resultId, choice) {
    const reason = document.getElementById('zlSpamReason')?.value?.trim();
    if (!reason) { showToast('❌ Vui lòng nhập lý do!', 'error'); return; }
    if (!_zlSpamImgData) { showToast('❌ Vui lòng chọn hình ảnh minh chứng!', 'error'); return; }
    try {
        const endpoint = choice === 'yes' ? '/api/zalo-results/' + resultId + '/spam-eligible' : '/api/zalo-results/' + resultId + '/spam-not-eligible';
        const res = await apiCall(endpoint, 'POST', { reason, image_data: _zlSpamImgData });
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        _zlSpamImgData = null;
        document.getElementById('zlSpamFormPopup')?.remove();
        showToast(choice === 'yes' ? '🎯 Đã đánh dấu Spam Được!' : '🚫 Đã đánh dấu KHÔNG SPAM ĐƯỢC!');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlSetPendingJoin(resultId) {
    document.getElementById('zlSpamPopup')?.remove();
    try {
        const res = await apiCall('/api/zalo-results/' + resultId + '/pending-join', 'POST');
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        showToast('⏳ Đã đánh dấu Chưa tham gia được nhóm!');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlToggleJoin(resultId) {
    try {
        const res = await apiCall('/api/zalo-results/' + resultId + '/join-status', 'POST');
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        showToast(res.join_status ? '✅ Đã Join nhóm!' : '↩️ Đã bỏ Join');
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

// Pool modal — simplified (no source dropdown)
function _zlPoolModal() {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    const userName = _zlCachedDepts.flatMap(d => d.members||[]).find(m => m.id == _zlViewUserId)?.full_name || '';
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(550px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${_ZL_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;">📥 Bơm Link cho ${userName}</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:20px 24px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Dán danh sách link (mỗi dòng 1 link):</label>
            <textarea id="zlPoolUrls" rows="10" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;margin-top:6px;box-sizing:border-box;resize:vertical;font-family:monospace;" placeholder="https://facebook.com/groups/123\nhttps://facebook.com/groups/456"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
                <button onclick="_zlPoolSubmit()" style="padding:10px 20px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;">📥 Bơm Link</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
}

async function _zlPoolSubmit() {
    const raw = document.getElementById('zlPoolUrls')?.value || '';
    const urls = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (urls.length === 0) { showToast('Vui lòng nhập ít nhất 1 link!', 'error'); return; }
    try {
        const res = await apiCall('/api/zalo-pool/bulk', 'POST', { urls, user_id: _zlViewUserId });
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        document.getElementById('zlModal')?.remove();
        let msg = `✅ Đã bơm ${res.added || 0} link!`;
        if (res.duplicates > 0) msg += ` (${res.duplicates} trùng)`;
        if (res.errors > 0) msg += ` (${res.errors} lỗi)`;
        showToast(msg, res.added > 0 ? 'success' : 'warning');
        if (res.dupUrls && res.dupUrls.length > 0) {
            setTimeout(() => alert('Link bị trùng:\\n' + res.dupUrls.join('\\n')), 300);
        }
        _zlLoadTasks();
    } catch(e) { showToast(e.message || 'Lỗi kết nối', 'error'); }
}

// "Các Nhóm Có Zalo" — show only tasks with zalo results, grouped by employee
async function _zpZaloGroupsView() {
    let old = document.getElementById('zlModal'); if (old) old.remove();
    try {
        const res = await apiCall('/api/zalo-tasks/team?date=all');
        const tasks = (res.tasks||[]).filter(t => t.results && t.results.length > 0);
        // Group by user
        const byUser = {};
        tasks.forEach(t => {
            if (!byUser[t.user_id]) byUser[t.user_id] = { name: t.user_name||t.username, dept: t.dept_name||'', tasks: [] };
            byUser[t.user_id].tasks.push(t);
        });
        const d = document.createElement('div'); d.id = 'zlModal';
        d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        let bodyH = '';
        if (Object.keys(byUser).length === 0) {
            bodyH = '<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có nhóm Zalo nào được tìm thấy.</div>';
        } else {
            Object.entries(byUser).forEach(([uid, data]) => {
                const totalR = data.tasks.reduce((s,t) => s+(t.results?.length||0), 0);
                const spamDone = data.tasks.reduce((s,t) => s+(t.results?.filter(r=>r.spam_status==='done').length||0), 0);
                bodyH += `<div style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                    <div style="background:#f8fafc;padding:10px 14px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;">
                        <div style="width:28px;height:28px;border-radius:50%;background:${_ZP_GRAD};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${(data.name||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
                        ${data.name} <span style="font-size:11px;color:#6b7280;font-weight:500;">${data.dept} • ${totalR} nhóm • ${spamDone} đã spam</span>
                    </div>`;
                data.tasks.forEach(t => {
                    t.results.forEach(r => {
                        const done = r.spam_status==='done';
                        bodyH += `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #f3f4f6;font-size:12px;background:${done?'#f0fdf4':'white'};">
                            <span style="font-weight:600;color:#1e293b;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.zalo_name}</span>
                            <a href="${r.zalo_link}" target="_blank" style="color:#6b7280;text-decoration:none;font-size:11px;flex:1;">${r.zalo_link.length>40?r.zalo_link.substring(0,40)+'...':r.zalo_link}</a>
                            ${done ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">✅ Đã Spam</span>` 
                                   : `<button onclick="_zpSpamModal(${r.id},'${(r.zalo_name||'').replace(/'/g,"\\'")}','${(r.zalo_link||'').replace(/'/g,"\\'")}')" style="padding:3px 10px;border:none;border-radius:5px;background:#dc2626;color:white;cursor:pointer;font-weight:700;font-size:10px;">📸 Spam</button>`}
                        </div>`;
                    });
                });
                bodyH += '</div>';
            });
        }
        d.innerHTML = `
        <div style="background:white;border-radius:16px;width:min(750px,95vw);max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);display:flex;flex-direction:column;">
            <div style="background:${_ZP_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;flex-shrink:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:16px;font-weight:800;">📊 Các Nhóm Có Zalo</div>
                    <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
                </div>
            </div>
            <div style="overflow-y:auto;flex:1;padding:16px;">${bodyH}</div>
        </div>`;
        document.body.appendChild(d);
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

// Source settings modal
async function _zpSourceSettings() {
    let old = document.getElementById('zlModal'); if (old) old.remove();
    try {
        const res = await apiCall('/api/zalo-sources');
        const sources = res.sources || [];
        const d = document.createElement('div'); d.id = 'zlModal';
        d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        let rows = sources.map((s,i) => `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 10px;text-align:center;font-size:20px;">${s.icon}</td>
            <td style="padding:8px 10px;font-weight:600;font-size:13px;">${s.name}</td>
            <td style="padding:8px 10px;text-align:center;">
                <button onclick="_zpEditSource(${s.id},'${s.name.replace(/'/g,"\\'")}','${s.icon}')" style="background:#f0f9ff;color:#0284c7;border:1px solid #bae6fd;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">✏️</button>
                <button onclick="_zpDelSource(${s.id})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;">🗑️</button>
            </td>
        </tr>`).join('');
        d.innerHTML = `
        <div style="background:white;border-radius:16px;width:min(550px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
            <div style="background:linear-gradient(135deg,#059669,#047857);padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:16px;font-weight:800;">⚙️ Cài Đặt Nguồn Group</div>
                    <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
                </div>
            </div>
            <div style="padding:16px 20px;max-height:400px;overflow-y:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                        <th style="padding:8px;width:50px;">Icon</th><th style="padding:8px;text-align:left;">Tên Nguồn</th><th style="padding:8px;width:80px;"></th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;">
                <input id="zpNewSrcIcon" value="📂" style="width:40px;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:16px;text-align:center;">
                <input id="zpNewSrcName" placeholder="Tên nguồn mới..." style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                <button onclick="_zpAddSource()" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;cursor:pointer;font-weight:700;font-size:13px;">Thêm</button>
            </div>
        </div>`;
        document.body.appendChild(d);
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

async function _zpAddSource() {
    const name = document.getElementById('zpNewSrcName')?.value?.trim();
    const icon = document.getElementById('zpNewSrcIcon')?.value?.trim() || '📂';
    if (!name) { showToast('Nhập tên nguồn!','error'); return; }
    try { await apiCall('/api/zalo-sources','POST',{name,icon}); showToast('✅ Đã thêm nguồn!'); _zpSwitchTab('settings'); } catch(e) { showToast(e.message||'Lỗi','error'); }
}
async function _zpEditSource(id, oldName, oldIcon) {
    const name = prompt('Tên nguồn:', oldName); if (!name) return;
    const icon = prompt('Icon:', oldIcon) || '📂';
    try { await apiCall('/api/zalo-sources/'+id,'PUT',{name,icon}); showToast('✅ Đã cập nhật!'); _zpSwitchTab('settings'); } catch(e) { showToast(e.message||'Lỗi','error'); }
}
async function _zpDelSource(id) {
    if (!confirm('Xóa nguồn này?')) return;
    try { await apiCall('/api/zalo-sources/'+id,'DELETE'); showToast('✅ Đã xóa!'); _zpSwitchTab('settings'); } catch(e) { showToast(e.message||'Lỗi','error'); }
}


async function _zlPoolDel(id) {
    if (!confirm('Xóa link này khỏi pool?')) return;
    try { await apiCall('/api/zalo-pool/' + id, 'DELETE'); showToast('✅ Đã xóa!'); } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

// ========== NHÓM SPAM ZALO — MANAGEMENT PAGE ==========
const _ZP_GRAD = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
let _zpCurUser = null, _zpCurDept = null, _zpCachedDepts = [], _zpAllResults = [];
let _zpFilter = 'pending_spam', _zpDateFilter = 'all', _zpCustomFrom = '', _zpCustomTo = '';

function _zpInit() {
    const area = document.getElementById('contentArea');
    if (!area) return;
    document.getElementById('pageTitle').textContent = 'Nhóm Spam Zalo';
    area.innerHTML = `
    <div style="padding:0;">
        <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
            <div id="zpSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
            <div style="flex:1;padding:20px 24px;overflow-y:auto;background:#f1f5f9;">
                <div id="zpStats" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;"></div>
                <div id="zpDateBar" style="margin-bottom:14px;"></div>
                <div id="zpToolbar" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px;"></div>
                <div id="zpProgress" style="margin-bottom:16px;"></div>
                <div id="zpTaskList">⏳ Đang tải...</div>
            </div>
        </div>
    </div>`;
    _zpLoadSidebar();
    _zpRenderDateBar();
    _zpLoadData();
    _zpLoadLockTaskStatus();
}

function _zpSelAll() { _zpCurUser = null; _zpCurDept = null; _zpRenderSidebar(); _zpLoadData(); }
function _zpSelDept(id) { _zpCurDept = id; _zpCurUser = null; _zpRenderSidebar(); _zpLoadData(); }
function _zpSelUser(id) { _zpCurUser = id; _zpCurDept = null; _zpRenderSidebar(); _zpLoadData(); }
function _zpSetFilter(f) { _zpFilter = f; _zpRenderToolbar(); _zpRenderTable(); }

async function _zpLoadSidebar() {
    try { const res = await apiCall('/api/dailylinks/members'); _zpCachedDepts = res.departments || []; _zpRenderSidebar(); } catch(e) { console.error(e); }
}

function _zpRenderSidebar() {
    const sb = document.getElementById('zpSidebar'); if (!sb) return;
    const isAll = !_zpCurUser && !_zpCurDept;
    let h = `<div style="margin-bottom:12px;"><div onclick="_zpSelAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;background:${isAll?_ZP_GRAD:'#eef2ff'};color:${isAll?'white':'#4338ca'};box-shadow:${isAll?'0 3px 12px rgba(124,58,237,0.3)':'none'};">📊 Tất cả nhân viên</div></div><div style="height:1px;background:linear-gradient(to right,transparent,#e2e8f0,transparent);margin:10px 0;"></div>`;
    (_zpCachedDepts||[]).forEach(d => {
        const isDeptSel = _zpCurDept==d.id && !_zpCurUser;
        h += `<div style="margin-bottom:6px;"><div onclick="_zpSelDept(${d.id})" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;background:${isDeptSel?_ZP_GRAD:'#f1f5f9'};color:${isDeptSel?'white':'#334155'};border:1px solid ${isDeptSel?'transparent':'#e2e8f0'};">🏢 ${d.name} <span style="font-size:10px;opacity:0.6;">(${d.members?.length||0})</span></div>`;
        (d.members||[]).forEach(m => {
            const isSel = _zpCurUser == m.id;
            const ini = (m.full_name||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            h += `<div onclick="_zpSelUser(${m.id})" style="padding:6px 10px 6px 22px;cursor:pointer;display:flex;align-items:center;gap:8px;border-radius:6px;margin:2px 0;background:${isSel?_ZP_GRAD:'transparent'};color:${isSel?'white':'#475569'};" onmouseover="if(!${isSel})this.style.background='#eef2ff'" onmouseout="if(!${isSel})this.style.background='transparent'"><div style="width:24px;height:24px;border-radius:50%;background:${isSel?'rgba(255,255,255,0.25)':'#e2e8f0'};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:${isSel?'white':'#64748b'};">${ini}</div><span style="font-size:12px;font-weight:${isSel?'700':'500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name}</span></div>`;
        }); h += '</div>';
    }); sb.innerHTML = h;
}

function _zpRenderDateBar() {
    const el = document.getElementById('zpDateBar'); if (!el) return;
    const opts = [['today','Hôm nay'],['yesterday','Hôm qua'],['7days','7 ngày'],['month','Tháng này'],['prev_month','Tháng trước'],['all','Tất cả'],['custom','Tùy chọn']];
    let h = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
    opts.forEach(([v,l]) => { const a = _zpDateFilter===v; h += `<button onclick="_zpDateFilter='${v}';_zpRenderDateBar();_zpLoadData()" style="padding:6px 14px;border:1px solid ${a?'#7c3aed':'#d1d5db'};border-radius:8px;background:${a?_ZP_GRAD:'white'};color:${a?'white':'#6b7280'};cursor:pointer;font-weight:700;font-size:11px;">${l}</button>`; });
    if (_zpDateFilter==='custom') { h += ` <input type="date" value="${_zpCustomFrom}" onchange="_zpCustomFrom=this.value;_zpLoadData()" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;"> <input type="date" value="${_zpCustomTo}" onchange="_zpCustomTo=this.value;_zpLoadData()" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;">`; }
    el.innerHTML = h + '</div>';
}

function _zpGetDateParams() {
    const today = _vnTodayFE(), d = new Date(Date.now()+7*3600000);
    switch(_zpDateFilter) {
        case 'today': return {date:today};
        case 'yesterday': { const y=new Date(d); y.setDate(y.getDate()-1); return {date:y.toISOString().split('T')[0]}; }
        case '7days': { const f=new Date(d); f.setDate(f.getDate()-6); return {date_from:f.toISOString().split('T')[0],date_to:today}; }
        case 'month': { return {date_from:new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0],date_to:today}; }
        case 'prev_month': { const f=new Date(d.getFullYear(),d.getMonth()-1,1),t=new Date(d.getFullYear(),d.getMonth(),0); return {date_from:f.toISOString().split('T')[0],date_to:t.toISOString().split('T')[0]}; }
        case 'all': return {date:'all'};
        case 'custom': return (_zpCustomFrom&&_zpCustomTo)?{date_from:_zpCustomFrom,date_to:_zpCustomTo}:{date:'all'};
        default: return {date:'all'};
    }
}

async function _zpLoadData() {
    try {
        const dp = _zpGetDateParams();
        let url = '/api/zalo-tasks/team?';
        url += (dp.date_from&&dp.date_to) ? 'date_from='+dp.date_from+'&date_to='+dp.date_to : 'date='+(dp.date||_vnTodayFE());
        if (_zpCurUser) url += '&user_id='+_zpCurUser;
        else if (_zpCurDept) url += '&dept_id='+_zpCurDept;
        const res = await apiCall(url);
        _zpAllResults = [];
        (res.tasks||[]).forEach(t => { (t.results||[]).forEach(r => {
            if (r.spam_eligible || r.spam_status==='done' || !r.join_status) _zpAllResults.push({...r, user_id:t.user_id, user_name:t.user_name||t.username, pool_url:t.pool_url||''});
        }); });
        _zpRenderStats(); _zpRenderToolbar(); _zpRenderProgress(); _zpRenderTable();
    } catch(e) { console.error(e); const el=document.getElementById('zpTaskList'); if(el) el.innerHTML=`<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`; }
}

function _zpRenderStats() {
    const el = document.getElementById('zpStats'); if (!el) return;
    if (!document.getElementById('zlSparkleCSS')) { const s=document.createElement('style'); s.id='zlSparkleCSS'; s.textContent=`@keyframes zlSparkle{0%,100%{box-shadow:0 0 8px rgba(255,255,255,0.3),0 4px 15px rgba(0,0,0,0.15)}50%{box-shadow:0 0 20px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.2)}}`; document.head.appendChild(s); }
    const chua=_zpAllResults.filter(r=>r.spam_eligible&&r.spam_status!=='done').length, da=_zpAllResults.filter(r=>r.spam_status==='done').length;
    el.innerHTML = `<div onclick="_zpSetFilter('pending_spam')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#ef4444,#b91c1c);border-radius:14px;padding:18px 20px;color:white;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"><div style="font-size:28px;margin-bottom:4px;">🔥</div><div style="font-size:32px;font-weight:900;">${chua}</div><div style="font-size:13px;font-weight:800;margin-top:4px;opacity:0.95;">QL CHƯA SPAM</div></div>
    <div onclick="_zpSetFilter('done_spam')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;padding:18px 20px;color:white;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite .5s;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"><div style="font-size:28px;margin-bottom:4px;">📣</div><div style="font-size:32px;font-weight:900;">${da}</div><div style="font-size:13px;font-weight:800;margin-top:4px;opacity:0.95;">QL ĐÃ SPAM</div></div>`;
}

function _zpRenderToolbar() {
    const tb = document.getElementById('zpToolbar'); if (!tb) return;
    const chua=_zpAllResults.filter(r=>r.spam_eligible&&r.spam_status!=='done'&&r.spam_status!=='marked').length;
    const marked=_zpAllResults.filter(r=>r.spam_status==='marked').length;
    const da=_zpAllResults.filter(r=>r.spam_status==='done').length;
    const nj=_zpAllResults.filter(r=>!r.join_status&&!r.spam_eligible&&r.spam_status!=='done').length;
    const btn=(f,l,ic,c,bc,tc)=>{ const a=_zpFilter===f; return `<button onclick="_zpSetFilter('${f}')" style="padding:6px 14px;border:2px solid ${a?(bc||'#7c3aed'):'#d1d5db'};border-radius:8px;background:${a?(tc||'#ede9fe'):'white'};color:${a?(bc||'#7c3aed'):'#6b7280'};cursor:pointer;font-weight:700;font-size:11px;">${ic} ${l} (${c})</button>`; };
    let html = btn('pending_spam','QL Chưa Spam','🔥',chua+marked)+btn('done_spam','QL Đã Spam','📣',da)+btn('not_joined','Chưa tham gia nhóm','❌',nj,'#d97706','#fef3c7');
    if (marked > 0) {
        html += `<button onclick="_zpBulkConfirmModal()" style="padding:8px 18px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:800;font-size:12px;box-shadow:0 3px 10px rgba(22,163,74,0.3);margin-left:8px;animation:zlSparkle 1.5s ease-in-out infinite;">📸 Xác nhận đã Spam (${marked} nhóm)</button>`;
    }
    tb.innerHTML = html;
}

function _zpRenderProgress() {
    const el = document.getElementById('zpProgress'); if (!el) return;
    const chua=_zpAllResults.filter(r=>r.spam_eligible&&r.spam_status!=='done').length, da=_zpAllResults.filter(r=>r.spam_status==='done').length;
    const total=chua+da, pct=total>0?Math.min(100,Math.round(da/total*100)):0;
    el.innerHTML = `<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:700;font-size:15px;color:#1e293b;">📣 Đã spam: <span style="color:#7c3aed;">${da}/${total}</span> nhóm</span><span style="font-size:13px;font-weight:700;color:${pct>=100?'#16a34a':'#f59e0b'};">${pct}%</span></div><div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${_ZP_GRAD};border-radius:4px;transition:width .5s;"></div></div></div>`;
}

function _zpRenderTable() {
    const el = document.getElementById('zpTaskList'); if (!el) return;
    let f = _zpFilter==='done_spam' ? _zpAllResults.filter(r=>r.spam_status==='done') : _zpFilter==='not_joined' ? _zpAllResults.filter(r=>!r.join_status&&!r.spam_eligible&&r.spam_status!=='done') : _zpAllResults.filter(r=>r.spam_eligible&&r.spam_status!=='done');
    if (!f.length) { el.innerHTML='<div style="text-align:center;padding:60px;color:#9ca3af;">Không có nhóm nào.</div>'; return; }
    const cp=(t)=>`<button onclick="navigator.clipboard.writeText('${t.replace(/'/g,"\\\\\\\\'")}');this.textContent='✅';setTimeout(()=>this.textContent='📋',1000)" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 3px;" title="Copy">📋</button>`;
    let rows=f.map((r,i)=>{
        const sz=r.zalo_link.length>35?r.zalo_link.substring(0,35)+'...':r.zalo_link;
        const sf=r.pool_url.length>40?r.pool_url.substring(0,40)+'...':r.pool_url;
        let sc;
        if (r.spam_status==='done') {
            sc=`<span style="font-size:11px;font-weight:700;color:#166534;">✅ Đã Spam</span>`;
        } else if (!r.join_status) {
            sc=`<span style="background:#f1f5f9;color:#9ca3af;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px dashed #d1d5db;">🔒 Cần Join trước</span>`;
        } else if (r.spam_status==='marked') {
            sc=`<button onclick="_zpToggleMark(${r.id})" style="padding:5px 14px;border:2px solid #16a34a;border-radius:6px;background:#f0fdf4;color:#16a34a;cursor:pointer;font-weight:700;font-size:11px;">✅ Đã đánh dấu</button>`;
        } else {
            sc=`<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;"><button onclick="_zpToggleMark(${r.id})" style="padding:4px 10px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;font-size:10px;" title="Đánh dấu đã spam">✅ Đã Spam</button><button onclick="_zpResetToGroupCoZalo(${r.id})" style="padding:4px 10px;border:none;border-radius:6px;background:#d97706;color:white;cursor:pointer;font-weight:700;font-size:10px;" title="Chưa join nhóm">❌ Chưa Join</button></div>`;
        }
        return `<tr style="border-bottom:1px solid #e5e7eb;background:${r.spam_status==='marked'?'#f0fdf4':i%2===0?'white':'#f9fafb'};">
        <td style="padding:8px 12px;font-size:13px;font-weight:800;color:#0f172a;">${r.user_name||''}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#334155;">${r.zalo_name||'—'}${r.zalo_name?cp(r.zalo_name):''}</td>
        <td style="padding:8px 12px;"><a href="${r.zalo_link}" target="_blank" style="color:#0284c7;font-size:12px;text-decoration:none;">${sz}</a>${cp(r.zalo_link)}</td>
        <td style="padding:8px 12px;"><a href="${r.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;">${sf}</a></td>
        <td style="padding:8px;text-align:center;font-size:12px;font-weight:600;">${r.member_count||'—'}</td>
        <td style="padding:8px;text-align:center;font-size:11px;color:#334155;">${r.join_status?'<span style="font-weight:600;color:#166534;">Đã Join</span>':'<span style="font-weight:700;color:#dc2626;">❌ Chưa Join</span>'}</td>
        <td style="padding:8px;text-align:center;">${sc}</td>
        <td style="padding:6px;text-align:center;">${r.spam_image?`<img src="${r.spam_image}" onclick="window.open('${r.spam_image}','_blank')" style="max-width:60px;max-height:45px;border-radius:6px;cursor:pointer;"/>`:'<span style="color:#9ca3af;font-size:10px;">—</span>'}</td>
        <td style="padding:6px 8px;font-size:11px;color:#374151;max-width:180px;word-break:break-word;">${r.spam_reason||'<span style="color:#9ca3af;">—</span>'}</td>
        <td style="padding:8px;text-align:center;font-size:10px;color:#6b7280;white-space:nowrap;">${r.marked_at?new Date(r.marked_at).toLocaleDateString('vi-VN')+'<br>'+new Date(r.marked_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'—'}</td>
        <td style="padding:6px;text-align:center;">${r.spam_screenshot?`<img src="${r.spam_screenshot}" onclick="window.open('${r.spam_screenshot}','_blank')" style="max-width:60px;max-height:45px;border-radius:6px;cursor:pointer;border:1px solid #e5e7eb;" onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"/>`:r.spam_status==='marked'?'<span style="color:#f59e0b;font-size:10px;font-weight:700;">⏳ Chờ ảnh</span>':'<span style="color:#9ca3af;font-size:10px;">—</span>'}</td></tr>`;
    }).join('');
    el.innerHTML=`<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:${_ZP_GRAD};color:white;"><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">TÊN NV</th><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">TÊN NHÓM</th><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK ZALO</th><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK GROUP</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">TV</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">JOIN</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">SPAM</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">ẢNH NV</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">LÝ DO</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">TIME</th><th style="padding:10px;text-align:center;font-size:11px;font-weight:700;">ẢNH QL</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Step 1: Toggle mark/unmark a result
async function _zpToggleMark(resultId) {
    try {
        const res = await apiCall('/api/zalo-results/'+resultId+'/mark-spam', 'POST');
        if (res.marked) { showToast('✅ Đã đánh dấu spam!'); }
        else { showToast('↩️ Đã bỏ đánh dấu'); }
        _zpLoadData();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

// Step 2: Bulk confirm modal — 1 image for all marked results
let _zpBulkImg = null;
function _zpBulkConfirmModal() {
    _zpBulkImg = null;
    const marked = _zpAllResults.filter(r=>r.spam_status==='marked');
    if (!marked.length) { showToast('Chưa có nhóm nào được đánh dấu!','error'); return; }
    let old=document.getElementById('zlModal'); if(old) old.remove();
    const names = marked.map(r=>'• '+(r.zalo_name||r.zalo_link.substring(0,30))+' ('+r.user_name+')').join('\n');
    const d=document.createElement('div'); d.id='zlModal'; d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML='<div style="background:white;border-radius:16px;width:min(500px,92vw);" tabindex="-1">'
        +'<div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:16px 20px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">'
        +'<div style="font-size:15px;font-weight:800;">📸 Xác nhận đã Spam — '+marked.length+' nhóm</div>'
        +'<button onclick="document.getElementById(\'zlModal\').remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;">✕</button>'
        +'</div>'
        +'<div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">'
        +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;max-height:120px;overflow-y:auto;font-size:12px;color:#166534;font-weight:600;white-space:pre-line;">'+marked.length+' nhóm sẽ được xác nhận:\n'+names+'</div>'
        +'<div><label style="font-size:13px;font-weight:700;color:#334155;">📝 Lý do</label>'
        +'<textarea id="zpBulkReason" rows="2" placeholder="VD: Đã spam thành công tất cả nhóm..." style="width:100%;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-top:6px;"></textarea></div>'
        +'<div><label style="font-size:13px;font-weight:700;color:#334155;">📷 Ảnh chụp chung <span style="color:red;">*</span></label>'
        +'<div id="zpBulkImgPre" style="display:none;margin:8px 0;text-align:center;"><img id="zpBulkImgTag" src="" style="max-width:100%;max-height:200px;border-radius:10px;border:2px solid #16a34a;"/></div>'
        +'<div id="zpBulkPasteZone" style="width:100%;padding:16px;border:2px dashed #cbd5e1;border-radius:10px;background:#f8fafc;text-align:center;font-weight:700;font-size:13px;color:#64748b;box-sizing:border-box;margin-top:6px;">'
        +'<div>📋 Dán ảnh bằng <strong style="color:#3b82f6;">Ctrl+V</strong></div>'
        +'<div style="font-size:11px;color:#94a3b8;margin-top:4px;">1 ảnh chung cho tất cả '+marked.length+' nhóm</div></div></div>'
        +'<button onclick="_zpBulkConfirmSubmit()" style="padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:800;font-size:14px;">✅ Xác nhận '+marked.length+' nhóm đã Spam</button>'
        +'</div></div>';
    document.body.appendChild(d);
    d.addEventListener('paste',function(e){ const items=e.clipboardData?.items; if(!items) return; for(let i=0;i<items.length;i++){ if(items[i].type.startsWith('image/')){ e.preventDefault(); const reader=new FileReader(); reader.onload=function(ev){ _zpBulkImg=ev.target.result; const tag=document.getElementById('zpBulkImgTag'),pre=document.getElementById('zpBulkImgPre'),z=document.getElementById('zpBulkPasteZone'); if(tag)tag.src=_zpBulkImg; if(pre)pre.style.display='block'; if(z)z.innerHTML='<div>✅ Đã dán ảnh — Ctrl+V để đổi</div>'; }; reader.readAsDataURL(items[i].getAsFile()); break; } } });
    d.setAttribute('tabindex','-1'); d.focus();
}

async function _zpBulkConfirmSubmit() {
    const reason = document.getElementById('zpBulkReason')?.value?.trim() || '';
    if (!_zpBulkImg) { showToast('Vui lòng dán ảnh chụp (Ctrl+V)!','error'); return; }
    const marked = _zpAllResults.filter(r=>r.spam_status==='marked');
    if (!marked.length) { showToast('Không có nhóm nào!','error'); return; }
    try {
        await apiCall('/api/zalo-results/bulk-confirm-spam', 'POST', {
            result_ids: marked.map(r=>r.id),
            image_data: _zpBulkImg,
            reason: reason || null
        });
        document.getElementById('zlModal')?.remove();
        showToast('✅ Đã xác nhận '+marked.length+' nhóm spam thành công!');
        _zpLoadData();
        _zpCheckAutoComplete();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

async function _zpResetToGroupCoZalo(resultId) {
    if(!confirm('Xác nhận đánh dấu nhóm này "Chưa tham gia"?\nNhóm sẽ trả về Group Có Zalo để NV join lại.')) return;
    try{
        const res = await apiCall('/api/zalo-results/'+resultId+'/reset-to-group','POST',{});
        if(res.error){showToast(res.error,'error');return;}
        showToast('✅ Đã đánh dấu Chưa tham gia nhóm!'); _zpLoadData();
    }catch(e){showToast(e.message||'Lỗi','error');}
}

// Init is triggered by handleRoute switch case in app.js

// ========== AUTO-COMPLETE CHECK for Setup Spam Zalo lock task ==========
async function _zpCheckAutoComplete() {
    try {
        const res = await apiCall('/api/zalo-spam/check-completion');
        if (res.has_task && res.remaining === 0 && res.completed) {
            // Show success banner
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#16a34a,#059669);color:white;padding:18px 32px;border-radius:16px;box-shadow:0 10px 40px rgba(22,163,74,0.4);z-index:99999;animation:_zpSlideIn .4s ease;font-family:Segoe UI,sans-serif;text-align:center;min-width:320px;';
            banner.innerHTML = '<div style="font-size:28px;margin-bottom:6px;">✅</div><div style="font-size:16px;font-weight:800;">CV Khóa hoàn thành!</div><div style="font-size:13px;opacity:0.9;margin-top:4px;">Đã spam hết tất cả nhóm — CV \"Setup Spam Zalo\" tự động hoàn thành</div>';
            document.body.appendChild(banner);
            if (!document.getElementById('_zpSlideCSS')) {
                const st = document.createElement('style'); st.id = '_zpSlideCSS';
                st.textContent = '@keyframes _zpSlideIn{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
                document.head.appendChild(st);
            }
            setTimeout(() => { banner.style.transition='opacity .5s'; banner.style.opacity='0'; setTimeout(()=>banner.remove(), 500); }, 4000);
        }
    } catch(e) { console.error('[ZaloSpam] Auto-complete check error:', e); }
}

// ========== LOCK TASK STATUS BANNER ==========
async function _zpLoadLockTaskStatus() {
    try {
        const res = await apiCall('/api/zalo-spam/check-completion');
        if (!res.has_task) return;
        const el = document.getElementById('zpStats');
        if (!el) return;
        const remaining = res.remaining;
        const completed = res.completed;
        const overdue = res.overdue_days || [];
        const totalPenalty = res.total_penalty || 0;
        let statusHtml = '';

        if (completed && overdue.length === 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">✅</span><div><div style="font-size:14px;font-weight:800;color:#166534;">CV Khóa đã hoàn thành!</div><div style="font-size:11px;color:#15803d;font-weight:600;">Setup Spam Zalo Cho NV — Tự động hoàn thành</div></div></div>';
        } else if (completed && overdue.length > 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">✅</span><div><div style="font-size:14px;font-weight:800;color:#166534;">CV Khóa hoàn thành hôm nay — Dừng phạt</div><div style="font-size:11px;color:#dc2626;font-weight:600;">⚠️ Tổng phạt tích lũy: ' + totalPenalty.toLocaleString() + 'đ (' + overdue.length + ' ngày)</div></div></div>';
        } else if (remaining > 0 && overdue.length > 0) {
            const dateList = overdue.map(d => { const dd = new Date(d.date + "T00:00:00"); return dd.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"}); }).join(' · ');
            statusHtml = '<div style="width:100%;padding:14px 18px;background:linear-gradient(135deg,#fef2f2,#fff5f5);border:2px solid #fca5a5;border-radius:12px;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="font-size:24px;">⚠️</span><div><div style="font-size:15px;font-weight:800;color:#991b1b;">CV Khóa quá hạn ' + overdue.length + ' ngày — Tổng phạt: ' + totalPenalty.toLocaleString() + 'đ</div></div></div><div style="font-size:11px;color:#dc2626;font-weight:600;padding-left:34px;margin-bottom:6px;">' + dateList + '</div><div style="font-size:11px;color:#7f1d1d;padding-left:34px;">Còn ' + remaining + ' nhóm chưa spam. Spam hết để hoàn thành CV hôm nay và dừng phạt thêm!</div></div>';
        } else if (remaining > 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#fef2f2,#fff5f5);border:2px solid #fca5a5;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">🔥</span><div><div style="font-size:14px;font-weight:800;color:#991b1b;">CV Khóa: Còn ' + remaining + ' nhóm chưa spam</div><div style="font-size:11px;color:#dc2626;font-weight:600;">Spam hết trong 🔥 QL Chưa Spam để tự động hoàn thành và không bị phạt 50,000đ</div></div></div>';
        }

        if (statusHtml) {
            el.insertAdjacentHTML('beforeend', statusHtml);
        }
    } catch(e) { console.error('[ZaloSpam] Lock task status error:', e); }
}

// ========== LOCK TASK STATUS BANNER FOR "Tìm Gr Zalo Và Join" ==========
async function _zlLoadLockTaskStatus() {
    try {
        const res = await apiCall('/api/zalo-group/check-completion');
        if (!res.has_task) return;
        const el = document.getElementById('zlLockBanner');
        if (!el) return;
        const remaining = res.remaining;
        const completed = res.completed;
        const overdue = res.overdue_days || [];
        const totalPenalty = res.total_penalty || 0;
        let statusHtml = '';

        if (completed && overdue.length === 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">\u2705</span><div><div style="font-size:14px;font-weight:800;color:#166534;">CV Kh\u00f3a \u0111\u00e3 ho\u00e0n th\u00e0nh!</div><div style="font-size:11px;color:#15803d;font-weight:600;">Th\u00f4ng B\u00e1o Gr Zalo Spam \u0110\u01b0\u1ee3c \u2014 T\u1ef1 \u0111\u1ed9ng ho\u00e0n th\u00e0nh</div></div></div>';
        } else if (completed && overdue.length > 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:2px solid #86efac;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">\u2705</span><div><div style="font-size:14px;font-weight:800;color:#166534;">CV Kh\u00f3a ho\u00e0n th\u00e0nh h\u00f4m nay \u2014 D\u1eebng ph\u1ea1t</div><div style="font-size:11px;color:#dc2626;font-weight:600;">\u26a0\ufe0f T\u1ed5ng ph\u1ea1t t\u00edch l\u0169y: ' + totalPenalty.toLocaleString() + '\u0111 (' + overdue.length + ' ng\u00e0y)</div></div></div>';
        } else if (remaining > 0 && overdue.length > 0) {
            const dateList = overdue.map(d => { const dd = new Date(d.date + "T00:00:00"); return dd.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"}); }).join(' \u00b7 ');
            statusHtml = '<div style="width:100%;padding:14px 18px;background:linear-gradient(135deg,#fef2f2,#fff5f5);border:2px solid #fca5a5;border-radius:12px;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="font-size:24px;">\u26a0\ufe0f</span><div><div style="font-size:15px;font-weight:800;color:#991b1b;">CV Kh\u00f3a qu\u00e1 h\u1ea1n ' + overdue.length + ' ng\u00e0y \u2014 T\u1ed5ng ph\u1ea1t: ' + totalPenalty.toLocaleString() + '\u0111</div></div></div><div style="font-size:11px;color:#dc2626;font-weight:600;padding-left:34px;margin-bottom:6px;">' + dateList + '</div><div style="font-size:11px;color:#7f1d1d;padding-left:34px;">C\u00f2n ' + remaining + ' nh\u00f3m Group C\u00f3 Zalo ch\u01b0a x\u1eed l\u00fd. X\u1eed l\u00fd h\u1ebft \u0111\u1ec3 ho\u00e0n th\u00e0nh CV v\u00e0 d\u1eebng ph\u1ea1t!</div></div>';
        } else if (remaining > 0) {
            statusHtml = '<div style="width:100%;padding:12px 18px;background:linear-gradient(135deg,#fef2f2,#fff5f5);border:2px solid #fca5a5;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="font-size:24px;">\ud83d\udd25</span><div><div style="font-size:14px;font-weight:800;color:#991b1b;">CV Kh\u00f3a: C\u00f2n ' + remaining + ' nh\u00f3m Group C\u00f3 Zalo</div><div style="font-size:11px;color:#dc2626;font-weight:600;">X\u1eed l\u00fd h\u1ebft \u0111\u1ec3 t\u1ef1 \u0111\u1ed9ng ho\u00e0n th\u00e0nh v\u00e0 kh\u00f4ng b\u1ecb ph\u1ea1t</div></div></div>';
        }

        if (statusHtml) {
            el.insertAdjacentHTML('beforeend', statusHtml);
        }
    } catch(e) { console.error('[ZaloGroup] Lock task status error:', e); }
}
