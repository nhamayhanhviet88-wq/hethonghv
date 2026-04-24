// ========== NOTIFICATION SYSTEM ==========
// Global notification panel for all users

let _notifPanel = null;
let _notifInterval = null;

// Pulse animation
(function() {
    if (document.getElementById('_notifPulseStyle')) return;
    const s = document.createElement('style');
    s.id = '_notifPulseStyle';
    s.textContent = `@keyframes _notifPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`;
    document.head.appendChild(s);
})();

// ==================== INIT ====================
function _notifInit() {
    _notifCheckUnread();
    // Poll every 60s
    if (_notifInterval) clearInterval(_notifInterval);
    _notifInterval = setInterval(_notifCheckUnread, 60000);
}

// ==================== CHECK UNREAD COUNT ====================
async function _notifCheckUnread() {
    try {
        const data = await apiCall('/api/notifications/unread-count');
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (data.count > 0) {
            badge.textContent = data.count > 99 ? '99+' : data.count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch(e) {}
}

// ==================== TOGGLE PANEL ====================
function _notifToggle() {
    if (_notifPanel && _notifPanel.parentNode) {
        _notifPanel.remove();
        _notifPanel = null;
        return;
    }
    _notifShowPanel();
}

// ==================== SHOW PANEL ====================
async function _notifShowPanel() {
    try {
        const data = await apiCall('/api/notifications/my');
        const notifications = data.notifications || [];

        // Remove existing panel
        if (_notifPanel) _notifPanel.remove();

        _notifPanel = document.createElement('div');
        _notifPanel.id = 'notifPanel';
        _notifPanel.style.cssText = 'position:fixed;top:50px;right:16px;width:420px;max-width:95vw;max-height:80vh;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);z-index:10000;overflow:hidden;border:1px solid #e5e7eb;animation:_notifSlideIn .2s ease;';

        let itemsHtml = '';
        if (notifications.length === 0) {
            itemsHtml = '<div style="text-align:center;padding:40px 20px;color:#9ca3af;"><div style="font-size:40px;margin-bottom:12px;">🔔</div><div style="font-size:14px;font-weight:600;">Chưa có thông báo nào</div></div>';
        } else {
            notifications.forEach((n, _ni) => {
                const isUnread = !n.is_read;
                const timeAgo = _notifTimeAgo(n.created_at);
                const icon = n.type === 'feedback' ? '💬' : '📢';
                const dateStr = n.ref_date ? ` (${n.ref_date.split('-').reverse().join('/')})` : '';
                // Store notification data globally for click handler
                window._notifItems = window._notifItems || {};
                window._notifItems[n.id] = n;

                itemsHtml += `<div onclick="_notifShowDetail(${n.id})" style="padding:14px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .15s;${isUnread ? 'background:#fffbeb;' : ''}" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${isUnread ? '#fffbeb' : 'white'}'">
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <div style="font-size:22px;flex-shrink:0;margin-top:2px;">${icon}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-weight:${isUnread ? '800' : '600'};font-size:12px;color:${isUnread ? '#92400e' : '#374151'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;">${n.ref_task_name || 'Thông báo'}${dateStr}</span>
                                ${isUnread ? '<span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>' : ''}
                            </div>
                            <div style="font-size:12px;color:#4b5563;line-height:1.5;margin-bottom:4px;${isUnread ? 'font-weight:600;' : ''}">${_notifEscapeHtml(n.content || '')}</div>
                            <div style="font-size:10px;color:#9ca3af;">👤 ${n.sender_name || 'Hệ thống'} · ${timeAgo}</div>
                        </div>
                    </div>
                </div>`;
            });
        }

        _notifPanel.innerHTML = `
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:white;font-weight:800;font-size:16px;">🔔 Thông báo</span>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${data.unread_count > 0 ? `<button onclick="_notifMarkAllRead()" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">✓ Đọc hết</button>` : ''}
                    <button onclick="_notifToggle()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;padding:0 4px;">✕</button>
                </div>
            </div>
            <div style="overflow-y:auto;max-height:calc(80vh - 60px);">
                ${itemsHtml}
            </div>
        `;

        document.body.appendChild(_notifPanel);

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', _notifOutsideClick);
        }, 100);
    } catch(e) {
        console.error('Notification error:', e);
    }
}

function _notifOutsideClick(e) {
    if (_notifPanel && !_notifPanel.contains(e.target) && e.target.id !== 'notifBtn' && !e.target.closest('#notifBtn')) {
        _notifPanel.remove();
        _notifPanel = null;
        document.removeEventListener('click', _notifOutsideClick);
    }
}

// ==================== SHOW NOTIFICATION DETAIL POPUP ====================
function _notifShowDetail(id) {
    const n = (window._notifItems || {})[id];
    if (!n) return;

    // Mark as read
    apiCall(`/api/notifications/${id}/read`, 'PUT').catch(() => {});
    _notifCheckUnread();

    // Close panel
    if (_notifPanel) { _notifPanel.remove(); _notifPanel = null; }

    // Build popup
    const dateF = n.ref_date ? n.ref_date.split('-').reverse().join('/') : '';
    const time = n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '';
    const icon = n.type === 'feedback' ? '💬' : '📢';

    let modal = document.getElementById('notifDetailModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'notifDetailModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:450px;max-width:92vw;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);border-top:4px solid #f59e0b;">
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:36px;margin-bottom:8px;">${icon}</div>
            <div style="font-size:16px;font-weight:800;color:#92400e;">${n.type === 'feedback' ? 'GÓP Ý TỪ QUẢN LÝ' : 'THÔNG BÁO'}</div>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="font-weight:700;font-size:14px;color:#92400e;margin-bottom:8px;">${_notifEscapeHtml(n.ref_task_name || 'Công việc')} ${dateF ? '(' + dateF + ')' : ''}</div>
            <div style="font-size:13px;color:#78350f;line-height:1.6;white-space:pre-wrap;background:white;border-radius:8px;padding:12px;border:1px solid #fde68a;">${_notifEscapeHtml(n.content || '')}</div>
            <div style="margin-top:10px;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;">
                <span>👤 ${_notifEscapeHtml(n.sender_name || 'Quản lý')}</span>
                <span>🕐 ${time}</span>
            </div>
        </div>
        <div style="text-align:center;">
            <button onclick="document.getElementById('notifDetailModal').remove()" style="padding:10px 28px;font-size:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(245,158,11,0.3);">Đã hiểu ✓</button>
        </div>
    </div>`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// ==================== MARK AS READ ====================
async function _notifRead(id, el) {
    try {
        await apiCall(`/api/notifications/${id}/read`, 'PUT');
        if (el) {
            el.style.background = 'white';
            el.onmouseout = function() { this.style.background = 'white'; };
            const dot = el.querySelector('span[style*="border-radius:50%"]');
            if (dot) dot.remove();
        }
        _notifCheckUnread();
    } catch(e) {}
}

// ==================== MARK ALL READ ====================
async function _notifMarkAllRead() {
    try {
        await apiCall('/api/notifications/read-all', 'PUT');
        _notifCheckUnread();
        _notifShowPanel(); // Refresh panel
    } catch(e) {}
}

// ==================== HELPERS ====================
function _notifTimeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff/86400)} ngày trước`;
    return d.toLocaleDateString('vi-VN');
}

function _notifEscapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==================== AUTO-SHOW POPUP FOR NEW FEEDBACK ====================
async function _notifCheckFeedbackPopup() {
    try {
        const data = await apiCall('/api/notifications/my');
        const unreadFeedbacks = (data.notifications || []).filter(n => n.type === 'feedback' && !n.is_read);
        if (unreadFeedbacks.length === 0) return;

        // Check localStorage for already-shown popup IDs
        const popupKey = `notif_popup_shown_${window._currentUser?.id || 'x'}`;
        let shown = [];
        try { shown = JSON.parse(localStorage.getItem(popupKey)) || []; } catch {}

        const newFeedbacks = unreadFeedbacks.filter(f => !shown.includes(f.id));
        if (newFeedbacks.length === 0) return;

        // Show popup for new feedbacks
        let items = '';
        newFeedbacks.forEach((f, i) => {
            const dateStr = f.ref_date ? f.ref_date.split('-').reverse().join('/') : '';
            items += `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;color:#92400e;margin-bottom:4px;">${i+1}. ${f.ref_task_name || 'Công việc'} ${dateStr ? `(${dateStr})` : ''}</div>
                <div style="font-size:12px;color:#78350f;margin-bottom:4px;line-height:1.5;">💬 "${_notifEscapeHtml(f.content || '')}"</div>
                <div style="font-size:11px;color:#9ca3af;">👤 ${f.sender_name || 'Quản lý'}</div>
            </div>`;
        });

        const modal = document.createElement('div');
        modal.id = 'notifFeedbackPopup';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;width:450px;max-width:92vw;max-height:80vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);border-top:4px solid #f59e0b;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;margin-bottom:8px;">💬</div>
                <div style="font-size:18px;font-weight:800;color:#92400e;">BẠN CÓ GÓP Ý MỚI TỪ QUẢN LÝ!</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px;">Hãy xem và cải thiện công việc nhé</div>
            </div>
            ${items}
            <div style="text-align:center;margin-top:16px;">
                <button id="notifFeedbackDismiss" style="padding:10px 28px;font-size:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(245,158,11,0.3);">Đã hiểu ✓</button>
            </div>
        </div>`;
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);

        document.getElementById('notifFeedbackDismiss').onclick = () => {
            const ids = newFeedbacks.map(f => f.id);
            const updated = [...new Set([...shown, ...ids])];
            try { localStorage.setItem(popupKey, JSON.stringify(updated)); } catch {}
            // Mark as read
            ids.forEach(id => apiCall(`/api/notifications/${id}/read`, 'PUT').catch(() => {}));
            modal.remove();
            _notifCheckUnread();
        };
    } catch(e) {}
}

// ==================== SLIDE-IN ANIMATION ====================
(function() {
    if (document.getElementById('_notifAnimStyle')) return;
    const s = document.createElement('style');
    s.id = '_notifAnimStyle';
    s.textContent = `@keyframes _notifSlideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }`;
    document.head.appendChild(s);
})();

// Init on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_notifInit, 2000));
} else {
    setTimeout(_notifInit, 2000);
}
// Also check for feedback popups after 3s
setTimeout(_notifCheckFeedbackPopup, 3000);
