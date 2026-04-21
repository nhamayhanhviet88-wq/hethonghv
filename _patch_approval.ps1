# Precise patch for lich-khoabieu.js approval grouping
$f = 'd:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH - Copy\public\js\pages\lich-khoabieu.js'
$c = [System.IO.File]::ReadAllText($f)

# ====== PATCH 1: Replace pending.forEach with grouped version ======
# Find exact start and end markers
$startMarker = "        let rows = '';`r`n        pending.forEach(r =>"
$endMarker = "            </tr>``;`r`n        });`r`n`r`n        // CV Khoa"

$startIdx = $c.IndexOf($startMarker)
if ($startIdx -lt 0) { Write-Host "ERROR: start marker not found"; exit 1 }

# Find the end: the "});" that closes pending.forEach, followed by "// CV Khoa"
$searchFrom = $startIdx + 100
$endIdx = $c.IndexOf("        });`r`n`r`n        // CV Khoa (lock task) pending rows", $searchFrom)
if ($endIdx -lt 0) { Write-Host "ERROR: end marker not found"; exit 1 }

# The replacement ends right before "// CV Khoa"
$replaceEnd = $c.IndexOf("        // CV Khoa (lock task) pending rows", $endIdx)

Write-Host "PATCH 1: start=$startIdx, replaceEnd=$replaceEnd"

$newPendingBlock = @'
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

            let viewBtn = '';
            if (g.guide_url && g.guide_url.includes('/')) {
                try {
                    const url = new URL(g.guide_url, window.location.origin);
                    const viewPath = url.pathname;
                    viewBtn = `<span onclick="window.open('${viewPath}?view_user_id=${g.user_id}&view_date=${g.report_date}', '_blank')" style="background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;" title="Mở trang xem chi tiết (tab mới)">👁️ Xem</span>`;
                } catch(e) { viewBtn = ''; }
            }
            if (!viewBtn) {
                const rData = JSON.stringify({
                    template_id: g.template_id, task_name: g.task_name, status: 'pending',
                    points_earned: 0, quantity: count, min_quantity: g.min_quantity,
                    report_value: g.reports.map(r => r.report_value).filter(Boolean).join(', '),
                    report_image: g.reports[0]?.report_image || '',
                    report_date: g.report_date, content: g.reports.map(r => r.content).filter(Boolean).join('\n'),
                    reject_reason: '', redo_count: 0, redo_deadline: '',
                    guide_url: g.guide_url, user_id: g.user_id,
                    input_requirements: g.input_requirements, output_requirements: g.output_requirements
                }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
                viewBtn = `<span onclick="_kbViewApprovalReport(this)" data-report="${rData}" style="background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:4px;" title="Xem báo cáo">📋 Xem</span>`;
            }

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

'@

$c = $c.Substring(0, $startIdx) + $newPendingBlock + $c.Substring($replaceEnd)
Write-Host "PATCH 1: OK"

# ====== PATCH 2: Add group approve/reject functions after _kbApproveReport ======
$afterMarker = "async function _kbApproveReport(reportId) {`r`n    if (!confirm('✅ Xác nhận DUYỆT báo cáo này?')) return;`r`n    try {`r`n        await apiCall(``/api/schedule/report/`${reportId}/approve``, 'PUT', { action: 'approve' });`r`n        showToast('✅ Đã duyệt báo cáo');`r`n        _kbLoadApprovalPanel();`r`n        _kbLoadSchedule();`r`n    } catch(e) { alert('Lỗi: ' + (e.message || 'Không có quyền')); }`r`n}"

$insertIdx = $c.IndexOf($afterMarker)
if ($insertIdx -lt 0) { 
    # Try simpler marker
    $insertIdx = $c.IndexOf("async function _kbApproveReport(reportId)")
    if ($insertIdx -ge 0) {
        # Find the closing brace
        $insertIdx = $c.IndexOf("`r`n}`r`n", $insertIdx) + 4
    }
}
if ($insertIdx -lt 0) { Write-Host "ERROR: insert point not found"; exit 1 }

$newFunctions = @'

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

'@

$c = $c.Substring(0, $insertIdx) + $newFunctions + $c.Substring($insertIdx)
Write-Host "PATCH 2: OK (inserted at $insertIdx)"

# ====== PATCH 3: Update badge count to show group count not raw count ======
$oldBadge = '${pending.length > 0 ? `<span style="background:rgba(255,255,255,0.3);color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:800;">📊 ${pending.length}</span>` : ' + "''" + '}'
$newBadge = '${pending.length > 0 ? `<span style="background:rgba(255,255,255,0.3);color:white;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:800;">📊 ${Object.keys(_pendingGroups).length}</span>` : ' + "''" + '}'
if ($c.Contains($oldBadge)) {
    $c = $c.Replace($oldBadge, $newBadge)
    Write-Host "PATCH 3: OK (badge count updated)"
} else {
    Write-Host "PATCH 3: SKIP (badge not found)"
}

[System.IO.File]::WriteAllText($f, $c)
Write-Host "ALL PATCHES APPLIED SUCCESSFULLY"
