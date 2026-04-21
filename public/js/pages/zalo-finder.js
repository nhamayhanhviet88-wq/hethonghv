// ========== ZALO GROUP FINDER — CUSTOM UI ==========
let _zlTasks = [], _zlStats = {}, _zlPoolStats = {}, _zlSpamImg = null;
const _ZL_GRAD = 'linear-gradient(135deg,#0284c7,#0369a1)';
const _ZL_ACCENT = '#0284c7';

function _zlInit() {
    const area = document.getElementById('contentArea');
    if (!area) return;
    const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(currentUser.role);
    area.innerHTML = `
    <div style="padding:20px 24px;max-width:1200px;margin:0 auto;">
        <div id="zlGuide"></div>
        <div id="zlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
        ${isManager ? `<div style="display:flex;gap:8px;margin-bottom:16px;">
            <button onclick="_zlPoolModal()" style="padding:10px 18px;border:none;border-radius:10px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(2,132,199,0.3);font-family:'Segoe UI',sans-serif;">📥 Bơm Link Pool</button>
            <button onclick="_zlPoolView()" style="padding:10px 18px;border:2px solid ${_ZL_ACCENT};border-radius:10px;background:white;color:${_ZL_ACCENT};cursor:pointer;font-weight:700;font-size:13px;font-family:'Segoe UI',sans-serif;">📊 Quản lý Pool</button>
        </div>` : ''}
        <div id="zlProgress" style="margin-bottom:16px;"></div>
        <div id="zlTaskList"></div>
    </div>`;
    _zlLoadGuide();
    _zlLoadTasks();
}

async function _zlLoadGuide() {
    try {
        const res = await apiCall('/api/dailylinks/guide-url?module_type=tim_gr_zalo');
        const el = document.getElementById('zlGuide');
        if (!el || !res.guide_url) return;
        el.innerHTML = `<a href="${res.guide_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 18px;margin-bottom:16px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;text-decoration:none;color:white;font-weight:800;font-size:14px;text-transform:uppercase;box-shadow:0 4px 15px rgba(245,158,11,0.35);border:2px solid #fbbf24;font-family:'Segoe UI',sans-serif;"><span style="font-size:18px;">📘</span>HƯỚNG DẪN CÔNG VIỆC: ${(res.task_name||'TÌM GR ZALO VÀ JOIN').toUpperCase()}<span style="margin-left:auto;">→</span></a>`;
    } catch(e) {}
}

