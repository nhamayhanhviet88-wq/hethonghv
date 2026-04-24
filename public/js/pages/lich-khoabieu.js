// ========== LỊCH KHÓA BIỂU CÔNG VIỆC ==========
const _KB_COLORS = [
    { bg:'#eff6ff', border:'#bfdbfe', badge:'#1d4ed8', text:'#1e3a5f', tag:'#dbeafe' },
    { bg:'#ecfdf5', border:'#a7f3d0', badge:'#059669', text:'#064e3b', tag:'#d1fae5' },
    { bg:'#fffbeb', border:'#fde68a', badge:'#d97706', text:'#78350f', tag:'#fef3c7' },
    { bg:'#f5f3ff', border:'#c4b5fd', badge:'#7c3aed', text:'#4c1d95', tag:'#ede9fe' },
    { bg:'#fff1f2', border:'#fecdd3', badge:'#e11d48', text:'#881337', tag:'#ffe4e6' },
    { bg:'#f0fdfa', border:'#99f6e4', badge:'#0d9488', text:'#134e4a', tag:'#ccfbf1' },
    { bg:'#fff7ed', border:'#fed7aa', badge:'#ea580c', text:'#7c2d12', tag:'#ffedd5' },
    { bg:'#eef2ff', border:'#a5b4fc', badge:'#4f46e5', text:'#312e81', tag:'#e0e7ff' },
    { bg:'#fdf2f8', border:'#f9a8d4', badge:'#db2777', text:'#831843', tag:'#fce7f3' },
    { bg:'#ecfeff', border:'#a5f3fc', badge:'#0891b2', text:'#164e63', tag:'#cffafe' },
];
let _kbTasks = [], _kbReports = {}, _kbSummary = {}, _kbHolidayMap = {};
let _kbSupportRequests = {}; // key: templateId_date → request object
let _kbOverridesDiem = {}, _kbOverridesKhoa = {}; // per-user overrides
let _kbOverrideUserIds = new Set(); // users who have any override
let _kbMonthlySummary = 0; // total approved points this month
let _kbLockTasks = [], _kbLockCompletions = {}, _kbLockHolidays = new Set(); // CV Khóa data
let _kbChainItems = []; // CV Chuỗi data for calendar
let _kbViewUserName = ''; // Name of user currently being viewed
let _kbForceApproval = false; // Force approval flag for viewed user
let _kbForceScheduleIds = new Set(); // Set of template_ids forced for viewed user
let _kbForceLockIds = new Set(); // Set of lock_task_ids forced for viewed user
let _kbForceChainIds = new Set();

// CSS: Employee pending banner animation
if (!document.getElementById('_kbPendingBannerCSS')) {
    const _pbSt = document.createElement('style'); _pbSt.id = '_kbPendingBannerCSS';
    _pbSt.textContent = `
        @keyframes _kbPendingPulse { 0%,100%{box-shadow:0 4px 20px rgba(217,119,6,0.35)} 50%{box-shadow:0 6px 30px rgba(217,119,6,0.55)} }
        @keyframes _kbBellShake { 0%,100%{transform:rotate(0)} 10%{transform:rotate(-12deg)} 20%{transform:rotate(12deg)} 30%{transform:rotate(-8deg)} 40%{transform:rotate(8deg)} 50%{transform:rotate(0)} }
    `;
    document.head.appendChild(_pbSt);
}


// ========== SMART NAVIGATION — "Xem" button routes to correct page ==========
const _KB_TASK_ROUTE_MAP = {
    'add/cmt đối tác': '/addcmtdoitackh',
    'đăng video': '/dangvideo',
    'đăng content': '/dangcontent',
    'đăng & tìm kh group': '/danggruop',
    'đăng tìm kh group': '/danggruop',
    'sedding cộng đồng': '/seddingcongdong',
    'đăng bản thân': '/dangbanthansp',
    'tuyển dụng sv': '/tuyendungsvkd',
    'tìm gr zalo': '/timgrzalovathongke',
};

function _kbSmartViewTask(taskName, userId, reportDate, taskType, taskRefId) {
    // Determine route based on task name
    const nameLower = (taskName || '').toLowerCase();
    let targetRoute = null;
    
    // Check if task has a dedicated dailylinks page
    for (const [pattern, route] of Object.entries(_KB_TASK_ROUTE_MAP)) {
        if (nameLower.includes(pattern)) {
            targetRoute = route;
            break;
        }
    }
    
    if (targetRoute) {
        // Has dedicated page → navigate there with user + date
        const url = targetRoute + '?sel_user=' + userId + '&sel_date=' + reportDate;
        window.open(url, '_blank');
    } else if (taskType === 'lock') {
        // CV Khóa → show detail modal popup
        _kbShowLockReviewModal(taskRefId, userId, reportDate);
    } else if (taskType === 'chain') {
        // CV Chuỗi → show detail modal popup
        _kbShowChainReviewModal(taskRefId, userId, reportDate);
    } else {
        // CV Điểm without dedicated page → go to Bàn Giao CV Điểm
        const url = '/bangiao-diem-kd?sel_user=' + userId + '&sel_date=' + reportDate;
        window.open(url, '_blank');
    }
}

// ========== LOCK TASK REVIEW MODAL ==========
async function _kbShowLockReviewModal(lockTaskId, userId, completionDate) {
    try {
        // Fetch lock task completion details
        const data = await apiCall('/api/lock-tasks/completion-detail?lock_task_id=' + lockTaskId + '&user_id=' + userId + '&date=' + completionDate);
        const comp = data.completion;
        const task = data.task;
        if (!comp) { alert('Không tìm thấy báo cáo CV Khóa này'); return; }
        
        const dateF = (comp.completion_date || '').split('-').reverse().join('/');
        const createdAt = comp.created_at ? new Date(comp.created_at).toLocaleString('vi-VN') : '';
        const proofHtml = comp.proof_url ? '<div style="margin-top:10px;"><img src="' + comp.proof_url + '" style="max-width:100%;max-height:300px;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;" onclick="window.open(this.src,\'_blank\')" /></div>' : '';
        
        const modal = document.createElement('div');
        modal.id = 'kbLockReviewModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;max-width:520px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);padding:0;">
                <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:18px 24px;border-radius:16px 16px 0 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;font-weight:700;">🔐 CV Khóa — Chi Tiết Báo Cáo</div>
                            <div style="font-size:16px;color:white;font-weight:800;margin-top:4px;">${task?.task_name || 'N/A'}</div>
                        </div>
                        <span onclick="this.closest('#kbLockReviewModal').remove()" style="color:white;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px;background:rgba(255,255,255,0.1);">✕</span>
                    </div>
                </div>
                <div style="padding:20px 24px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">👤 Nhân viên</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${comp.user_name || comp.username || ''}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">📅 Ngày báo cáo</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${dateF}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">⏰ Thời gian nộp</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${createdAt}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">🔄 Lần nộp</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">Lần ${(comp.redo_count || 0) + 1}</div>
                        </div>
                    </div>
                    ${comp.content ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:14px;"><div style="font-size:10px;color:#92400e;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📝 Nội dung báo cáo</div><div style="font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">' + comp.content + '</div></div>' : ''}
                    ${proofHtml ? '<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:14px;"><div style="font-size:10px;color:#065f46;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📸 Ảnh minh chứng</div>' + proofHtml + '</div>' : ''}
                    ${!comp.content && !comp.proof_url ? '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Không có nội dung hoặc ảnh minh chứng</div>' : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {
        console.error('Lock review modal error:', e);
        alert('Không thể tải chi tiết CV Khóa: ' + e.message);
    }
}

// ========== CHAIN TASK REVIEW MODAL ==========
async function _kbShowChainReviewModal(chainItemId, userId, deadline) {
    try {
        const data = await apiCall('/api/chain-tasks/completion-detail?chain_item_id=' + chainItemId + '&user_id=' + userId);
        const comp = data.completion;
        const item = data.item;
        if (!comp) { alert('Không tìm thấy báo cáo CV Chuỗi này'); return; }
        
        const dateF = (deadline || '').split('-').reverse().join('/');
        const createdAt = comp.created_at ? new Date(comp.created_at).toLocaleString('vi-VN') : '';
        const proofHtml = comp.proof_url ? '<div style="margin-top:10px;"><img src="' + comp.proof_url + '" style="max-width:100%;max-height:300px;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;" onclick="window.open(this.src,\'_blank\')" /></div>' : '';
        
        const modal = document.createElement('div');
        modal.id = 'kbChainReviewModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;max-width:520px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);padding:0;">
                <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:18px 24px;border-radius:16px 16px 0 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;font-weight:700;">🔗 CV Chuỗi — Chi Tiết Báo Cáo</div>
                            <div style="font-size:16px;color:white;font-weight:800;margin-top:4px;">${item?.task_name || 'N/A'}</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">${data.chain_name || ''}</div>
                        </div>
                        <span onclick="this.closest('#kbChainReviewModal').remove()" style="color:white;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px;background:rgba(255,255,255,0.1);">✕</span>
                    </div>
                </div>
                <div style="padding:20px 24px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">👤 Nhân viên</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${comp.user_name || comp.username || ''}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">📅 Deadline</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${dateF}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">⏰ Thời gian nộp</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${createdAt}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:12px;">
                            <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">📊 Số lượng</div>
                            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${comp.quantity_done || 0}/${item?.min_quantity || 1}</div>
                        </div>
                    </div>
                    ${comp.content ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:14px;"><div style="font-size:10px;color:#92400e;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📝 Nội dung báo cáo</div><div style="font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">' + comp.content + '</div></div>' : ''}
                    ${proofHtml ? '<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:14px;"><div style="font-size:10px;color:#065f46;font-weight:700;text-transform:uppercase;margin-bottom:6px;">📸 Ảnh minh chứng</div>' + proofHtml + '</div>' : ''}
                    ${!comp.content && !comp.proof_url ? '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Không có nội dung hoặc ảnh minh chứng</div>' : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch(e) {
        console.error('Chain review modal error:', e);
        alert('Không thể tải chi tiết CV Chuỗi: ' + e.message);
    }
}
 // Set of chain_item_ids forced for viewed user
const _kbRolePriority = { giam_doc: 5, quan_ly_cap_cao: 4, quan_ly: 3, truong_phong: 2, nhan_vien: 1, part_time: 0 };
const _kbRoleLabel = { giam_doc: '⭐ Giám đốc', quan_ly_cap_cao: '⭐ Quản lý cấp cao', quan_ly: '⭐ Quản lý', truong_phong: '⭐ Trưởng phòng', nhan_vien: 'Nhân viên', part_time: 'Part time' };
const _kbIsLeader = (role) => ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(role);

// ===== SELECTION PERSISTENCE — shared key with Bàn Giao =====
function _kbSaveSelection(sel) {
    try {
        const key = `kb_selection_${window._currentUser?.id || 'default'}`;
        localStorage.setItem(key, JSON.stringify(sel));
    } catch {}
}
function _kbGetSavedSelection() {
    try {
        const key = `kb_selection_${window._currentUser?.id || 'default'}`;
        return JSON.parse(localStorage.getItem(key));
    } catch { return null; }
}

// ===== REMOVE DEPT from sidebar (deactivate via API) =====
async function _kbRemoveDept(deptId, event) {
    if (event) event.stopPropagation();
    const name = event?.target?.closest?.('.kb-dept-header')?.dataset?.dept || 'phòng này';
    if (!confirm(`Xóa ${name} khỏi sidebar?\nDữ liệu công việc vẫn được giữ nguyên.\nCó thể thêm lại bất cứ lúc nào.`)) return;
    try {
        await apiCall('/api/task-points/deactivate-team', 'POST', { team_id: deptId });
        showToast(`✅ Đã xóa khỏi sidebar`);
        const container = document.getElementById('app');
        if (container) renderLichKhoaBieuPage(container);
    } catch(e) {
        showToast('Lỗi: ' + (e.message || 'Không thể xóa'), 'error');
    }
}
let _kbMonthlyHolidays = []; // holidays in the month
let _kbWeekStart = null;
let _kbViewUserId = null; // null = self
let _kbColorMap = {};
const _KB_DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

// ===== LINKED PAGE MAPPING: tasks that report via their own page, not the "Báo cáo" button =====
const _KB_LINKED_PAGES = [
    { re: /add.*cmt.*đối.*tác/i, page: '/addcmtdoitackh', label: 'Add/Cmt Đối Tác KH', icon: '👥' },
    { re: /đăng.*video/i, page: '/dangvideo', label: 'Đăng Video', icon: '🎬' },
    { re: /đăng.*content/i, page: '/dangcontent', label: 'Đăng Content', icon: '✍️' },
    { re: /đăng.*tìm.*kh.*group/i, page: '/danggruop', label: 'Đăng & Tìm KH Group', icon: '📢' },
    { re: /sedding.*cộng.*đồng/i, page: '/seddingcongdong', label: 'Sedding Cộng Đồng', icon: '🌐' },
    { re: /đăng.*bản.*thân/i, page: '/dangbanthansp', label: 'Đăng Bản Thân & SP', icon: '📸' },
    { re: /tìm.*gr.*zalo/i, page: '/timgrzalovathongke', label: 'Tìm Gr Zalo', icon: '🔍' },
    { re: /tuyển.*dụng.*sv/i, page: '/tuyendungsvkd', label: 'Tuyển Dụng SV KD', icon: '🎓' },
    { re: /gọi.*điện.*telesale/i, page: '/hethonggoidien', label: 'Gọi Điện Telesale', icon: '📞' },
    { re: /tự.*tìm.*kiếm.*telesale/i, page: '/hethonggoidien', label: 'Tự Tìm Kiếm Telesale', icon: '🔎' },
    { re: /nh[ấắ]n.*t[iì]m.*đ[ốồ]i.*t[áà]c.*kh/i, page: '/nhantintimdoitackh', label: 'Nhắn Tìm ĐT KH', icon: '🎵' },
    { re: /thông.*báo.*gr.*zalo.*spam/i, page: '/timgrzalovathongke', label: 'Thông Báo Gr Zalo Spam', icon: '📋' },
    { re: /setup.*spam.*zalo/i, page: '/hethongphanchiagrzalo', label: 'Nhóm Spam Zalo', icon: '🔥' },
];
function _kbGetLinkedPage(taskName) {
    if (!taskName) return null;
    for (const m of _KB_LINKED_PAGES) { if (m.re.test(taskName)) return m; }
    return null;
}

function _kbParseJSON(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch(e) { return []; }
}

// Auto-linkify URLs in text
function _kbLinkify(text) {
    if (!text) return '';
    return String(text).replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;" onclick="event.stopPropagation()">$1</a>');
}

function _kbGetColor(name) {
    if (!_kbColorMap[name]) {
        // Deterministic hash — same name always gets same color (synced with bangiao-diem)
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
        const idx = Math.abs(hash) % _KB_COLORS.length;
        _kbColorMap[name] = _KB_COLORS[idx];
    }
    return _kbColorMap[name];
}

// View report detail modal
async function _kbViewReport(el) {
    const data = JSON.parse(el.getAttribute('data-report').replace(/&quot;/g, '"'));

    // If task has a linked page → navigate there with user + date instead of modal
    const _vrLinkedPage = _kbGetLinkedPage(data.task_name);
    if (_vrLinkedPage) {
        const _vrUserId = data.user_id || (_kbViewUserId || currentUser?.id || '');
        const url = _vrLinkedPage.page + '?sel_user=' + _vrUserId + '&sel_date=' + (data.report_date || '');
        window.open(url, '_blank');
        return;
    }
    const statusMap = {
        approved: { label: '✅ Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
        pending: { label: '⏳ Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
        rejected: { label: '❌ Bị từ chối', color: '#dc2626', bg: '#fecaca' },
        expired: { label: '🚫 Hết hạn làm lại', color: '#6b7280', bg: '#f3f4f6' }
    };

    // Fetch report history
    let versions = [];
    if (data.template_id) {
        try {
            const uid = _kbViewUserId || currentUser.id;
            const res = await apiCall(`/api/schedule/report-history?template_id=${data.template_id}&report_date=${data.report_date}&user_id=${uid}`);
            versions = res.history || [];
        } catch(e) {}
    }

    // Fallback: if no history API or no versions, show single report
    if (versions.length === 0) {
        versions = [data];
    }

    let versionsHtml = '';
    versions.forEach((v, i) => {
        const s = statusMap[v.status] || statusMap.pending;
        const isLatest = i === 0;
        const redoNum = (v.redo_count || 0) + 1;
        const label = isLatest ? `Lần ${redoNum} (Mới nhất)` : `Lần ${redoNum}`;

        versionsHtml += `
        <div style="border:${isLatest ? '2px solid #3b82f6' : '1px solid #e5e7eb'};border-radius:10px;padding:14px;margin-bottom:12px;background:${isLatest ? '#f8fafc' : 'white'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:13px;font-weight:700;color:#1e293b;">📋 ${label}</span>
                <span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">${s.label}</span>
            </div>
            ${v.reject_reason ? `<div style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#dc2626;font-weight:700;margin-bottom:2px;">💬 Lý do từ chối:</div>
                <div style="font-size:12px;color:#7f1d1d;">${v.reject_reason}</div>
            </div>` : ''}
            ${v.content ? `<div style="padding:8px 12px;background:white;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:2px;">📝 Nội dung:</div>
                <div style="font-size:12px;color:#1e293b;">${v.content}</div>
            </div>` : ''}
            ${(() => { const qd = v.quantity || 0; const mq = v.min_quantity || data.min_quantity || 1; const isLow = qd < mq; return `<div style="padding:6px 12px;background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:700;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}</div>`; })()}
            ${v.report_value ? `<div style="padding:6px 12px;background:#eff6ff;border-radius:6px;margin-bottom:6px;">
                <a href="${v.report_value}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">🔗 Xem link báo cáo →</a>
            </div>` : ''}
            ${v.report_image ? `<div style="margin-top:6px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:4px;">🖼️ Hình ảnh:</div>
                <img src="${v.report_image}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${v.report_image}','_blank')">
            </div>` : ''}
        </div>`;
    });

    // Remove old modal
    let modal = document.getElementById('kbReportViewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbReportViewModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;';
    modal.innerHTML = `<div style="background:white;border-radius:16px;padding:0;width:480px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);position:relative;">
        <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:16px 22px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:16px;font-weight:800;color:white;">📊 ${data.task_name}</div>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">📅 ${data.report_date.split('-').reverse().join('/')}</div>
            </div>
            <button onclick="document.getElementById('kbReportViewModal').remove()" style="background:rgba(255,255,255,.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:18px 22px;">
            ${(() => {
                const t = versions[0] || data;
                let rq = '';
                if (t.guide_url) {
                    rq += `<div style="margin-bottom:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <div style="font-weight:700;font-size:11px;color:#166534;margin-bottom:4px;">📋 Hướng dẫn công việc</div>
                        <a href="${t.guide_url}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;word-break:break-all;">${t.guide_url} →</a>
                    </div>`;
                }
                if (t.input_requirements) {
                    rq += `<div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:8px;">
                        <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:6px;">📥 Yêu cầu đầu vào</div>
                        <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(t.input_requirements)}</div>
                    </div>`;
                }
                if (t.output_requirements) {
                    rq += `<div style="padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:8px;">
                        <div style="font-size:12px;color:#1d4ed8;font-weight:700;margin-bottom:6px;">📤 Yêu cầu đầu ra</div>
                        <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(t.output_requirements)}</div>
                    </div>`;
                }
                return rq ? `<div style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                    <div style="background:linear-gradient(135deg,#166534,#15803d);padding:10px 16px;">
                        <span style="color:white;font-weight:700;font-size:13px;">📋 Yêu cầu công việc</span>
                    </div>
                    <div style="padding:14px;">${rq}</div>
                </div>` : '';
            })()}
            <div style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:10px 16px;">
                    <span style="color:white;font-weight:700;font-size:13px;">📄 Báo cáo công việc</span>
                </div>
                <div style="padding:14px;">${versionsHtml}</div>
            </div>
            <div style="text-align:right;margin-top:8px;">
                <button onclick="document.getElementById('kbReportViewModal').remove()" style="padding:8px 20px;border-radius:8px;border:none;background:#1e3a5f;color:white;font-weight:700;cursor:pointer;font-size:13px;">Đóng</button>
            </div>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// Helper: render requirements list (JSON array or plain text) with numbered badges & clickable URLs
function _kbRenderReqList(rawValue) {
    let items = [];
    try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) items = parsed;
        else items = [String(rawValue)];
    } catch(e) {
        items = [String(rawValue)];
    }
    if (items.length === 0) return '';
    return items.map((item, i) => {
        const isUrl = /^https?:\/\//i.test(item);
        const display = isUrl
            ? `<a href="${item}" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;">${item}</a>`
            : `<span>${item}</span>`;
        const colors = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2'];
        const c = colors[i % colors.length];
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;${i > 0 ? 'border-top:1px solid rgba(0,0,0,0.06);' : ''}">
            <span style="min-width:22px;height:22px;border-radius:50%;background:${c};color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</span>
            <div style="font-size:12px;color:#1e293b;line-height:1.5;padding-top:1px;">${display}</div>
        </div>`;
    }).join('');
}

// ===== Approval Report View (CV Điểm) — with task requirements =====
async function _kbViewApprovalReport(el) {
    const data = JSON.parse(el.getAttribute('data-report').replace(/&quot;/g, '"'));
    const statusMap = {
        approved: { label: '✅ Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
        pending: { label: '⏳ Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
        rejected: { label: '❌ Bị từ chối', color: '#dc2626', bg: '#fecaca' },
        expired: { label: '🚫 Hết hạn', color: '#6b7280', bg: '#f3f4f6' }
    };

    // Task requirements section
    let reqHtml = '';
    if (data.guide_url) {
        reqHtml += `<div style="margin-bottom:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <div style="font-weight:700;font-size:11px;color:#166534;margin-bottom:4px;">📋 Hướng dẫn công việc</div>
            <a href="${data.guide_url}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;word-break:break-all;">${data.guide_url} →</a>
        </div>`;
    }
    if (data.input_requirements) {
        reqHtml += `<div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:8px;">
            <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:6px;">📥 Yêu cầu đầu vào</div>
            <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(data.input_requirements)}</div>
        </div>`;
    }
    if (data.output_requirements) {
        reqHtml += `<div style="padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:8px;">
            <div style="font-size:12px;color:#1d4ed8;font-weight:700;margin-bottom:6px;">📤 Yêu cầu đầu ra</div>
            <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(data.output_requirements)}</div>
        </div>`;
    }

    // Fetch report history
    let versions = [];
    if (data.template_id) {
        try {
            const res = await apiCall(`/api/schedule/report-history?template_id=${data.template_id}&report_date=${data.report_date}&user_id=${data.user_id || ''}`);
            versions = res.history || [];
        } catch(e) {}
    }
    if (versions.length === 0) versions = [data];

    let versionsHtml = '';
    versions.forEach((v, i) => {
        const s = statusMap[v.status] || statusMap.pending;
        const isLatest = i === 0;
        const redoNum = (v.redo_count || 0) + 1;
        const label = isLatest ? `Lần ${redoNum} (Mới nhất)` : `Lần ${redoNum}`;
        versionsHtml += `
        <div style="border:${isLatest ? '2px solid #3b82f6' : '1px solid #e5e7eb'};border-radius:10px;padding:14px;margin-bottom:12px;background:${isLatest ? '#f8fafc' : 'white'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:13px;font-weight:700;color:#1e293b;">📋 ${label}</span>
                <span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">${s.label}</span>
            </div>
            ${v.reject_reason ? `<div style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#dc2626;font-weight:700;margin-bottom:2px;">💬 Lý do từ chối:</div>
                <div style="font-size:12px;color:#7f1d1d;">${v.reject_reason}</div>
            </div>` : ''}
            ${v.content ? `<div style="padding:8px 12px;background:white;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:2px;">📝 Nội dung:</div>
                <div style="font-size:12px;color:#1e293b;">${v.content}</div>
            </div>` : ''}
            ${(() => { const qd = v.quantity || 0; const mq = v.min_quantity || data.min_quantity || 1; const isLow = qd < mq; return `<div style="padding:6px 12px;background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:700;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}</div>`; })()}
            ${v.report_value ? `<div style="padding:6px 12px;background:#eff6ff;border-radius:6px;margin-bottom:6px;">
                <a href="${v.report_value}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">🔗 Xem link báo cáo →</a>
            </div>` : ''}
            ${v.report_image ? `<div style="margin-top:6px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:4px;">🖼️ Hình ảnh:</div>
                <img src="${v.report_image}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${v.report_image}','_blank')">
            </div>` : ''}
        </div>`;
    });

    let modal = document.getElementById('kbReportViewModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'kbReportViewModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:white;border-radius:16px;padding:0;width:500px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:16px 22px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:16px;font-weight:800;color:white;">📊 ${data.task_name}</div>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">📅 ${data.report_date.split('-').reverse().join('/')}</div>
            </div>
            <button onclick="document.getElementById('kbReportViewModal').remove()" style="background:rgba(255,255,255,.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:18px 22px;">
            ${reqHtml ? `<div style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <div style="background:linear-gradient(135deg,#166534,#15803d);padding:10px 16px;">
                    <span style="color:white;font-weight:700;font-size:13px;">📋 Yêu cầu công việc</span>
                </div>
                <div style="padding:14px;">${reqHtml}</div>
            </div>` : ''}
            <div style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:10px 16px;">
                    <span style="color:white;font-weight:700;font-size:13px;">📄 Báo cáo công việc</span>
                </div>
                <div style="padding:14px;">${versionsHtml}</div>
            </div>
            <div style="text-align:right;margin-top:8px;">
                <button onclick="document.getElementById('kbReportViewModal').remove()" style="padding:8px 20px;border-radius:8px;border:none;background:#1e3a5f;color:white;font-weight:700;cursor:pointer;font-size:13px;">Đóng</button>
            </div>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// ===== Approval Report View (CV Khóa) — with task requirements =====
async function _kbViewLockApprovalReport(lockTaskId, userId, completionDate) {
    const statusMap = {
        approved: { label: '✅ Hoàn thành', color: '#16a34a', bg: '#dcfce7' },
        pending: { label: '⏳ Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
        rejected: { label: '❌ Bị từ chối', color: '#dc2626', bg: '#fecaca' },
        expired: { label: '🚫 Hết hạn', color: '#6b7280', bg: '#f3f4f6' }
    };

    // Fetch task detail + completions
    let taskDetail = null, completions = [];
    try {
        const [tRes, cRes] = await Promise.all([
            apiCall(`/api/lock-tasks/${lockTaskId}`),
            apiCall(`/api/lock-tasks/${lockTaskId}/completions?user_id=${userId}&date=${completionDate}`)
        ]);
        taskDetail = tRes.task || tRes;
        completions = cRes.completions || [];
    } catch(e) {}

    // Task requirements
    let reqHtml = '';
    if (taskDetail) {
        if (taskDetail.guide_link) {
            reqHtml += `<div style="margin-bottom:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                <div style="font-weight:700;font-size:11px;color:#166534;margin-bottom:4px;">📋 Hướng dẫn công việc</div>
                <a href="${taskDetail.guide_link}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;word-break:break-all;">${taskDetail.guide_link} →</a>
            </div>`;
        }
        if (taskDetail.input_requirements) {
            reqHtml += `<div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:8px;">
                <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:6px;">📥 Yêu cầu đầu vào</div>
                <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(taskDetail.input_requirements)}</div>
            </div>`;
        }
        if (taskDetail.output_requirements) {
            reqHtml += `<div style="padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:8px;">
                <div style="font-size:12px;color:#1d4ed8;font-weight:700;margin-bottom:6px;">📤 Yêu cầu đầu ra</div>
                <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(taskDetail.output_requirements)}</div>
            </div>`;
        }
    }

    // Completions (versions)
    let versionsHtml = '';
    completions.forEach((v, i) => {
        const s = statusMap[v.status] || statusMap.pending;
        const isLatest = i === 0;
        const redoNum = (v.redo_count || 0) + 1;
        const label = isLatest ? `Lần ${redoNum} (Mới nhất)` : `Lần ${redoNum}`;
        versionsHtml += `
        <div style="border:${isLatest ? '2px solid #3b82f6' : '1px solid #e5e7eb'};border-radius:10px;padding:14px;margin-bottom:12px;background:${isLatest ? '#f8fafc' : 'white'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:13px;font-weight:700;color:#1e293b;">📋 ${label}</span>
                <span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">${s.label}</span>
            </div>
            ${v.reject_reason ? `<div style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#dc2626;font-weight:700;margin-bottom:2px;">💬 Lý do từ chối:</div>
                <div style="font-size:12px;color:#7f1d1d;">${v.reject_reason}</div>
            </div>` : ''}
            ${v.content ? `<div style="padding:8px 12px;background:white;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:2px;">📝 Nội dung:</div>
                <div style="font-size:12px;color:#1e293b;">${v.content}</div>
            </div>` : ''}
            ${(() => { const qd = v.quantity_done || 0; const mq = taskDetail?.min_quantity || 1; const isLow = qd < mq; return `<div style="padding:6px 12px;background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:700;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}</div>`; })()}
            ${v.proof_url ? `<div style="padding:6px 12px;background:#eff6ff;border-radius:6px;margin-bottom:6px;">
                ${v.proof_url.startsWith('/uploads') ? `<div style="margin-top:4px;"><img src="${v.proof_url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${v.proof_url}','_blank')"></div>` : `<a href="${v.proof_url}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">🔗 Xem link →</a>`}
            </div>` : ''}
        </div>`;
    });

    if (!versionsHtml) versionsHtml = '<div style="color:#9ca3af;text-align:center;padding:20px;">Không có dữ liệu báo cáo</div>';

    const taskName = taskDetail?.task_name || 'Công việc khóa';

    let modal = document.getElementById('kbReportViewModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'kbReportViewModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:white;border-radius:16px;padding:0;width:500px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:16px 22px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:16px;font-weight:800;color:white;">🔐 ${taskName}</div>
                <div style="font-size:11px;color:#fca5a5;margin-top:3px;">📅 ${completionDate.split('-').reverse().join('/')}</div>
            </div>
            <button onclick="document.getElementById('kbReportViewModal').remove()" style="background:rgba(255,255,255,.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:18px 22px;">
            ${reqHtml ? `<div style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <div style="background:linear-gradient(135deg,#166534,#15803d);padding:10px 16px;">
                    <span style="color:white;font-weight:700;font-size:13px;">📋 Yêu cầu công việc</span>
                </div>
                <div style="padding:14px;">${reqHtml}</div>
            </div>` : ''}
            <div style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:10px 16px;">
                    <span style="color:white;font-weight:700;font-size:13px;">📄 Báo cáo công việc</span>
                </div>
                <div style="padding:14px;">${versionsHtml}</div>
            </div>
            <div style="text-align:right;margin-top:8px;">
                <button onclick="document.getElementById('kbReportViewModal').remove()" style="padding:8px 20px;border-radius:8px;border:none;background:#991b1b;color:white;font-weight:700;cursor:pointer;font-size:13px;">Đóng</button>
            </div>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function _kbFmtDate(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
function _kbDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

let _kbAllDepts = [];
let _kbActiveDeptIds = [];

async function renderLichKhoaBieuPage(container) {
    _kbWeekStart = null;
    _kbViewUserId = null;
    _kbColorMap = {};
    _kbAllDepts = [];
    _kbActiveDeptIds = [];

    const isManager = ['giam_doc','quan_ly','truong_phong','quan_ly_cap_cao'].includes(currentUser.role);

    let membersHtml = '';
    if (isManager) {
        try {
            // Fetch members AND departments in parallel
            const [m, dData] = await Promise.all([
                apiCall('/api/schedule/team-members'),
                apiCall('/api/task-points/departments')
            ]);
            const members = m.members || [];
            const overrideUserIds = new Set(m.override_user_ids || []);
            const rawDepts = (dData.departments || []).filter(d => !d.name.toUpperCase().includes('AFFILIATE'));
            const activeDeptIds = new Set(dData.active_dept_ids || []);
            _kbAllDepts = rawDepts;
            _kbActiveDeptIds = [...activeDeptIds];
            const allApprovers = dData.approvers || [];

            // Identify system-level departments (HỆ THỐNG...)
            const systemDepts = rawDepts.filter(d => d.name.startsWith('HỆ THỐNG'));
            const nonSystemDepts = rawDepts.filter(d => !d.name.startsWith('HỆ THỐNG'));

            // Group members by dept name
            const byDept = {};
            members.forEach(u => {
                const dn = u.dept_name || 'Không phòng ban';
                if (!byDept[dn]) byDept[dn] = [];
                byDept[dn].push(u);
            });

            const memberDeptNames = new Set(Object.keys(byDept));

            // Helper: render members for a dept
            const renderDeptMembers = (dept, isChild) => {
                let deptMembers = (byDept[dept.name] || []).slice();
                const deptApprovers = allApprovers.filter(a => a.department_id === dept.id);
                const approverIdSet = new Set();
                deptApprovers.forEach(a => {
                    approverIdSet.add(a.user_id);
                    if (!deptMembers.some(mm => mm.id === a.user_id)) {
                        deptMembers.push({ id: a.user_id, full_name: a.full_name, username: a.username, role: a.role, dept_name: dept.name, _isApprover: true });
                    }
                });
                deptMembers.forEach(mm => { if (approverIdSet.has(mm.id)) mm._isApprover = true; });
                deptMembers.sort((a, b) => {
                    const aP = (a._isApprover ? 10 : 0) + (a._is_dept_head ? 10 : 0) + (_kbRolePriority[a.role] || 0);
                    const bP = (b._isApprover ? 10 : 0) + (b._is_dept_head ? 10 : 0) + (_kbRolePriority[b.role] || 0);
                    return bP - aP;
                });
                let html = '';
                deptMembers.forEach(u => {
                    const isDeptHead = u._is_dept_head;
                    const isApprover = u._isApprover;
                    const isLead = isDeptHead || _kbIsLeader(u.role) || isApprover;
                    const roleTag = isApprover ? '⭐ Quản Lý' : (isDeptHead ? '⭐ Trưởng phòng' : (_kbRoleLabel[u.role] || u.role));
                    const nameStyle = `font-weight:${isLead ? '700' : '500'};`;
                    const roleStyle = `font-size:10px;${isLead ? 'color:#d97706;font-weight:700;' : 'color:#94a3b8;'}`;
                    const _canForce = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role);
                    const _forceGear = _canForce ? `<span onclick="event.stopPropagation();_kbShowForceApprovalSetup(${u.id},'${(u.full_name||'').replace(/'/g,"\\\\'")}')" title="Kiểm soát CV" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;font-size:13px;cursor:pointer;flex-shrink:0;opacity:0.35;transition:all .15s;" onmouseover="this.style.opacity='1';this.style.background='#e2e8f0'" onmouseout="this.style.opacity='0.35';this.style.background='transparent'">⚙️</span>` : '';
                    html += `
                        <div class="kb-member-item" data-uid="${u.id}" data-name="${u.full_name}" data-dept="${dept.name}" onclick="_kbSelectMember(${u.id})" style="padding:9px 14px ${isChild ? '9px 32px' : '9px 18px'};font-size:13px;color:#1e293b;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:all .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                            onmouseover="if(!this.classList.contains('kb-active'))this.style.background='#f8fafc'"
                            onmouseout="if(!this.classList.contains('kb-active'))this.style.background='white'">
                            <div style="flex:1;min-width:0;">
                                <div style="${nameStyle}font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${u.full_name}${overrideUserIds.has(u.id) ? '<span title="Đã tùy chỉnh công việc" style="display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;line-height:1;flex-shrink:0;box-shadow:0 1px 3px rgba(217,119,6,0.3);">✏️ TC</span>' : ''}</div>
                                <div style="${roleStyle}margin-top:1px;">${roleTag}</div>
                            </div>
                            ${_forceGear}
                        </div>`;
                });
                return html;
            };

            // Build sidebar grouped by HỆ THỐNG
            let deptListHtml = '';
            systemDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            systemDepts.forEach(sys => {
                // Get active child depts under this system
                let childDepts = nonSystemDepts.filter(d => d.parent_id === sys.id && activeDeptIds.has(d.id));
                // For non-giam_doc: filter depts that have members
                if (['quan_ly','truong_phong','quan_ly_cap_cao'].includes(currentUser.role)) {
                    childDepts = childDepts.filter(d => memberDeptNames.has(d.name) || nonSystemDepts.some(sub => sub.parent_id === d.id && memberDeptNames.has(sub.name)));
                }
                // Also add parent depts of active sub-teams
                childDepts.forEach(d => {
                    if (d.parent_id === sys.id) {
                        const subTeams = nonSystemDepts.filter(sub => sub.parent_id === d.id && activeDeptIds.has(sub.id));
                        if (subTeams.length > 0 && !childDepts.includes(d)) childDepts.push(d);
                    }
                });
                childDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                const memberIdSet = new Set(members.map(m => m.id));
                const hasSysApprovers = allApprovers.some(a => a.department_id === sys.id && (currentUser.role === 'giam_doc' || memberIdSet.has(a.user_id)));
                if (childDepts.length === 0 && !hasSysApprovers && currentUser.role !== 'giam_doc') return;

                // System header with expand/collapse
                deptListHtml += `<div class="kb-system-header" data-sys-id="${sys.id}" onclick="_kbToggleSystem(${sys.id})" style="padding:10px 14px;font-size:13px;font-weight:900;color:#fff;text-transform:uppercase;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-bottom:2px solid #0f172a;margin-top:6px;box-shadow:0 3px 10px rgba(15,23,42,0.35);border-radius:8px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;transition:all .2s;cursor:pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    <span style="font-size:15px;">🏛️</span>
                    <span style="flex:1;">${sys.name}</span>
                    <span class="kb-sys-arrow" style="font-size:10px;opacity:0.7;transition:transform .2s;">▼</span>
                </div>`;

                // Collapsible content
                deptListHtml += `<div class="kb-sys-content" data-sys-id="${sys.id}">`;

                // System-level approvers (quản lý cấp cao) — non-GĐ only sees those in their scope
                const sysApprovers = allApprovers.filter(a => a.department_id === sys.id && (currentUser.role === 'giam_doc' || memberIdSet.has(a.user_id)));
                sysApprovers.forEach(a => {
                    deptListHtml += `
                        <div class="kb-member-item" data-uid="${a.user_id}" data-name="${a.full_name}" data-dept="${sys.name}" onclick="_kbSelectMember(${a.user_id})" style="padding:9px 14px 9px 18px;font-size:13px;color:#1e293b;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:all .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                            onmouseover="if(!this.classList.contains('kb-active'))this.style.background='#f8fafc'"
                            onmouseout="if(!this.classList.contains('kb-active'))this.style.background='white'">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${a.full_name}${overrideUserIds.has(a.user_id) ? '<span title="Đã tùy chỉnh công việc" style="display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;line-height:1;flex-shrink:0;box-shadow:0 1px 3px rgba(217,119,6,0.3);">✏️ TC</span>' : ''}</div>
                                <div style="font-size:10px;color:#d97706;font-weight:700;margin-top:1px;">⭐ Quản lý cấp cao</div>
                            </div>
                        </div>`;
                });

                let parentStt = 0, childStt = 0;
                childDepts.forEach(dept => {
                    const isSubTeam = childDepts.some(p => p.id === dept.parent_id);
                    // Get sub-teams of this dept
                    const subTeams = nonSystemDepts.filter(sub => sub.parent_id === dept.id && activeDeptIds.has(sub.id))
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                    if (!isSubTeam) {
                        parentStt++;
                        childStt = 0;
                    }
                    const sttLabel = !isSubTeam
                        ? `<span style="color:#0f172a;font-size:12px;font-weight:900;margin-right:5px;background:rgba(255,255,255,0.85);padding:1px 6px;border-radius:4px;">${parentStt}.</span>`
                        : `<span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${++childStt}.</span>`;
                    const deleteBtn = (!isSubTeam && currentUser.role === 'giam_doc') ? `<span onclick="_kbRemoveDept(${dept.id}, event)" title="Xóa phòng khỏi sidebar" style="font-size:11px;opacity:0.5;cursor:pointer;margin-left:2px;" onmouseover="this.style.opacity='1';this.style.color='#ef4444'" onmouseout="this.style.opacity='0.5';this.style.color=''">🗑️</span>` : '';
                    deptListHtml += `<div class="kb-dept-header" data-dept="${dept.name}" data-dept-id="${dept.id}" style="padding:${isSubTeam ? '7px 14px 7px 28px' : '10px 14px'};font-size:${isSubTeam ? '11px' : '13px'};font-weight:900;color:${isSubTeam ? '#475569' : '#fff'};text-transform:uppercase;background:${isSubTeam ? 'linear-gradient(135deg,#f1f5f9,#e8eef5)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)'};border-bottom:${isSubTeam ? '1px solid #e2e8f0' : '2px solid #1e40af'};${isSubTeam ? 'border-left:3px solid #93c5fd;' : 'margin-top:4px;box-shadow:0 2px 8px rgba(37,99,235,0.25);border-radius:6px;'}letter-spacing:${isSubTeam ? '0.3px' : '0.5px'};display:flex;align-items:center;gap:6px;transition:all .2s;cursor:default;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${sttLabel}${isSubTeam ? '<span style="color:#94a3b8;">└</span> ' : '<span style="font-size:14px;">🏢</span> '}<span style="flex:1;">${dept.name}</span>${deleteBtn}</div>`;
                    deptListHtml += renderDeptMembers(dept, isSubTeam);

                    // Render sub-teams
                    subTeams.forEach(sub => {
                        childStt++;
                        deptListHtml += `<div class="kb-dept-header" data-dept="${sub.name}" data-dept-id="${sub.id}" style="padding:7px 14px 7px 28px;font-size:11px;font-weight:900;color:#475569;text-transform:uppercase;background:linear-gradient(135deg,#f1f5f9,#e8eef5);border-bottom:1px solid #e2e8f0;border-left:3px solid #93c5fd;letter-spacing:0.3px;display:flex;align-items:center;gap:6px;transition:all .2s;cursor:default;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"><span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${childStt}.</span><span style="color:#94a3b8;">└</span> <span style="flex:1;">${sub.name}</span></div>`;
                        deptListHtml += renderDeptMembers(sub, true);
                    });
                });
                deptListHtml += `</div>`;
            });


            membersHtml = `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;width:230px;min-width:230px;overflow-y:auto;max-height:calc(100vh - 140px);box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px 12px 0 0;">
                    <input type="text" id="kbMemberSearch" placeholder="🔍 Tìm nhân viên..." 
                           oninput="_kbFilterMembers()" 
                           style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;color:#1e293b;background:white;outline:none;" 
                           onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,0.1)'" 
                           onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'" />
                </div>
                <div id="kbMemberList">
                    <div class="kb-member-item kb-active" data-uid="" data-name="Lịch của tôi" onclick="_kbSelectMember(null)" style="padding:12px 16px;font-size:14px;color:#122546;cursor:pointer;border-bottom:1px solid #e2e8f0;border-left:3px solid #2563eb;background:#eff6ff;font-weight:700;display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;">📋</span> Lịch của tôi
                    </div>
                    ${deptListHtml}
                </div>
            </div>`;
        } catch(e) {}
    }

    const isGD = currentUser.role === 'giam_doc';
    const hasApprovalScope = isManager; // Will be refined after loading approvers

    container.innerHTML = `
    <div style="max-width:1500px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">📋 Lịch Khóa Biểu Công Việc</h2>
                ${isGD ? `<button onclick="_kbShowSetupTab()" id="kbSetupBtn" style="padding:6px 14px;font-size:12px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">⚙️ Setup Người Duyệt</button>` : ''}
                ${isGD ? `<button onclick="_kbShowCreateDeptModal()" style="padding:6px 14px;font-size:12px;border:1px dashed #16a34a;border-radius:8px;background:rgba(22,163,74,0.04);color:#16a34a;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='rgba(22,163,74,0.04)'">＋ Tạo mới</button>` : ''}
                ${isGD ? `<button onclick="_kbShowReorderModal()" style="padding:6px 14px;font-size:12px;border:1px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">🔢 STT</button>` : ''}
                <button onclick="_kbShowUnreportedModal()" style="padding:6px 14px;font-size:12px;border:1px solid #dc2626;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fef2f2'">🔍 CV Chưa BC</button>
            </div>
            <div id="kbViewingLabel" style="font-size:13px;color:#6b7280;"></div>
        </div>
        <div id="kbSetupPanel" style="display:none;margin-bottom:16px;"></div>
        <div id="kbApprovalPanel" style="margin-bottom:14px;"></div>
        <div id="kbMyPendingBanner" style="margin-bottom:14px;"></div>
        <div id="kbSupportPanel" style="margin-bottom:14px;"></div>
        <div style="display:flex;gap:16px;">
            ${membersHtml}
            <div style="flex:1;">
                <div id="kbStatsBar" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;"></div>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">⚠️</span>
                    <span style="font-size:12px;color:#92400e;font-weight:500;">Mỗi ngày tối đa <strong>100 điểm</strong>. Nếu tổng điểm CV trong ngày vượt 100đ, hệ thống chỉ tính tối đa 100đ cho ngày đó.</span>
                </div>
                <div id="kbGridWrap" style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow-x:auto;">
                    <div style="text-align:center;padding:40px;color:#9ca3af;">Đang tải...</div>
                </div>
            </div>
        </div>
    </div>`;

    // Priority: CV Phạt target user → select that user directly
    const ptUser = sessionStorage.getItem('_ptTargetUser');
    if (ptUser) {
        const ptMemberEl = document.querySelector(`.kb-member-item[data-uid="${ptUser}"]`);
        if (ptMemberEl) {
            _kbSelectMember(ptUser);
        } else {
            // User not in sidebar (NV viewing own schedule)
            _kbLoadSchedule();
        }
    } else {
        // Restore saved selection or default to "Lịch của tôi"
        const kbSaved = _kbGetSavedSelection();
        if (kbSaved && kbSaved.userId) {
            const memberEl = document.querySelector(`.kb-member-item[data-uid="${kbSaved.userId}"]`);
            if (memberEl) {
                _kbSelectMember(kbSaved.userId);
            } else {
                _kbLoadSchedule();
            }
        } else {
            _kbLoadSchedule();
        }
    }
    if (hasApprovalScope) _kbLoadApprovalPanel();
    if (hasApprovalScope) _kbLoadSupportPanel();
    _kbLoadMyPendingBanner(); // Show pending notification for employees
    _kbCheckRejectedPopup();
    setTimeout(() => _kbCheckForceApprovalNotification(), 3000);
}

