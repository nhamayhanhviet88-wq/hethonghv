// ========== ZALO GROUP FINDER — CUSTOM UI ==========
let _zlTasks = [], _zlStats = {}, _zlPoolStats = {}, _zlSpamImg = null;
let _zlViewUserId = null, _zlViewDeptId = null, _zlCachedDepts = [], _zlFilter = 'all';
const _ZL_GRAD = 'linear-gradient(135deg,#0284c7,#0369a1)';
const _ZL_ACCENT = '#0284c7';

function _zlInit() {
    const area = document.getElementById('contentArea');
    if (!area) return;
    _zlFilter = 'all';
    const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
    if (isManager) {
        area.innerHTML = `
        <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
            <div id="zlSidebar" style="width:240px;min-width:240px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
            <div style="flex:1;padding:20px 24px;overflow-y:auto;">
                <div id="zlGuide"></div>
                <div id="zlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
                <div id="zlToolbar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;"></div>
                <div id="zlProgress" style="margin-bottom:16px;"></div>
                <div id="zlTaskList"></div>
            </div>
        </div>`;
        _zlLoadSidebar();
    } else {
        area.innerHTML = `
        <div style="padding:20px 24px;max-width:1200px;margin:0 auto;">
            <div id="zlGuide"></div>
            <div id="zlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div id="zlProgress" style="margin-bottom:16px;"></div>
            <div id="zlTaskList"></div>
        </div>`;
    }
    _zlLoadGuide();
    _zlLoadTasks();
}

async function _zlLoadSidebar() {
    try {
        const res = await apiCall('/api/dailylinks/members');
        _zlCachedDepts = res.departments || [];
        _zlRenderSidebar();
    } catch(e) { console.error(e); }
}