async function _zlLoadTasks() {
    try {
        const [taskRes, statsRes] = await Promise.all([
            apiCall('/api/zalo-tasks/my'),
            apiCall('/api/zalo-tasks/stats')
        ]);
        _zlTasks = taskRes.tasks || [];
        _zlStats = statsRes;
        _zlRenderStats();
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
    const done = res.done || 0, total = _zlTasks.length, quota = res.quota || 25;
    const pct = total > 0 ? Math.round(done/total*100) : 0;
    el.innerHTML = `
    <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:700;font-size:15px;color:#0c4a6e;font-family:'Segoe UI',sans-serif;">🔍 Tiến độ hôm nay: <span style="color:${_ZL_ACCENT};">${done}/${total}</span> đã xử lý</span>
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
    if (_zlTasks.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#9ca3af;font-size:15px;">
            ${res.pool_empty ? '⚠️ Pool đã hết link. Vui lòng liên hệ quản lý để bơm thêm link.' : 'Chưa có công việc hôm nay.'}
        </div>`;
        return;
    }
    el.innerHTML = _zlTasks.map((t, i) => {
        const isDone = t.status === 'done';
        const isNoResult = t.status === 'no_result';
        const statusBg = isDone ? '#dcfce7' : isNoResult ? '#fef3c7' : '#f0f9ff';
        const statusBorder = isDone ? '#86efac' : isNoResult ? '#fde68a' : '#bae6fd';
        const statusIcon = isDone ? '✅' : isNoResult ? '❌' : '🔵';
        const shortUrl = t.pool_url.length > 60 ? t.pool_url.substring(0,60)+'...' : t.pool_url;
        let resultsHtml = '';
        if (t.results && t.results.length > 0) {
            resultsHtml = `<div style="margin-top:8px;padding:8px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px;">Nhóm Zalo đã tìm (${t.results.length}):</div>
                ${t.results.map(r => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
                    <span style="color:#16a34a;">✓</span>
                    <span style="font-weight:600;color:#1e293b;">${r.zalo_name}</span>
                    <a href="${r.zalo_link}" target="_blank" style="color:#6b7280;font-size:11px;text-decoration:none;" onmouseover="this.style.color='#0284c7'" onmouseout="this.style.color='#6b7280'">${r.zalo_link.length>30?r.zalo_link.substring(0,30)+'...':r.zalo_link}</a>
                    <button onclick="_zlDelResult(${r.id})" style="margin-left:auto;background:none;border:none;color:#dc2626;cursor:pointer;font-size:10px;padding:2px 4px;">🗑️</button>
                    ${r.spam_status==='done' ? '<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">✅ Đã Spam</span>' : ''}
                </div>`).join('')}
            </div>`;
        }
        return `<div style="background:${statusBg};border:1.5px solid ${statusBorder};border-radius:12px;padding:14px 18px;margin-bottom:10px;transition:all .2s;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:16px;">${statusIcon}</span>
                <span style="font-weight:800;color:${_ZL_ACCENT};font-size:14px;font-family:'Segoe UI',sans-serif;">Link #${i+1}</span>
                <a href="${t.pool_url}" target="_blank" rel="noopener" style="color:#334155;text-decoration:none;font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#0284c7'" onmouseout="this.style.color='#334155'">${shortUrl}</a>
                <a href="${t.pool_url}" target="_blank" style="background:${_ZL_GRAD};color:white;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">Mở link ↗</a>
            </div>
            ${resultsHtml}
            ${!isNoResult ? `<div style="display:flex;gap:6px;margin-top:10px;">
                <button onclick="_zlAddResultModal(${t.id})" style="padding:6px 14px;border:none;border-radius:7px;background:#16a34a;color:white;cursor:pointer;font-weight:700;font-size:12px;font-family:'Segoe UI',sans-serif;">➕ Thêm nhóm Zalo</button>
                ${t.status==='pending' ? `<button onclick="_zlNoResult(${t.id})" style="padding:6px 14px;border:1px solid #d1d5db;border-radius:7px;background:white;color:#6b7280;cursor:pointer;font-weight:600;font-size:12px;font-family:'Segoe UI',sans-serif;">❌ Không tìm thấy</button>` : ''}
            </div>` : '<div style="margin-top:6px;font-size:12px;color:#92400e;font-weight:600;">Đã đánh dấu: Không tìm thấy nhóm Zalo</div>'}
        </div>`;
    }).join('');
}

// Add result modal
function _zlAddResultModal(taskId) {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(440px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${_ZL_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;font-family:'Segoe UI',sans-serif;">➕ Thêm nhóm Zalo</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Tên nhóm Zalo <span style="color:#dc2626;">*</span></label>
                <input id="zlResName" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:6px;box-sizing:border-box;" placeholder="VD: Nhóm Sale Hà Nội" autofocus>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Link nhóm Zalo <span style="color:#dc2626;">*</span></label>
                <input id="zlResLink" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:6px;box-sizing:border-box;" placeholder="https://zalo.me/g/...">
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;font-family:'Segoe UI',sans-serif;">Hủy</button>
                <button onclick="_zlSubmitResult(${taskId})" style="padding:10px 20px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;font-family:'Segoe UI',sans-serif;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
    setTimeout(() => document.getElementById('zlResName')?.focus(), 100);
}

async function _zlSubmitResult(taskId) {
    const name = document.getElementById('zlResName')?.value?.trim();
    const link = document.getElementById('zlResLink')?.value?.trim();
    if (!name || !link) { showToast('Vui lòng nhập tên và link nhóm Zalo!', 'error'); return; }
    try {
        await apiCall('/api/zalo-tasks/' + taskId + '/result', 'POST', { zalo_name: name, zalo_link: link });
        document.getElementById('zlModal')?.remove();
        showToast('✅ Đã thêm nhóm Zalo!');
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

// Pool modal — bulk import
function _zlPoolModal() {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    const d = document.createElement('div'); d.id = 'zlModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(550px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${_ZL_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:16px;font-weight:800;font-family:'Segoe UI',sans-serif;">📥 Bơm Link Pool</div>
                <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:20px 24px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Dán danh sách link (mỗi dòng 1 link):</label>
            <textarea id="zlPoolUrls" rows="10" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;margin-top:6px;box-sizing:border-box;resize:vertical;font-family:monospace;" placeholder="https://example.com/group1\nhttps://example.com/group2\nhttps://example.com/group3"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
                <button onclick="document.getElementById('zlModal').remove()" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-size:13px;font-family:'Segoe UI',sans-serif;">Hủy</button>
                <button onclick="_zlPoolSubmit()" style="padding:10px 20px;border:none;border-radius:8px;background:${_ZL_GRAD};color:white;cursor:pointer;font-weight:700;font-size:13px;font-family:'Segoe UI',sans-serif;">📥 Bơm Link</button>
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
        const res = await apiCall('/api/zalo-pool/bulk', 'POST', { urls });
        document.getElementById('zlModal')?.remove();
        showToast(`✅ Đã thêm ${res.added} link! ${res.duplicates > 0 ? `(${res.duplicates} trùng)` : ''}`);
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

// Pool view modal
async function _zlPoolView() {
    let old = document.getElementById('zlModal');
    if (old) old.remove();
    try {
        const res = await apiCall('/api/zalo-pool');
        const st = res.stats || {};
        const d = document.createElement('div'); d.id = 'zlModal';
        d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        d.innerHTML = `
        <div style="background:white;border-radius:16px;width:min(700px,95vw);max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);display:flex;flex-direction:column;">
            <div style="background:${_ZL_GRAD};padding:18px 24px;border-radius:16px 16px 0 0;color:white;flex-shrink:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:16px;font-weight:800;font-family:'Segoe UI',sans-serif;">📊 Quản lý Pool (${st.total||0} link)</div>
                    <button onclick="document.getElementById('zlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
                </div>
                <div style="display:flex;gap:12px;margin-top:10px;font-size:12px;">
                    <span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;">🟢 Chưa phân: ${st.available||0}</span>
                    <span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;">🟡 Đã phân: ${st.assigned||0}</span>
                    <span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;">✅ Hoàn thành: ${st.completed||0}</span>
                </div>
            </div>
            <div style="overflow-y:auto;flex:1;padding:16px;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                        <th style="padding:8px;text-align:center;width:40px;">STT</th>
                        <th style="padding:8px;text-align:left;">URL</th>
                        <th style="padding:8px;text-align:center;width:90px;">Trạng thái</th>
                        <th style="padding:8px;text-align:center;width:60px;"></th>
                    </tr></thead>
                    <tbody>${(res.pool||[]).map((p,i) => {
                        const stLabel = p.status==='available'?'🟢 Chưa phân':p.status==='assigned'?'🟡 Đã phân':'✅ Xong';
                        return `<tr style="border-bottom:1px solid #f3f4f6;">
                            <td style="padding:6px 8px;text-align:center;color:#6b7280;">${i+1}</td>
                            <td style="padding:6px 8px;"><a href="${p.url}" target="_blank" style="color:#0284c7;text-decoration:none;font-size:11px;word-break:break-all;">${p.url}</a></td>
                            <td style="padding:6px 8px;text-align:center;font-size:11px;">${stLabel}</td>
                            <td style="padding:6px 8px;text-align:center;">${p.status==='available'?`<button onclick="_zlPoolDel(${p.id})" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:10px;">🗑️</button>`:''}</td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>
        </div>`;
        document.body.appendChild(d);
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _zlPoolDel(id) {
    if (!confirm('Xóa link này khỏi pool?')) return;
    try {
        await apiCall('/api/zalo-pool/' + id, 'DELETE');
        showToast('✅ Đã xóa!');
        _zlPoolView(); // refresh
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}