function _kbSelectMember(userId) {
    _kbViewUserId = userId;
    _kbWeekStart = null;
    _kbColorMap = {};
    // Get user name from sidebar element
    const memberEl = userId ? document.querySelector(`.kb-member-item[data-uid="${userId}"]`) : null;
    _kbViewUserName = memberEl?.dataset?.name || '';
    // Highlight — light blue for selected, white for others
    document.querySelectorAll('.kb-member-item').forEach(el => {
        const isActive = (el.dataset.uid === '' && userId === null) || (el.dataset.uid == userId);
        el.classList.toggle('kb-active', isActive);
        el.style.background = isActive ? '#eff6ff' : 'white';
        el.style.color = isActive ? '#1e40af' : '#1e293b';
        el.style.fontWeight = isActive ? '700' : '400';
        el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
        el.style.borderRadius = '';
    });
    // Save selection
    _kbSaveSelection({ userId, userName: _kbViewUserName });
    _kbLoadSchedule();
}

async function _kbLoadSchedule() {
    // Init week
    if (!_kbWeekStart) {
        // Check if navigating from CV Phạt page with a target week
        const ptWeek = sessionStorage.getItem('_ptTargetWeek');
        if (ptWeek) {
            sessionStorage.removeItem('_ptTargetWeek');
            sessionStorage.removeItem('_ptTargetUser');
            const wd = new Date(ptWeek + 'T00:00:00');
            _kbWeekStart = new Date(wd.getFullYear(), wd.getMonth(), wd.getDate());
        } else {
            const now = new Date();
            const day = now.getDay();
            const mon = new Date(now);
            mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            _kbWeekStart = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
        }
    }

    const monStr = _kbDateStr(_kbWeekStart);
    const sun = new Date(_kbWeekStart); sun.setDate(_kbWeekStart.getDate() + 6);
    const sunStr = _kbDateStr(sun);

    // Load ALL data in ONE request via consolidated dashboard API
    try {
        const uid = _kbViewUserId || currentUser.id;
        const viewMonth = _kbWeekStart.getMonth();
        const viewYear = _kbWeekStart.getFullYear();

        const data = await apiCall(`/api/schedule/dashboard?user_id=${uid}&week_start=${monStr}`);

        _kbTasks = data.tasks || [];

        _kbReports = {};
        (data.reports || []).forEach(rep => {
            const key = `${rep.template_id}_${rep.report_date.slice(0,10)}`;
            _kbReports[key] = rep;
            // Also index by task_name for fallback matching (when snapshot has null template_id)
            if (rep.task_name) {
                const nameKey = `name_${rep.task_name}_${rep.report_date.slice(0,10)}`;
                _kbReports[nameKey] = rep;
            }
        });

        _kbSummary = {};
        (data.weekly_summary || []).forEach(row => { _kbSummary[row.report_date.slice(0,10)] = row; });

        _kbHolidayMap = data.holidays_week || {};

        _kbMonthlySummary = (data.monthly_summary || []).reduce((s, r) => s + Number(r.total_points || 0), 0);

        _kbMonthlyHolidays = (data.holidays_year || []).filter(hol => {
            const dd = new Date(hol.holiday_date);
            return dd.getMonth() === viewMonth;
        });

        // Store user overrides
        _kbOverridesDiem = data.overrides_diem || {};
        _kbOverridesKhoa = data.overrides_khoa || {};

        // Store force approval data
        _kbForceApproval = data.force_approval || false;
        _kbForceScheduleIds = new Set(data.force_schedule_ids || []);
        _kbForceLockIds = new Set(data.force_lock_ids || []);
        _kbForceChainIds = new Set(data.force_chain_ids || []);
    } catch(e) {
        _kbTasks = []; _kbReports = {}; _kbSummary = {};
        _kbHolidayMap = {}; _kbMonthlySummary = 0; _kbMonthlyHolidays = [];
    }

    // Update label
    const lbl = document.getElementById('kbViewingLabel');
    if (lbl) {
        if (_kbViewUserId) {
            const el = document.querySelector(`.kb-member-item[data-uid="${_kbViewUserId}"]`);
            const name = el ? el.textContent.trim().split('(')[0].trim() : 'NV';
            lbl.innerHTML = `<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:6px;font-weight:600;">👤 Đang xem: ${name}</span>`;
        } else {
            lbl.innerHTML = `<span style="background:#ecfdf5;color:#059669;padding:3px 10px;border-radius:6px;font-weight:600;">📋 Lịch của tôi</span>`;
        }
    }

    // Load support requests for this week
    try {
        const uid = _kbViewUserId || currentUser.id;
        const srData = await apiCall(`/api/task-support/my-requests?user_id=${uid}&week_start=${monStr}&week_end=${sunStr}`);
        _kbSupportRequests = {};
        (srData.requests || []).forEach(sr => {
            _kbSupportRequests[`${sr.template_id}_${sr.task_date}`] = sr;
        });
    } catch(e) {
        _kbSupportRequests = {};
    }

    // Load CV Khóa tasks for this week
    try {
        const uid = _kbViewUserId || currentUser.id;
        const ltData = await apiCall(`/api/lock-tasks/calendar?user_id=${uid}&week_start=${monStr}`);
        _kbLockTasks = ltData.tasks || [];
        _kbLockCompletions = {};
        window._kbLockCompAllVersions = {};
        (ltData.completions || []).forEach(c => {
            const key = `${c.lock_task_id}_${c.completion_date.slice(0,10)}`;
            // Store latest (first in sorted list = highest redo_count) for grid display
            if (!_kbLockCompletions[key]) _kbLockCompletions[key] = c;
            // Store ALL versions for history modal
            if (!window._kbLockCompAllVersions[key]) window._kbLockCompAllVersions[key] = [];
            window._kbLockCompAllVersions[key].push(c);
        });
        _kbLockHolidays = new Set(ltData.holidays || []);
        // Store lock support requests
        window._kbLockSupportRequests = {};
        (ltData.supportRequests || []).forEach(sr => {
            const dateStr = typeof sr.task_date === 'string' ? sr.task_date.slice(0,10) : '';
            window._kbLockSupportRequests[`${sr.lock_task_id}_${dateStr}`] = sr;
        });
    } catch(e) {
        _kbLockTasks = []; _kbLockCompletions = {}; _kbLockHolidays = new Set();
        window._kbLockSupportRequests = {};
    }
    // Load CV Chuỗi (chain task items) for this week
    try {
        const uid2 = _kbViewUserId || currentUser.id;
        const chainData = await apiCall(`/api/chain-tasks/calendar?user_id=${uid2}&week_start=${monStr}`);
        _kbChainItems = chainData.items || [];
    } catch(e) {
        _kbChainItems = [];
    }

    _kbRenderStats();
    _kbRenderGrid();
    _kbInjectSelfSearchStats();
    _kbInjectTelesaleStats();
    _kbInjectPartnerOutreachStats();
    _kbInjectAddCmtStats();
    _kbInjectDangVideoStats();
    _kbInjectDangContentStats();
    _kbInjectDangGroupStats();
    _kbInjectTuyenDungStats();
    _kbInjectSeddingStats();
    _kbInjectZaloStats();
    _kbInjectDangBTStats();
}

function _kbChangeWeek(offset) {
    if (!_kbWeekStart) return;
    const d = new Date(_kbWeekStart);
    d.setDate(d.getDate() + offset * 7);
    _kbWeekStart = d;
    _kbLoadSchedule();
}

// ===== STAT CARDS =====
function _kbRenderStats() {
    const bar = document.getElementById('kbStatsBar');
    if (!bar) return;

    const now = new Date();
    const viewMonth = _kbWeekStart.getMonth();
    const viewYear = _kbWeekStart.getFullYear();
    const lastDay = new Date(viewYear, viewMonth+1, 0).getDate();

    // Count working days (Mon-Sat) minus holidays
    let workingDays = 0;
    const holidayDates = new Set(_kbMonthlyHolidays.map(h => h.holiday_date.slice(0,10)));
    for (let day = 1; day <= lastDay; day++) {
        const d = new Date(viewYear, viewMonth, day);
        const dow = d.getDay(); // 0=Sun, 1=Mon...6=Sat
        if (dow >= 1 && dow <= 6) { // Mon-Sat
            const ds = _kbDateStr(d);
            if (!holidayDates.has(ds)) workingDays++;
        }
    }

    // Today's points (capped at 100)
    const todayStr = _kbDateStr(now);
    const todayEarnedRaw = Number(_kbSummary[todayStr]?.total_points || 0);
    const todayEarned = Math.min(todayEarnedRaw, 100);

    // Week points (Mon-Sun, each day capped at 100)
    let weekEarned = 0;
    const sunDate = new Date(_kbWeekStart); sunDate.setDate(_kbWeekStart.getDate() + 6);
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(_kbWeekStart); colDate.setDate(_kbWeekStart.getDate() + d - 1);
        const ds = _kbDateStr(colDate);
        if (_kbSummary[ds]) weekEarned += Math.min(Number(_kbSummary[ds].total_points || 0), 100);
    }

    // Month max = days in month × 100
    const monthMax = lastDay * 100;
    const weekMax = 700;
    const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    const card = (icon, label, value, sub, color) => `
        <div style="background:white;border:2px solid ${color};border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">${icon} ${label}</div>
            <div style="font-size:26px;font-weight:800;color:${color};line-height:1;">${value}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${sub}</div>
        </div>`;

    bar.innerHTML = 
        card('📅', 'SỐ NGÀY CÔNG NHẬT', workingDays, `${monthNames[viewMonth]} — T2→T7 trừ lễ`, '#122546') +
        card('⭐', 'ĐIỂM NGÀY', `${todayEarned}/100`, `Hôm nay ${_kbFmtDate(now)}`, '#dc2626') +
        card('📊', 'ĐIỂM TUẦN', `${weekEarned}/${weekMax}`, `T2→CN (${_kbFmtDate(_kbWeekStart)}—${_kbFmtDate(sunDate)})`, '#d97706') +
        card('🏆', 'ĐIỂM TỔNG THÁNG', `${_kbMonthlySummary}/${monthMax}`, `${monthNames[viewMonth]} ${viewYear}`, '#16a34a');
}