function _zlSelAll() { _zlViewUserId = null; _zlViewDeptId = null; _zlFilter = 'all'; _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSelDept(id) { _zlViewDeptId = id; _zlViewUserId = null; _zlFilter = 'all'; _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSelUser(id) { _zlViewUserId = id; _zlViewDeptId = null; _zlFilter = 'all'; _zlRenderSidebar(); _zlLoadTasks(); }
function _zlSetFilter(f) { _zlFilter = f; const done = _zlTasks.filter(t => t.status==='done'||t.status==='no_result').length; _zlRenderToolbar(); _zlRenderTasks({done, quota: _zlTasks.length||25}); }

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
    if (!isManager) { tb.innerHTML = ''; return; }
    const cAll = _zlTasks.length;
    const cPending = _zlTasks.filter(t => t.status === 'pending').length;
    const cHasZalo = _zlTasks.filter(t => t.results && t.results.length > 0 && !(t.results.some(r => r.spam_eligible))).length;
    const cSpamOk = _zlTasks.filter(t => t.results && t.results.some(r => r.spam_eligible)).length;
    const cNoZalo = _zlTasks.filter(t => t.status === 'no_result').length;
    const btn = (f, label, icon, count) => {
        const active = _zlFilter === f;
        return `<button onclick="_zlSetFilter('${f}')" style="padding:6px 14px;border:2px solid ${active?_ZL_ACCENT:'#d1d5db'};border-radius:8px;background:${active?'#e0f2fe':'white'};color:${active?_ZL_ACCENT:'#6b7280'};cursor:pointer;font-weight:700;font-size:11px;transition:all .2s;white-space:nowrap;">${icon} ${label} (${count})</button>`;
    };
    let h = '<div style="display:flex;gap:6px;flex-wrap:wrap;flex:1;align-items:center;">';
    h += btn('all', 'Tất Cả', '📋', cAll);
    h += btn('pending', 'Link Group Chưa Tìm', '🔍', cPending);
    h += btn('has_zalo', 'Group Có Zalo', '✅', cHasZalo);
    h += btn('spam_ok', 'Zalo Spam Được', '🎯', cSpamOk);
    h += btn('no_zalo', 'Group K Có Zalo', '❌', cNoZalo);
    h += '</div>';
    if (_zlViewUserId) {
        h += `<button onclick="_zlPoolModal()" style="padding:8px 18px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(2,132,199,0.3);white-space:nowrap;flex-shrink:0;">📥 Bơm Link</button>`;
    }
    tb.innerHTML = h;
}

function _vnTodayFE() {
    const now = new Date(Date.now() + 7 * 3600000);
    return now.toISOString().split('T')[0];
}

async function _zlLoadTasks() {
    try {
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
        let taskRes, statsRes;
        if (isManager) {
            let url = '/api/zalo-tasks/team?date=' + _vnTodayFE();
            let statsUrl = '/api/zalo-tasks/stats';
            if (_zlViewUserId) { url += '&user_id=' + _zlViewUserId; statsUrl += '?user_id=' + _zlViewUserId; }
            else if (_zlViewDeptId) { url += '&dept_id=' + _zlViewDeptId; }
            [taskRes, statsRes] = await Promise.all([apiCall(url), apiCall(statsUrl)]);
            taskRes.tasks = taskRes.tasks || [];
            const doneCount = taskRes.tasks.filter(t => t.status === 'done' || t.status === 'no_result').length;
            const realTarget = statsRes?.target || 25;
            taskRes.done = doneCount;
            taskRes.quota = realTarget;
            _zlTasks = taskRes.tasks;
            _zlStats = { today: doneCount, target: realTarget, week: statsRes?.week || 0, month: statsRes?.month || 0 };
        } else {
            [taskRes, statsRes] = await Promise.all([
                apiCall('/api/zalo-tasks/my'),
                apiCall('/api/zalo-tasks/stats')
            ]);
            _zlTasks = taskRes.tasks || [];
            _zlStats = statsRes;
        }
        _zlRenderStats();
        _zlRenderToolbar();
        _zlRenderProgress(taskRes);
        _zlRenderTasks(taskRes);
    } catch(e) { console.error(e); }
}
function _zlRenderStats() {
    const s = _zlStats, el = document.getElementById('zlStats');
    if (!el) return;
    const cards = [
        {l:'Hôm Nay',v:`${s.today||0}/${s.target||25}`,bg:_ZL_GRAD,icon:'📊'},
        {l:'Tuần Này',v:`${s.week||0}`,bg:'linear-gradient(135deg,#f59e0b,#d97706)',icon:'📅'},
        {l:'Tháng Này',v:`${s.month||0}`,bg:'linear-gradient(135deg,#6366f1,#4f46e5)',icon:'📆'},
    ];
    el.innerHTML = cards.map(c => `<div style="flex:1;min-width:180px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;font-family:'Segoe UI',sans-serif;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('');
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
    let filtered = _zlTasks;
    if (_zlFilter === 'pending') filtered = filtered.filter(t => t.status === 'pending');
    else if (_zlFilter === 'has_zalo') filtered = filtered.filter(t => t.results && t.results.length > 0 && !(t.results.some(r => r.spam_eligible)));
    else if (_zlFilter === 'spam_ok') filtered = filtered.filter(t => t.results && t.results.some(r => r.spam_eligible));
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
            t.results.forEach((r, ri) => {
                const shortZalo = r.zalo_link.length > 35 ? r.zalo_link.substring(0,35)+'...' : r.zalo_link;
                const joinBtn = r.join_status
                    ? `<button onclick="_zlToggleJoin(${r.id})" style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✅ Đã Join</button>`
                    : `<button onclick="_zlToggleJoin(${r.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">❌ Chưa Join</button>`;
                const spamBtn = r.spam_status === 'done'
                    ? `<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">✅ Đã Spam</span>`
                    : r.spam_eligible
                        ? `<button onclick="_zlToggleSpamEligible(${r.id})" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🎯 Spam Được</button>`
                        : `<button onclick="_zlToggleSpamEligible(${r.id})" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Đánh dấu</button>`;
                rows.push(`<tr style="border-bottom:1px solid #e5e7eb;">
                    ${ri===0 ? `<td rowspan="${t.results.length}" style="padding:10px 12px;font-size:12px;font-weight:600;color:#334155;vertical-align:top;border-right:1px solid #e5e7eb;white-space:nowrap;">${t.user_name || ''}</td>` : ''}
                    <td style="padding:8px 12px;"><a href="${r.zalo_link}" target="_blank" style="color:#0284c7;font-size:12px;text-decoration:none;font-weight:500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${shortZalo}</a>
                        <button onclick="_zlDelResult(${r.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:10px;padding:0 4px;vertical-align:middle;">🗑️</button></td>
                    ${ri===0 ? `<td rowspan="${t.results.length}" style="padding:8px 12px;vertical-align:top;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;"><a href="${t.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;" onmouseover="this.style.color='#0284c7'" onmouseout="this.style.color='#6b7280'">${shortFbUrl}</a></td>` : ''}
                    <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">${joinBtn}</td>
                    <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">${spamBtn}</td>
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
                <td style="padding:8px 12px;font-size:12px;color:#9ca3af;" colspan="2">${statusLabel}
                    <a href="${t.pool_url}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;margin-left:8px;">${shortFbUrl}</a></td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
                <td style="padding:8px 12px;text-align:center;border-left:1px solid #e5e7eb;">—</td>
            </tr>`);
        }
    });
    el.innerHTML = `<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',sans-serif;">
            <thead><tr style="background:linear-gradient(135deg,#0c4a6e,#0369a1);color:white;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;white-space:nowrap;">TÊN NHÂN VIÊN</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK NHÓM ZALO</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;">LINK GROUP</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">JOIN NHÓM</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;white-space:nowrap;">SPAM ĐƯỢC</th>
            </tr></thead>
            <tbody>${rows.join('')}</tbody>
        </table>
    </div>`;
}

