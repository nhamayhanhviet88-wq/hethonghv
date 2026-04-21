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
    const cHasZalo = allResults.filter(r => !r.spam_eligible && !r.spam_not_eligible).length;
    const cSpamOk = allResults.filter(r => r.spam_eligible).length;
    const cSpamNo = allResults.filter(r => r.spam_not_eligible).length;
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
    if (_zlViewUserId && isManager) {
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
        <div style="flex:1;min-width:180px;background:${_ZL_GRAD};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);">
            <div style="font-size:28px;margin-bottom:4px;">📊</div>
            <div style="font-size:28px;font-weight:900;font-family:'Segoe UI',sans-serif;">${s.today||0}/${s.target||25}</div>
            <div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">Hôm Nay</div>
        </div>
        <div onclick="_zlSetFilter('spam_ok')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:14px;padding:18px 20px;color:#fbbf24;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite,zlPulse 3s ease-in-out infinite;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:28px;margin-bottom:4px;">🔥</div>
            <div style="font-size:28px;font-weight:900;font-family:'Segoe UI',sans-serif;animation:zlGlow 2s ease-in-out infinite;">${s.qlChuaSpam||0}</div>
            <div style="font-size:12px;font-weight:800;margin-top:2px;letter-spacing:0.5px;">QL CHƯA SPAM</div>
        </div>
        <div onclick="_zlSetFilter('spam_done')" style="flex:1;min-width:180px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:14px;padding:18px 20px;color:#991b1b;cursor:pointer;animation:zlSparkle 2s ease-in-out infinite .5s,zlPulse 3s ease-in-out infinite .5s;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:28px;margin-bottom:4px;">📣</div>
            <div style="font-size:28px;font-weight:900;font-family:'Segoe UI',sans-serif;">${s.qlDaSpam||0}</div>
            <div style="font-size:12px;font-weight:800;margin-top:2px;letter-spacing:0.5px;">QL ĐÃ SPAM</div>
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
        resultFilter = r => !r.spam_eligible && !r.spam_not_eligible;
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'spam_ok') {
        resultFilter = r => r.spam_eligible;
        filtered = filtered.filter(t => t.results && t.results.some(resultFilter));
    }
    else if (_zlFilter === 'spam_no') {
        resultFilter = r => r.spam_not_eligible;
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
                    ? `<button onclick="_zlToggleJoin(${r.id})" style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✅ Đã Join</button>`
                    : `<button onclick="_zlToggleJoin(${r.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">❌ Chưa Join</button>`;
                const spamBtn = r.spam_status === 'done'
                    ? `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ Đã Spam</span>`
                    : r.spam_eligible
                        ? `<button onclick="_zlToggleSpamEligible(${r.id})" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🎯 Spam Được</button>`
                        : r.spam_not_eligible
                            ? `<button onclick="_zlSpamChoose(${r.id})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🚫 KHÔNG SPAM ĐƯỢC</button>`
                            : r.pending_join
                                ? `<button onclick="_zlSpamChoose(${r.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">⏳ Chưa tham gia được</button>`
                                : `<button onclick="_zlSpamChoose(${r.id})" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Đánh dấu</button>`;
                rows.push(`<tr style="border-bottom:1px solid #e5e7eb;">
                    ${ri===0 ? `<td rowspan="${displayResults.length}" style="padding:10px 12px;font-size:12px;font-weight:600;color:#334155;vertical-align:top;border-right:1px solid #e5e7eb;white-space:nowrap;">${t.user_name || ''}</td>` : ''}
                    <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#334155;border-right:1px solid #e5e7eb;">${r.zalo_name || '—'}</td>
                    <td style="padding:8px 12px;"><a href="${r.zalo_link}" target="_blank" style="color:#0284c7;font-size:12px;text-decoration:none;font-weight:500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${shortZalo}</a>
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
                <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#334155;border-right:1px solid #e5e7eb;white-space:nowrap;">${t.user_name || ''}</td>
                <td style="padding:8px 12px;font-size:12px;color:#9ca3af;" colspan="3">${statusLabel}
                    <a href="${t.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;margin-left:8px;">${shortFbUrl}</a></td>
                <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 8px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
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
                ${showSpamCols ? '<th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">HÌNH ẢNH</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">LÝ DO</th>' : ''}
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">TIME</th>
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
                <input type="file" id="zlSpamImgInput" accept="image/*" onchange="_zlSpamImgPreview(this)" style="display:none;">
                <div id="zlSpamPasteZone" onclick="document.getElementById('zlSpamImgInput').click()" style="width:100%;padding:16px 12px;border:2px dashed #cbd5e1;border-radius:10px;background:#f8fafc;color:#64748b;cursor:pointer;font-weight:700;font-size:13px;transition:all .2s;text-align:center;box-sizing:border-box;" onmouseover="this.style.borderColor='${accentColor}';this.style.background='${bgColor}'" onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
                    <div>📎 Chọn / Chụp hình ảnh</div>
                    <div style="font-size:11px;font-weight:500;color:#94a3b8;margin-top:4px;">hoặc <strong style="color:#3b82f6;">Ctrl+V</strong> để dán ảnh từ clipboard</div>
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
function _zlSpamImgPreview(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        _zlSpamImgData = e.target.result;
        document.getElementById('zlSpamImgTag').src = _zlSpamImgData;
        document.getElementById('zlSpamImgPreview').style.display = 'block';
        const pasteZone = document.getElementById('zlSpamPasteZone');
        if (pasteZone) {
            pasteZone.innerHTML = '<div>✅ Đã chọn ảnh — Nhấn để đổi</div><div style="font-size:11px;font-weight:500;color:#94a3b8;margin-top:4px;">hoặc <strong style="color:#3b82f6;">Ctrl+V</strong> để dán ảnh khác</div>';
        }
    };
    reader.readAsDataURL(input.files[0]);
}

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

function _zpInit() {
    const area = document.getElementById('contentArea');
    if (!area) return;
    document.getElementById('pageTitle').textContent = 'Nhóm Spam Zalo';
    area.innerHTML = `
    <div style="padding:0;">
        <div style="background:white;padding:20px 32px;border-bottom:1px solid #e5e7eb;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:42px;height:42px;border-radius:12px;background:${_ZP_GRAD};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">📱</div>
                <div><div style="font-size:20px;font-weight:800;color:#1e293b;letter-spacing:-0.3px;">Nhóm Spam Zalo</div>
                <div style="font-size:12px;color:#6b7280;">Tổng hợp các nhóm Zalo từ nhân viên — quản lý đánh dấu đã spam</div></div>
            </div>
        </div>
        <div style="display:flex;gap:0;min-height:calc(100vh - 140px);">
            <div id="zpSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
            <div style="flex:1;padding:20px 24px;overflow-y:auto;background:#f1f5f9;">
                <div id="zpSpamStats" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px;"></div>
                <div id="zpSpamList" style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải...</div>
            </div>
        </div>
    </div>`;
    _zpLoadSpamData();
}

function _zpSelAll() { _zpCurUser = null; _zpCurDept = null; _zpRenderSidebar(); _zpRenderFiltered(); }
function _zpSelDept(id) { _zpCurDept = id; _zpCurUser = null; _zpRenderSidebar(); _zpRenderFiltered(); }
function _zpSelUser(id) { _zpCurUser = id; _zpCurDept = null; _zpRenderSidebar(); _zpRenderFiltered(); }

function _zpRenderSidebar() {
    const sb = document.getElementById('zpSidebar');
    if (!sb) return;
    const isAll = !_zpCurUser && !_zpCurDept;
    let h = `<div style="margin-bottom:12px;">
        <div onclick="_zpSelAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;
            background:${isAll ? _ZP_GRAD : '#eef2ff'};color:${isAll ? 'white' : '#4338ca'};
            box-shadow:${isAll ? '0 3px 12px rgba(124,58,237,0.3)' : 'none'};transition:all 0.2s;">📊 Tất cả nhân viên</div>
    </div>
    <div style="height:1px;background:linear-gradient(to right,transparent,#e2e8f0,transparent);margin:10px 0;"></div>`;
    (_zpCachedDepts||[]).forEach(d => {
        const isDeptSel = _zpCurDept==d.id && !_zpCurUser;
        const memberCount = d.members?.length || 0;
        h += `<div style="margin-bottom:6px;">
            <div onclick="_zpSelDept(${d.id})" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
                background:${isDeptSel ? _ZP_GRAD : '#f1f5f9'};color:${isDeptSel ? 'white' : '#334155'};transition:all .2s;border:1px solid ${isDeptSel?'transparent':'#e2e8f0'};">
                🏢 ${d.name} <span style="font-size:10px;opacity:0.6;">(${memberCount})</span>
            </div>`;
        (d.members||[]).forEach(m => {
            const isSel = _zpCurUser == m.id;
            const initials = (m.full_name||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
            h += `<div onclick="_zpSelUser(${m.id})" style="padding:6px 10px 6px 22px;cursor:pointer;display:flex;align-items:center;gap:8px;border-radius:6px;margin:2px 0;
                background:${isSel ? _ZP_GRAD : 'transparent'};color:${isSel ? 'white' : '#475569'};transition:all .15s;"
                onmouseover="if(!${isSel})this.style.background='#eef2ff'" onmouseout="if(!${isSel})this.style.background='transparent'">
                <div style="width:24px;height:24px;border-radius:50%;background:${isSel?'rgba(255,255,255,0.25)':'#e2e8f0'};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:${isSel?'white':'#64748b'};flex-shrink:0;">${initials}</div>
                <span style="font-size:12px;font-weight:${isSel?'700':'500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name}</span>
            </div>`;
        });
        h += '</div>';
    });
    sb.innerHTML = h;
}

async function _zpLoadSpamData() {
    try {
        const [res, memRes] = await Promise.all([
            apiCall('/api/zalo-tasks/team?date=all'),
            apiCall('/api/dailylinks/members')
        ]);
        _zpCachedDepts = memRes.departments || [];
        _zpRenderSidebar();
        const tasks = (res.tasks||[]).filter(t => t.results && t.results.length > 0);
        _zpAllResults = [];
        tasks.forEach(t => {
            (t.results||[]).forEach(r => {
                _zpAllResults.push({
                    ...r,
                    user_id: t.user_id,
                    user_name: t.user_name || t.username,
                    dept_name: t.dept_name || '',
                    dept_id: t.dept_id || null,
                    pool_url: t.pool_url || '',
                    assigned_date: t.assigned_date
                });
            });
        });
        _zpRenderFiltered();
    } catch(e) {
        const el = document.getElementById('zpSpamList');
        if (el) el.innerHTML = `<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

function _zpRenderFiltered() {
    let filtered = _zpAllResults;
    if (_zpCurUser) {
        filtered = filtered.filter(r => r.user_id == _zpCurUser);
    } else if (_zpCurDept) {
        const deptObj = _zpCachedDepts.find(d => d.id == _zpCurDept);
        if (deptObj) {
            const memberIds = (deptObj.members||[]).map(m => m.id);
            filtered = filtered.filter(r => memberIds.includes(r.user_id));
        }
    }
    const total = filtered.length;
    const spammed = filtered.filter(r => r.spam_status === 'done').length;
    const pending = total - spammed;
    const statsEl = document.getElementById('zpSpamStats');
    if (statsEl) {
        statsEl.innerHTML = [
            {l:'Tổng Nhóm Zalo',v:total,bg:_ZP_GRAD,icon:'📱'},
            {l:'Đã Spam',v:spammed,bg:'linear-gradient(135deg,#10b981,#059669)',icon:'✅'},
            {l:'Chưa Spam',v:pending,bg:'linear-gradient(135deg,#f59e0b,#d97706)',icon:'⏳'},
        ].map(c => `<div style="flex:1;min-width:160px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:26px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:11px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('');
    }
    const byUser = {};
    filtered.forEach(r => {
        const key = r.user_name || 'Unknown';
        if (!byUser[key]) byUser[key] = { dept: r.dept_name, results: [] };
        byUser[key].results.push(r);
    });
    const listEl = document.getElementById('zpSpamList');
    if (!listEl) return;
    if (total === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:60px;color:#9ca3af;font-size:15px;">Chưa có nhóm Zalo nào được tìm thấy.</div>';
        return;
    }
    let h = '';
    Object.entries(byUser).forEach(([name, data]) => {
        const totalR = data.results.length;
        const doneR = data.results.filter(r => r.spam_status === 'done').length;
        const initials = name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
        h += `<div style="margin-bottom:16px;background:white;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
            <div style="padding:14px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb;background:#fafbfc;">
                <div style="width:36px;height:36px;border-radius:50%;background:${_ZP_GRAD};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${initials}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:14px;color:#1e293b;">${name}</div>
                    <div style="font-size:11px;color:#6b7280;">${data.dept} • ${totalR} nhóm • ${doneR} đã spam</div>
                </div>
                <div style="font-size:13px;font-weight:700;color:${doneR===totalR?'#16a34a':'#f59e0b'};">${Math.round(doneR/totalR*100)}%</div>
            </div>`;
        data.results.forEach(r => {
            const done = r.spam_status === 'done';
            const eName = (r.zalo_name||'').replace(/'/g,"\\'");
            const eLink = (r.zalo_link||'').replace(/'/g,"\\'");
            h += `<div style="display:flex;align-items:center;gap:10px;padding:10px 20px;border-bottom:1px solid #f3f4f6;font-size:13px;background:${done?'#f0fdf4':'white'};">
                <span style="font-weight:600;color:#1e293b;min-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.zalo_name}</span>
                <a href="${r.zalo_link}" target="_blank" style="color:#6b7280;text-decoration:none;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.zalo_link}</a>
                ${done
                    ? `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;">✅ Đã Spam</span>
                       ${r.spam_screenshot ? `<img src="${r.spam_screenshot}" onclick="_zpLB(this.src)" style="width:32px;height:32px;border-radius:6px;cursor:pointer;object-fit:cover;">` : ''}`
                    : `<button onclick="_zpSpamModal(${r.id},'${eName}','${eLink}')" style="padding:5px 14px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;font-size:11px;white-space:nowrap;">📸 Đánh dấu Spam</button>`}
            </div>`;
        });
        h += '</div>';
    });
    listEl.innerHTML = h;
}

// Spam modal with screenshot
function _zpSpamModal(resultId, zaloName, zaloLink) {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    _zlSpamImg = null;
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;">📸 Đánh Dấu Đã Spam</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:20px 24px;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
                <div style="font-size:12px;color:#991b1b;font-weight:600;">Nhóm: <strong>${zaloName}</strong></div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">${zaloLink}</div>
            </div>
            <label style="font-weight:600;font-size:13px;color:#374151;">Ảnh minh chứng đã Spam <span style="color:#dc2626;">*</span></label>
            <div style="margin-top:8px;">
                <div id="zpSpamPreview" style="display:none;margin-bottom:10px;text-align:center;"></div>
                <label style="display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;border:2px dashed #d1d5db;border-radius:10px;cursor:pointer;background:#f9fafb;transition:all .2s;" onmouseover="this.style.borderColor='#dc2626'" onmouseout="this.style.borderColor='#d1d5db'">
                    <span style="font-size:24px;">📷</span>
                    <span style="font-size:13px;font-weight:600;color:#6b7280;">Chọn hoặc chụp ảnh</span>
                    <input type="file" accept="image/*" capture="environment" onchange="_zpHandleSpamImg(this)" style="display:none;">
                </label>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;">Hủy</button>
                <button onclick="_zpSubmitSpam(${resultId})" style="padding:10px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;cursor:pointer;font-weight:700;font-size:13px;">✅ Xác nhận Spam</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
}

function _zpHandleSpamImg(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        _zlSpamImg = e.target.result;
        const preview = document.getElementById('zpSpamPreview');
        if (preview) {
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${_zlSpamImg}" style="max-width:100%;max-height:200px;border-radius:8px;border:2px solid #dc2626;">`;
        }
    };
    reader.readAsDataURL(file);
}

async function _zpSubmitSpam(resultId) {
    if (!_zlSpamImg) { showToast('Vui lòng chụp ảnh minh chứng!', 'error'); return; }
    try {
        await apiCall('/api/zalo-results/' + resultId + '/spam', 'POST', { image_data: _zlSpamImg });
        document.getElementById('zlModal')?.remove();
        showToast('✅ Đã đánh dấu Spam!');
        _zpLoadSpamData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

function _zpLB(src) { if (typeof _dlOpenLB === 'function') { _dlOpenLB(src); } else { window.open(src,'_blank'); } }

// Init is triggered by handleRoute switch case in app.js