function _kbRenderGrid() {
    const wrap = document.getElementById('kbGridWrap');
    if (!wrap) return;

    // Inject approval badge pulse animation (once)
    if (!document.getElementById('_kbPulseStyle')) {
        const s = document.createElement('style');
        s.id = '_kbPulseStyle';
        s.textContent = '@keyframes _kbPulse { 0%,100%{transform:scale(1);box-shadow:0 2px 6px rgba(217,119,6,0.4)} 50%{transform:scale(1.08);box-shadow:0 3px 10px rgba(217,119,6,0.6)} } @keyframes _kbPendingPulse { 0%,100%{opacity:1;box-shadow:0 2px 8px rgba(245,158,11,0.4)} 50%{opacity:0.85;box-shadow:0 3px 14px rgba(245,158,11,0.7)} }';
        document.head.appendChild(s);
    }

    // Colors (hash-based — deterministic)
    _kbColorMap = {};
    const uniqueNames = [...new Set(_kbTasks.map(t => t.task_name))];
    uniqueNames.forEach(n => _kbGetColor(n));

    // Group by column (1=Mon..7=Sun) using _date or day_of_week
    const byDay = {};
    for (let d = 1; d <= 7; d++) byDay[d] = [];
    const monDate0 = new Date(_kbWeekStart);
    _kbTasks.forEach(t => {
        let col = t.day_of_week;
        if (t._date) {
            // Calculate column from date
            const td = new Date(t._date + 'T00:00:00');
            const diff = Math.round((td - monDate0) / 86400000);
            col = diff + 1; // 1-based
        }
        if (col >= 1 && col <= 7 && byDay[col]) byDay[col].push(t);
    });

    // Slots
    const allSlots = new Set();
    _kbTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort();

    // Week dates
    const monDate = new Date(_kbWeekStart);
    const sunDate2 = new Date(monDate); sunDate2.setDate(monDate.getDate() + 6);

    // Calculate earned points per day
    const earnedPerDay = {};
    const totalPerDay = {};
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateStr = _kbDateStr(colDate);
        let earned = 0;
        if (_kbSummary[dateStr]) earned = Number(_kbSummary[dateStr].total_points || 0);
        earnedPerDay[d] = _kbHolidayMap[d] ? 0 : earned;
        totalPerDay[d] = _kbHolidayMap[d] ? 0 : (byDay[d]||[]).reduce((s,t) => s + (t.points||0), 0);
    }

    const isSelf = !_kbViewUserId || Number(_kbViewUserId) === currentUser.id;
    const isManager = ['giam_doc','quan_ly','truong_phong','quan_ly_cap_cao'].includes(currentUser.role);
    const canReport = isSelf; // Can report own tasks (via 'Lịch của tôi' or own name in sidebar)
    const canApprove = isManager && !isSelf;
    const todayStr = _kbDateStr(new Date()); // For date comparison

    // User info header (when viewing someone else)
    const viewingName = _kbViewUserName || (isSelf ? currentUser.full_name : '');
    const userHeaderHtml = viewingName ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-bottom:2px solid #93c5fd;border-radius:10px 10px 0 0;">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(37,99,235,0.3);">${viewingName.charAt(0).toUpperCase()}</div>
        <div>
            <div style="font-weight:800;font-size:15px;color:#1e3a5f;">${viewingName}</div>
            <div style="font-size:11px;color:#6b7280;">${isSelf ? '📋 Lịch của tôi' : '👤 Đang xem lịch nhân viên'}</div>
        </div>
    </div>` : '';

    // Week nav
    let html = userHeaderHtml + `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;${!viewingName ? 'border-radius:10px 10px 0 0;' : ''}">
        <button onclick="_kbChangeWeek(-1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀ Tuần trước</button>
        <div style="font-weight:700;color:#122546;font-size:14px;">📅 ${_kbFmtDate(monDate)} — ${_kbFmtDate(sunDate2)}/${monDate.getFullYear()}</div>
        <button onclick="_kbChangeWeek(1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">Tuần sau ▶</button>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:100px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 7; d++) {
        const isH = !!_kbHolidayMap[d];
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateLabel = _kbFmtDate(colDate);
        if (isH) {
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#fef2f2;">
                <div style="font-weight:700;color:#dc2626;font-size:13px;">${_KB_DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:4px;font-size:11px;color:#dc2626;">🏖️ ${_kbHolidayMap[d]}</div>
            </th>`;
        } else {
            const earned = earnedPerDay[d];
            const total = totalPerDay[d];
            const cappedEarned = Math.min(earned, 100);
            const cappedTotal = Math.min(total, 100);
            const pct = cappedTotal > 0 ? Math.min(Math.round(cappedEarned/cappedTotal*100),100) : 0;
            const barColor = cappedEarned >= cappedTotal && cappedTotal > 0 ? '#16a34a' : cappedEarned > 0 ? '#d97706' : '#e5e7eb';
            const overCap = total > 100;
            const isToday = _kbDateStr(colDate) === _kbDateStr(new Date());
            const thBg = isToday ? 'background:linear-gradient(135deg,#1e40af,#2563eb);' : 'background:#f8fafc;';
            const nameColor = isToday ? 'color:white;' : 'color:#122546;';
            const dateColor = isToday ? 'color:#bfdbfe;' : 'color:#9ca3af;';
            const scoreColor = isToday ? `color:white;` : `color:${barColor};`;
            const barBg = isToday ? 'background:rgba(255,255,255,0.3);' : 'background:#e5e7eb;';
            const todayBadge = isToday ? '<span style="display:inline-block;background:#fbbf24;color:#1e3a5f;font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">HÔM NAY</span>' : '';
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid ${isToday ? '#2563eb' : '#e5e7eb'};min-width:150px;${thBg}${isToday ? 'box-shadow:0 4px 12px rgba(37,99,235,0.3);position:relative;' : ''}">
                <div style="font-weight:700;${nameColor}font-size:13px;">${_KB_DAY_NAMES[d]} <span style="font-size:10px;${dateColor}">${dateLabel}</span>${todayBadge}</div>
                <div style="margin-top:6px;height:4px;${barBg}border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${isToday ? 'white' : barColor};border-radius:2px;transition:width .3s;"></div>
                </div>
                <div style="font-size:10px;margin-top:3px;${scoreColor}font-weight:600;">${cappedEarned}/${cappedTotal}đ${overCap ? ' <span style="color:#fecaca;" title="Tổng CV = ' + total + 'đ, chỉ tính tối đa 100đ">(max 100)</span>' : ''}</div>
            </th>`;
        }
    }
    html += `</tr></thead>`;

    // Body
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="8" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px;">Chưa có lịch công việc. Hãy setup tại <b>Bàn Giao CV Điểm</b> trước.</td></tr>`;
    } else {
        sortedSlots.forEach((slot, idx) => {
            const [tStart, tEnd] = slot.split('|');
            const isLast = idx === sortedSlots.length - 1;
            const borderB = isLast ? 'none' : '1px solid #f3f4f6';
            html += `<tr>`;
            html += `<td style="padding:10px 14px;border-bottom:${borderB};background:#fafbfc;vertical-align:top;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);border-radius:10px;padding:10px 14px;text-align:center;box-shadow:0 2px 8px rgba(18,37,70,0.15);min-width:70px;">
                    <div style="font-weight:800;color:#fff;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tStart}</div>
                    <div style="margin:4px auto;width:20px;height:1px;background:rgba(255,255,255,0.3);"></div>
                    <div style="font-weight:800;color:#FFC107;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tEnd}</div>
                </div>
            </td>`;
            for (let d = 1; d <= 7; d++) {
                if (_kbHolidayMap[d]) {
                    html += `<td style="padding:8px;border-bottom:${borderB};background:#fef2f2;text-align:center;"><div style="color:#fca5a5;font-size:18px;">🏖️</div></td>`;
                    continue;
                }
                const task = byDay[d].find(t => t.time_start + '|' + t.time_end === slot);
                if (!task) {
                    html += `<td style="padding:8px;border-bottom:${borderB};text-align:center;color:#d1d5db;font-size:20px;">—</td>`;
                    continue;
                }

                const c = _kbGetColor(task.task_name);
                const hasOverride = task._has_override;
                const overrideBadge = hasOverride ? '<span title="Đã tùy chỉnh cho NV này" style="position:absolute;top:-6px;left:-6px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;width:18px;height:18px;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(217,119,6,0.4);z-index:2;">✏️</span>' : '';
                const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
                const dateStr = _kbDateStr(colDate);
                const reportTemplateId = task._source === 'snapshot' ? task.template_id : task.id;
                const reportKey = `${reportTemplateId}_${dateStr}`;
                // Fallback: if template_id is null OR no match, try matching by task_name
                let report = _kbReports[reportKey];
                if (!report && task.task_name) {
                    const nameKey = `name_${task.task_name}_${dateStr}`;
                    report = _kbReports[nameKey];
                }

                let statusBadge = '';
                let actionBtn = ''; // inline with guide button row
                const _linkedPage = _kbGetLinkedPage(task.task_name);
                const _isPastDay = dateStr < _kbDateStr(new Date());
                if (_linkedPage && canReport && !_isPastDay) {
                    // Task has a linked menu page → navigate there instead of showing Báo cáo
                    actionBtn = `<a href="${_linkedPage.page}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;cursor:pointer;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(99,102,241,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${_linkedPage.icon} Mở trang →</a>`;
                } else if (_linkedPage && !canReport) {
                    actionBtn = '';
                } else
                if (report) {
                    // HAS REPORT — make it clickable to view details
                    const rData = JSON.stringify({
                        template_id: reportTemplateId, task_name: task.task_name, user_id: (_kbViewUserId || currentUser.id), status: report.status, points_earned: report.points_earned,
                        quantity: report.quantity, min_quantity: task.min_quantity || 1, report_value: report.report_value || '', report_image: report.report_image || '',
                        report_date: dateStr, content: report.content || '', reject_reason: report.reject_reason || '',
                        redo_count: report.redo_count || 0, redo_deadline: report.redo_deadline || ''
                    }).replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    if (report.status === 'approved') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;transition:all .15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">✅ +${report.points_earned}đ</span>`;
                        statusBadge = `<div style="margin-top:4px;"><span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span></div>`;
                    } else if (report.status === 'pending') {
                        actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fde68a;">⏳ ${report.redo_count > 0 ? 'Chờ duyệt lại' : 'Chờ duyệt'}</span>`;
                        statusBadge = `<div style="margin-top:4px;"><span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span></div>`;
                    } else if (report.status === 'rejected') {
                        if (isSelf) {
                            actionBtn = `<span onclick="_kbViewReport(this)" data-report="${rData}" style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">❌ Bị từ chối</span>`;
                            // Show redo button for self
                            if (report.redo_deadline && new Date(report.redo_deadline) > new Date()) {
                                statusBadge = `<div style="margin-top:4px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                                    <button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\\'")}', ${report.id})" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo lại</button>
                                    <span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                                </div>`;
                            } else {
                                statusBadge = `<div style="margin-top:4px;"><span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span></div>`;
                            }
                        } else {
                            // Manager view: show warning badge
                            actionBtn = `<span style="background:#dc2626;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;line-height:1;display:inline-flex;align-items:center;border:1px solid #b91c1c;box-shadow:0 2px 8px rgba(220,38,38,0.35);animation:_kbPulse 2s infinite;">⚠️ Chờ NV nộp lại</span>`;
                            statusBadge = `<div style="margin-top:4px;"><span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span></div>`;
                        }
                    } else if (report.status === 'expired') {
                        if (isSelf) {
                            actionBtn = `<span style="background:#f3f4f6;color:#6b7280;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🚫 Hết hạn (0đ)</span>`;
                        } else {
                            actionBtn = `<span style="background:#dc2626;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;line-height:1;display:inline-flex;align-items:center;border:1px solid #b91c1c;box-shadow:0 2px 8px rgba(220,38,38,0.35);animation:_kbPulse 2s infinite;">⚠️ Chờ NV nộp lại</span>`;
                        }
                        statusBadge = `<div style="margin-top:4px;"><span onclick="_kbViewReport(this)" data-report="${rData}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span></div>`;
                    }
                } else if (canReport) {
                    if (dateStr === todayStr) {
                        const todaySrKey = `${reportTemplateId}_${dateStr}`;
                        const todaySr = _kbSupportRequests[todaySrKey];
                        if (todaySr && todaySr.status === 'pending') {
                            actionBtn = `<span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span>`;
                            statusBadge = `<div style="margin-top:4px;"><button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo</button></div>`;
                        } else if (todaySr && todaySr.status === 'supported') {
                            actionBtn = `<span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;">✅ Sếp đã HT</span>`;
                            statusBadge = `<div style="margin-top:4px;"><button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo</button></div>`;
                        } else {
                            actionBtn = `<button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo</button>`;
                        }
                    } else if (dateStr < todayStr) {
                        // Check support request
                        const srKey = `${reportTemplateId}_${dateStr}`;
                        const sr = _kbSupportRequests[srKey];
                        if (sr && sr.status === 'pending') {
                            actionBtn = `<span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span>`;
                            statusBadge = `<div style="margin-top:4px;"><button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo</button></div>`;
                        } else if (sr && sr.status === 'supported') {
                            actionBtn = `<span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;" title="${(sr.manager_note||'').replace(/"/g,'&quot;')}">✅ Sếp đã HT</span>`;
                            statusBadge = `<div style="margin-top:4px;"><button onclick="_kbShowReportModal(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:#059669;color:white;cursor:pointer;font-weight:700;">📝 Báo cáo</button></div>`;
                        } else {
                            actionBtn = `<span style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">🚫 Bỏ lỡ</span>`;
                        }
                    } else {
                        actionBtn = `<span style="background:#f3f4f6;color:#9ca3af;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🔒 Sắp tới</span>`;
                    }
                } else {
                    if (dateStr < todayStr) {
                        const srKey2 = `${reportTemplateId}_${dateStr}`;
                        const sr2 = _kbSupportRequests[srKey2];
                        if (sr2 && sr2.status === 'pending') {
                            actionBtn = `<span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;line-height:1;display:inline-flex;align-items:center;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span>`;
                        } else if (sr2 && sr2.status === 'supported') {
                            actionBtn = `<span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #86efac;" title="${(sr2.manager_note||'').replace(/"/g,'&quot;')}">✅ Sếp đã HT</span>`;
                        } else {
                            actionBtn = `<span style="background:#fecaca;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #fca5a5;">🚫 Bỏ lỡ</span>`;
                        }
                    } else if (dateStr === todayStr) {
                        actionBtn = `<span style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:4px;font-size:10px;line-height:1;display:inline-flex;align-items:center;">⏳ Chưa nộp</span>`;
                    } else {
                        actionBtn = `<span style="background:#f3f4f6;color:#9ca3af;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;line-height:1;display:inline-flex;align-items:center;border:1px solid #e5e7eb;">🔒 Sắp tới</span>`;
                    }
                }

                // Check if this is a "Tự Tìm Kiếm" task
                const isSelfSearch = /tự\s*tìm\s*kiếm/i.test(task.task_name);
                const ssPlaceholder = isSelfSearch ? `<div id="kbSS_${dateStr}" data-ss-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Gọi Điện Telesale" task
                const isTelesale = /gọi\s*điện\s*telesale/i.test(task.task_name);
                const tsPlaceholder = isTelesale ? `<div id="kbTS_${dateStr}" data-ts-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Nhắn Tìm Đối Tác" task
                const isPartnerOutreach = /nhắn.*đối\s*tác/i.test(task.task_name);
                const poPlaceholder = isPartnerOutreach ? `<div id="kbPO_${dateStr}" data-po-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is an "Add/Cmt Đối Tác" task
                const isAddCmt = /add.*cmt.*đối\s*tác/i.test(task.task_name);
                const acPlaceholder = isAddCmt ? `<div id="kbAC_${dateStr}" data-ac-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Đăng Video" task
                const isDangVideo = /đăng\s*video/i.test(task.task_name);
                const dvPlaceholder = isDangVideo ? `<div id="kbDV_${dateStr}" data-dv-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Đăng Content" task
                const isDangContent = /đăng\s*content/i.test(task.task_name);
                const dcPlaceholder = isDangContent ? `<div id="kbDC_${dateStr}" data-dc-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Đăng & Tìm KH Group" task
                const isDangGroup = /đăng.*tìm.*kh.*group/i.test(task.task_name);
                const dgPlaceholder = isDangGroup ? `<div id="kbDG_${dateStr}" data-dg-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Tuyển Dụng" task
                const isTuyenDung = /tuyển\s*dụng/i.test(task.task_name);
                const tdPlaceholder = isTuyenDung ? `<div id="kbTD_${dateStr}" data-td-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Sedding" task
                const isSedding = /sedding/i.test(task.task_name);
                const sdPlaceholder = isSedding ? `<div id="kbSD_${dateStr}" data-sd-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                // Check if this is a "Tìm Gr Zalo" task
                const isZalo = /tìm.*gr.*zalo/i.test(task.task_name);
                const zlPlaceholder = isZalo ? `<div id="kbZL_${dateStr}" data-zl-date="${dateStr}" style="margin-top:6px;"></div>` : '';

                html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                    <div style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:10px 12px;text-align:center;position:relative;">
                        ${overrideBadge}
                        ${(task.requires_approval || _kbForceApproval || _kbForceScheduleIds.has(task.template_id || task.id)) ? `<span style="position:absolute;top:-7px;right:-7px;background:linear-gradient(135deg,${task.requires_approval ? '#f59e0b,#d97706' : '#ef4444,#dc2626'});color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(217,119,6,0.4);animation:_kbPulse 2s infinite;border:1px solid ${task.requires_approval ? '#fbbf24' : '#f87171'};">🔒 CẦN DUYỆT</span>` : ''}
                        <div onclick="_kbShowTaskDetail(${task._source === 'snapshot' ? task.template_id : task.id})" style="font-weight:700;color:${c.text};font-size:13px;margin-bottom:4px;cursor:pointer;transition:all .15s;" onmouseover="this.style.textDecoration='underline';this.style.opacity='0.8'" onmouseout="this.style.textDecoration='none';this.style.opacity='1'">${task.task_name}</div>
                        <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
                            <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${task.points}đ</span>
                        </div>
                        <div style="font-size:9px;color:#9ca3af;margin-top:3px;">🕐 ${tStart} — ${tEnd}</div>
                        <div style="display:flex;flex-direction:column;gap:4px;align-items:center;margin-top:6px;">

                            ${isSelf && dateStr === todayStr && !report && !_kbSupportRequests[`${reportTemplateId}_${dateStr}`] ? `<button onclick="_kbSendSupportRequest(${reportTemplateId},'${dateStr}','${(task.task_name||'').replace(/'/g,"\\\\\\\\'")}')" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;cursor:pointer;font-weight:700;line-height:1;display:inline-flex;align-items:center;white-space:nowrap;box-shadow:0 2px 6px rgba(217,119,6,0.3);" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 4px 10px rgba(217,119,6,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 2px 6px rgba(217,119,6,0.3)'">🆘 Sếp HT</button>` : ''}
                            ${actionBtn}
                        </div>
                        ${ssPlaceholder}
                        ${tsPlaceholder}
                        ${poPlaceholder}
                        ${acPlaceholder}
                        ${dvPlaceholder}
                        ${dcPlaceholder}
                        ${dgPlaceholder}
                        ${tdPlaceholder}
                        ${sdPlaceholder}
                        ${zlPlaceholder}
                        ${statusBadge}
                    </div>
                </td>`;
            }
            html += `</tr>`;
        });
    }

    // ===== CV KHÓA ROWS =====
    if (_kbLockTasks && _kbLockTasks.length > 0) {
        // Section divider
        html += `<tr><td colspan="8" style="padding:6px 14px;background:linear-gradient(135deg,#991b1b,#dc2626);font-size:11px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1px;">🔐 CV Khóa — Không hoàn thành = Khóa TK + Phạt tiền</td></tr>`;

        const monDate2 = new Date(_kbWeekStart);
        _kbLockTasks.forEach(lt => {
            html += `<tr data-kb-task-name="${lt.task_name.replace(/"/g,'&quot;')}">`;
            // Time slot column
            html += `<td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;background:#fafbfc;vertical-align:top;">
                <div style="background:linear-gradient(135deg,#991b1b,#dc2626);border-radius:10px;padding:8px 12px;text-align:center;box-shadow:0 2px 8px rgba(153,27,27,0.2);min-width:70px;">
                    <div style="font-weight:700;color:#fff;font-size:11px;">🔐 KHÓA</div>
                    <div style="margin:2px auto;width:20px;height:1px;background:rgba(255,255,255,0.3);"></div>
                    <div style="font-weight:700;color:#fca5a5;font-size:10px;">24:00</div>
                </div>
            </td>`;

            for (let d = 1; d <= 7; d++) {
                if (_kbHolidayMap[d]) {
                    html += `<td style="padding:8px;border-bottom:1px solid #f3f4f6;background:#fef2f2;text-align:center;"><div style="color:#fca5a5;font-size:18px;">🏖️</div></td>`;
                    continue;
                }

                const colDate = new Date(monDate2); colDate.setDate(monDate2.getDate() + d - 1);
                const dateStr = _kbDateStr(colDate);
                const dayOfWeek = colDate.getDay(); // 0=Sun, 1=Mon...

                // Skip dates before the task was created/assigned (convert UTC to local)
                let taskStartDate = '';
                if (lt.created_at) {
                    const d = new Date(lt.created_at);
                    taskStartDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                }
                if (dateStr < todayStr && taskStartDate && dateStr < taskStartDate) {
                    html += `<td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center;color:#e5e7eb;font-size:20px;">—</td>`;
                    continue;
                }

                // Check if this task applies to this day
                let applies = false;
                if (lt.recurrence_type === 'administrative') {
                    applies = dayOfWeek >= 1 && dayOfWeek <= 6; // Mon-Sat
                } else if (lt.recurrence_type === 'daily') {
                    applies = !_kbLockHolidays.has(dateStr); // Every day except holidays
                } else if (lt.recurrence_type === 'weekly') {
                    const wDays = (lt.recurrence_value || '').split(',').map(Number);
                    applies = wDays.includes(dayOfWeek);
                    // ROLLING: "Setup Spam Zalo" — if past recurrence day + not completed, show on working days
                    if (!applies && lt.task_name && (/setup.*spam.*zalo/i.test(lt.task_name) || /thông.*báo.*gr.*zalo/i.test(lt.task_name)) && dateStr <= todayStr && dayOfWeek >= 1 && dayOfWeek <= 6) {
                        // Check if any recurrence day THIS week or BEFORE is uncompleted
                        const wStart = new Date(_kbWeekStart);
                        for (let rd = 0; rd < 7; rd++) {
                            const rDate = new Date(wStart); rDate.setDate(wStart.getDate() + rd);
                            const rDow = rDate.getDay() === 0 ? 7 : rDate.getDay();
                            const rStr = _kbDateStr(rDate);
                            if (wDays.includes(rDow) && rStr < dateStr) {
                                const rKey = `${lt.id}_${rStr}`;
                                const rComp = _kbLockCompletions[rKey];
                                const rReal = (rComp && rComp.status === 'expired' && (!rComp.content || rComp.content.trim() === '' || /^Phạt chồng:/.test(rComp.content)) && !rComp.proof_url) ? null : rComp;
                                if (!rReal || (rReal.status !== 'approved' && rReal.status !== 'pending')) {
                                    applies = true; lt._isRolled = true; lt._rolledFromDate = rStr;
                                    break;
                                }
                            }
                        }
                    }
                } else if (lt.recurrence_type === 'monthly') {
                    const mDates = (lt.recurrence_value || '').split(',').map(Number);
                    const lastDay = new Date(colDate.getFullYear(), colDate.getMonth() + 1, 0).getDate();
                    applies = mDates.some(d => Math.min(d, lastDay) === colDate.getDate());
                } else if (lt.recurrence_type === 'once') {
                    applies = dateStr === lt.recurrence_value;
                }

                // Skip holidays
                if (_kbLockHolidays.has(dateStr)) applies = false;

                if (!applies) {
                    html += `<td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center;color:#e5e7eb;font-size:20px;">—</td>`;
                    continue;
                }


                // Get completion status
                const compKey = `${lt.id}_${dateStr}`;
                const comp = _kbLockCompletions[compKey];

                // Phân biệt comp thật vs comp tự sinh bởi hệ thống
                // Auto-generated: status='expired', content rỗng, không có proof → NV chưa nộp gì
                const isAutoGenerated = comp && comp.status === 'expired'
                    && (!comp.content || comp.content.trim() === '' || /^Phạt chồng:/.test(comp.content))
                    && !comp.proof_url;
                // realComp = null nếu là auto-gen → coi như chưa có báo cáo
                const realComp = isAutoGenerated ? null : comp;

                let lockStatusBadge = '';
                let lockBg = '#fef2f2';
                let lockBorder = '#fecaca';

                if (realComp) {
                    if (realComp.status === 'approved') {
                        lockStatusBadge = '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">✅ Đã duyệt</span>';
                        lockBg = '#f0fdf4'; lockBorder = '#a7f3d0';
                    } else if (realComp.status === 'pending') {
                        lockStatusBadge = '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:5px 10px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;display:inline-block;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt</span></div>';
                        lockBg = '#fffbeb'; lockBorder = '#fde68a';
                    } else if (realComp.status === 'rejected') {
                        lockStatusBadge = '<span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">❌ Từ chối</span>';
                    } else if (realComp.status === 'expired') {
                        lockStatusBadge = ''; // No badge — only "Báo cáo lại" button shown
                    }
                } else if (dateStr < todayStr) {
                    // Floating fiery badge — rực lửa giống QUÁ HẠN ở CV Chuỗi
                    lockStatusBadge = '<span style="position:absolute;top:-7px;left:-7px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(220,38,38,0.4);animation:_kbPulse 2s infinite;border:1px solid #fca5a5;">🔥 KHÔNG BÁO CÁO</span>';
                    lockBg = '#fff5f5'; lockBorder = '#fca5a5';
                } else if (dateStr === todayStr) {
                    lockStatusBadge = '';
                } else {
                    lockStatusBadge = '<span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">🔒 Sắp tới</span>';
                    lockBg = '#fafbfc'; lockBorder = '#e5e7eb';
                }

                // Force approval badge for lock tasks
                const _lockForced = _kbForceApproval || _kbForceLockIds.has(lt.id);
                let lockForceBadge = '';
                if (_lockForced && !realComp) {
                    lockForceBadge = '<div style="text-align:center;margin-top:4px;"><span style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;padding:2px 8px;border-radius:5px;font-size:9px;font-weight:800;box-shadow:0 1px 4px rgba(220,38,38,0.3);">🔒 CẦN DUYỆT</span></div>';
                } else if (_lockForced && realComp && realComp.status === 'pending') {
                    lockForceBadge = '<div style="text-align:center;margin-top:4px;"><span style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;padding:2px 8px;border-radius:5px;font-size:9px;font-weight:800;box-shadow:0 1px 4px rgba(220,38,38,0.3);">🔒 CẦN DUYỆT</span></div>';
                }

                // Determine action buttons
                const viewUserId = _kbViewUserId || currentUser.id;
                const isSelf = viewUserId === currentUser.id;
                let actionHtml = '';
                const srKey = `${lt.id}_${dateStr}`;
                const hasSR = window._kbLockSupportRequests && window._kbLockSupportRequests[srKey];

                const _ltLinkedPage = _kbGetLinkedPage(lt.task_name);
                const _ltIsPast = dateStr < todayStr;
                const _ltDoneOrPending = realComp && (realComp.status === 'approved' || realComp.status === 'pending' || realComp.status === 'completed');
                if (_ltLinkedPage && isSelf && !(_ltIsPast && _ltDoneOrPending)) {
                    // Lock task has a linked menu page → navigate there instead of Báo cáo
                    actionHtml = `<div style="margin-top:6px;text-align:center;"><a href="${_ltLinkedPage.page}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;cursor:pointer;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(99,102,241,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${_ltLinkedPage.icon} Mở trang →</a></div>`;
                } else if (_ltLinkedPage && !isSelf ) {
                    actionHtml = ''; // manager view
                } else if (isSelf) {
                    if (dateStr === todayStr && !realComp) {
                        // Today, not submitted: show Báo cáo (for self)
                        let srBadge = '';
                        if (!hasSR) {
                            srBadge = `<button onclick="_kbLockSupport(${lt.id},'${dateStr}','${lt.task_name.replace(/'/g,"\\\\'")}')" style="padding:3px 10px;border:none;border-radius:5px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(217,119,6,0.3);">🆘 Sếp HT</button>`;
                        } else if (hasSR.status === 'supported') {
                            srBadge = `<span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid #86efac;" title="${(hasSR.manager_note||'').replace(/"/g,'&quot;')}">✅ Sếp đã HT</span>`;
                        } else {
                            srBadge = '<span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span>';
                        }
                        actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                            ${srBadge}
                            <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo</button>
                        </div>`;
                    } else if (realComp && realComp.status === 'rejected') {
                        // Self: show Báo cáo lại + Xem báo cáo cũ
                        actionHtml = `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                            <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo lại</button>
                            <span onclick="_kbShowLockReport(${realComp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    } else if (dateStr < todayStr && !realComp) {
                        // Past, chưa báo cáo (including auto-generated) → nút "Báo cáo"
                        const srObj = window._kbLockSupportRequests && window._kbLockSupportRequests[srKey];
                        if (srObj && srObj.status === 'pending') {
                            actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                                <span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span>
                                <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo</button>
                            </div>`;
                        } else if (srObj && srObj.status === 'supported') {
                            actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                                <span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid #86efac;">✅ Sếp đã HT</span>
                                <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo</button>
                            </div>`;
                        } else {
                            // Past, chưa báo cáo lần nào → nút "Báo cáo" (không phải "Báo cáo lại")
                            actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                                <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo</button>
                            </div>`;
                        }
                    } else if (realComp && realComp.status === 'expired') {
                        // Self: real report that expired → show "Báo cáo lại"
                        actionHtml = `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                            <button onclick="_kbLockSubmit(${lt.id},'${dateStr}')" style="padding:3px 10px;border:none;border-radius:5px;background:#059669;color:white;font-size:10px;font-weight:700;cursor:pointer;">📝 Báo cáo lại</button>
                            <span onclick="_kbShowLockReport(${realComp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    } else if (realComp) {
                        const btnColor = 'background:#2563eb;border:1px solid #1d4ed8;';
                        actionHtml = `<div style="margin-top:4px;text-align:center;">
                            <span onclick="_kbShowLockReport(${realComp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;${btnColor}color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    }
                } else {
                    // Manager viewing staff
                    if (realComp && realComp.status === 'rejected') {
                        // Manager: show warning for rejected
                        actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                            <span style="background:#dc2626;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;border:1px solid #b91c1c;box-shadow:0 2px 8px rgba(220,38,38,0.35);animation:_kbPulse 2s infinite;">⚠️ Chờ NV nộp lại</span>
                            <span onclick="_kbShowLockReport(${realComp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    } else if (realComp && realComp.status === 'expired') {
                        // Manager: show warning for expired (real report)
                        actionHtml = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;align-items:center;">
                            <span style="background:#dc2626;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;border:1px solid #b91c1c;box-shadow:0 2px 8px rgba(220,38,38,0.35);animation:_kbPulse 2s infinite;">⚠️ Chờ NV nộp lại</span>
                            <span onclick="_kbShowLockReport(${realComp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    } else if (dateStr === todayStr && !realComp) {
                        actionHtml = `<div style="margin-top:6px;"><span style="padding:3px 10px;border-radius:5px;background:#fef2f2;color:#dc2626;font-size:10px;font-weight:700;border:1px solid #fecaca;">📭 Chưa nộp</span></div>`;
                    } else if (dateStr < todayStr && !realComp) {
                        const srObj2 = window._kbLockSupportRequests && window._kbLockSupportRequests[srKey];
                        if (srObj2 && srObj2.status === 'pending') {
                            actionHtml = `<div style="margin-top:6px;"><span style="background:#f5f3ff;color:#7c3aed;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid #c4b5fd;">⏳ Chờ Hỗ Trợ</span></div>`;
                        } else if (srObj2 && srObj2.status === 'supported') {
                            actionHtml = `<div style="margin-top:6px;"><span style="background:#dcfce7;color:#059669;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid #86efac;">✅ Sếp đã HT</span></div>`;
                        } else {
                            actionHtml = `<div style="margin-top:6px;"><span style="background:#dc2626;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:800;border:1px solid #b91c1c;box-shadow:0 2px 8px rgba(220,38,38,0.35);animation:_kbPulse 2s infinite;">🔥 Chưa nộp BC</span></div>`;
                        }
                    }
                    // Manager: show Xem báo cáo if comp exists and not already shown above
                    if (comp && comp.status !== 'rejected' && comp.status !== 'expired') {
                        actionHtml += `<div style="margin-top:4px;text-align:center;">
                            <span onclick="_kbShowLockReport(${comp.id})" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#2563eb;border:1px solid #1d4ed8;color:white;font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📄 Xem báo cáo</span>
                        </div>`;
                    }
                }

                html += `<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <div style="background:${lockBg};border:2px solid ${lockBorder};border-left:4px solid #dc2626;border-radius:8px;padding:10px 12px;text-align:center;position:relative;">
                        ${lt.requires_approval ? '<span style="position:absolute;top:-7px;right:-7px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(217,119,6,0.4);animation:_kbPulse 2s ease-in-out infinite;">CẦN DUYỆT</span>' : ''}
                        <div onclick="_kbShowLockTaskDetail(${lt.id})" style="font-weight:700;color:#991b1b;font-size:12px;margin-bottom:4px;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;">${lt.task_name}</div>
                        <div style="font-size:9px;color:#9ca3af;margin-top:3px;">⏰ Hạn: 24:00</div>

                        <div style="margin-top:6px;">${lockStatusBadge}</div>${lockForceBadge}
                        ${actionHtml}
                        ${/sedding/i.test(lt.task_name) ? `<div id="kbSD_${dateStr}" data-sd-date="${dateStr}" style="margin-top:6px;"></div>` : ''}
                        ${/tìm.*gr.*zalo/i.test(lt.task_name) ? `<div id="kbZL_${dateStr}" data-zl-date="${dateStr}" style="margin-top:6px;"></div>` : ''}
                        ${/đăng.*bản.*thân/i.test(lt.task_name) ? `<div id="kbBT_${dateStr}" data-bt-date="${dateStr}" style="margin-top:6px;"></div>` : ''}
                    </div>
                </td>`;
            }
            html += `</tr>`;
        });
    }

    // ===== CV CHUỖI ROWS =====
    if (_kbChainItems && _kbChainItems.length > 0) {
        // Section divider — blue banner
        html += `<tr><td colspan="8" style="padding:6px 14px;background:linear-gradient(135deg,#1e40af,#2563eb);font-size:11px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1px;">🔗 CV Chuỗi — Công việc chuỗi liên kết</td></tr>`;

        // Group items by chain_instance_id
        const chainGroups = {};
        _kbChainItems.forEach(item => {
            if (!chainGroups[item.chain_instance_id]) {
                chainGroups[item.chain_instance_id] = {
                    chain_name: item.chain_name,
                    chain_instance_id: item.chain_instance_id,
                    execution_mode: item.execution_mode,
                    total_items: item.total_items,
                    completed_items: item.completed_items,
                    items: []
                };
            }
            chainGroups[item.chain_instance_id].items.push(item);
        });

        // Color palette for distinguishing chains — includes subtle background tints
        const _chainColors = [
            { gd:'#1e40af', gl:'#2563eb', border:'#2563eb', text:'#1e40af', badge:'#93c5fd', tint:'#eff6ff', tintBorder:'#bfdbfe' },  // Blue
            { gd:'#b45309', gl:'#d97706', border:'#d97706', text:'#92400e', badge:'#fcd34d', tint:'#fffbeb', tintBorder:'#fde68a' },  // Amber
            { gd:'#7c3aed', gl:'#8b5cf6', border:'#8b5cf6', text:'#6d28d9', badge:'#c4b5fd', tint:'#f5f3ff', tintBorder:'#ddd6fe' },  // Violet
            { gd:'#be185d', gl:'#e11d48', border:'#e11d48', text:'#9f1239', badge:'#fda4af', tint:'#fff1f2', tintBorder:'#fecdd3' },  // Rose
            { gd:'#047857', gl:'#059669', border:'#059669', text:'#065f46', badge:'#6ee7b7', tint:'#ecfdf5', tintBorder:'#a7f3d0' },  // Emerald
            { gd:'#0e7490', gl:'#0891b2', border:'#0891b2', text:'#155e75', badge:'#67e8f9', tint:'#ecfeff', tintBorder:'#a5f3fc' },  // Cyan
            { gd:'#c2410c', gl:'#ea580c', border:'#ea580c', text:'#9a3412', badge:'#fdba74', tint:'#fff7ed', tintBorder:'#fed7aa' },  // Orange
            { gd:'#4338ca', gl:'#6366f1', border:'#6366f1', text:'#3730a3', badge:'#a5b4fc', tint:'#eef2ff', tintBorder:'#c7d2fe' },  // Indigo
        ];

        const monDate3 = new Date(_kbWeekStart);
        const _now3 = new Date();
        const todayStr3 = `${_now3.getFullYear()}-${String(_now3.getMonth()+1).padStart(2,'0')}-${String(_now3.getDate()).padStart(2,'0')}`;

        Object.values(chainGroups).forEach((chain, chainIdx) => {
            const cc = _chainColors[chainIdx % _chainColors.length];
            html += `<tr>`;
            // Time slot column — colored chain badge
            html += `<td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;background:#fafbfc;vertical-align:top;">
                <div style="background:linear-gradient(135deg,${cc.gd},${cc.gl});border-radius:10px;padding:8px 12px;text-align:center;box-shadow:0 2px 8px ${cc.gd}33;min-width:70px;cursor:pointer;" onclick="_kbOpenChainDetail(${chain.chain_instance_id})">
                    <div style="font-weight:700;color:#fff;font-size:10px;">🔗 CHUỖI</div>
                    <div style="margin:2px auto;width:20px;height:1px;background:rgba(255,255,255,0.3);"></div>
                    <div style="font-weight:700;color:${cc.badge};font-size:9px;">${Number(chain.completed_items)||0}/${Number(chain.total_items)||0}</div>
                </div>
            </td>`;

            // Render each day of the week
            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(monDate3);
                dayDate.setDate(dayDate.getDate() + d);
                const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;

                // Find chain items with deadline on this day
                const dayItems = chain.items.filter(it => {
                    const itDeadline = (it.deadline || '').slice(0, 10);
                    return itDeadline === dateStr;
                });

                if (dayItems.length === 0) {
                    html += `<td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center;color:#d1d5db;font-size:20px;background:${cc.tint};">—</td>`;
                    continue;
                }

                html += `<td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;background:${cc.tint};">`;
                dayItems.forEach(item => {
                    const isPending = item.status === 'pending';
                    const minQty = Number(item.min_quantity) || 1;
                    const approvedCount = Number(item.approved_count) || 0;
                    const isCompleted = item.status === 'completed' || approvedCount >= minQty;
                    const isOverdue = !isCompleted && dateStr < todayStr3;

                    // Use chain-tinted background for active items
                    let itemBg, itemBorder, nameColor, opacity;
                    if (isCompleted) {
                        itemBg = '#f0fdf4'; itemBorder = '#a7f3d0'; nameColor = '#059669'; opacity = '1';
                    } else if (isPending) {
                        itemBg = '#f8fafc'; itemBorder = '#e2e8f0'; nameColor = '#94a3b8'; opacity = '0.55';
                    } else if (isOverdue) {
                        itemBg = '#fff5f5'; itemBorder = '#fecaca'; nameColor = '#dc2626'; opacity = '1';
                    } else {
                        // Active: use chain-specific tint color
                        itemBg = cc.tint; itemBorder = cc.tintBorder; nameColor = cc.text; opacity = '1';
                    }

                    // Status badge
                    let statusBadge = '';
                    if (isCompleted) {
                        statusBadge = '<span style="background:#dcfce7;color:#059669;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">✅ Xong</span>';
                    } else if (isPending) {
                        statusBadge = '<span style="background:#f1f5f9;color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">🔒 Chờ</span>';
                    } else if (isOverdue) {
                        statusBadge = '<span style="background:#fecaca;color:#dc2626;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔥 Quá hạn</span>';
                    } else {
                        // Check if user has submitted
                        const myComp = item.my_completions;
                        if (myComp && myComp.length > 0) {
                            const lastComp = myComp[myComp.length - 1];
                            if (lastComp.status === 'pending') {
                                statusBadge = '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;display:inline-block;"><span style="font-size:10px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt</span></div>';
                            } else if (lastComp.status === 'rejected') {
                                statusBadge = '<span style="background:#fecaca;color:#dc2626;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">❌ Từ chối</span>';
                            }
                        } else {
                            statusBadge = '<span style="background:#dbeafe;color:#2563eb;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔵 Đang làm</span>';
                        }
                    }

                    // Floating overdue badge (prominent, like CẦN DUYỆT)
                    const overdueBadge = isOverdue ? '<span style="position:absolute;top:-7px;left:-7px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(220,38,38,0.4);animation:_kbPulse 2s infinite;border:1px solid #fca5a5;">🔥 QUÁ HẠN</span>' : '';

                    // Action button — uses chain color
                    let actionBtn = '';
                    if (!isCompleted && !isPending) {
                        actionBtn = `<div style="margin-top:4px;"><span onclick="_kbOpenChainDetail(${item.chain_instance_id})" style="display:inline-block;padding:3px 8px;border-radius:5px;background:${cc.gl};color:white;font-size:9px;font-weight:700;cursor:pointer;">📋 Xem chuỗi</span></div>`;
                    }

                    html += `<div onclick="_kbOpenChainDetail(${item.chain_instance_id})" style="background:${itemBg};border:2px solid ${itemBorder};border-left:4px solid ${cc.border};border-radius:8px;padding:8px 10px;text-align:center;margin-bottom:4px;cursor:pointer;opacity:${opacity};transition:opacity 0.2s;position:relative;">
                        ${overdueBadge}
                        ${(item.requires_approval || _kbForceApproval || _kbForceChainIds.has(item.id)) ? `<span style="position:absolute;top:-7px;right:-7px;background:linear-gradient(135deg,${item.requires_approval ? '#f59e0b,#d97706' : '#ef4444,#dc2626'});color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(217,119,6,0.4);animation:_kbPulse 2s infinite;border:1px solid ${item.requires_approval ? '#fbbf24' : '#f87171'};">🔒 CẦN DUYỆT</span>` : ''}
                        <div style="font-weight:700;color:${nameColor};font-size:11px;margin-bottom:2px;">🔗 ${item.task_name}</div>
                        <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">${chain.chain_name} (${item.item_order}/${Number(chain.total_items)||0})</div>
                        ${item.guide_link ? `<a href="${item.guide_link}" target="_blank" onclick="event.stopPropagation()" style="font-size:9px;color:${cc.text};text-decoration:underline;">🔗 HD</a>` : ''}
                        <div style="margin-top:4px;">${statusBadge}</div>
                        ${actionBtn}
                    </div>`;
                });
                html += `</td>`;
            }
            html += `</tr>`;
        });
    }


    html += `</tbody></table>`;

    wrap.innerHTML = html;
}