// Add result modal
function _zlAddResultModal(taskId) {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${_ZL_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;font-family:'Segoe UI',sans-serif;">➕ Thêm nhóm Zalo</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:20px 24px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Link nhóm Zalo <span style="color:#6b7280;font-weight:400;">(mỗi ô 1 link)</span></label>
            <div id="zlLinkInputs" style="margin-top:8px;"></div>
            <button onclick="_zlAddLinkInput()" style="margin-top:8px;padding:6px 14px;border:1px dashed #93c5fd;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:12px;width:100%;">
                ➕ Thêm link Zalo
            </button>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;font-family:'Segoe UI',sans-serif;">Hủy</button>
                <button onclick="_zlSubmitResult(${taskId})" style="padding:10px 20px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;font-family:'Segoe UI',sans-serif;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
    _zlAddLinkInput(); // Add first input automatically
}

let _zlLinkCount = 0;
function _zlAddLinkInput() {
    const container = document.getElementById('zlLinkInputs');
    if (!container) return;
    _zlLinkCount++;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
    row.innerHTML = `
        <span style="font-size:12px;font-weight:700;color:#6b7280;min-width:18px;">${container.children.length + 1}.</span>
        <input class="zlLinkField" style="flex:1;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;" placeholder="https://zalo.me/g/..." autofocus>
        <button onclick="this.parentElement.remove();_zlReindexLinks()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:4px;">🗑️</button>
    `;
    container.appendChild(row);
    row.querySelector('input')?.focus();
}

function _zlReindexLinks() {
    const container = document.getElementById('zlLinkInputs');
    if (!container) return;
    Array.from(container.children).forEach((row, i) => {
        const num = row.querySelector('span');
        if (num) num.textContent = (i + 1) + '.';
    });
}

async function _zlSubmitResult(taskId) {
    const inputs = document.querySelectorAll('.zlLinkField');
    const links = Array.from(inputs).map(i => i.value.trim()).filter(l => l.length > 0);
    if (links.length === 0) { showToast('Vui lòng nhập ít nhất 1 link nhóm Zalo!', 'error'); return; }
    // Clear old error messages
    document.getElementById('zlDupError')?.remove();
    try {
        const res = await apiCall('/api/zalo-tasks/' + taskId + '/results-bulk', 'POST', { links });
        if (res.error && res.duplicateLinks) {
            // Show duplicate errors inline in modal
            let errDiv = document.getElementById('zlDupError');
            if (!errDiv) {
                errDiv = document.createElement('div');
                errDiv.id = 'zlDupError';
                document.getElementById('zlLinkInputs')?.parentElement?.insertBefore(errDiv, document.getElementById('zlLinkInputs'));
            }
            errDiv.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:10px;';
            errDiv.innerHTML = `<div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:6px;">❌ Các link Zalo bị trùng — Xóa đi để lưu được:</div>
                ${res.duplicateLinks.map(d => `<div style="font-size:11px;color:#991b1b;padding:2px 0;">• ${d.link.substring(0,40)}... <span style="color:#6b7280;">(đã nhập bởi ${d.owner})</span></div>`).join('')}`;
            return;
        }
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        document.getElementById('zlModal')?.remove();
        showToast(`✅ Đã thêm ${res.added || 0} nhóm Zalo!`);
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