// ========== CV CHUỖI: Open chain detail modal ==========
async function _kbOpenChainDetail(instanceId) {
    // Reuse the chain detail modal from bangiao-khoa.js if available
    if (typeof _ctShowDetailModal === 'function') {
        _ctShowDetailModal(instanceId);
        return;
    }

    // Fallback: build a standalone modal
    try {
        const data = await apiCall(`/api/chain-tasks/instances/${instanceId}`);
        const overlay = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        const footer = document.getElementById('modalFooter');

        title.textContent = `🔗 ${data.chain_name}`;
        const modeLabel = data.execution_mode === 'sequential' ? '📋 Tuần tự' : '⚡ Song song';
        const startStr = data.start_date ? new Date(data.start_date).toLocaleDateString('vi-VN') : '';
        const endStr = data.end_date ? new Date(data.end_date).toLocaleDateString('vi-VN') : '';
        const completedCount = (data.items || []).filter(i => i.status === 'completed').length;
        const totalCount = (data.items || []).length;
        const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;

        let html = `<div style="padding:16px 20px;">
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;font-size:12px;color:#6b7280;">
                <span>${modeLabel}</span>
                <span>📅 ${startStr} → ${endStr}</span>
                <span>👤 ${data.creator_name || ''}</span>
            </div>
            ${data.chain_description ? `<div style="margin-bottom:12px;padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
                <div style="font-size:10px;color:#0369a1;font-weight:700;margin-bottom:4px;text-transform:uppercase;">📝 Mô tả công việc chuỗi</div>
                <div style="font-size:12px;color:#1e293b;white-space:pre-wrap;">${data.chain_description}</div>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:12px;color:#374151;">Tiến độ</span>
                <span style="font-size:12px;font-weight:700;color:${pct===100?'#059669':'#dc2626'};">${completedCount}/${totalCount} (${pct}%)</span>
            </div>
            <div style="background:#e5e7eb;border-radius:6px;height:6px;margin-bottom:16px;">
                <div style="background:linear-gradient(90deg,#2563eb,#059669);height:100%;border-radius:6px;width:${pct}%;transition:width 0.3s;"></div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:8px;text-align:center;color:#6b7280;font-weight:700;">#</th>
                    <th style="padding:8px;text-align:left;color:#6b7280;font-weight:700;">TASK CON</th>
                    <th style="padding:8px;text-align:center;color:#6b7280;font-weight:700;">DEADLINE</th>
                    <th style="padding:8px;text-align:center;color:#6b7280;font-weight:700;">TRẠNG THÁI</th>
                </tr></thead><tbody>`;

        (data.items || []).forEach(item => {
            const deadlineStr = item.deadline ? new Date(item.deadline).toLocaleDateString('vi-VN') : '';
            const isOver = item.status !== 'completed' && item.deadline && new Date(item.deadline) < new Date();
            let badge = '';
            if (item.status === 'completed') badge = '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">✅ Xong</span>';
            else if (item.status === 'pending') badge = '<span style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">🔒 Chờ</span>';
            else if (isOver) badge = '<span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">⚠️ Trễ</span>';
            else badge = '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">🔵 Đang làm</span>';

            html += `<tr style="border-bottom:1px solid #f3f4f6;${isOver?'background:#fff5f5;':''}">
                <td style="padding:8px;text-align:center;font-weight:700;color:#6b7280;">${item.item_order}</td>
                <td style="padding:8px;">
                    <div style="font-weight:600;color:#1e293b;">${item.task_name}</div>
                    ${item.guide_link ? `<a href="${item.guide_link}" target="_blank" style="font-size:10px;color:#2563eb;text-decoration:underline;">🔗 Hướng dẫn CV</a>` : ''}
                </td>
                <td style="padding:8px;text-align:center;font-size:11px;color:${isOver?'#dc2626':'#374151'};font-weight:${isOver?'700':'500'};">${deadlineStr}</td>
                <td style="padding:8px;text-align:center;">${badge}</td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        body.innerHTML = html;
        footer.innerHTML = `<button onclick="document.getElementById('modalOverlay').classList.remove('show')" style="padding:8px 24px;border-radius:8px;border:1px solid #1e293b;background:#1e293b;color:white;font-weight:700;cursor:pointer;">Đóng</button>`;
        overlay.classList.add('show');
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// Premium task detail modal (same design as Bàn Giao CV Điểm)
async function _kbShowTaskDetail(templateId) {
    let task = _kbTasks.find(t => {
        const tid = t._source === 'snapshot' ? t.template_id : t.id;
        return tid === templateId;
    });
    // If not in local cache (e.g. viewing from approval panel), fetch from API
    if (!task) {
        try {
            const data = await apiCall(`/api/task-points/template/${templateId}`);
            task = data.template;
        } catch(e) {}
    }
    if (!task) { showToast('Không tìm thấy công việc', 'error'); return; }
    const c = _kbGetColor(task.task_name);
    const inputReqs = _kbParseJSON(task.input_requirements);
    const outputReqs = _kbParseJSON(task.output_requirements);
    const isFixed = !task.week_only;
    const isGD = currentUser.role === 'giam_doc';
    const isViewingOther = !!_kbViewUserId && _kbViewUserId !== currentUser.id;
    const canEditOverride = isGD && isViewingOther;
    const ov = _kbOverridesDiem[task.id];
    const origPoints = ov && ov.custom_points != null ? (task._orig_points != null ? task._orig_points : task.points) : null;
    const origMinQty = ov && ov.custom_min_quantity != null ? (task._orig_min_quantity != null ? task._orig_min_quantity : (task.min_quantity || 1)) : null;

    document.getElementById('kbDetailModal')?.remove();

    const reqList = (items, icon, color, label) => {
        if (!items || items.length === 0) return '';
        return `
            <div style="margin-bottom:14px;">
                <div style="font-weight:700;font-size:12px;color:${color};margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">${icon}</span> ${label}
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;border:1px solid #e5e7eb;">
                    ${items.map((r, i) => `
                        <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;${i < items.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                            <span style="background:${color};color:white;min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${i + 1}</span>
                            <span style="font-size:13px;color:#374151;line-height:1.5;padding-top:1px;">${_kbLinkify(r)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    };

    const m = document.createElement('div');
    m.id = 'kbDetailModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:kbFadeIn .2s ease;';
    m.onclick = (e) => { if (e.target === m) m.remove(); };
    m.innerHTML = `
    <style>
        @keyframes kbFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes kbSlideUp { from { transform:translateY(20px);opacity:0; } to { transform:translateY(0);opacity:1; } }
    </style>
    <div style="background:white;border-radius:16px;width:min(480px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.2);animation:kbSlideUp .25s ease;">
        <div style="background:linear-gradient(135deg, ${c.badge}, ${c.badge}dd);padding:24px 28px;border-radius:16px 16px 0 0;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.1);"></div>
            <div style="position:absolute;bottom:-30px;left:30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
            <button onclick="document.getElementById('kbDetailModal').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            <div style="font-size:22px;font-weight:800;color:white;margin-bottom:6px;text-shadow:0 1px 3px rgba(0,0,0,0.15);">${task.task_name}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${isFixed ? '📌 Cố định' : '📅 1 tuần'}</span>
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${_KB_DAY_NAMES[task.day_of_week]}</span>
                ${task.requires_approval ? '<span style="background:rgba(255,200,0,0.3);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">🔒 Cần duyệt</span>' : ''}
            </div>
        </div>
        <div style="padding:24px 28px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
                <div style="text-align:center;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 8px;position:relative;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Điểm${ov && ov.custom_points != null ? ' <span style="color:#d97706;font-size:9px;">✏️ TC</span>' : ''}</div>
                    <div style="font-size:24px;font-weight:800;color:${c.badge};">${task.points}<span style="font-size:12px;">đ</span></div>
                    ${origPoints != null ? '<div style="font-size:9px;color:#9ca3af;text-decoration:line-through;">Gốc: ' + origPoints + 'đ</div>' : ''}
                    ${canEditOverride ? '<button onclick="_kbEditOverrideDiem(' + task.id + ',\'points\')" style="position:absolute;top:4px;right:4px;background:#f59e0b;border:none;color:white;width:20px;height:20px;border-radius:50%;font-size:10px;cursor:pointer;" title="Sửa điểm cho NV này">✏️</button>' : ''}
                </div>
                <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 8px;position:relative;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">SL Tối Thiểu${ov && ov.custom_min_quantity != null ? ' <span style="color:#d97706;font-size:9px;">✏️ TC</span>' : ''}</div>
                    <div style="font-size:24px;font-weight:800;color:#16a34a;">≥${task.min_quantity || 1}<span style="font-size:12px;"> lần</span></div>
                    ${origMinQty != null ? '<div style="font-size:9px;color:#9ca3af;text-decoration:line-through;">Gốc: ≥' + origMinQty + ' lần</div>' : ''}
                    ${canEditOverride ? '<button onclick="_kbEditOverrideDiem(' + task.id + ',\'min_quantity\')" style="position:absolute;top:4px;right:4px;background:#f59e0b;border:none;color:white;width:20px;height:20px;border-radius:50%;font-size:10px;cursor:pointer;" title="Sửa SL cho NV này">✏️</button>' : ''}
                </div>
                <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Khung Giờ</div>
                    <div style="font-size:14px;font-weight:800;color:#334155;margin-top:2px;">${task.time_start}</div>
                    <div style="font-size:9px;color:#9ca3af;">→ ${task.time_end}</div>
                </div>
            </div>
            ${task.guide_url ? `
            <div style="margin-bottom:18px;">
                <a href="${task.guide_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg, #eff6ff, #dbeafe);border:1px solid #93c5fd;border-radius:10px;text-decoration:none;color:#1d4ed8;transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(37,99,235,0.15)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
                    <span style="font-size:20px;">📘</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">Xem hướng dẫn công việc</div>
                        <div style="font-size:11px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:350px;">${task.guide_url}</div>
                    </div>
                    <span style="margin-left:auto;font-size:14px;">→</span>
                </a>
            </div>` : ''}
            <div id="kbTaskDetailSSProgress"></div>
            ${reqList(inputReqs, '📥', '#2563eb', 'Yêu cầu đầu vào')}
            ${reqList(outputReqs, '📤', '#059669', 'Yêu cầu đầu ra')}
            ${!inputReqs.length && !outputReqs.length ? `
            <div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;background:#f9fafb;border-radius:8px;border:1px dashed #e5e7eb;">
                Chưa có yêu cầu đầu vào/ra
            </div>` : ''}
        </div>
    </div>`;
    document.body.appendChild(m);
    // If this is a Tự Tìm Kiếm task, load self-search progress into the detail modal
    if (/tự\s*tìm\s*kiếm/i.test(task.task_name)) {
        _kbLoadDetailSelfSearch();
    }
    // If this is a Gọi Điện Telesale task, load call progress into the detail modal
    if (/gọi\s*điện\s*telesale/i.test(task.task_name)) {
        _kbLoadDetailTelesale();
    }
    // If this is a Nhắn Tìm Đối Tác task, load partner outreach progress into the detail modal
    if (/nhắn.*đối\s*tác/i.test(task.task_name)) {
        _kbLoadDetailPartnerOutreach();
    }
    // If this is an Add/Cmt Đối Tác task, load addcmt progress into the detail modal
    if (/add.*cmt.*đối\s*tác/i.test(task.task_name)) {
        _kbLoadDetailAddCmt();
    }
    // If this is a Đăng Video task, load video progress into the detail modal
    if (/đăng\s*video/i.test(task.task_name)) {
        _kbLoadDetailDangVideo();
    }
    // If this is a Đăng Content task, load content progress into the detail modal
    if (/đăng\s*content/i.test(task.task_name)) {
        _kbLoadDetailDangContent();
    }
    // If this is a Đăng & Tìm KH Group task
    if (/đăng.*tìm.*kh.*group/i.test(task.task_name)) {
        _kbLoadDetailDangGroup();
    }
    // If this is a Tuyển Dụng task
    if (/tuyển\s*dụng/i.test(task.task_name)) {
        _kbLoadDetailTuyenDung();
    }
    // If this is a Sedding task
    if (/sedding/i.test(task.task_name)) {
        _kbLoadDetailSedding();
    }
    // If this is a Tìm Gr Zalo task
    if (/tìm.*gr.*zalo/i.test(task.task_name)) {
        _kbLoadDetailZalo();
    }
    // If this is a Đăng Bản Thân task
    if (/đăng.*bản.*thân/i.test(task.task_name)) {
        _kbLoadDetailDangBT();
    }
}

// Report modal — full redesign
let _kbPastedFile = null;

function _kbShowReportModal(templateId, reportDate, fallbackName, redoReportId) {
    let task = _kbTasks.find(t => {
        const tid = t._source === 'snapshot' ? t.template_id : t.id;
        return tid === templateId;
    });
    // Fallback: if templateId is null/0, find by task_name + date
    if (!task && fallbackName) {
        task = _kbTasks.find(t => t.task_name === fallbackName && t._date === reportDate);
    }
    // If task found from snapshot with null template_id, resolve the real template_id
    if (task && task._source === 'snapshot' && !task.template_id && task.task_name) {
        // Find the template by task_name in all tasks (look for template version)
        const tmpl = _kbTasks.find(t => t._source !== 'snapshot' && t.task_name === task.task_name);
        if (tmpl) templateId = tmpl.id;
    }
    const taskName = task ? task.task_name : 'Công việc';
    const taskPoints = task ? task.points : 0;
    const needsApproval = task ? task.requires_approval : false;
    const minQty = task ? (task.min_quantity || 1) : 1;
    const guideUrl = task ? (task.guide_url || '') : '';
    const inputReqs = task ? _kbParseJSON(task.input_requirements) : [];
    const outputReqs = task ? _kbParseJSON(task.output_requirements) : [];
    _kbPastedFile = null;

    const isRedo = !!redoReportId;
    // Get rejection reason for redo
    let rejectReason = '';
    if (isRedo) {
        // Find rejection reason from reports
        const reportKey = `${templateId}_${reportDate}`;
        const report = _kbReports[reportKey];
        if (report && report.reject_reason) rejectReason = report.reject_reason;
        // Also try by name
        if (!rejectReason && fallbackName) {
            const nameKey = `name_${fallbackName}_${reportDate}`;
            const rpt2 = _kbReports[nameKey];
            if (rpt2 && rpt2.reject_reason) rejectReason = rpt2.reject_reason;
        }
    }
    const rejectBanner = isRedo && rejectReason ? `
        <div style="background:linear-gradient(135deg,#fef2f2,#fff1f2);border:2px solid #dc2626;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="background:#dc2626;color:white;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;">❌ LÝ DO TỪ CHỐI</span>
            </div>
            <div style="font-size:13px;color:#991b1b;font-weight:600;line-height:1.5;padding:10px 14px;background:white;border-radius:8px;border:1px solid #fecaca;">
                "${rejectReason.replace(/"/g, '&quot;')}"
            </div>
            <div style="margin-top:8px;font-size:11px;color:#dc2626;font-weight:600;">📝 Hãy khắc phục và báo cáo lại bên dưới</div>
        </div>` : '';
    const approvalWarn = needsApproval ? `
        <div style="padding:10px 12px;background:${isRedo ? '#fef2f2' : '#fef3c7'};border:1px solid ${isRedo ? '#fecaca' : '#fde68a'};border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">${isRedo ? '🔄' : '🔒'}</span>
            <div style="font-size:12px;color:${isRedo ? '#991b1b' : '#78350f'};font-weight:600;">${isRedo ? 'Nộp lại công việc bị từ chối — sửa và nộp lại để duyệt' : 'Công việc này cần Quản lý/TP duyệt mới được tính điểm'}</div>
        </div>` : '';

    // Build requirements HTML (compact)
    const reqHtml = (items, icon, color, label) => {
        if (!items.length) return '';
        return `<div style="margin-top:8px;">
            <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:4px;">${icon} ${label}</div>
            ${items.map((r, i) => `<div style="font-size:11px;color:#374151;padding:2px 0 2px 12px;border-left:2px solid ${color}20;">${i+1}. ${_kbLinkify(r)}</div>`).join('')}
        </div>`;
    };

    const hasTaskInfo = guideUrl || inputReqs.length || outputReqs.length;
    const taskInfoSection = hasTaskInfo ? `
        <div style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="padding:12px 14px;background:#f8fafc;">
                ${guideUrl ? `<a href="${guideUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;text-decoration:none;color:#1d4ed8;margin-bottom:8px;transition:all .15s;font-size:12px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <span style="font-size:16px;">📘</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;">Hướng dẫn công việc</div>
                        <div style="font-size:10px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${guideUrl}</div>
                    </div>
                    <span>→</span>
                </a>` : ''}
                ${reqHtml(inputReqs, '📥', '#2563eb', 'Yêu cầu đầu vào')}
                ${reqHtml(outputReqs, '📤', '#059669', 'Yêu cầu đầu ra')}
            </div>
        </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'kbReportModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(520px,92vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,${isRedo ? '#991b1b,#dc2626' : '#122546,#1e3a5f'});padding:18px 22px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">${isRedo ? '🔄 Nộp lại công việc' : '📝 Báo cáo công việc'}</h3>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">${isRedo ? 'Sửa và nộp lại để được duyệt' : 'Nộp kết quả hoàn thành'}</div>
            </div>
            <button onclick="document.getElementById('kbReportModal').remove()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:20px 22px;">
            ${rejectBanner}
            ${(() => {
                const srKey = `${templateId}_${reportDate}`;
                const srObj = _kbSupportRequests && _kbSupportRequests[srKey];
                if (srObj && srObj.status === 'supported' && srObj.manager_note) {
                    return `<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #059669;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <span style="background:#059669;color:white;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;">✅ SẾP ĐÃ HỖ TRỢ</span>
                        </div>
                        <div style="font-size:13px;color:#065f46;font-weight:600;line-height:1.5;padding:10px 14px;background:white;border-radius:8px;border:1px solid #a7f3d0;">
                            "${srObj.manager_note.replace(/"/g, '&quot;')}"
                        </div>
                    </div>`;
                }
                return '';
            })()}
            ${approvalWarn}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📋 Tên công việc</div>
                    <div style="font-size:14px;font-weight:700;color:#122546;">${taskName}</div>
                </div>
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📅 Ngày báo cáo</div>
                    <div style="font-size:14px;font-weight:700;color:#122546;">${reportDate.split('-').reverse().join('/')}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;text-align:center;">
                    <div style="font-size:10px;color:#059669;text-transform:uppercase;font-weight:600;margin-bottom:4px;">⭐ Điểm</div>
                    <div style="font-size:18px;font-weight:800;color:#059669;">${taskPoints}đ</div>
                </div>
                <div style="padding:10px 12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;text-align:center;">
                    <div style="font-size:10px;color:#2563eb;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📊 Tối thiểu</div>
                    <div style="font-size:18px;font-weight:800;color:#2563eb;">≥${minQty}</div>
                </div>
                <div>
                    <label style="font-weight:600;font-size:11px;color:#374151;display:block;margin-bottom:4px;">SL hoàn thành <span style="color:#dc2626;">*</span></label>
                    <input id="kbRptQty" type="number" min="0" value="${minQty}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-weight:700;color:#122546;box-sizing:border-box;text-align:center;">
                </div>
            </div>
            ${taskInfoSection}
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">📄 Nội dung hoàn thành <span style="color:#dc2626;">*</span></label>
                <textarea id="kbRptContent" rows="2" placeholder="Mô tả công việc đã làm..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">🔗 Link báo cáo kết quả <span style="color:#dc2626;">*</span></label>
                <input id="kbRptLink" type="url" placeholder="https://docs.google.com/... hoặc link TikTok..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:6px;">🖼️ Hình ảnh báo cáo <span style="color:#dc2626;">*</span> <span style="font-weight:400;color:#9ca3af;">(Ctrl+V để dán ảnh)</span></label>
                <div id="kbPasteZone" tabindex="0" style="border:2px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#fafbfc;transition:all .2s;min-height:60px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                    <div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div>
                    <div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>
                </div>
                <div id="kbPastePreview" style="display:none;margin-top:8px;position:relative;">
                    <img id="kbPasteImg" style="max-width:100%;max-height:150px;border-radius:6px;border:1px solid #e5e7eb;">
                    <button onclick="_kbRemovePaste()" style="position:absolute;top:4px;right:4px;background:#dc2626;color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;">×</button>
                </div>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:14px;background:#f9fafb;padding:8px 10px;border-radius:6px;border:1px solid #f3f4f6;">
                💡 <b>Lưu ý:</b> Bắt buộc phải có ít nhất <b>link</b> hoặc <b>hình ảnh</b> để nộp báo cáo.
            </div>
            <input type="hidden" id="kbRptTemplateId" value="${templateId}">
            <input type="hidden" id="kbRptDate" value="${reportDate}">
            <input type="hidden" id="kbRptRedoId" value="${redoReportId || ''}">
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('kbReportModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_kbSubmitReport()" style="padding:9px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,${isRedo ? '#dc2626,#991b1b' : '#16a34a,#15803d'});color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(22,163,74,0.3);">${isRedo ? '🔄 Nộp lại' : '📤 Nộp báo cáo'}</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    // Paste listener on zone
    const zone = document.getElementById('kbPasteZone');
    zone.addEventListener('paste', _kbHandlePaste);
    setTimeout(() => zone.focus(), 100);
}

function _kbHandlePaste(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            _kbPastedFile = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('kbPasteImg').src = ev.target.result;
                document.getElementById('kbPastePreview').style.display = 'block';
                const z = document.getElementById('kbPasteZone');
                z.innerHTML = '<div style="font-size:14px;color:#16a34a;font-weight:600;">✅ Đã dán ảnh thành công!</div>';
                z.style.borderColor = '#16a34a';
                z.style.background = '#f0fdf4';
            };
            reader.readAsDataURL(_kbPastedFile);
            break;
        }
    }
}

function _kbRemovePaste() {
    _kbPastedFile = null;
    document.getElementById('kbPastePreview').style.display = 'none';
    const z = document.getElementById('kbPasteZone');
    z.innerHTML = '<div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div><div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>';
    z.style.borderColor = '#d1d5db';
    z.style.background = '#fafbfc';
}

async function _kbSubmitReport() {
    const templateId = document.getElementById('kbRptTemplateId')?.value;
    const reportDate = document.getElementById('kbRptDate')?.value;
    const link = document.getElementById('kbRptLink')?.value?.trim();
    const qty = document.getElementById('kbRptQty')?.value || '0';
    const content = document.getElementById('kbRptContent')?.value?.trim();
    const redoId = document.getElementById('kbRptRedoId')?.value;

    if (!content) {
        showToast('Vui lòng nhập nội dung hoàn thành!', 'error');
        document.getElementById('kbRptContent')?.focus();
        return;
    }

    if (!qty || Number(qty) <= 0) {
        showToast('Vui lòng nhập số lượng hoàn thành!', 'error');
        document.getElementById('kbRptQty')?.focus();
        return;
    }

    if (!link && !_kbPastedFile) {
        showToast('Phải có ít nhất link hoặc hình ảnh báo cáo!', 'error');
        return;
    }

    try {
        // Check if this is a redo submission
        if (redoId) {
            const formData = new FormData();
            formData.append('quantity', qty);
            if (content) formData.append('content', content);
            if (link) formData.append('report_value', link);
            if (_kbPastedFile) formData.append('report_image', _kbPastedFile, 'paste.png');

            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const resp = await fetch(`/api/schedule/report/${redoId}/redo`, {
                method: 'PUT',
                body: formData,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await resp.json();
            if (result.success) {
                showToast('🔄 Đã nộp lại! ⏳ Chờ duyệt');
                document.getElementById('kbReportModal')?.remove();
                _kbLoadSchedule();
                if (typeof _kbLoadApprovalPanel === 'function') _kbLoadApprovalPanel();
            } else {
                showToast('Lỗi: ' + (result.error || 'Không thể nộp lại'), 'error');
            }
            return;
        }

        const formData = new FormData();
        formData.append('template_id', templateId);
        formData.append('report_date', reportDate);
        formData.append('quantity', qty);
        if (content) formData.append('content', content);
        if (link) formData.append('report_value', link);
        if (_kbPastedFile) formData.append('report_image', _kbPastedFile, 'paste.png');

        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        const resp = await fetch('/api/schedule/report', {
            method: 'POST',
            body: formData,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await resp.json();
        if (data.success) {
            showToast(`✅ Đã nộp báo cáo! ${data.status === 'pending' ? '⏳ Chờ duyệt' : '+' + data.points_earned + 'đ'}`);
            document.getElementById('kbReportModal')?.remove();
            _kbLoadSchedule();
        } else {
            showToast('Lỗi: ' + (data.error || 'Unknown'), 'error');
        }
    } catch(e) { showToast('Lỗi gửi báo cáo: ' + (e.message || ''), 'error'); }
}

async function _kbApprove(reportId, action) {
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action });
        showToast(action === 'approve' ? '✅ Đã duyệt!' : '❌ Đã từ chối!');
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

function _kbToggleSystem(sysId) {
    const content = document.querySelector(`.kb-sys-content[data-sys-id="${sysId}"]`);
    const header = document.querySelector(`.kb-system-header[data-sys-id="${sysId}"]`);
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const arrow = header?.querySelector('.kb-sys-arrow');
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

function _kbFilterMembers() {
    const q = (document.getElementById('kbMemberSearch')?.value || '').toLowerCase().trim();
    const list = document.getElementById('kbMemberList');
    if (!list) return;
    const members = list.querySelectorAll('.kb-member-item');
    const deptHeaders = list.querySelectorAll('.kb-dept-header');
    
    // Track which depts have visible members
    const visibleDepts = new Set();
    
    members.forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        const dept = el.dataset.dept || '';
        const uid = el.dataset.uid;
        if (!q || uid === '' || name.includes(q)) {
            el.style.display = '';
            if (dept) visibleDepts.add(dept);
        } else {
            el.style.display = 'none';
        }
    });
    
    // Show/hide dept headers based on whether they have visible members
    deptHeaders.forEach(h => {
        const dept = h.dataset.dept || '';
        if (!q || visibleDepts.has(dept)) {
            h.style.display = '';
        } else {
            h.style.display = 'none';
        }
    });
}

// ========== SETUP NGƯỜI DUYỆT (GĐ only) ==========
let _kbSetupVisible = false;
async function _kbShowSetupTab() {
    const panel = document.getElementById('kbSetupPanel');
    if (!panel) return;
    _kbSetupVisible = !_kbSetupVisible;
    const btn = document.getElementById('kbSetupBtn');
    if (!_kbSetupVisible) {
        panel.style.display = 'none';
        if (btn) { btn.style.background = 'white'; btn.style.color = '#64748b'; }
        return;
    }
    if (btn) { btn.style.background = '#2563eb'; btn.style.color = 'white'; }
    panel.style.display = 'block';
    panel.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">Đang tải...</div>';

    try {
        const [approverData, deptData, configData, usersData] = await Promise.all([
            apiCall('/api/schedule/approvers'),
            apiCall('/api/task-points/departments'),
            apiCall('/api/schedule/config'),
            apiCall('/api/users/dropdown')
        ]);

        const approvers = approverData.approvers || [];
        const allDepts = (deptData.departments || []);
        const redoMax = configData.task_redo_max || 1;
        const allUsers = (usersData.users || []).filter(u => u.role !== 'tkaffiliate' && u.status !== 'resigned');

        // Build tree
        const systems = allDepts.filter(d => !d.parent_id);
        let html = `<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="margin:0;font-size:16px;color:#1e293b;font-weight:700;">⚙️ Setup Người Duyệt Công Việc</h3>
                <div style="display:flex;align-items:center;gap:12px;">
                    <label style="font-size:12px;color:#64748b;font-weight:600;">Số lần làm lại tối đa:</label>
                    <input type="number" id="kbRedoMaxInput" value="${redoMax}" min="0" max="10" style="width:60px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;text-align:center;" />
                    <button onclick="_kbSaveRedoMax()" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#2563eb;color:white;cursor:pointer;font-weight:600;">Lưu</button>
                </div>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">ℹ️ Giám Đốc tự động duyệt tất cả, không cần gán. Gán người duyệt cho phòng CHA → tự động duyệt luôn team CON.</div>`;

        systems.forEach(sys => {
            const children = allDepts.filter(d => d.parent_id === sys.id);
            const sysApprovers = approvers.filter(a => a.department_id === sys.id);
            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:10px 14px;font-weight:800;font-size:13px;letter-spacing:.3px;display:flex;align-items:center;justify-content:space-between;">
                    <span>🏢 ${sys.name}</span>
                    <select onchange="_kbAddApprover(this.value, ${sys.id}); this.value='';" style="padding:3px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;color:white;background:rgba(255,255,255,0.15);cursor:pointer;">
                        <option value="" style="color:#333;">+ Gán duyệt toàn hệ thống</option>
                        ${allUsers.filter(u => !sysApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}" style="color:#333;">${u.full_name} (${u.role})</option>`).join('')}
                    </select>
                </div>
                ${sysApprovers.length > 0 ? `<div style="padding:6px 14px;background:#eff6ff;border-bottom:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
                    <span style="font-size:10px;color:#64748b;font-weight:600;">Duyệt toàn hệ thống:</span>
                    ${sysApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;border:1px solid #93c5fd;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#1d4ed8;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:12px;padding:0;line-height:1;">×</button></span>`).join('')}
                </div>` : ''}`;

            children.forEach(dept => {
                const deptApprovers = approvers.filter(a => a.department_id === dept.id);
                const subTeams = allDepts.filter(d => d.parent_id === dept.id);

                html += `<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-weight:700;font-size:13px;color:#1e293b;">📦 ${dept.name}</span>
                        <select onchange="_kbAddApprover(this.value, ${dept.id}); this.value='';" style="padding:3px 8px;font-size:11px;border:1px solid #e2e8f0;border-radius:6px;color:#64748b;">
                            <option value="">+ Thêm người duyệt</option>
                            ${allUsers.filter(u => !deptApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${deptApprovers.length === 0 ? '<span style="font-size:11px;color:#d1d5db;font-style:italic;">Chưa gán</span>' : ''}
                        ${deptApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;color:#1d4ed8;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:12px;padding:0;line-height:1;">×</button></span>`).join('')}
                    </div>`;

                // Sub-teams
                subTeams.forEach(team => {
                    const teamApprovers = approvers.filter(a => a.department_id === team.id);
                    html += `<div style="margin-top:6px;padding-left:16px;border-left:2px solid #e2e8f0;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                            <span style="font-size:12px;color:#475569;font-weight:600;">└ ${team.name}</span>
                            <select onchange="_kbAddApprover(this.value, ${team.id}); this.value='';" style="padding:2px 6px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;color:#64748b;">
                                <option value="">+ Thêm</option>
                                ${allUsers.filter(u => !teamApprovers.some(a => a.user_id === u.id)).map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${teamApprovers.length === 0 ? '<span style="font-size:10px;color:#d1d5db;font-style:italic;">Kế thừa từ phòng cha</span>' : ''}
                            ${teamApprovers.map(a => `<span style="display:inline-flex;align-items:center;gap:3px;background:#ecfdf5;border:1px solid #a7f3d0;padding:2px 6px;border-radius:5px;font-size:10px;font-weight:600;color:#059669;">👤 ${a.user_name} <button onclick="_kbRemoveApprover(${a.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:11px;padding:0;line-height:1;">×</button></span>`).join('')}
                        </div>
                    </div>`;
                });

                html += `</div>`;
            });
            html += `</div>`;
        });

        html += `</div>`;
        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:12px;">Lỗi: ${e.message}</div>`;
    }
}

async function _kbAddApprover(userId, deptId) {
    if (!userId) return;
    try {
        await apiCall('/api/schedule/approvers', 'POST', { user_id: Number(userId), department_id: deptId });
        _kbShowSetupTab(); _kbSetupVisible = false; _kbShowSetupTab(); // refresh
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _kbRemoveApprover(id) {
    if (!confirm('Xóa phân quyền duyệt này?')) return;
    try {
        await apiCall(`/api/schedule/approvers/${id}`, 'DELETE');
        _kbShowSetupTab(); _kbSetupVisible = false; _kbShowSetupTab();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _kbSaveRedoMax() {
    const v = Number(document.getElementById('kbRedoMaxInput')?.value) || 1;
    try {
        await apiCall('/api/schedule/config', 'POST', { task_redo_max: v });
        alert('Đã lưu: Tối đa ' + v + ' lần làm lại');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== COUNTDOWN HELPER ==========
function _kbFormatCountdown(deadlineStr) {
    if (!deadlineStr) return '<span style="color:#9ca3af;">—</span>';
    const now = new Date();
    const dl = new Date(deadlineStr);
    const diff = dl - now;
    if (diff <= 0) return '<span style="font-weight:800;color:#dc2626;font-size:11px;">🔴 HẾT HẠN</span>';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    let color = '#059669'; // green
    let bg = '#ecfdf5';
    if (hours < 6) { color = '#dc2626'; bg = '#fef2f2'; } // red
    else if (hours < 12) { color = '#d97706'; bg = '#fef3c7'; } // orange
    return `<span style="font-weight:800;color:${color};background:${bg};padding:2px 8px;border-radius:6px;font-size:11px;">${hours}h${mins > 0 ? String(mins).padStart(2,'0') + 'p' : ''}</span>`;
}


// ========== EMPLOYEE PENDING BANNER ==========
async function _kbLoadMyPendingBanner() {
    // Remove old banner if exists
    document.getElementById('_kbPendingStickyBanner')?.remove();
    try {
        const data = await apiCall('/api/schedule/my-pending');
        const reports = data.reports || [];
        const lockPending = data.lockPending || [];
        const chainPending = data.chainPending || [];
        const total = reports.length + lockPending.length + chainPending.length;
        if (total === 0) return;

        let taskList = [];
        reports.forEach(r => {
            const dateF = r.report_date.split('-').reverse().join('/');
            taskList.push('📊 ' + r.task_name + ' (' + dateF + ')');
        });
        lockPending.forEach(r => {
            const dateF = (r.completion_date||'').split('-').reverse().join('/');
            taskList.push('🔐 ' + r.task_name + ' (' + dateF + ')');
        });
        chainPending.forEach(r => {
            taskList.push('🔗 ' + r.task_name);
        });

        const banner = document.createElement('div');
        banner.id = '_kbPendingStickyBanner';
        banner.innerHTML = `
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:12px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 4px 20px rgba(217,119,6,0.4);position:relative;">
            <div style="width:44px;height:44px;background:rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;animation:_kbBellShake 2s infinite;">⏳</div>
            <div style="flex:1;min-width:0;">
                <div style="color:white;font-weight:900;font-size:15px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">
                    🔔 BẠN CÓ ${total} CÔNG VIỆC ĐANG CHỜ DUYỆT!
                </div>
                <div style="color:rgba(255,255,255,0.9);font-size:12px;margin-top:3px;">
                    ${taskList.join(' • ')}
                </div>
                <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-top:2px;">
                    💡 Hãy liên hệ quản lý để được duyệt sớm nhất
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.3);padding:8px 18px;border-radius:20px;font-size:22px;font-weight:900;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.2);min-width:36px;text-align:center;flex-shrink:0;">${total}</div>
            <button onclick="document.getElementById('_kbPendingStickyBanner').style.display='none'" style="position:absolute;top:6px;right:10px;background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:16px;padding:2px 6px;">✕</button>
        </div>`;
        banner.style.cssText = 'position:sticky;top:0;z-index:100;margin:-20px -20px 16px -20px;border-radius:0 0 12px 12px;overflow:hidden;animation:_kbPendingPulse 3s infinite;';

        // Insert at top of the content area (inside the flex>right column, before stats bar)
        const gridWrap = document.getElementById('kbGridWrap');
        if (gridWrap && gridWrap.parentElement) {
            gridWrap.parentElement.insertBefore(banner, gridWrap.parentElement.firstChild);
        } else {
            // Fallback: insert after kbApprovalPanel
            const ap = document.getElementById('kbApprovalPanel');
            if (ap && ap.parentElement) {
                ap.parentElement.insertBefore(banner, ap.nextSibling);
            }
        }
    } catch(e) { console.warn('[MyPending]', e); }
}

// ========== APPROVAL PANEL (pending reports) ==========
async function _kbLoadApprovalPanel() {
    const panel = document.getElementById('kbApprovalPanel');
    if (!panel) return;

    try {
        // Fetch CV Diem, CV Khoa, and Chain Task pending reports
        const [data, lockData, chainData] = await Promise.all([
            apiCall('/api/schedule/pending-approvals'),
            apiCall('/api/lock-tasks/pending-reviews').catch(() => ({ reviews: [] })),
            apiCall('/api/chain-tasks/pending-reviews').catch(() => ({ reviews: [] }))
        ]);
        const pending = data.pending || [];
        const lockReviews = lockData.reviews || [];
        const chainReviews = chainData.reviews || [];
        const totalCount = pending.length + lockReviews.length + chainReviews.length;

        // Update sidebar badge
        _kbUpdateSidebarBadge(totalCount);

        if (totalCount === 0) {
            panel.innerHTML = '';
            return;
        }

        let rows = '';
        // ===== GROUP pending reports by user + task + date =====
        const _pendingGroups = {};
        pending.forEach(r => {
            const key = `${r.user_id}_${r.template_id}_${r.report_date}`;
            if (!_pendingGroups[key]) {
                _pendingGroups[key] = {
                    ids: [], user_name: r.user_name, task_name: r.task_name,
                    template_id: r.template_id, user_id: r.user_id,
                    report_date: r.report_date, template_points: r.template_points,
                    guide_url: r.guide_url || '', min_quantity: r.min_quantity || 1,
                    approval_deadline: r.approval_deadline,
                    input_requirements: r.input_requirements || '',
                    output_requirements: r.output_requirements || '',
                    reports: [], hasRedo: false
                };
            }
            _pendingGroups[key].ids.push(r.id);
            _pendingGroups[key].reports.push(r);
            if (r.redo_count > 0) _pendingGroups[key].hasRedo = true;
            if (r.approval_deadline && (!_pendingGroups[key].approval_deadline || r.approval_deadline < _pendingGroups[key].approval_deadline)) {
                _pendingGroups[key].approval_deadline = r.approval_deadline;
            }
        });

        Object.values(_pendingGroups).forEach(g => {
            const dateFormatted = g.report_date.split('-').reverse().join('/');
            const countdown = _kbFormatCountdown(g.approval_deadline);
            const dlDate = g.approval_deadline ? new Date(g.approval_deadline) : null;
            const isOverdue = dlDate && dlDate < new Date();
            const isUrgent = dlDate && (dlDate - new Date()) < 6 * 3600000;
            const count = g.ids.length;
            const countBadge = count > 1 ? `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:800;margin-left:6px;">${count}/${g.min_quantity}</span>` : '';
            const idsJson = JSON.stringify(g.ids).replace(/"/g, '&quot;');

            const taskNameEsc = (g.task_name||'').replace(/'/g, "\\'");
            const viewBtn = `<span onclick="_kbSmartViewTask('${taskNameEsc}', ${g.user_id}, '${g.report_date}', 'schedule', ${g.template_id})" style="background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;" title="Mở trang xem chi tiết">👁️ Xem</span>`;

            rows += `<tr style="border-bottom:1px solid #f1f5f9;${isOverdue ? 'background:#fef2f2;' : isUrgent ? 'background:#fffbeb;' : ''}">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;">${g.user_name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;">
                    <span onclick="_kbShowTaskDetail(${g.template_id})" style="color:#2563eb;cursor:pointer;font-weight:700;text-decoration:underline;text-decoration-style:dashed;text-underline-offset:2px;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'">${g.task_name}</span>
                    ${countBadge}
                    ${g.hasRedo ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">🔄 Nộp lại</span>' : ''}
                </td>
                <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${dateFormatted}</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1d4ed8;">${g.template_points}đ</td>
                <td style="padding:8px 12px;text-align:center;">${viewBtn}</td>
                <td style="padding:8px 12px;text-align:center;">${countdown}</td>
                <td style="padding:8px 12px;text-align:center;">
                    <button onclick="_kbApproveGroupReports(${idsJson})" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-weight:700;margin-right:4px;">✅ Duyệt${count > 1 ? ' ('+count+')' : ''}</button>
                    <button onclick="_kbRejectGroupReports(${idsJson}, '${g.task_name.replace(/'/g, "\\'")}', '${g.user_name.replace(/'/g, "\\'")}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">❌ Từ chối</button>
                </td>
            </tr>`;
        });
        // CV Khoa (lock task) pending rows
        lockReviews.forEach(r => {
            const isRedo = r.redo_count > 0;
            const dateFormatted = r.completion_date.split('-').reverse().join('/');
            const lockDeadline = r.approval_deadline ? new Date(r.approval_deadline) : null;
            const lockOverdue = lockDeadline && lockDeadline < new Date();
            const lockUrgent = lockDeadline && (lockDeadline - new Date()) < 6 * 3600000;
            rows += `<tr style="border-bottom:1px solid #f1f5f9;${lockOverdue ? 'background:#fef2f2;' : lockUrgent ? 'background:#fffbeb;' : ''}">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;">${r.user_name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;">
                    <span onclick="_kbShowLockTaskDetail(${r.lock_task_id})" style="color:#991b1b;font-weight:700;cursor:pointer;text-decoration:underline;text-decoration-style:dashed;text-underline-offset:2px;" onmouseover="this.style.color='#7f1d1d'" onmouseout="this.style.color='#991b1b'">${r.task_name}</span>
                    <span style="background:#fecaca;color:#991b1b;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">🔐 KHÓA</span>
                    ${isRedo ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:2px;">🔄 Nộp lại</span>' : ''}
                </td>
                <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${dateFormatted}</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#991b1b;">🔐</td>
                <td style="padding:8px 12px;text-align:center;">
                    <span onclick="_kbSmartViewTask('${(r.task_name||'').replace(/'/g, "\\'")}', ${r.user_id}, '${r.completion_date}', 'lock', ${r.lock_task_id})" style="background:#fef2f2;border:1px solid #fecaca;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;" title="Mở trang xem chi tiết">👁️ Xem</span>
                </td>
                <td style="padding:8px 12px;text-align:center;">${r.approval_deadline ? _kbFormatCountdown(r.approval_deadline) : '<span style="color:#9ca3af;">—</span>'}</td>
                <td style="padding:8px 12px;text-align:center;">
                    <button onclick="_kbLockApprove(${r.id})" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-weight:700;margin-right:4px;">✅ Duyệt</button>
                    <button onclick="_kbLockReject(${r.id}, '${(r.task_name||'').replace(/'/g, "\\'")}', '${(r.user_name||'').replace(/'/g, "\\'")}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">❌ Từ chối</button>
                </td>
            </tr>`;
        });

        // CV Chuoi (chain task) pending rows
        chainReviews.forEach(r => {
            const isRedo = r.redo_count > 0;
            const deadlineFormatted = r.deadline ? r.deadline.split('-').reverse().join('/') : '—';
            const chainCountdown = r.approval_deadline ? _kbFormatCountdown(r.approval_deadline) : '<span style="color:#9ca3af;">—</span>';
            const dlDate = r.approval_deadline ? new Date(r.approval_deadline) : null;
            const isOverdue = dlDate && dlDate < new Date();
            const isUrgent = dlDate && (dlDate - new Date()) < 6 * 3600000;
            const rData = JSON.stringify({
                id: r.id, chain_item_id: r.chain_item_id, task_name: r.task_name, chain_name: r.chain_name,
                proof_url: r.proof_url || '', content: r.content || '', quantity_done: r.quantity_done || 0,
                min_quantity: r.min_quantity || 1, user_name: r.user_name, redo_count: r.redo_count || 0,
                created_at: r.created_at || '', user_id: r.user_id
            }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            rows += `<tr style="border-bottom:1px solid #f1f5f9;${isOverdue ? 'background:#fef2f2;' : isUrgent ? 'background:#fffbeb;' : ''}">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;">${r.user_name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;">
                    <span style="color:#1e40af;font-weight:700;">${r.task_name}</span>
                    <span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">🔗 CHUỖI</span>
                    ${isRedo ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:2px;">🔄 Nộp lại</span>' : ''}
                    <div style="font-size:10px;color:#6b7280;margin-top:2px;">${r.chain_name}</div>
                </td>
                <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${deadlineFormatted}</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1e40af;">🔗</td>
                <td style="padding:8px 12px;text-align:center;">
                    <span onclick="_kbSmartViewTask('${(r.task_name||'').replace(/'/g, "\\'")}', ${r.user_id}, '${r.deadline || r.completion_date || ''}', 'chain', ${r.chain_item_id})" style="background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;" title="Mở trang xem chi tiết">👁️ Xem</span>
                </td>
                <td style="padding:8px 12px;text-align:center;">${chainCountdown}</td>
                <td style="padding:8px 12px;text-align:center;">
                    <button onclick="_kbChainApprove(${r.chain_item_id},${r.id})" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-weight:700;margin-right:4px;">✅ Duyệt</button>
                    <button onclick="_kbChainReject(${r.chain_item_id},${r.id},'${(r.task_name||'').replace(/'/g, "\\'")}','${(r.user_name||'').replace(/'/g, "\\'")}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">❌ Từ chối</button>
                </td>
            </tr>`;
        });

        panel.innerHTML = `
        <div style="background:white;border:2px solid #fde68a;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(217,119,6,0.1);">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:800;font-size:14px;">📋 CÔNG VIỆC CHỜ DUYỆT</span>
                <div style="display:flex;gap:6px;">
                    ${pending.length > 0 ? `<span style="background:rgba(255,255,255,0.3);color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:800;">📊 ${Object.keys(_pendingGroups).length}</span>` : ''}
                    ${lockReviews.length > 0 ? `<span style="background:rgba(220,38,38,0.6);color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:800;">🔐 ${lockReviews.length}</span>` : ''}
                    ${chainReviews.length > 0 ? `<span style="background:rgba(37,99,235,0.6);color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:800;">🔗 ${chainReviews.length}</span>` : ''}
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#1e3a5f;">
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Nhân viên</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Công việc</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Ngày</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Điểm</th>
                            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Báo cáo</th>
                            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">⏰ Còn</th>
                            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#fde68a;font-weight:700;text-transform:uppercase;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    } catch(e) {
        panel.innerHTML = '';
    }
}

async function _kbApproveReport(reportId) {
    if (!confirm('✅ Xác nhận DUYỆT báo cáo này?')) return;
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action: 'approve' });
        showToast('✅ Đã duyệt báo cáo');
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }
}
// ===== GROUP APPROVE: approve all reports in a group at once =====
async function _kbApproveGroupReports(ids) {
    if (!Array.isArray(ids)) ids = [ids];
    const count = ids.length;
    if (!confirm(`✅ Xác nhận DUYỆT ${count > 1 ? count + ' báo cáo' : 'báo cáo này'}?`)) return;
    try {
        for (const id of ids) {
            await apiCall(`/api/schedule/report/${id}/approve`, 'PUT', { action: 'approve' });
        }
        showToast(`✅ Đã duyệt ${count} báo cáo`);
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }
}

// ===== GROUP REJECT: reject all reports in a group =====
function _kbRejectGroupReports(ids, taskName, userName) {
    if (!Array.isArray(ids)) ids = [ids];
    let modal = document.getElementById('kbRejectModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'kbRejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const count = ids.length;
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#dc2626;">❌ Từ chối báo cáo</h3>
        <div style="margin-bottom:12px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — ${taskName}${count > 1 ? ' <span style="background:#fecaca;color:#991b1b;padding:1px 8px;border-radius:6px;font-size:11px;font-weight:700;">'+count+' báo cáo</span>' : ''}</div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Lý do từ chối *</label>
            <textarea id="kbRejectReason" rows="3" style="width:100%;padding:8px 12px;border:1px solid #fecaca;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Nhập lý do từ chối..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('kbRejectModal').remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;">Hủy</button>
            <button onclick="_kbConfirmGroupReject(${JSON.stringify(ids)})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">Xác nhận từ chối</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('kbRejectReason')?.focus(), 100);
}

async function _kbConfirmGroupReject(ids) {
    const reason = document.getElementById('kbRejectReason')?.value?.trim();
    if (!reason) { alert('Phải nhập lý do từ chối'); return; }
    try {
        for (const id of ids) {
            await apiCall(`/api/schedule/report/${id}/approve`, 'PUT', { action: 'reject', reject_reason: reason });
        }
        document.getElementById('kbRejectModal')?.remove();
        showToast(`❌ Đã từ chối ${ids.length} báo cáo`);
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không thể từ chối')); }
}


function _kbRejectReport(reportId, taskName, userName) {
    let modal = document.getElementById('kbRejectModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbRejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#dc2626;">❌ Từ chối báo cáo</h3>
        <div style="margin-bottom:12px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — ${taskName}</div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Lý do từ chối *</label>
            <textarea id="kbRejectReason" rows="3" style="width:100%;padding:8px 12px;border:1px solid #fecaca;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Nhập lý do từ chối..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('kbRejectModal').remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;">Hủy</button>
            <button onclick="_kbConfirmReject(${reportId})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">Xác nhận từ chối</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('kbRejectReason')?.focus(), 100);
}

async function _kbConfirmReject(reportId) {
    const reason = document.getElementById('kbRejectReason')?.value?.trim();
    if (!reason) { alert('Phải nhập lý do từ chối'); return; }
    try {
        await apiCall(`/api/schedule/report/${reportId}/approve`, 'PUT', { action: 'reject', reject_reason: reason });
        document.getElementById('kbRejectModal')?.remove();
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không thể từ chối')); }
}

// ===== Lock Task Approve/Reject from approval panel =====
async function _kbLockApprove(completionId) {
    if (!confirm('✅ Xác nhận DUYỆT báo cáo CV Khóa này?')) return;
    try {
        await apiCall(`/api/lock-tasks/${completionId}/review`, 'POST', { action: 'approve' });
        showToast('✅ Đã duyệt CV Khóa');
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }
}

function _kbLockReject(completionId, taskName, userName) {
    let modal = document.getElementById('kbRejectModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbRejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#dc2626;">❌ Từ chối CV Khóa</h3>
        <div style="margin-bottom:12px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — <span style="color:#991b1b;">${taskName}</span> <span style="background:#fecaca;color:#991b1b;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔐 KHÓA</span></div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Lý do từ chối *</label>
            <textarea id="kbLockRejectReason" rows="3" style="width:100%;padding:8px 12px;border:1px solid #fecaca;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Nhập lý do từ chối..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('kbRejectModal').remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;">Hủy</button>
            <button onclick="_kbConfirmLockReject(${completionId})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">Xác nhận từ chối</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('kbLockRejectReason')?.focus(), 100);
}

async function _kbConfirmLockReject(completionId) {
    const reason = document.getElementById('kbLockRejectReason')?.value?.trim();
    if (!reason) { alert('Phải nhập lý do từ chối'); return; }
    try {
        await apiCall(`/api/lock-tasks/${completionId}/review`, 'POST', { action: 'reject', reject_reason: reason });
        document.getElementById('kbRejectModal')?.remove();
        showToast('✅ Đã từ chối CV Khóa');
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không thể từ chối')); }
}

// ===== Chain Task: View Report from approval panel =====
function _kbViewChainReport(el) {
    const data = JSON.parse(el.getAttribute('data-report').replace(/&quot;/g, '"'));

    let modal = document.getElementById('kbChainReportModal');
    if (modal) modal.remove();

    const proofHtml = data.proof_url ? (
        /\.(jpg|jpeg|png|gif|webp)$/i.test(data.proof_url)
            ? `<div style="margin-top:8px;"><div style="font-size:11px;color:#64748b;margin-bottom:4px;">🖼️ Hình ảnh:</div><img src="${data.proof_url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${data.proof_url}','_blank')"></div>`
            : `<div style="margin-top:6px;padding:6px 12px;background:#eff6ff;border-radius:6px;"><a href="${data.proof_url}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">🔗 Xem link báo cáo →</a></div>`
    ) : '';

    const qd = data.quantity_done || 0;
    const mq = data.min_quantity || 1;
    const isLow = qd < mq;
    const quantityHtml = `<div style="padding:6px 12px;background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;font-weight:700;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>
        ${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}
    </div>`;

    modal = document.createElement('div');
    modal.id = 'kbChainReportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;';
    modal.innerHTML = `<div style="background:white;border-radius:16px;padding:0;width:480px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);position:relative;">
        <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:16px 22px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:16px;font-weight:800;color:white;">🔗 ${data.task_name}</div>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">📋 ${data.chain_name} — ${data.user_name}</div>
            </div>
            <button onclick="document.getElementById('kbChainReportModal').remove()" style="background:rgba(255,255,255,.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:18px 22px;">
            ${data.redo_count > 0 ? `<div style="margin-bottom:8px;"><span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">🔄 Lần nộp: ${data.redo_count + 1}</span></div>` : ''}
            ${quantityHtml}
            ${data.content ? `<div style="padding:8px 12px;background:white;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:11px;color:#64748b;margin-bottom:2px;">📝 Nội dung:</div>
                <div style="font-size:12px;color:#1e293b;">${data.content}</div>
            </div>` : ''}
            ${proofHtml}
            <div style="text-align:right;margin-top:12px;">
                <button onclick="document.getElementById('kbChainReportModal').remove()" style="padding:8px 20px;border-radius:8px;border:none;background:#1e40af;color:white;font-weight:700;cursor:pointer;font-size:13px;">Đóng</button>
            </div>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// ===== Chain Task Approve/Reject from approval panel =====
async function _kbChainApprove(itemId, completionId) {
    if (!confirm('✅ Xác nhận DUYỆT báo cáo CV Chuỗi này?')) return;
    try {
        await apiCall(`/api/chain-tasks/items/${itemId}/approve`, 'POST', { completion_id: completionId });
        showToast('✅ Đã duyệt CV Chuỗi');
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }
}

function _kbChainReject(itemId, completionId, taskName, userName) {
    let modal = document.getElementById('kbRejectModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbRejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#dc2626;">❌ Từ chối CV Chuỗi</h3>
        <div style="margin-bottom:12px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — <span style="color:#1e40af;">${taskName}</span> <span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔗 CHUỖI</span></div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Lý do từ chối *</label>
            <textarea id="kbChainRejectReason" rows="3" style="width:100%;padding:8px 12px;border:1px solid #fecaca;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Nhập lý do từ chối..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('kbRejectModal').remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;">Hủy</button>
            <button onclick="_kbConfirmChainReject(${itemId},${completionId})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:#dc2626;color:white;cursor:pointer;font-weight:700;">Xác nhận từ chối</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('kbChainRejectReason')?.focus(), 100);
}

async function _kbConfirmChainReject(itemId, completionId) {
    const reason = document.getElementById('kbChainRejectReason')?.value?.trim();
    if (!reason) { alert('Phải nhập lý do từ chối'); return; }
    try {
        await apiCall(`/api/chain-tasks/items/${itemId}/reject`, 'POST', { completion_id: completionId, reject_reason: reason });
        document.getElementById('kbRejectModal')?.remove();
        showToast('✅ Đã từ chối CV Chuỗi');
        _kbLoadApprovalPanel();
        _kbLoadSchedule();
    } catch(e) { alert('Lỗi: ' + (e.message || 'Không thể từ chối')); }
}

// ========== REJECTED POPUP (for employees) ==========
async function _kbCheckRejectedPopup() {
    try {
        const data = await apiCall('/api/schedule/my-rejected');
        const rejected = data.rejected || [];
        if (rejected.length === 0) return;

        // Check localStorage for already-dismissed rejections
        const dismissKey = `kb_rejected_dismissed_${window._currentUser?.id || 'default'}`;
        let dismissed = [];
        try { dismissed = JSON.parse(localStorage.getItem(dismissKey)) || []; } catch {}

        // Filter: only show rejections not yet dismissed
        const newRejected = rejected.filter(r => {
            const id = `${r.id}_${r.report_date}`;
            return !dismissed.includes(id);
        });
        if (newRejected.length === 0) return;

        let items = '';
        newRejected.forEach((r, i) => {
            const dateF = r.report_date.split('-').reverse().join('/');
            const deadlineDate = new Date(r.redo_deadline);
            const deadlineStr = `${String(deadlineDate.getDate()).padStart(2,'0')}/${String(deadlineDate.getMonth()+1).padStart(2,'0')}`;
            items += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:#dc2626;margin-bottom:4px;">${i+1}. ${r.task_name} (${dateF})</div>
                <div style="font-size:12px;color:#7f1d1d;margin-bottom:4px;">💬 Lý do: "${r.reject_reason}"</div>
                <div style="font-size:11px;color:#d97706;font-weight:600;">⏰ Hạn nộp lại: 23:59 ngày ${deadlineStr}</div>
            </div>`;
        });

        let modal = document.createElement('div');
        modal.id = 'kbRejectedPopup';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;width:450px;max-width:92vw;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);border-top:4px solid #dc2626;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
                <div style="font-size:18px;font-weight:800;color:#dc2626;">BẠN CÓ CÔNG VIỆC BỊ TỪ CHỐI!</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px;">Hãy sửa và nộp lại trước hạn để không mất điểm</div>
            </div>
            ${items}
            <div style="text-align:center;margin-top:16px;">
                <button id="kbRejectedDismissBtn" style="padding:10px 28px;font-size:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(37,99,235,0.3);">Đã hiểu ✓</button>
            </div>
        </div>`;
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);

        // On dismiss: save all current rejected IDs to localStorage
        document.getElementById('kbRejectedDismissBtn').onclick = () => {
            const ids = newRejected.map(r => `${r.id}_${r.report_date}`);
            const updated = [...new Set([...dismissed, ...ids])];
            try { localStorage.setItem(dismissKey, JSON.stringify(updated)); } catch {}
            modal.remove();
        };
    } catch(e) {}
}

// ========== SIDEBAR BADGE ==========
function _kbUpdateSidebarBadge(count) {
    // Find the sidebar menu item for "Lịch Khóa Biểu Công Việc"
    const menuItems = document.querySelectorAll('.sidebar-menu-item, [data-page]');
    menuItems.forEach(el => {
        if (el.textContent.includes('Lịch Khóa Biểu') && !el.textContent.includes('Badge')) {
            let badge = el.querySelector('.kb-pending-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'kb-pending-badge';
                    badge.style.cssText = 'background:#dc2626;color:white;font-size:10px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:6px;line-height:1.3;display:inline-block;animation:_kbPulse 2s infinite;';
                    el.appendChild(badge);
                }
                badge.textContent = count;
            } else if (badge) {
                badge.remove();
            }
        }
    });
}

// Load badge on page init for managers
async function _kbInitBadge() {
    const isManager = ['giam_doc','quan_ly','truong_phong','quan_ly_cap_cao'].includes(currentUser?.role);
    if (!isManager) return;
    try {
        const data = await apiCall('/api/schedule/pending-count');
        _kbUpdateSidebarBadge(data.count || 0);
    } catch(e) {}
}

// Auto-init badge
if (typeof currentUser !== 'undefined' && currentUser) {
    setTimeout(_kbInitBadge, 1000);
}

// ========== SẾP HỖ TRỢ FUNCTIONS ==========

// NV: Send support request
async function _kbSendSupportRequest(templateId, dateStr, taskName) {
    if (!confirm(`🆘 Gửi yêu cầu hỗ trợ cho công việc "${taskName}" ngày ${dateStr.split('-').reverse().join('/')}?\n\nDeadline hỗ trợ: hạn đến hết ngày mai.\nBạn vẫn có thể tự báo cáo công việc này.`)) return;

    try {
        const res = await apiCall('/api/task-support/request', 'POST', {
            template_id: templateId,
            task_date: dateStr,
            task_name: taskName
        });
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        showToast(`✅ ${res.message || 'Đã gửi yêu cầu hỗ trợ'}`);
        _kbLoadSchedule();
    } catch(e) {
        showToast(e.message || 'Lỗi gửi yêu cầu', 'error');
    }
}

// QL: Load support panel
async function _kbLoadSupportPanel() {
    const panel = document.getElementById('kbSupportPanel');
    if (!panel) return;

    try {
        const data = await apiCall('/api/task-support/pending');
        const pending = data.pending || [];

        if (pending.length === 0) {
            panel.innerHTML = '';
            return;
        }

        let rows = '';
        pending.forEach(r => {
            const dateFormatted = r.task_date.split('-').reverse().join('/');
            const countdown = _kbFormatCountdown(r.deadline_at || (r.deadline + 'T23:59:59'));
            const dlDate = r.deadline_at ? new Date(r.deadline_at) : new Date(r.deadline + 'T23:59:59');
            const isOverdue = dlDate < new Date();
            const isUrgent = !isOverdue && (dlDate - new Date()) < 6 * 3600000;

            rows += `<tr style="border-bottom:1px solid #f1f5f9;${isOverdue ? 'background:#fef2f2;' : isUrgent ? 'background:#fffbeb;' : ''}">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;">${r.user_name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;"><span onclick="_kbShowTaskDetail(${r.template_id})" style="color:#2563eb;cursor:pointer;font-weight:700;text-decoration:underline;text-decoration-style:dashed;text-underline-offset:2px;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#2563eb'">${r.task_name}</span></td>
                <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${dateFormatted}</td>
                <td style="padding:8px 12px;text-align:center;">${countdown}</td>
                <td style="padding:8px 12px;text-align:center;">
                    <button onclick="_kbRespondSupport(${r.id}, '${(r.task_name||'').replace(/'/g,"\\'")}', '${(r.user_name||'').replace(/'/g,"\\'")}', '${dateFormatted}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(5,150,105,0.3);">✅ Đã hỗ trợ</button>
                </td>
            </tr>`;
        });

        panel.innerHTML = `
        <div style="background:white;border:2px solid #fca5a5;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(220,38,38,0.1);">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:800;font-size:14px;">🆘 HỖ TRỢ NHÂN SỰ</span>
                <span style="background:rgba(255,255,255,0.3);color:white;padding:2px 10px;border-radius:10px;font-size:13px;font-weight:800;">${pending.length}</span>
            </div>
            <div style="padding:6px 12px;background:#fef2f2;font-size:11px;color:#dc2626;font-weight:600;">
                ⚠️ Nếu không hỗ trợ trước hạn, tài khoản sẽ bị <b>KHÓA</b>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#1e3a5f;">
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Nhân viên</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Công việc</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Ngày</th>
                            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">⏰ Còn</th>
                            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    } catch(e) {
        panel.innerHTML = '';
    }
}

// QL: Respond to support request
function _kbRespondSupport(requestId, taskName, userName, dateStr) {
    let modal = document.getElementById('kbSupportModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kbSupportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:480px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,.25);">
        <h3 style="margin:0 0 16px 0;font-size:16px;color:#059669;">✅ Xác nhận hỗ trợ nhân sự</h3>
        <div style="margin-bottom:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:10px 14px;">
            <div style="font-size:13px;color:#374151;"><strong>${userName}</strong> — ${taskName}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">📅 Ngày: ${dateStr}</div>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Ghi chú hỗ trợ * (bắt buộc)</label>
            <textarea id="kbSupportNote" rows="4" style="width:100%;padding:8px 12px;border:1px solid #a7f3d0;border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Mô tả cách bạn đã hỗ trợ nhân viên (VD: đã gọi điện hướng dẫn, đã chat giải đáp...)"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button onclick="document.getElementById('kbSupportModal')?.remove()" style="padding:8px 16px;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;">Hủy</button>
            <button onclick="_kbSubmitSupport(${requestId})" style="padding:8px 16px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(5,150,105,0.3);">✅ Xác nhận đã hỗ trợ</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('kbSupportNote')?.focus();
}

async function _kbSubmitSupport(requestId) {
    const note = document.getElementById('kbSupportNote')?.value;
    if (!note || !note.trim()) {
        alert('⚠️ Vui lòng nhập ghi chú hỗ trợ (bắt buộc)');
        return;
    }

    try {
        const res = await apiCall(`/api/task-support/respond/${requestId}`, 'POST', { note: note.trim() });
        if (res.error) {
            alert('Lỗi: ' + res.error);
            return;
        }
        document.getElementById('kbSupportModal')?.remove();
        showToast('✅ Đã đánh dấu hỗ trợ thành công');
        _kbLoadSupportPanel();
        _kbLoadSchedule();
    } catch(e) {
        alert('Lỗi: ' + (e.message || 'Không thể xử lý'));
    }
}

// ========== CV KHÓA: Upload proof from calendar ==========
async function _kbLockSubmit(lockTaskId, dateStr) {
    // Fetch task detail for the modal
    let taskDetail = null;
    try {
        const res = await apiCall(`/api/lock-tasks/${lockTaskId}/detail`);
        taskDetail = res.task;
    } catch(e) {}

    const taskName = taskDetail?.task_name || 'Công việc';
    const guideLink = taskDetail?.guide_link || '';
    const reqApproval = taskDetail?.requires_approval;
    let inputReqs = [], outputReqs = [];
    try {
        const raw = taskDetail?.input_requirements?.trim?.();
        if (raw) { if (raw.startsWith('[')) inputReqs = JSON.parse(raw); else inputReqs = [raw]; }
    } catch(e) { if (taskDetail?.input_requirements) inputReqs = [taskDetail.input_requirements]; }
    try {
        const raw = taskDetail?.output_requirements?.trim?.();
        if (raw) { if (raw.startsWith('[')) outputReqs = JSON.parse(raw); else outputReqs = [raw]; }
    } catch(e) { if (taskDetail?.output_requirements) outputReqs = [taskDetail.output_requirements]; }

    const reqHtml = (reqs, icon, color, title) => {
        if (!reqs || reqs.length === 0) return '';
        return `<div style="margin-bottom:10px;">
            <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:5px;">${icon} ${title}</div>
            <div style="padding:8px 10px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                ${reqs.map((r,i) => `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:3px;"><span style="min-width:18px;height:18px;background:#dc2626;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;">${i+1}</span><span style="font-size:12px;color:#374151;word-break:break-all;">${r}</span></div>`).join('')}
            </div>
        </div>`;
    };

    const approvalWarn = reqApproval ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🔒</span>
        <span style="font-size:12px;color:#92400e;font-weight:600;">Công việc này cần Quản lý/TP duyệt mới được tính điểm</span>
    </div>` : '';

    const guideHtml = guideLink ? `<a href="${guideLink}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;text-decoration:none;margin-bottom:10px;">
        <span style="font-size:22px;">📖</span>
        <div style="flex:1;overflow:hidden;">
            <div style="font-weight:700;font-size:12px;color:#991b1b;">Hướng dẫn công việc</div>
            <div style="font-size:10px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${guideLink}</div>
        </div>
        <span>→</span>
    </a>` : '';

    // Remove existing modal
    document.getElementById('kbLockReportModal')?.remove();
    window._kbLockPastedFile = null;

    const modal = document.createElement('div');
    modal.id = 'kbLockReportModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(520px,92vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:18px 22px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">📝 Báo cáo công việc</h3>
                <div style="font-size:11px;color:#fca5a5;margin-top:3px;">Nộp kết quả hoàn thành</div>
            </div>
            <button onclick="document.getElementById('kbLockReportModal').remove()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
        <div style="padding:20px 22px;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:11px;color:#991b1b;font-weight:600;">
                ⚠️ Không làm sẽ bị phạt và khóa tài khoản
            </div>
            ${approvalWarn}
            ${(() => {
                // Check for rejection reason
                const compKey = `${lockTaskId}_${dateStr}`;
                const comp = _kbLockCompletions && _kbLockCompletions[compKey];
                if (comp && (comp.status === 'rejected' || comp.status === 'expired') && comp.reject_reason) {
                    return `<div style="background:linear-gradient(135deg,#fef2f2,#fff1f2);border:2px solid #dc2626;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <span style="background:#dc2626;color:white;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;">❌ LÝ DO TỪ CHỐI</span>
                        </div>
                        <div style="font-size:13px;color:#991b1b;font-weight:600;line-height:1.5;padding:10px 14px;background:white;border-radius:8px;border:1px solid #fecaca;">
                            "${comp.reject_reason.replace(/"/g, '&quot;')}"
                        </div>
                        <div style="margin-top:8px;font-size:11px;color:#dc2626;font-weight:600;">📝 Hãy khắc phục và báo cáo lại bên dưới</div>
                    </div>`;
                }
                return '';
            })()}
            ${(() => {
                // Check for manager support note
                const srKey2 = `${lockTaskId}_${dateStr}`;
                const srObj = window._kbLockSupportRequests && window._kbLockSupportRequests[srKey2];
                if (srObj && srObj.status === 'supported' && srObj.manager_note) {
                    return `<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #059669;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <span style="background:#059669;color:white;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;">✅ SẾP ĐÃ HỖ TRỢ</span>
                        </div>
                        <div style="font-size:13px;color:#065f46;font-weight:600;line-height:1.5;padding:10px 14px;background:white;border-radius:8px;border:1px solid #a7f3d0;">
                            "${srObj.manager_note.replace(/"/g, '&quot;')}"
                        </div>
                    </div>`;
                }
                return '';
            })()}
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📋 Tên công việc</div>
                    <div style="font-size:14px;font-weight:700;color:#991b1b;">${taskName}</div>
                </div>
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📅 Ngày báo cáo</div>
                    <div style="font-size:14px;font-weight:700;color:#991b1b;">${dateStr.split('-').reverse().join('/')}</div>
                </div>
                <div style="padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">📊 SL tối thiểu</div>
                    <div style="font-size:14px;font-weight:700;color:#dc2626;">${taskDetail?.min_quantity || 1} lần</div>
                </div>
            </div>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:14px;">
                ${guideHtml}
                ${reqHtml(inputReqs, '📥', '#991b1b', 'Yêu cầu đầu vào')}
                ${reqHtml(outputReqs, '📤', '#991b1b', 'Yêu cầu đầu ra')}
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">📊 Số lượng đã hoàn thành <span style="color:#dc2626;">*</span></label>
                <input id="kbLockRptQty" type="number" min="0" value="${taskDetail?.min_quantity || 1}" placeholder="VD: 25" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">📄 Nội dung hoàn thành <span style="color:#dc2626;">*</span></label>
                <textarea id="kbLockRptContent" rows="2" placeholder="Mô tả công việc đã làm..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:4px;">🔗 Link báo cáo kết quả <span style="color:#dc2626;">*</span></label>
                <input id="kbLockRptLink" type="url" placeholder="https://docs.google.com/... hoặc link TikTok..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:12px;color:#374151;display:block;margin-bottom:6px;">🖼️ Hình ảnh báo cáo <span style="color:#dc2626;">*</span> <span style="font-weight:400;color:#9ca3af;">(Ctrl+V để dán ảnh)</span></label>
                <div id="kbLockPasteZone" tabindex="0" style="border:2px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#fafbfc;transition:all .2s;min-height:60px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                    <div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div>
                    <div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>
                </div>
                <div id="kbLockPastePreview" style="display:none;margin-top:8px;position:relative;">
                    <img id="kbLockPasteImg" style="max-width:100%;max-height:150px;border-radius:6px;border:1px solid #e5e7eb;">
                    <button onclick="_kbLockRemovePaste()" style="position:absolute;top:4px;right:4px;background:#dc2626;color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;">×</button>
                </div>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:14px;background:#f9fafb;padding:8px 10px;border-radius:6px;border:1px solid #f3f4f6;">
                💡 <b>Lưu ý:</b> Bắt buộc phải có ít nhất <b>link</b> hoặc <b>hình ảnh</b> để nộp báo cáo.
            </div>
            <input type="hidden" id="kbLockRptTaskId" value="${lockTaskId}">
            <input type="hidden" id="kbLockRptDate" value="${dateStr}">
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('kbLockReportModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_kbLockSubmitReport()" style="padding:9px 24px;border-radius:8px;border:none;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(220,38,38,0.3);">📤 Nộp báo cáo</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    // Paste listener
    const zone = document.getElementById('kbLockPasteZone');
    zone.addEventListener('paste', _kbLockHandlePaste);
    setTimeout(() => zone.focus(), 100);
}

function _kbLockHandlePaste(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            window._kbLockPastedFile = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('kbLockPasteImg').src = ev.target.result;
                document.getElementById('kbLockPastePreview').style.display = 'block';
                const z = document.getElementById('kbLockPasteZone');
                z.innerHTML = '<div style="font-size:14px;color:#059669;font-weight:600;">✅ Đã dán ảnh thành công!</div>';
                z.style.borderColor = '#059669';
                z.style.background = '#f0fdf4';
            };
            reader.readAsDataURL(window._kbLockPastedFile);
            break;
        }
    }
}

function _kbLockRemovePaste() {
    window._kbLockPastedFile = null;
    document.getElementById('kbLockPastePreview').style.display = 'none';
    const z = document.getElementById('kbLockPasteZone');
    z.innerHTML = '<div style="font-size:28px;margin-bottom:6px;opacity:.5;">📋</div><div style="font-size:12px;color:#9ca3af;">Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>';
    z.style.borderColor = '#d1d5db';
    z.style.background = '#fafbfc';
}

async function _kbLockSubmitReport() {
    const lockTaskId = document.getElementById('kbLockRptTaskId')?.value;
    const dateStr = document.getElementById('kbLockRptDate')?.value;
    const link = document.getElementById('kbLockRptLink')?.value?.trim();
    const content = document.getElementById('kbLockRptContent')?.value?.trim();

    const qtyDone = Number(document.getElementById('kbLockRptQty')?.value) || 0;

    if (!content) {
        showToast('Vui lòng nhập nội dung hoàn thành!', 'error');
        document.getElementById('kbLockRptContent')?.focus();
        return;
    }

    if (qtyDone <= 0) {
        showToast('Vui lòng nhập số lượng đã hoàn thành!', 'error');
        document.getElementById('kbLockRptQty')?.focus();
        return;
    }

    if (!link && !window._kbLockPastedFile) {
        showToast('Phải có ít nhất link hoặc hình ảnh báo cáo!', 'error');
        return;
    }

    const fd = new FormData();
    if (window._kbLockPastedFile) fd.append('file', window._kbLockPastedFile);
    if (link) fd.append('proof_url', link);
    if (content) fd.append('content', content);
    fd.append('quantity_done', String(qtyDone));

    try {
        const res = await fetch(`/api/lock-tasks/${lockTaskId}/submit?date=${dateStr}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: fd
        });
        const json = await res.json();
        if (json.error) { showToast('❌ ' + json.error, 'error'); return; }
        showToast('✅ Đã nộp báo cáo thành công!');
        document.getElementById('kbLockReportModal')?.remove();
        _kbLoadSchedule();
    } catch(e) {
        showToast('❌ Lỗi upload: ' + (e.message || ''), 'error');
    }
}

// ========== CV KHÓA: Send support request ==========
async function _kbLockSupport(lockTaskId, dateStr, taskName) {
    if (!confirm(`🆘 Gửi yêu cầu hỗ trợ cho công việc "${taskName}" ngày ${dateStr}?`)) return;
    try {
        const res = await apiCall(`/api/lock-tasks/${lockTaskId}/support`, 'POST', { task_date: dateStr });
        if (res.error) { showToast('❌ ' + res.error, 'error'); return; }
        showToast('✅ Đã gửi yêu cầu hỗ trợ cho quản lý!');
        _kbLoadSchedule();
    } catch(e) {
        showToast('❌ ' + (e.message || 'Lỗi'), 'error');
    }
}

// ========== CV KHÓA: Task detail popup (RED theme) ==========
async function _kbShowLockTaskDetail(lockTaskId) {
    try {
        const res = await apiCall(`/api/lock-tasks/${lockTaskId}/detail`);
        const t = res.task;
        if (!t) { showToast('Không tìm thấy CV', 'error'); return; }

        const recLabels = { administrative: 'Hành chính (T2-T7)', daily: 'Hằng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng', once: 'Một lần' };
        const recLabel = recLabels[t.recurrence_type] || t.recurrence_type;

        // Parse requirements (could be JSON array, plain string/URL, or empty)
        let inputReqs = [], outputReqs = [];
        try {
            if (t.input_requirements) {
                const raw = t.input_requirements.trim();
                if (raw.startsWith('[')) inputReqs = JSON.parse(raw);
                else inputReqs = [raw];
            }
        } catch(e) { inputReqs = [t.input_requirements]; }
        try {
            if (t.output_requirements) {
                const raw = t.output_requirements.trim();
                if (raw.startsWith('[')) outputReqs = JSON.parse(raw);
                else outputReqs = [raw];
            }
        } catch(e) { outputReqs = [t.output_requirements]; }

        const modal = document.createElement('div');
        modal.id = 'kbLockDetailModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:white;border-radius:16px;max-width:420px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.2);position:relative;">
            <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:20px 24px;border-radius:16px 16px 0 0;position:relative;">
                <button onclick="document.getElementById('kbLockDetailModal').remove()" style="position:absolute;top:12px;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:18px;cursor:pointer;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">×</button>
                <h3 style="color:white;font-size:20px;font-weight:800;margin:0 0 8px 0;line-height:1.3;">${t.task_name}</h3>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">🔒 ${recLabel}</span>
                    ${t.requires_approval ? '<span style="background:rgba(255,200,0,0.3);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">🔒 Cần duyệt</span>' : ''}
                </div>
            </div>
            <div style="padding:20px 24px;">
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:12px;color:#991b1b;font-weight:600;display:flex;align-items:center;gap:6px;">
                        ⚠️ Không làm sẽ bị phạt và khóa tài khoản
                    </div>
                    <div style="flex-shrink:0;text-align:center;padding:10px 16px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
                        <div style="font-size:10px;color:#991b1b;font-weight:700;">HẠN NỘP</div>
                        <div style="font-size:22px;font-weight:800;color:#dc2626;">24:00</div>
                    </div>
                </div>
                ${t.task_content ? `<div style="margin-bottom:12px;padding:10px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151;line-height:1.6;border:1px solid #e5e7eb;">${t.task_content}</div>` : ''}
                ${t.guide_link ? `
                <div style="margin-bottom:16px;padding:12px;background:#fef2f2;border-radius:10px;display:flex;align-items:center;gap:10px;border:1px solid #fecaca;">
                    <span style="font-size:24px;">📖</span>
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#991b1b;">Xem hướng dẫn công việc</div>
                        <div style="font-size:11px;color:#6b7280;word-break:break-all;">${t.guide_link}</div>
                    </div>
                    <a href="${t.guide_link}" target="_blank" style="font-size:18px;text-decoration:none;">→</a>
                </div>` : ''}
                <div id="kbLockDetailProgress"></div>
                ${inputReqs.length > 0 ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;">📥 Yêu cầu đầu vào</div>
                    <div style="padding:10px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                        ${inputReqs.map((r,i) => { const isLink = /^https?:\/\//i.test(r); return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;"><span style="min-width:20px;height:20px;background:#dc2626;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">${i+1}</span>${isLink ? `<a href="${r}" target="_blank" style="font-size:12px;color:#2563eb;word-break:break-all;">${r}</a>` : `<span style="font-size:12px;color:#374151;word-break:break-all;">${r}</span>`}</div>`; }).join('')}
                    </div>
                </div>` : ''}
                ${outputReqs.length > 0 ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;">📤 Yêu cầu đầu ra</div>
                    <div style="padding:10px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                        ${outputReqs.map((r,i) => { const isLink = /^https?:\/\//i.test(r); return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;"><span style="min-width:20px;height:20px;background:#dc2626;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">${i+1}</span>${isLink ? `<a href="${r}" target="_blank" style="font-size:12px;color:#2563eb;word-break:break-all;">${r}</a>` : `<span style="font-size:12px;color:#374151;word-break:break-all;">${r}</span>`}</div>`; }).join('')}
                    </div>
                </div>` : ''}
            </div>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        // Load Sedding progress if applicable
        if (/sedding/i.test(t.task_name)) {
            _kbLoadLockDetailSedding();
        }
        // Load Zalo progress if applicable
        if (/tìm.*gr.*zalo/i.test(t.task_name)) {
            _kbLoadLockDetailZalo();
        }
        // Load Đăng Bản Thân progress if applicable
        if (/đăng.*bản.*thân/i.test(t.task_name)) {
            _kbLoadLockDetailDangBT();
        }
    } catch(e) {
        showToast('Lỗi: ' + (e.message || ''), 'error');
    }
}

// ========== DEPT MANAGEMENT (GĐ only) — moved from Bàn Giao CV Điểm ==========

// Show modal to add dept/team to sidebar
function _kbShowCreateDeptModal() {
    const modal = document.createElement('div');
    modal.id = 'kbCreateDeptModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    // Build system options
    const systemDepts = _kbAllDepts.filter(d => d.name.startsWith('HỆ THỐNG'));
    const sysOpts = systemDepts.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(420px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:#122546;">＋ Tạo lịch công việc</h3>
            <button onclick="document.getElementById('kbCreateDeptModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">🏛️ Hệ thống <span style="color:#dc2626;">*</span></label>
            <select id="kbNewSysSelect" onchange="_kbFilterCreateDepts()" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                ${sysOpts || '<option value="">Không có hệ thống</option>'}
            </select>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Phòng ban / Team <span style="color:#dc2626;">*</span></label>
            <select id="kbNewDeptSelect" onchange="_kbLoadCreateUsers()" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                <option value="">— Chọn hệ thống trước —</option>
            </select>
        </div>
        <div style="margin-bottom:6px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Nhân viên <span style="color:#9ca3af;font-weight:400;">(không chọn = lịch team)</span></label>
            <select id="kbNewUserSelect" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                <option value="">— Toàn bộ Team —</option>
            </select>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">💡 Để trống = lịch chung cho cả team. Chọn NV = lịch riêng cho người đó.</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button onclick="document.getElementById('kbCreateDeptModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_kbActivateDept()" style="padding:8px 20px;border-radius:6px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">✅ Tạo</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    _kbFilterCreateDepts();
}

function _kbFilterCreateDepts() {
    const sysId = Number(document.getElementById('kbNewSysSelect')?.value);
    const deptSel = document.getElementById('kbNewDeptSelect');
    if (!deptSel) return;
    // Get ALL non-system depts under this system (both active & inactive parents)
    const allChildDepts = _kbAllDepts.filter(d => d.parent_id === sysId && !d.name.startsWith('HỆ THỐNG'));
    allChildDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let opts = '';
    allChildDepts.forEach(d => {
        const parentIsActive = _kbActiveDeptIds.includes(d.id);
        const subTeams = _kbAllDepts.filter(sub => sub.parent_id === d.id && !_kbActiveDeptIds.includes(sub.id));
        if (!parentIsActive) {
            // Parent chưa active → cho chọn parent + sub-teams
            opts += `<option value="${d.id}">🏢 ${d.name}</option>`;
            subTeams.forEach(sub => { opts += `<option value="${sub.id}">  └ ${sub.name}</option>`; });
        } else if (subTeams.length > 0) {
            // Parent đã active nhưng còn sub-teams chưa active → hiện group header
            opts += `<optgroup label="🏢 ${d.name}">`;
            subTeams.forEach(sub => { opts += `<option value="${sub.id}">${sub.name}</option>`; });
            opts += `</optgroup>`;
        }
    });
    deptSel.innerHTML = opts || '<option value="">Tất cả phòng đã được thêm</option>';
    _kbLoadCreateUsers();
}

async function _kbLoadCreateUsers() {
    const deptId = document.getElementById('kbNewDeptSelect')?.value;
    const userSel = document.getElementById('kbNewUserSelect');
    if (!deptId || !userSel) return;
    try {
        const u = await apiCall(`/api/task-points/users?department_id=${deptId}`);
        const users = u.users || [];
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>' + users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
    } catch(e) {
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>';
    }
}

async function _kbActivateDept() {
    const deptSel = document.getElementById('kbNewDeptSelect');
    if (!deptSel || !deptSel.value) return;
    const deptId = Number(deptSel.value);
    const deptName = deptSel.options[deptSel.selectedIndex]?.text;
    document.getElementById('kbCreateDeptModal')?.remove();

    // Activate in database
    try {
        await apiCall('/api/task-points/activate-team', 'POST', { team_id: deptId });
        _kbActiveDeptIds.push(deptId);
        showToast(`✅ Đã thêm ${deptName} vào sidebar`);
        // Reload page
        const content = document.getElementById('content') || document.querySelector('[id="content"]');
        if (content) renderLichKhoaBieuPage(content);
    } catch(e) {
        showToast('Lỗi: ' + (e.message || ''), 'error');
    }
}

async function _kbRemoveDept(deptId, event) {
    if (event) event.stopPropagation();
    const dept = _kbAllDepts.find(d => d.id === deptId);
    const name = dept?.name || 'phòng này';
    if (!confirm(`Xóa ${name} khỏi sidebar?\nDữ liệu công việc vẫn được giữ nguyên.\nCó thể thêm lại bất cứ lúc nào.`)) return;
    try {
        await apiCall('/api/task-points/deactivate-team', 'POST', { team_id: deptId });
        // Also remove children
        const children = _kbAllDepts.filter(d => d.parent_id === deptId);
        for (const child of children) {
            await apiCall('/api/task-points/deactivate-team', 'POST', { team_id: child.id });
        }
        showToast(`✅ Đã xóa ${name} khỏi sidebar`);
        // Reload page
        const content = document.getElementById('content') || document.querySelector('[id="content"]');
        if (content) renderLichKhoaBieuPage(content);
    } catch(e) {
        showToast('Lỗi: ' + (e.message || ''), 'error');
    }
}

function _kbShowReorderModal() {
    const activeSet = new Set(_kbActiveDeptIds);
    const activeDepts = _kbAllDepts.filter(d => activeSet.has(d.id));
    const parents = activeDepts.filter(d => !d.parent_id || !activeDepts.some(p => p.id === d.parent_id))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    let rowsHtml = '';
    let parentIdx = 0;
    parents.forEach(p => {
        parentIdx++;
        rowsHtml += `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #f3f4f6;background:#f8fafc;">
                <input type="number" min="1" class="_kbSttInput" data-id="${p.id}" value="${p.display_order !== null && p.display_order !== undefined ? p.display_order + 1 : parentIdx}" style="width:50px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-weight:700;text-align:center;color:#2563eb;outline:none;" onfocus="this.style.borderColor='#2563eb';this.select()" onblur="this.style.borderColor='#d1d5db'">
                <span style="font-weight:700;color:#122546;font-size:13px;">${p.name}</span>
            </div>`;
        const children = activeDepts.filter(c => c.parent_id === p.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        children.forEach((c, ci) => {
            rowsHtml += `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 14px 8px 36px;border-bottom:1px solid #f9fafb;">
                <input type="number" min="1" class="_kbSttInput" data-id="${c.id}" value="${c.display_order !== null && c.display_order !== undefined ? c.display_order + 1 : ci + 1}" style="width:46px;padding:5px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;text-align:center;color:#059669;outline:none;" onfocus="this.style.borderColor='#059669';this.select()" onblur="this.style.borderColor='#e5e7eb'">
                <span style="color:#6b7280;font-size:12px;">└ ${c.name}</span>
            </div>`;
        });
    });

    const modal = document.createElement('div');
    modal.id = '_kbReorderModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;width:min(420px,90vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:16px;color:#122546;font-weight:700;">🔢 Sắp xếp thứ tự phòng ban</h3>
                <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Nhập số STT — số nhỏ hiển trước</div>
            </div>
            <button onclick="document.getElementById('_kbReorderModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
        </div>
        <div style="overflow-y:auto;flex:1;">
            ${rowsHtml}
        </div>
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;">
            <button onclick="document.getElementById('_kbReorderModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_kbSaveReorder()" style="padding:8px 20px;border-radius:6px;border:none;background:#2563eb;color:white;cursor:pointer;font-size:13px;font-weight:600;">✅ Lưu thứ tự</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function _kbSaveReorder() {
    const inputs = document.querySelectorAll('._kbSttInput');
    const orders = [];
    inputs.forEach(inp => {
        const id = Number(inp.dataset.id);
        const stt = Number(inp.value) || 0;
        orders.push({ id, display_order: stt - 1 });
    });
    try {
        await apiCall('/api/task-points/reorder-departments', 'PUT', { orders });
        showToast('✅ Đã lưu thứ tự');
        document.getElementById('_kbReorderModal')?.remove();
        const content = document.getElementById('content') || document.querySelector('[id="content"]');
        if (content) renderLichKhoaBieuPage(content);
    } catch(e) {
        showToast('Lỗi lưu thứ tự', 'error');
    }
}

// ========== VIEW LOCK TASK REPORT ==========
function _kbShowLockReport(compId) {
    // Find the completion from _kbLockCompletions map
    let comp = null;
    let compKey = null;
    for (const key in _kbLockCompletions) {
        if (_kbLockCompletions[key].id === compId) {
            comp = _kbLockCompletions[key];
            compKey = key;
            break;
        }
    }
    // Also check all versions
    if (!comp) {
        for (const key in window._kbLockCompAllVersions) {
            const found = (window._kbLockCompAllVersions[key] || []).find(c => c.id === compId);
            if (found) { comp = found; compKey = key; break; }
        }
    }
    if (!comp) { showToast('Không tìm thấy báo cáo', 'error'); return; }

    const lt = _kbLockTasks.find(t => t.id === comp.lock_task_id);
    const taskName = lt ? lt.task_name : 'Công việc khóa';

    // If task has a linked page → navigate there with user + date
    const _lrLinkedPage = _kbGetLinkedPage(taskName);
    if (_lrLinkedPage) {
        const _lrUserId = comp.user_id || (_kbViewUserId || currentUser?.id || '');
        const _lrDate = comp.completion_date || '';
        const url = _lrLinkedPage.page + '?sel_user=' + _lrUserId + '&sel_date=' + _lrDate;
        window.open(url, '_blank');
        return;
    }

    const statusMap = {
        approved: { icon: '✅', label: 'Đã duyệt', color: '#16a34a', bg: '#dcfce7' },
        pending: { icon: '⏳', label: 'Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
        rejected: { icon: '❌', label: 'Từ chối', color: '#dc2626', bg: '#fecaca' },
        expired: { icon: '🚫', label: 'Hết hạn', color: '#6b7280', bg: '#f3f4f6' }
    };
    const dateF = comp.completion_date ? comp.completion_date.split('-').reverse().join('/') : '';

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '650px';

    titleEl.innerHTML = `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">🔐</span> ${taskName}`;

    // Get ALL versions for this task+date
    const allVersions = (window._kbLockCompAllVersions && compKey ? window._kbLockCompAllVersions[compKey] : [comp]) || [comp];
    // Sort: latest first (highest redo_count)
    allVersions.sort((a, b) => (b.redo_count || 0) - (a.redo_count || 0));

    // Helper: render one version card
    function renderVersion(v, isLatest) {
        const st = statusMap[v.status] || statusMap.pending;
        let proofHtml = '';
        if (v.proof_url) {
            if (v.proof_url.startsWith('/uploads')) {
                proofHtml = `<div style="margin-top:8px;">
                    <div style="font-weight:600;color:#374151;font-size:11px;margin-bottom:4px;">🖼️ Hình ảnh:</div>
                    <a href="${v.proof_url}" target="_blank"><img src="${v.proof_url}" style="max-width:100%;max-height:200px;border-radius:6px;border:1px solid #e5e7eb;" onerror="this.style.display='none'" /></a>
                </div>`;
            } else {
                proofHtml = `<div style="margin-top:8px;">
                    <div style="font-weight:600;color:#374151;font-size:11px;margin-bottom:4px;">🔗 Link:</div>
                    <a href="${v.proof_url}" target="_blank" style="color:#2563eb;word-break:break-all;font-size:11px;">${v.proof_url}</a>
                </div>`;
            }
        }

        const borderColor = isLatest ? '#3b82f6' : '#e5e7eb';
        const headerBg = isLatest ? '#eff6ff' : '#f9fafb';
        const label = isLatest ? `📄 Lần ${(v.redo_count || 0) + 1} (Mới nhất)` : `📋 Lần ${(v.redo_count || 0) + 1}`;

        return `<div style="border:2px solid ${borderColor};border-radius:10px;overflow:hidden;${!isLatest?'opacity:0.85;':''}">
            <div style="background:${headerBg};padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${borderColor};">
                <span style="font-weight:700;font-size:12px;color:#374151;">${label}</span>
                <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">${st.icon} ${st.label}</span>
            </div>
            <div style="padding:12px 14px;">
                ${v.content ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px;">
                    <div style="font-weight:600;color:#374151;font-size:11px;margin-bottom:4px;">📄 Nội dung:</div>
                    <div style="font-size:12px;color:#1e293b;line-height:1.5;white-space:pre-wrap;">${v.content}</div>
                </div>` : '<div style="font-size:11px;color:#9ca3af;text-align:center;padding:8px;">📭 Không có nội dung</div>'}
                ${(() => { const qd = v.quantity_done || 0; const mq = lt?.min_quantity || 1; const isLow = qd < mq; return `<div style="background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:6px;padding:8px 10px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span style="font-weight:700;font-size:11px;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}</div>`; })()}
                ${proofHtml}
                ${v.reject_reason ? `<div style="margin-top:8px;background:#fef2f2;border:1px solid #fecaca;border-left:3px solid #dc2626;border-radius:6px;padding:8px 10px;">
                    <div style="font-weight:600;color:#dc2626;font-size:11px;margin-bottom:2px;">💬 Lý do từ chối:</div>
                    <div style="font-size:11px;color:#7f1d1d;">${v.reject_reason}</div>
                </div>` : ''}
                ${v.reviewed_at ? `<div style="margin-top:6px;font-size:10px;color:#9ca3af;">⏰ ${new Date(v.reviewed_at).toLocaleString('vi-VN')}</div>` : ''}
            </div>
        </div>`;
    }

    let versionsHtml = '';
    allVersions.forEach((v, i) => {
        versionsHtml += renderVersion(v, i === 0);
        if (i < allVersions.length - 1) versionsHtml += '<div style="height:10px;"></div>';
    });

    // Build task requirements HTML
    let reqHtml = '';
    if (lt) {
        if (lt.guide_link) {
            reqHtml += `<div style="margin-bottom:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                <div style="font-weight:700;font-size:11px;color:#166534;margin-bottom:4px;">📋 Hướng dẫn công việc</div>
                <a href="${lt.guide_link}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none;word-break:break-all;">${lt.guide_link} →</a>
            </div>`;
        }
        if (lt.input_requirements) {
            reqHtml += `<div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:8px;">
                <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:6px;">📥 Yêu cầu đầu vào</div>
                <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(lt.input_requirements)}</div>
            </div>`;
        }
        if (lt.output_requirements) {
            reqHtml += `<div style="padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:8px;">
                <div style="font-size:12px;color:#1d4ed8;font-weight:700;margin-bottom:6px;">📤 Yêu cầu đầu ra</div>
                <div style="background:white;border-radius:8px;padding:8px 12px;">${_kbRenderReqList(lt.output_requirements)}</div>
            </div>`;
        }
    }

    body.innerHTML = `
    <div style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <span style="font-size:13px;color:#6b7280;font-weight:600;">📅 ${dateF}</span>
            ${allVersions.length > 1 ? `<span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:3px 8px;border-radius:4px;">📊 ${allVersions.length} lần báo cáo</span>` : ''}
        </div>
        ${reqHtml ? `<div style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <div style="background:linear-gradient(135deg,#166534,#15803d);padding:10px 16px;">
                <span style="color:white;font-weight:700;font-size:13px;">📋 Yêu cầu công việc</span>
            </div>
            <div style="padding:14px;">${reqHtml}</div>
        </div>` : ''}
        <div style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#122546,#1e3a5f);padding:10px 16px;">
                <span style="color:white;font-weight:700;font-size:13px;">📄 Báo cáo công việc</span>
            </div>
            <div style="padding:14px;">${versionsHtml}</div>
        </div>
    </div>`;

    footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    overlay.classList.add('show');
}

// ========== SELF-SEARCH PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectSelfSearchStats() {
    const placeholders = document.querySelectorAll('[data-ss-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-ss-date');
        try {
            const res = await apiCall(`/api/telesale/self-search-stats/${uid}?date=${dateStr}`);
            const count = res.count || 0;
            const target = res.target || 20;
            const pct = Math.min(100, Math.round(count / target * 100));
            const done = count >= target;
            const barColor = done ? '#059669' : '#6366f1';
            const statusLabel = done ? `<span style="color:#059669;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#6366f1;font-weight:700;">🔍 ${count}/${target}</span>`;
            el.innerHTML = `
                <div style="margin-top:4px;">
                    <div style="font-size:9px;margin-bottom:2px;">${statusLabel}</div>
                    <div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;">
                        <div style="background:${barColor};height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div>
                    </div>
                </div>`;
        } catch(e) {}
    }
}

async function _kbLoadDetailSelfSearch() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/telesale/self-search-stats/${uid}?date=${todayStr}`);
        const count = res.count || 0;
        const target = res.target || 20;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1.5px solid #a5b4fc;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#3730a3;">🔍 Tiến trình Tự Tìm Kiếm Telesale hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#6366f1'};">${count}/${target} KH — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#c7d2fe;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();document.querySelector('[data-page=goidien]')?.click();" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(99,102,241,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(99,102,241,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(99,102,241,0.3)'">
                    📞 Mở Gọi Điện Telesale →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== TELESALE CALL PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectTelesaleStats() {
    const placeholders = document.querySelectorAll('[data-ts-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    // Only need 1 API call per date since all telesale cards share the same total
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-ts-date');
        if (datesCalled[dateStr]) {
            // Reuse cached result
            _kbRenderTelesaleMini(el, datesCalled[dateStr]);
            continue;
        }
        try {
            const res = await apiCall(`/api/telesale/call-progress/${uid}?date=${dateStr}`);
            datesCalled[dateStr] = res;
            _kbRenderTelesaleMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderTelesaleMini(el, res) {
    const count = res.answered || 0;
    const target = res.target || 100;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const barColor = done ? '#059669' : '#059669';
    const statusLabel = done
        ? `<span style="color:#059669;font-weight:800;">✅ ${count}/${target}</span>`
        : `<span style="color:#059669;font-weight:700;">📞 ${count}/${target}</span>`;
    el.innerHTML = `
        <div style="margin-top:4px;">
            <div style="font-size:9px;margin-bottom:2px;">${statusLabel}</div>
            <div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;">
                <div style="background:${barColor};height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div>
            </div>
        </div>`;
}

async function _kbLoadDetailTelesale() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/telesale/call-progress/${uid}?date=${todayStr}`);
        const count = res.answered || 0;
        const target = res.target || 100;
        const totalPts = res.total_points || 50;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1.5px solid #6ee7b7;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#065f46;">📞 Tiến trình Gọi Điện hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#065f46'};">${count}/${target} bắt máy — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#a7f3d0;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#059669,#10b981,#34d399);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();document.querySelector('[data-page=goidien]')?.click();" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#059669,#10b981);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(5,150,105,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(5,150,105,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(5,150,105,0.3)'">
                    📞 Mở Gọi Điện Telesale →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== NHẮN TÌM ĐỐI TÁC PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectPartnerOutreachStats() {
    const placeholders = document.querySelectorAll('[data-po-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-po-date');
        if (datesCalled[dateStr]) {
            _kbRenderPartnerOutreachMini(el, datesCalled[dateStr]);
            continue;
        }
        try {
            const res = await apiCall(`/api/partner-outreach/live-count/${uid}?date=${dateStr}`);
            datesCalled[dateStr] = res;
            _kbRenderPartnerOutreachMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderPartnerOutreachMini(el, res) {
    const count = res.count || 0;
    const target = res.target || 20;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const barColor = done ? '#2563eb' : '#2563eb';
    const statusLabel = done
        ? `<span style="color:#2563eb;font-weight:800;">✅ ${count}/${target}</span>`
        : `<span style="color:#2563eb;font-weight:700;">💬 ${count}/${target}</span>`;
    el.innerHTML = `
        <div style="margin-top:4px;">
            <div style="font-size:9px;margin-bottom:2px;">${statusLabel}</div>
            <div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;">
                <div style="background:${barColor};height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div>
            </div>
        </div>`;
}

async function _kbLoadDetailPartnerOutreach() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/partner-outreach/live-count/${uid}?date=${todayStr}`);
        const count = res.count || 0;
        const target = res.target || 20;
        const totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1.5px solid #93c5fd;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#1e40af;">💬 Tiến trình Nhắn Tìm Đối Tác hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#1e40af'};">${count}/${target} đối tác — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#bfdbfe;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#2563eb,#3b82f6,#60a5fa);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/nhantintimdoitackh';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(37,99,235,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(37,99,235,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(37,99,235,0.3)'">
                    💬 Mở Nhắn Tìm Đối Tác →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ADD/CMT ĐỐI TÁC PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectAddCmtStats() {
    const placeholders = document.querySelectorAll('[data-ac-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-ac-date');
        if (datesCalled[dateStr]) {
            _kbRenderAddCmtMini(el, datesCalled[dateStr]);
            continue;
        }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=addcmt`);
            datesCalled[dateStr] = res;
            _kbRenderAddCmtMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderAddCmtMini(el, res) {
    const count = res.count || 0;
    const target = res.target || 10;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending';
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        const statusLabel = done
            ? `<span style="color:#16a34a;font-weight:800;">✅ ${count}/${target}</span>`
            : `<span style="color:#16a34a;font-weight:700;">👥 ${count}/${target}</span>`;
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${statusLabel}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#16a34a;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailAddCmt() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=addcmt`);
        const count = res.count || 0;
        const target = res.target || 10;
        const totalPts = res.total_points || 5;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#15803d;">👥 Tiến trình Add/Cmt Đối Tác hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#15803d'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#bbf7d0;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#16a34a,#22c55e,#4ade80);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/addcmtdoitackh';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(22,163,74,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(22,163,74,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(22,163,74,0.3)'">
                    👥 Mở Add/Cmt Đối Tác →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ĐĂNG VIDEO ISOCAL PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectDangVideoStats() {
    const placeholders = document.querySelectorAll('[data-dv-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-dv-date');
        if (datesCalled[dateStr]) {
            _kbRenderDangVideoMini(el, datesCalled[dateStr]);
            continue;
        }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=dang_video`);
            datesCalled[dateStr] = res;
            _kbRenderDangVideoMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderDangVideoMini(el, res) {
    const count = res.count || 0;
    const target = res.target || 1;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending';
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        const statusLabel = done
            ? `<span style="color:#dc2626;font-weight:800;">✅ ${count}/${target}</span>`
            : `<span style="color:#dc2626;font-weight:700;">🎬 ${count}/${target}</span>`;
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${statusLabel}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#dc2626;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailDangVideo() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=dang_video`);
        const count = res.count || 0;
        const target = res.target || 1;
        const totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#fef2f2,#fecaca);border:1.5px solid #fca5a5;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#b91c1c;">🎬 Tiến trình Đăng Video hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#b91c1c'};">${count}/${target} video — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#fecaca;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#dc2626,#ef4444,#f87171);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/dangvideo';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(220,38,38,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(220,38,38,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(220,38,38,0.3)'">
                    🎬 Mở Đăng Video Isocal →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ĐĂNG CONTENT ISOCAL PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectDangContentStats() {
    const placeholders = document.querySelectorAll('[data-dc-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-dc-date');
        if (datesCalled[dateStr]) { _kbRenderDangContentMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=dang_content`);
            datesCalled[dateStr] = res;
            _kbRenderDangContentMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderDangContentMini(el, res) {
    const count = res.count || 0, target = res.target || 1;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending';
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#8b5cf6;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#8b5cf6;font-weight:700;">✍️ ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#8b5cf6;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailDangContent() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=dang_content`);
        const count = res.count || 0, target = res.target || 1, totalPts = res.total_points || 5;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1.5px solid #c4b5fd;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#7c3aed;">✍️ Tiến trình Đăng Content hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#7c3aed'};">${count}/${target} bài — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#ddd6fe;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#8b5cf6,#a78bfa,#c4b5fd);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/dangcontent';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(139,92,246,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(139,92,246,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(139,92,246,0.3)'">
                    ✍️ Mở Đăng Content Isocal →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ĐĂNG & TÌM KH GROUP PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectDangGroupStats() {
    const placeholders = document.querySelectorAll('[data-dg-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-dg-date');
        if (datesCalled[dateStr]) { _kbRenderDangGroupMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=dang_group`);
            datesCalled[dateStr] = res;
            _kbRenderDangGroupMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderDangGroupMini(el, res) {
    const count = res.count || 0, target = res.target || 5;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending';
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#0891b2;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#0891b2;font-weight:700;">📢 ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#0891b2;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailDangGroup() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=dang_group`);
        const count = res.count || 0, target = res.target || 5, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#ecfeff,#cffafe);border:1.5px solid #67e8f9;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#0e7490;">📢 Tiến trình Đăng & Tìm KH Group hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#0e7490'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#a5f3fc;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/danggruop';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#0891b2,#0e7490);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(8,145,178,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(8,145,178,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(8,145,178,0.3)'">
                    📢 Mở Đăng & Tìm KH Group →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== TUYỂN DỤNG SV KD PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectTuyenDungStats() {
    const placeholders = document.querySelectorAll('[data-td-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-td-date');
        if (datesCalled[dateStr]) { _kbRenderTuyenDungMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=tuyen_dung`);
            datesCalled[dateStr] = res;
            _kbRenderTuyenDungMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderTuyenDungMini(el, res) {
    const count = res.count || 0, target = res.target || 5;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending';
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#be185d;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#be185d;font-weight:700;">🎓 ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#be185d;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailTuyenDung() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=tuyen_dung`);
        const count = res.count || 0, target = res.target || 5, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:1.5px solid #f9a8d4;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#9d174d;">🎓 Tiến trình Tuyển Dụng SV KD hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#9d174d'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#fbcfe8;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#be185d,#db2777,#ec4899);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/tuyendungsvkd';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#be185d,#9d174d);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(190,24,93,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(190,24,93,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(190,24,93,0.3)'">
                    🎓 Mở Tuyển Dụng SV KD →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}



// ========== SEDDING CỘNG ĐỒNG PROGRESS IN LỊCH KHÓA BIỂU ==========

// Check if lock task needs approval for mini-render elements
function _kbLockNeedsApproval() {
    if (_kbForceApproval) return true;
    for (const lt of (_kbLockTasks || [])) {
        if (lt.requires_approval) return true;
        if (_kbForceLockIds && _kbForceLockIds.has(lt.id)) return true;
    }
    return false;
}

async function _kbInjectSeddingStats() {
    const placeholders = document.querySelectorAll('[data-sd-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-sd-date');
        if (datesCalled[dateStr]) { _kbRenderSeddingMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=sedding`);
            datesCalled[dateStr] = res;
            _kbRenderSeddingMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderSeddingMini(el, res) {
    const count = res.count || 0, target = res.target || 20;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending' || (done && _kbLockNeedsApproval());
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#ea580c;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#ea580c;font-weight:700;">🌐 ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#ea580c;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailSedding() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=sedding`);
        const count = res.count || 0, target = res.target || 20, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1.5px solid #fdba74;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#c2410c;">🌐 Tiến trình Sedding hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#c2410c'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#fed7aa;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#ea580c,#f97316,#fb923c);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/seddingcongdong';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#ea580c,#c2410c);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(234,88,12,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(234,88,12,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(234,88,12,0.3)'">
                    🌐 Mở Sedding Cộng Đồng & Lẫn Nhau →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== SEDDING PROGRESS IN CV KHÓA DETAIL MODAL ==========
async function _kbLoadLockDetailSedding() {
    const el = document.getElementById('kbLockDetailProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=sedding`);
        const count = res.count || 0, target = res.target || 20, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1.5px solid #fdba74;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#c2410c;">🌐 Tiến trình Sedding hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#c2410c'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#fed7aa;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#ea580c,#f97316,#fb923c);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbLockDetailModal')?.remove();window.location.href='/seddingcongdong';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#ea580c,#c2410c);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(234,88,12,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(234,88,12,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(234,88,12,0.3)'">
                    🌐 Mở Sedding Cộng Đồng & Lẫn Nhau →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== TÌM GR ZALO VÀ JOIN PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectZaloStats() {
    const placeholders = document.querySelectorAll('[data-zl-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-zl-date');
        if (datesCalled[dateStr]) { _kbRenderZaloMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=tim_gr_zalo`);
            datesCalled[dateStr] = res;
            _kbRenderZaloMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderZaloMini(el, res) {
    const count = res.count || 0, target = res.target || 20;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending' || (done && _kbLockNeedsApproval());
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#0284c7;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#0284c7;font-weight:700;">🔍 ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#0284c7;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailZalo() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=tim_gr_zalo`);
        const count = res.count || 0, target = res.target || 20, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #7dd3fc;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#0369a1;">🔍 Tiến trình Tìm Gr Zalo hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#0369a1'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#bae6fd;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0284c7,#0ea5e9,#38bdf8);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/timgrzalovathongke';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#0284c7,#0369a1);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(2,132,199,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(2,132,199,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(2,132,199,0.3)'">
                    🔍 Mở Tìm Gr Zalo Và Join →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ZALO PROGRESS IN CV KHÓA DETAIL MODAL ==========
async function _kbLoadLockDetailZalo() {
    const el = document.getElementById('kbLockDetailProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=tim_gr_zalo`);
        const count = res.count || 0, target = res.target || 20, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #7dd3fc;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#0369a1;">🔍 Tiến trình Tìm Gr Zalo hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#0369a1'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#bae6fd;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#0284c7,#0ea5e9,#38bdf8);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbLockDetailModal')?.remove();window.location.href='/timgrzalovathongke';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#0284c7,#0369a1);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(2,132,199,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(2,132,199,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(2,132,199,0.3)'">
                    🔍 Mở Tìm Gr Zalo Và Join →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ĐĂNG BẢN THÂN & SẢN PHẨM PROGRESS IN LỊCH KHÓA BIỂU ==========
async function _kbInjectDangBTStats() {
    const placeholders = document.querySelectorAll('[data-bt-date]');
    if (placeholders.length === 0) return;
    const uid = _kbViewUserId || currentUser.id;
    const datesCalled = {};
    for (const el of placeholders) {
        const dateStr = el.getAttribute('data-bt-date');
        if (datesCalled[dateStr]) { _kbRenderDangBTMini(el, datesCalled[dateStr]); continue; }
        try {
            const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${dateStr}&module_type=dang_banthan_sp`);
            datesCalled[dateStr] = res;
            _kbRenderDangBTMini(el, res);
        } catch(e) {}
    }
}

function _kbRenderDangBTMini(el, res) {
    const count = res.count || 0, target = res.target || 10;
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const isPending = res.report_status === 'pending' || (done && _kbLockNeedsApproval());
    if (isPending) {
        el.innerHTML = `<div style="margin-top:4px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:4px 8px;border-radius:6px;text-align:center;animation:_kbPendingPulse 3s infinite;"><span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.2);">⏳ Chờ Duyệt ${count}/${target}</span></div></div>`;
    } else {
        el.innerHTML = `<div style="margin-top:4px;"><div style="font-size:9px;margin-bottom:2px;">${done ? `<span style="color:#a21caf;font-weight:800;">✅ ${count}/${target}</span>` : `<span style="color:#a21caf;font-weight:700;">📸 ${count}/${target}</span>`}</div><div style="background:#e5e7eb;border-radius:4px;height:5px;overflow:hidden;"><div style="background:#d946ef;height:100%;width:${pct}%;border-radius:4px;transition:width .5s;"></div></div></div>`;
    }
}

async function _kbLoadDetailDangBT() {
    const el = document.getElementById('kbTaskDetailSSProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=dang_banthan_sp`);
        const count = res.count || 0, target = res.target || 10, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#fdf4ff,#fae8ff);border:1.5px solid #e879f9;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#a21caf;">📸 Tiến trình Đăng Bản Thân hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#a21caf'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#f0abfc;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#d946ef,#c026d3,#a21caf);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbDetailModal')?.remove();window.location.href='/dangbanthansp';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#d946ef,#a21caf);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(217,70,239,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(217,70,239,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(217,70,239,0.3)'">
                    📸 Mở Đăng Bản Thân & Sản Phẩm →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}

// ========== ĐĂNG BẢN THÂN PROGRESS IN CV KHÓA DETAIL MODAL ==========
async function _kbLoadLockDetailDangBT() {
    const el = document.getElementById('kbLockDetailProgress');
    if (!el) return;
    const uid = _kbViewUserId || currentUser.id;
    const todayStr = _kbDateStr(new Date());
    try {
        const res = await apiCall(`/api/dailylinks/live-count/${uid}?date=${todayStr}&module_type=dang_banthan_sp`);
        const count = res.count || 0, target = res.target || 10, totalPts = res.total_points || 10;
        const pct = Math.min(100, Math.round(count / target * 100));
        const done = count >= target;
        const earned = Math.round(Math.min(count, target) / target * totalPts);
        el.innerHTML = `
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#fdf4ff,#fae8ff);border:1.5px solid #e879f9;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;font-weight:700;color:#a21caf;">📸 Tiến trình Đăng Bản Thân hôm nay</span>
                <span style="font-size:13px;font-weight:800;color:${done?'#059669':'#a21caf'};">${count}/${target} link — ${pct}%${done?' ✅':''}</span>
            </div>
            <div style="background:#f0abfc;border-radius:8px;height:10px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#d946ef,#c026d3,#a21caf);height:100%;width:${pct}%;border-radius:8px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:11px;color:#6b7280;">💰 ${earned}/${totalPts} điểm</span>
            </div>
            <div style="margin-top:10px;text-align:center;">
                <a href="javascript:void(0)" onclick="document.getElementById('kbLockDetailModal')?.remove();window.location.href='/dangbanthansp';" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#d946ef,#a21caf);color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 3px 10px rgba(217,70,239,0.3);transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 5px 15px rgba(217,70,239,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 3px 10px rgba(217,70,239,0.3)'">
                    📸 Mở Đăng Bản Thân & Sản Phẩm →
                </a>
            </div>
        </div>`;
    } catch(e) {}
}


// ========== PER-USER OVERRIDE FUNCTIONS (GĐ only) ==========
async function _kbEditOverrideDiem(templateId, field) {
    if (currentUser.role !== 'giam_doc') { showToast('Chỉ Giám Đốc', 'error'); return; }
    var uid = _kbViewUserId;
    if (!uid) { showToast('Phải đang xem lịch nhân viên', 'error'); return; }
    var task = _kbTasks.find(function(t) { return (t._source === 'snapshot' ? t.template_id : t.id) === templateId; });
    var taskName = task ? task.task_name : '';
    var ov = _kbOverridesDiem[templateId];
    var label = field === 'points' ? 'Điểm' : 'SL Tối Thiểu';
    var currentVal = field === 'points' ? (task ? task.points : 0) : (task ? (task.min_quantity || 1) : 1);
    var origVal = currentVal;
    if (field === 'points' && ov && ov.custom_points != null && task && task._orig_points != null) origVal = task._orig_points;
    if (field === 'min_quantity' && ov && ov.custom_min_quantity != null && task && task._orig_min_quantity != null) origVal = task._orig_min_quantity;

    var old = document.getElementById('kbOverrideModal');
    if (old) old.remove();
    var m = document.createElement('div'); m.id = 'kbOverrideModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;';
    m.onclick = function(e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:white;border-radius:16px;width:min(380px,90vw);box-shadow:0 25px 60px rgba(0,0,0,0.2);overflow:hidden;">'
        + '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:18px 24px;">'
        + '<div style="font-size:16px;font-weight:800;color:white;">✏️ Tùy chỉnh ' + label + '</div>'
        + '<div style="font-size:12px;color:#fef3c7;margin-top:4px;">' + taskName + '</div></div>'
        + '<div style="padding:24px;">'
        + '<div style="display:flex;gap:12px;margin-bottom:16px;">'
        + '<div style="flex:1;text-align:center;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb;">'
        + '<div style="font-size:10px;color:#6b7280;font-weight:600;">GIÁ TRỊ GỐC</div>'
        + '<div style="font-size:20px;font-weight:800;color:#374151;">' + origVal + '</div></div>'
        + '<div style="flex:1;text-align:center;background:#fffbeb;border-radius:8px;padding:10px;border:2px solid #f59e0b;">'
        + '<div style="font-size:10px;color:#d97706;font-weight:600;">GIÁ TRỊ MỚI</div>'
        + '<input id="kbOvInput" type="number" value="' + currentVal + '" min="0" style="width:80px;font-size:20px;font-weight:800;color:#d97706;border:none;text-align:center;background:transparent;outline:none;" /></div></div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="_kbSaveOverrideDiem(' + templateId + ',\'' + field + '\')" style="flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-weight:700;cursor:pointer;font-size:13px;">💾 Lưu</button>'
        + (ov ? '<button onclick="_kbResetOverrideDiem(' + templateId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ef4444;color:white;font-weight:700;cursor:pointer;font-size:13px;">🔄 Mặc định</button>' : '')
        + '<button onclick="document.getElementById(\'kbOverrideModal\').remove()" style="flex:1;padding:10px;border:none;border-radius:8px;background:#e5e7eb;color:#374151;font-weight:700;cursor:pointer;font-size:13px;">Hủy</button>'
        + '</div></div></div>';
    document.body.appendChild(m);
    var inp = document.getElementById('kbOvInput'); if (inp) inp.focus();
}

async function _kbSaveOverrideDiem(templateId, field) {
    var inp = document.getElementById('kbOvInput');
    if (!inp) return;
    var val = Number(inp.value);
    if (isNaN(val) || val < 0) { showToast('Giá trị không hợp lệ', 'error'); return; }
    var existing = _kbOverridesDiem[templateId];
    try {
        await apiCall('/api/schedule/user-override', 'POST', {
            user_id: _kbViewUserId,
            source_type: 'diem',
            source_id: templateId,
            custom_points: field === 'points' ? val : (existing && existing.custom_points != null ? existing.custom_points : null),
            custom_min_quantity: field === 'min_quantity' ? val : (existing && existing.custom_min_quantity != null ? existing.custom_min_quantity : null)
        });
        showToast('✅ Đã lưu tùy chỉnh!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var dm = document.getElementById('kbDetailModal'); if (dm) dm.remove();
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbResetOverrideDiem(templateId) {
    if (!confirm('Khôi phục giá trị mặc định cho công việc này?')) return;
    try {
        await apiCall('/api/schedule/user-override?user_id=' + _kbViewUserId + '&source_type=diem&source_id=' + templateId, 'DELETE');
        showToast('🔄 Đã khôi phục mặc định!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var dm = document.getElementById('kbDetailModal'); if (dm) dm.remove();
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbEditOverrideKhoa(lockTaskId) {
    if (currentUser.role !== 'giam_doc') { showToast('Chỉ Giám Đốc', 'error'); return; }
    var uid = _kbViewUserId;
    if (!uid) { showToast('Phải đang xem lịch NV', 'error'); return; }
    var lt = _kbLockTasks.find(function(t) { return t.id === lockTaskId; });
    var ov = _kbOverridesKhoa[lockTaskId];
    var currentVal = ov && ov.custom_min_quantity != null ? ov.custom_min_quantity : (lt ? lt.min_quantity : 1);
    var origVal = lt ? (lt.min_quantity || 1) : 1;
    var old = document.getElementById('kbOverrideModal');
    if (old) old.remove();
    var m = document.createElement('div'); m.id = 'kbOverrideModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;';
    m.onclick = function(e) { if (e.target === m) m.remove(); };
    m.innerHTML = '<div style="background:white;border-radius:16px;width:min(380px,90vw);box-shadow:0 25px 60px rgba(0,0,0,0.2);overflow:hidden;">'
        + '<div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:18px 24px;">'
        + '<div style="font-size:16px;font-weight:800;color:white;">✏️ Tùy chỉnh SL Tối Thiểu (CV Khóa)</div>'
        + '<div style="font-size:12px;color:#fecaca;margin-top:4px;">' + (lt ? lt.task_name : '') + '</div></div>'
        + '<div style="padding:24px;">'
        + '<div style="display:flex;gap:12px;margin-bottom:16px;">'
        + '<div style="flex:1;text-align:center;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb;">'
        + '<div style="font-size:10px;color:#6b7280;font-weight:600;">GIÁ TRỊ GỐC</div>'
        + '<div style="font-size:20px;font-weight:800;color:#374151;">' + origVal + '</div></div>'
        + '<div style="flex:1;text-align:center;background:#fef2f2;border-radius:8px;padding:10px;border:2px solid #dc2626;">'
        + '<div style="font-size:10px;color:#dc2626;font-weight:600;">GIÁ TRỊ MỚI</div>'
        + '<input id="kbOvInput" type="number" value="' + currentVal + '" min="0" style="width:80px;font-size:20px;font-weight:800;color:#dc2626;border:none;text-align:center;background:transparent;outline:none;" /></div></div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="_kbSaveOverrideKhoa(' + lockTaskId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;font-weight:700;cursor:pointer;font-size:13px;">💾 Lưu</button>'
        + (ov ? '<button onclick="_kbResetOverrideKhoa(' + lockTaskId + ')" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ef4444;color:white;font-weight:700;cursor:pointer;font-size:13px;">🔄 Mặc định</button>' : '')
        + '<button onclick="document.getElementById(\'kbOverrideModal\').remove()" style="flex:1;padding:10px;border:none;border-radius:8px;background:#e5e7eb;color:#374151;font-weight:700;cursor:pointer;font-size:13px;">Hủy</button>'
        + '</div></div></div>';
    document.body.appendChild(m);
    var inp = document.getElementById('kbOvInput'); if (inp) inp.focus();
}

async function _kbSaveOverrideKhoa(lockTaskId) {
    var inp = document.getElementById('kbOvInput');
    if (!inp) return;
    var val = Number(inp.value);
    if (isNaN(val) || val < 0) { showToast('Giá trị không hợp lệ', 'error'); return; }
    try {
        await apiCall('/api/schedule/user-override', 'POST', {
            user_id: _kbViewUserId, source_type: 'khoa', source_id: lockTaskId, custom_points: null, custom_min_quantity: val
        });
        showToast('✅ Đã lưu!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var lm = document.getElementById('kbLockDetailModal'); if (lm) lm.remove();
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}

async function _kbResetOverrideKhoa(lockTaskId) {
    if (!confirm('Khôi phục mặc định?')) return;
    try {
        await apiCall('/api/schedule/user-override?user_id=' + _kbViewUserId + '&source_type=khoa&source_id=' + lockTaskId, 'DELETE');
        showToast('🔄 Đã khôi phục!', 'success');
        var om = document.getElementById('kbOverrideModal'); if (om) om.remove();
        var lm = document.getElementById('kbLockDetailModal'); if (lm) lm.remove();
        _kbLoadSchedule();
    } catch(e) { showToast('Lỗi: ' + (e.message || ''), 'error'); }
}


// Helper: scroll to and highlight a task row by name after calendar loads
function _kbScrollToTask(taskName) {
    let tries = 0;
    const check = () => {
        const rows = document.querySelectorAll('[data-kb-task-name]');
        let target = null;
        for (const r of rows) {
            if (r.getAttribute('data-kb-task-name') === taskName) { target = r; break; }
        }
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash highlight
            target.style.transition = 'box-shadow 0.3s, outline 0.3s';
            target.style.outline = '3px solid #dc2626';
            target.style.boxShadow = '0 0 20px rgba(220,38,38,0.4)';
            target.style.background = '#fef2f2';
            setTimeout(() => {
                target.style.outline = '3px solid #f59e0b';
                target.style.boxShadow = '0 0 15px rgba(245,158,11,0.3)';
            }, 800);
            setTimeout(() => {
                target.style.outline = '';
                target.style.boxShadow = '';
                target.style.background = '';
                target.style.transition = '';
            }, 3000);
        } else if (tries < 20) {
            tries++;
            setTimeout(check, 300);
        }
    };
    setTimeout(check, 500);
}

// ========== UNREPORTED CV MODAL ==========
async function _kbShowUnreportedModal() {
    const existing = document.getElementById('kbUnreportedModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kbUnreportedModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:white;border-radius:16px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.25);"><div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:18px 24px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center;"><div style="color:white;font-weight:800;font-size:18px;">\ud83d\udd0d CV Ch\u01b0a B\u00e1o C\u00e1o</div><button onclick="document.getElementById(\'kbUnreportedModal\').remove()" style="background:rgba(255,255,255,.15);border:none;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;color:white;">\u00d7</button></div><div id="kbUnreportedContent" style="padding:20px 24px;"><div style="text-align:center;padding:30px;color:#9ca3af;">\u23f3 \u0110ang t\u1ea3i...</div></div></div>';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);

    try {
        const data = await apiCall('/api/lock-tasks/unreported');
        const content = document.getElementById('kbUnreportedContent');
        if (!content) return;

        const khoaList = data.khoa || [];
        const chuoiList = data.chuoi || [];

        if (khoaList.length === 0 && chuoiList.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">\u2705</div><div style="font-size:16px;font-weight:700;color:#166534;">Kh\u00f4ng c\u00f3 CV ch\u01b0a b\u00e1o c\u00e1o!</div><div style="font-size:12px;color:#6b7280;margin-top:6px;">T\u1ea5t c\u1ea3 CV Kh\u00f3a v\u00e0 CV Chu\u1ed7i \u0111\u00e3 \u0111\u01b0\u1ee3c ho\u00e0n th\u00e0nh</div></div>';
            return;
        }

        const fmtDate = (d) => { const p = (d||'').slice(0,10).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : d; };
        const jumpBtn = (date, userId, bgColor, taskName) => {
            const escapedName = (taskName||'').replace(/'/g, "\\'");
            return '<button onclick="document.getElementById(\'kbUnreportedModal\').remove();' +
                'var d=new Date(\'' + (date||'').slice(0,10) + 'T00:00:00\');' +
                'var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);' +
                '_kbWeekStart=d;' +
                'var el=document.querySelector(\'.kb-member-item[data-uid=\\\\x22' + userId + '\\\\x22]\');' +
                'if(el){_kbSelectMember(' + userId + ');}else{_kbLoadSchedule();}' +
                '_kbScrollToTask(\'' + escapedName + '\');" ' +
                'style="padding:6px 12px;border:none;border-radius:8px;background:' + bgColor + ';color:white;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">\ud83d\udcc5 Xem l\u1ecbch</button>';
        };

        // Merge all items with a type tag
        const allItems = [
            ...khoaList.map(k => ({ ...k, _type: 'khoa' })),
            ...chuoiList.map(c => ({ ...c, _type: 'chuoi' }))
        ];

        // Split into self vs subordinates
        const myId = currentUser.id;
        const selfItems = allItems.filter(i => i.user_id === myId);
        const subItems = allItems.filter(i => i.user_id !== myId);
        const selfPenalty = selfItems.reduce((s, i) => s + Number(i.penalty_amount || 0), 0);
        const subPenalty = subItems.reduce((s, i) => s + Number(i.penalty_amount || 0), 0);

        // Render a single item row
        const renderItem = (item) => {
            const isChain = item._type === 'chuoi';
            const borderColor = isChain ? '#c4b5fd' : '#fecaca';
            const bg = isChain ? '#f5f3ff' : '#fef2f2';
            const btnColor = isChain ? '#7c3aed' : '#dc2626';
            const icon = isChain ? '\ud83d\udd17' : '\ud83d\udd10';
            const chainTag = isChain ? ' <span style="font-size:10px;color:#7c3aed;">(' + item.chain_name + ')</span>' : '';
            return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid ' + borderColor + ';border-radius:8px;margin-bottom:4px;background:' + bg + ';">' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + icon + ' ' + item.task_name + chainTag + '</div>' +
                '<div style="font-size:10px;color:#6b7280;margin-top:1px;">\ud83d\udcc5 ' + fmtDate(item.task_date) + ' \u00b7 \ud83d\udcb0 ' + Number(item.penalty_amount||0).toLocaleString() + '\u0111</div>' +
                '</div>' + jumpBtn(item.task_date, item.user_id, btnColor, item.task_name) + '</div>';
        };

        let html = '';

        // ===== HEADER: stat cards =====
        html += '<div style="display:flex;gap:10px;margin-bottom:20px;">';
        html += '<div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fca5a5;border-radius:12px;padding:14px;text-align:center;">' +
            '<div style="font-size:28px;font-weight:900;color:#dc2626;">' + allItems.length + '</div>' +
            '<div style="font-size:10px;color:#991b1b;font-weight:700;text-transform:uppercase;">T\u1ed5ng CV ch\u01b0a BC</div></div>';
        html += '<div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fca5a5;border-radius:12px;padding:14px;text-align:center;">' +
            '<div style="font-size:20px;font-weight:900;color:#dc2626;">' + selfPenalty.toLocaleString() + '\u0111</div>' +
            '<div style="font-size:10px;color:#991b1b;font-weight:700;">PH\u1ea0T B\u1ea2N TH\u00c2N</div></div>';
        if (subItems.length > 0) {
            html += '<div style="flex:1;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fcd34d;border-radius:12px;padding:14px;text-align:center;">' +
                '<div style="font-size:20px;font-weight:900;color:#d97706;">' + subPenalty.toLocaleString() + '\u0111</div>' +
                '<div style="font-size:10px;color:#92400e;font-weight:700;">PH\u1ea0T NV C\u1ea4P D\u01af\u1edaI</div></div>';
        }
        html += '</div>';

        // ===== SECTION 1: PHAT BAN THAN =====
        if (selfItems.length > 0) {
            html += '<div style="margin-bottom:20px;">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px 14px;background:linear-gradient(135deg,#991b1b,#dc2626);border-radius:10px;">' +
                '<span style="font-size:16px;">\ud83d\udc64</span>' +
                '<span style="color:white;font-weight:800;font-size:14px;">PH\u1ea0T B\u1ea2N TH\u00c2N</span>' +
                '<span style="background:rgba(255,255,255,.2);color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;">' + selfItems.length + ' CV \u00b7 ' + selfPenalty.toLocaleString() + '\u0111</span></div>';
            selfItems.forEach(item => { html += renderItem(item); });
            html += '</div>';
        }

        // ===== SECTION 2: PHAT NV CAP DUOI =====
        if (subItems.length > 0) {
            html += '<div>';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 14px;background:linear-gradient(135deg,#92400e,#d97706);border-radius:10px;">' +
                '<span style="font-size:16px;">\ud83d\udc65</span>' +
                '<span style="color:white;font-weight:800;font-size:14px;">PH\u1ea0T NV C\u1ea4P D\u01af\u1edaI</span>' +
                '<span style="background:rgba(255,255,255,.2);color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;">' + subItems.length + ' CV \u00b7 ' + subPenalty.toLocaleString() + '\u0111</span></div>';

            // Group by user
            const byUser = {};
            subItems.forEach(item => {
                const key = item.user_id;
                if (!byUser[key]) byUser[key] = { full_name: item.full_name, username: item.username, dept_name: item.dept_name, items: [], total: 0 };
                byUser[key].items.push(item);
                byUser[key].total += Number(item.penalty_amount || 0);
            });

            // Sort users by total penalty desc
            const sortedUsers = Object.entries(byUser).sort((a, b) => b[1].total - a[1].total);
            let subIdx = 0;

            sortedUsers.forEach(([uid, u]) => {
                const cid = 'kbUnrSub_' + (subIdx++);
                html += '<div style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">';
                // User header (clickable accordion)
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1px solid #e5e7eb;cursor:pointer;" onclick="var b=document.getElementById(\'' + cid + '\');b.style.display=b.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.chevron\').textContent=b.style.display===\'none\'?\'\u25b6\':\'\u25bc\'">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:12px;">' + (u.full_name||'?').charAt(0).toUpperCase() + '</div>' +
                    '<div><div style="font-size:13px;font-weight:700;color:#1e293b;">' + u.full_name + ' <span style="font-size:11px;color:#6b7280;font-weight:400;">(' + u.username + ')</span></div>' +
                    '<div style="font-size:10px;color:#6b7280;">\ud83c\udfe2 ' + (u.dept_name || '\u2014') + '</div></div></div>' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<div style="text-align:right;"><div style="font-size:14px;font-weight:800;color:#dc2626;">' + u.total.toLocaleString() + '\u0111</div>' +
                    '<div style="font-size:10px;color:#6b7280;">' + u.items.length + ' CV ph\u1ea1t</div></div>' +
                    '<span class="chevron" style="font-size:10px;color:#9ca3af;">\u25bc</span></div></div>';
                // User items (collapsible body)
                html += '<div id="' + cid + '" style="padding:8px 10px;">';
                u.items.forEach(item => { html += renderItem(item); });
                html += '</div></div>';
            });

            html += '</div>';
        }

        content.innerHTML = html;

    } catch(e) {
        const content = document.getElementById('kbUnreportedContent');
        if (content) content.innerHTML = '<div style="text-align:center;padding:30px;color:#dc2626;">❌ Lỗi tải dữ liệu</div>';
    }
}

// ========== FORCE APPROVAL SETUP — Kiểm Soát CV Nhân Viên ==========

async function _kbShowForceApprovalSetup(userId, userName) {
    // Remove existing popup
    let old = document.getElementById('kbForceApprovalPopup');
    if (old) old.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'kbForceApprovalPopup';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const popup = document.createElement('div');
    popup.style.cssText = 'background:white;border-radius:16px;width:520px;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);';

    popup.innerHTML = `
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#1e293b,#334155);color:white;border-radius:16px 16px 0 0;">
            <div style="font-size:18px;font-weight:800;">🔒 Kiểm Soát CV</div>
            <div style="font-size:13px;opacity:0.8;margin-top:4px;">Nhân viên: <b>${userName}</b></div>
        </div>
        <div id="kbForceBody" style="padding:20px 24px;">
            <div style="text-align:center;padding:30px;color:#94a3b8;">⏳ Đang tải...</div>
        </div>`;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Load data
    try {
        const [faData, reviewerList] = await Promise.all([
            apiCall(`/api/users/${userId}/force-approval`),
            apiCall('/api/users/dropdown')
        ]);

        // Get user's tasks (templates) — reuse schedule API
        const uid = userId;
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        const monStr = _kbDateStr(mon);
        const schedData = await apiCall(`/api/schedule/dashboard?user_id=${uid}&week_start=${monStr}`);

        // Deduplicate schedule tasks by task_name (same template repeats for each day)
        // Collect ALL template IDs per task_name for force approval
        const schedTaskMap = {};
        (schedData.tasks || []).forEach(t => {
            const name = t.task_name;
            if (!name) return;
            if (!schedTaskMap[name]) schedTaskMap[name] = { ...t, allIds: [] };
            const tid = t.template_id || t.id; // Prefer template_id (actual task_point_templates.id)
            if (tid && !schedTaskMap[name].allIds.includes(tid)) schedTaskMap[name].allIds.push(tid);
        });
        const schedTasks = Object.values(schedTaskMap);

        // Get lock tasks for user
        let lockTasks = [];
        try {
            const ltData = await apiCall(`/api/lock-tasks/user/${uid}`);
            // Deduplicate lock tasks by task_name
            const lockMap = {};
            (ltData.tasks || []).forEach(t => {
                if (!t.task_name || lockMap[t.task_name]) return;
                lockMap[t.task_name] = t;
            });
            lockTasks = Object.values(lockMap);
        } catch(e) { console.log('Lock tasks error:', e); }

        // Get chain items for user
        let chainItems = [];
        try {
            const ciData = await apiCall(`/api/chain-tasks/user-items?user_id=${uid}`);
            chainItems = ciData.items || [];
        } catch(e) {}

        // Filter reviewers: only TP/QL/QLCC/GĐ
        const REVIEWER_ROLES = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'];
        const reviewers = (reviewerList.users || []).filter(u => REVIEWER_ROLES.includes(u.role) && u.id !== userId);

        // Build current force task map
        const forceTaskMap = {};
        (faData.tasks || []).forEach(t => { forceTaskMap[`${t.task_type}_${t.task_ref_id}`] = true; });

        const body = document.getElementById('kbForceBody');
        let html = '';

        // 1. Reviewer selection
        html += `<div style="margin-bottom:20px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b;">👤 Người Kiểm Duyệt</div>
            <select id="kbForceReviewer" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:white;">
                <option value="">— Duyệt theo phòng ban (mặc định) —</option>
                ${reviewers.map(r => `<option value="${r.id}" ${r.id === faData.force_approval_reviewer_id ? 'selected' : ''}>${r.full_name} (${_kbRoleLabel[r.role] || r.role})</option>`).join('')}
            </select>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">ℹ️ Chỉ hiện TP, QL, QLCC, GĐ từ tất cả phòng ban</div>
        </div>`;

        // 2. Force ALL toggle
        html += `<div style="margin-bottom:16px;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;display:flex;align-items:center;gap:12px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;font-size:14px;font-weight:700;color:#991b1b;">
                <input type="checkbox" id="kbForceAll" ${faData.force_approval ? 'checked' : ''} style="width:18px;height:18px;accent-color:#dc2626;cursor:pointer;">
                🔒 Kiểm soát TẤT CẢ công việc
            </label>
        </div>`;

        // 3. Per-task selection
        html += `<div id="kbForceTaskList" style="${faData.force_approval ? 'opacity:0.4;pointer-events:none;' : ''}">`;
        html += `<div style="font-size:12px;color:#64748b;margin-bottom:10px;font-weight:600;">— Hoặc chọn từng công việc cần kiểm soát —</div>`;

        // Schedule tasks
        if (schedTasks.length > 0) {
            html += `<div style="font-weight:700;font-size:13px;color:#1d4ed8;margin:12px 0 6px;display:flex;align-items:center;gap:6px;">📊 CV ĐIỂM</div>`;
            schedTasks.forEach(t => {
                const allIds = t.allIds || [t.template_id || t.id];
                // Check if ANY of the IDs is in forceTaskMap
                const isChecked = allIds.some(id => forceTaskMap[`schedule_${id}`]);
                const checked = isChecked ? 'checked' : '';
                const nativeApproval = t.requires_approval ? '<span style="background:#fbbf24;color:#78350f;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">Cần duyệt gốc</span>' : '';
                html += `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:6px;transition:background .1s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" class="kbForceTask" data-type="schedule" data-ref="${allIds.join(',')}" ${checked} style="width:16px;height:16px;accent-color:#dc2626;">
                    <span style="font-size:13px;color:#334155;">${t.task_name} <span style="color:#94a3b8;font-size:11px;">(${t.points || 0}đ)</span>${nativeApproval}</span>
                </label>`;
            });
        }

        // Lock tasks
        if (lockTasks.length > 0) {
            html += `<div style="font-weight:700;font-size:13px;color:#059669;margin:16px 0 6px;display:flex;align-items:center;gap:6px;">🔐 CV KHÓA</div>`;
            lockTasks.forEach(t => {
                const checked = forceTaskMap[`lock_${t.id}`] ? 'checked' : '';
                const nativeApproval = t.requires_approval ? '<span style="background:#fbbf24;color:#78350f;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">Cần duyệt gốc</span>' : '';
                html += `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:6px;transition:background .1s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" class="kbForceTask" data-type="lock" data-ref="${t.id}" ${checked} style="width:16px;height:16px;accent-color:#dc2626;">
                    <span style="font-size:13px;color:#334155;">${t.task_name}${nativeApproval}</span>
                </label>`;
            });
        }

        // Chain items
        if (chainItems.length > 0) {
            html += `<div style="font-weight:700;font-size:13px;color:#7c3aed;margin:16px 0 6px;display:flex;align-items:center;gap:6px;">🔗 CV CHUỖI</div>`;
            chainItems.forEach(t => {
                const checked = forceTaskMap[`chain_${t.id}`] ? 'checked' : '';
                const nativeApproval = t.requires_approval ? '<span style="background:#fbbf24;color:#78350f;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;">Cần duyệt gốc</span>' : '';
                html += `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:6px;transition:background .1s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" class="kbForceTask" data-type="chain" data-ref="${t.id}" ${checked} style="width:16px;height:16px;accent-color:#dc2626;">
                    <span style="font-size:13px;color:#334155;">${t.task_name} — ${t.chain_name || ''}${nativeApproval}</span>
                </label>`;
            });
        }

        if (schedTasks.length === 0 && lockTasks.length === 0 && chainItems.length === 0) {
            html += `<div style="text-align:center;padding:15px;color:#94a3b8;font-size:13px;">Không tìm thấy công việc nào cho NV này</div>`;
        }

        html += `</div>`; // close kbForceTaskList

        // Save button
        html += `<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:16px;">
            <button onclick="document.getElementById('kbForceApprovalPopup').remove()" style="padding:8px 20px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">Hủy</button>
            <button onclick="_kbSaveForceApproval(${userId})" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(220,38,38,0.3);" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">💾 Lưu</button>
        </div>`;

        body.innerHTML = html;

        // Toggle: when "force all" is checked, disable individual list
        document.getElementById('kbForceAll').addEventListener('change', function() {
            const list = document.getElementById('kbForceTaskList');
            if (this.checked) {
                list.style.opacity = '0.4';
                list.style.pointerEvents = 'none';
            } else {
                list.style.opacity = '1';
                list.style.pointerEvents = 'auto';
            }
        });

    } catch(e) {
        const body = document.getElementById('kbForceBody');
        if (body) body.innerHTML = `<div style="text-align:center;padding:30px;color:#dc2626;">❌ Lỗi tải: ${e.message}</div>`;
    }
}

async function _kbSaveForceApproval(userId) {
    const forceAll = document.getElementById('kbForceAll')?.checked || false;
    const reviewerId = document.getElementById('kbForceReviewer')?.value || null;

    // Collect selected tasks (schedule checkboxes may have comma-separated IDs)
    const tasks = [];
    document.querySelectorAll('.kbForceTask:checked').forEach(cb => {
        const refs = cb.dataset.ref.split(',');
        refs.forEach(ref => {
            if (ref) tasks.push({ task_type: cb.dataset.type, task_ref_id: Number(ref) });
        });
    });

    try {
        // Save toggle + reviewer
        await apiCall(`/api/users/${userId}/force-approval`, 'PUT', {
            force_approval: forceAll,
            reviewer_id: reviewerId ? Number(reviewerId) : null
        });

        // Save per-task list
        await apiCall(`/api/users/${userId}/force-approval/tasks`, 'POST', { tasks });

        showToast('✅ Đã lưu cài đặt kiểm soát CV', 'success');
        document.getElementById('kbForceApprovalPopup')?.remove();

        // Reload schedule if viewing this user
        if (_kbViewUserId === userId) _kbLoadSchedule();
    } catch(e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
    }
}

// ========== FORCE APPROVAL NOTIFICATION — Thông báo cho Reviewer ==========

async function _kbCheckForceApprovalNotification() {
    // Only check for TP/QL/QLCC/GĐ
    if (!['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role)) return;

    try {
        // Check if current user is a designated reviewer for any employee
        const res = await apiCall(`/api/schedule/force-approval-pending?reviewer_id=${currentUser.id}`);
        if (!res.pending || res.pending.length === 0) return;

        // Build notification
        let html = `<div style="padding:20px 24px;">
            <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:12px;">🔔 BẠN CÓ CV CẦN KIỂM DUYỆT</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Bạn được chỉ định kiểm duyệt CV của các nhân viên sau:</div>`;

        res.pending.forEach(p => {
            html += `<div style="padding:8px 12px;background:#fef2f2;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
                <span style="font-weight:700;color:#991b1b;">${p.full_name}</span>
                <span style="background:#dc2626;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${p.count} CV chờ</span>
            </div>`;
        });

        html += `<div style="text-align:center;margin-top:16px;">
            <button onclick="this.closest('[data-force-notif]').remove()" style="padding:8px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;font-size:13px;font-weight:700;cursor:pointer;">Đã hiểu ✓</button>
        </div></div>`;

        const notif = document.createElement('div');
        notif.setAttribute('data-force-notif', '1');
        notif.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9998;background:white;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);border:2px solid #dc2626;min-width:320px;animation:_kbSlideIn .3s ease;';
        notif.innerHTML = html;
        document.body.appendChild(notif);

        // Auto-dismiss after 30s
        setTimeout(() => { if (notif.parentNode) notif.remove(); }, 30000);
    } catch(e) { /* silent */ }
}
