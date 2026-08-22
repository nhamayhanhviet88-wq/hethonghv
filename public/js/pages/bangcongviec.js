
function _bcvGetDeptShortCode(deptName) {
    if (!deptName) return 'CHUNG';
    var nameUpper = String(deptName).toUpperCase().trim();
    if (nameUpper.indexOf('MARKETING') !== -1) return 'MKT';
    if (nameUpper.indexOf('KINH DOANH') !== -1) return 'KD';
    if (nameUpper.indexOf('KẾ TOÁN') !== -1 || nameUpper.indexOf('KE TOAN') !== -1) return 'KT';
    if (nameUpper.indexOf('THỦ QUỸ') !== -1 || nameUpper.indexOf('THU QUY') !== -1) return 'QUY';
    if (nameUpper.indexOf('THỦ KHO') !== -1 || nameUpper.indexOf('THU KHO') !== -1) return 'KHO';
    if (nameUpper.indexOf('NHÂN SỰ') !== -1 || nameUpper.indexOf('HÀNH CHÍNH') !== -1) return 'NS';
    if (nameUpper.indexOf('AFFILIATE') !== -1) return 'AFF';
    if (nameUpper.indexOf('ÉP') !== -1 || nameUpper.indexOf('EP') !== -1) return 'EP';
    if (nameUpper.indexOf('HOÀN THIỆN') !== -1 || nameUpper.indexOf('HOAN THIEN') !== -1) return 'HT';
    if (nameUpper.indexOf('CẮT CÁNH') !== -1) return 'CC';
    if (nameUpper.indexOf('CẮT') !== -1) return 'CAT';
    if (nameUpper.indexOf('XÃ HỘI') !== -1) return 'XH';
    if (nameUpper.indexOf('VĂN PHÒNG') !== -1) return 'VP';
    if (nameUpper.indexOf('XƯỞNG') !== -1) return 'XUONG';
    if (nameUpper.indexOf('THIẾT KẾ') !== -1 || nameUpper.indexOf('THIET KE') !== -1) return 'TK';
    if (nameUpper.indexOf('SINH VIÊN') !== -1) return 'SVKD';
    if (nameUpper.indexOf('THỬ VIỆC') !== -1) return 'TVKD';
    if (nameUpper.indexOf('TIÊN PHONG') !== -1) return 'MTP';
    if (nameUpper.indexOf('TINH HOA') !== -1) return 'MTH';
    if (nameUpper.indexOf('MAY') !== -1) return 'MAY';
    if (nameUpper.indexOf('IN') !== -1) return 'IN';
    if (nameUpper.indexOf('SALE') !== -1) return 'SALE';

    var stopWords = ['PHÒNG', 'TEAM', 'HỆ', 'THỐNG', 'BAN', 'BỘ', 'PHẬN', 'HV'];
    var words = nameUpper.split(/\s+/).filter(function(w) { return w && stopWords.indexOf(w) === -1; });
    if (words.length > 0) {
        var code = words.map(function(w) { return w[0]; }).join('').replace(/[^A-Z0-9]/g, '');
        if (code) return code;
    }
    return 'CV';
}

function _bcvCanSeeReadStatus(user) {
    user = user || window._currentUser || {};
    var role = (user.role || '').toLowerCase();
    var username = (user.username || '').toLowerCase();
    var fullName = (user.full_name || '').toLowerCase();

    // Giám Đốc / Admin
    if (role === 'giam_doc' || role === 'admin' || username === 'admin') return true;

    // Quản lý cấp cao / Lê Việt Trinh
    if (role === 'quan_ly_cap_cao' || username === 'trinh' || username === 'leviettrinh' || username === 'trinh.lvt' || fullName.includes('lê việt trinh') || fullName.includes('le viet trinh')) return true;

    return false;
}

function _bcvGetTaskCode(task) {
    if (!task) return 'CV-000';
    if (task.task_code && task.task_code.trim()) return task.task_code.trim();
    return 'CV-' + String(task.id || 0).padStart(3, '0');
}

function _bcvGetFriendlyGuideLinkHtml(guideLink, deptId) {
    if (!guideLink || !guideLink.trim()) return '<div style="font-size:12px;color:#94a3b8">Không có link hướng dẫn</div>';

    var links = [];
    var trimmed = guideLink.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            var parsed = JSON.parse(trimmed);
            links = Array.isArray(parsed) ? parsed : [parsed];
        } catch(e) {}
    }

    if (Array.isArray(links) && links.length > 0) {
        var docs = _bcv.documents || [];
        if (deptId) {
            var filtered = docs.filter(function(d) { return String(d.department_id) === String(deptId); });
            if (filtered.length > 0) docs = filtered;
        }

        // Group main_categories exactly like _bcvRenderTuLieuTab to match "Tư Liệu X" numbering
        var mainCatGroups = {};
        docs.forEach(function(d) {
            var cat = d.main_category || 'TƯ LIỆU CHUNG';
            if (!mainCatGroups[cat]) mainCatGroups[cat] = [];
            mainCatGroups[cat].push(d);
        });
        var mainCatKeys = Object.keys(mainCatGroups);

        var firstMainCat = '';

        // 1. Match ANY link in links against department documents by sub_category or main_category
        docs.forEach(function(d) {
            if (firstMainCat) return;
            var subClean = (d.sub_category || '').toLowerCase().trim();
            var mainClean = (d.main_category || '').replace(/^\d+[\.\s\-]*/, '').trim().toLowerCase();

            links.forEach(function(l) {
                if (firstMainCat) return;
                var lSub = ((typeof l === 'object' && (l.subCat || l.prefix)) || '').toLowerCase().trim();
                var lMain = ((typeof l === 'object' && l.mainCat) || '').toLowerCase().trim();
                var matchSub = subClean && lSub && (lSub.includes(subClean) || subClean.includes(lSub));
                var matchMain = lMain && mainClean && lMain.includes(mainClean);

                if (matchSub || matchMain) {
                    var cleanCat = d.main_category ? d.main_category.replace(/^\d+[\.\s\-]*/, '').trim() : '';
                    var mainIdx = mainCatKeys.indexOf(d.main_category);
                    firstMainCat = 'Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;
                }
            });
        });

        // 2. Fallback: match by URL / Title across all links and all docs
        if (!firstMainCat) {
            docs.forEach(function(d) {
                if (firstMainCat) return;
                var dLinks = d.links;
                if (typeof dLinks === 'string') {
                    try { dLinks = JSON.parse(dLinks); } catch(e) { dLinks = []; }
                }
                (dLinks || []).forEach(function(l) {
                    if (firstMainCat) return;
                    var lUrl = typeof l === 'string' ? l : l.url;
                    var lTitle = typeof l === 'string' ? l : (l.title || l.url);

                    links.forEach(function(linkObj) {
                        if (firstMainCat) return;
                        var sUrl = typeof linkObj === 'string' ? linkObj : linkObj.url;
                        var sTitle = typeof linkObj === 'object' ? linkObj.title : '';

                        var matchUrl = sUrl && lUrl && (lUrl.trim() === sUrl.trim() || sUrl.trim().includes(lUrl.trim()) || lUrl.trim().includes(sUrl.trim()));
                        var matchTitle = !sTitle || (lTitle && lTitle.trim() === sTitle.trim());

                        if (matchUrl && matchTitle) {
                            var cleanCat = d.main_category ? d.main_category.replace(/^\d+[\.\s\-]*/, '').trim() : '';
                            var mainIdx = mainCatKeys.indexOf(d.main_category);
                            firstMainCat = 'Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;
                        }
                    });
                });
            });
        }

        // 3. Fallback to rawMainCat stored on links
        if (!firstMainCat && links[0] && links[0].mainCat) {
            var rawClean = links[0].mainCat.replace(/^Tư Liệu \d+\s*:\s*/i, '').replace(/^\d+[\.\s\-]*/, '').trim();
            mainCatKeys.forEach(function(catKey, idx) {
                var c = catKey.replace(/^\d+[\.\s\-]*/, '').trim();
                if (c.toLowerCase() === rawClean.toLowerCase()) {
                    firstMainCat = 'Tư Liệu ' + (idx + 1) + ' : ' + c;
                }
            });
            if (!firstMainCat) {
                firstMainCat = 'Tư Liệu 1 : ' + rawClean;
            }
        }

        // Group links by subCat / prefix
        var groups = {};
        links.forEach(function(link) {
            var prefix = typeof link === 'object' ? (link.prefix || link.subCat || '') : '';
            var key = prefix || 'Mục khác';
            if (!groups[key]) groups[key] = [];
            groups[key].push(link);
        });

        var html = '<div style="display:flex;flex-direction:column;gap:8px">';
        if (firstMainCat) {
            html += '<div style="font-size:12px;font-weight:800;color:#047857;display:flex;align-items:center;gap:4px">📂 ' + _esc(firstMainCat) + ':</div>';
        }

        Object.keys(groups).forEach(function(prefixKey) {
            html += '<div style="margin-left:' + (firstMainCat ? '10px' : '0') + '">';
            if (prefixKey && prefixKey !== 'Mục khác') {
                html += '<div style="font-size:11px;font-weight:800;color:#d97706;margin-bottom:4px;display:flex;align-items:center;gap:4px">📁 ' + _esc(prefixKey) + ':</div>';
            }
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
            groups[prefixKey].forEach(function(link) {
                var title = typeof link === 'string' ? link : (link.title || link.url);
                var url = typeof link === 'string' ? link : link.url;
                html += '<a href="' + _escAttr(url) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#059669;background:#ecfdf5;padding:6px 12px;border-radius:8px;border:1px solid #a7f3d0;text-decoration:none">📚 ' + _esc(title) + ' ↗</a>';
            });
            html += '</div></div>';
        });

        html += '</div>';
        return html;
    }

    return '<a href="' + _escAttr(guideLink) + '" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#059669;font-weight:700;word-break:break-all;padding:6px 12px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;text-decoration:none">📚 ' + _esc(guideLink) + ' ↗</a>';
}

// Get Document category display name for a task (e.g. "📌 Tư Liệu 1 : KOC KOL" or "📌 Công Việc Lẻ")
function _bcvGetTaskDocCategory(t) {
    if (!t || !t.guide_link || !t.guide_link.trim()) {
        return '📌 Công Việc Lẻ';
    }

    var guideLink = t.guide_link.trim();
    var links = [];
    if (guideLink.startsWith('[') || guideLink.startsWith('{')) {
        try {
            var parsed = JSON.parse(guideLink);
            links = Array.isArray(parsed) ? parsed : [parsed];
        } catch(e) {}
    }

    // 1. Check if first link has explicit mainCat stored
    if (Array.isArray(links) && links.length > 0) {
        var firstLink = links[0];
        if (typeof firstLink === 'object' && firstLink.mainCat) {
            var rawMain = firstLink.mainCat.trim();
            if (!rawMain.startsWith('📌')) {
                rawMain = '📌 ' + rawMain;
            }
            return rawMain;
        }
    }

    // 2. Match against _bcv.documents by sub_category / main_category or URL/Title
    var docs = _bcv.documents || [];
    if (t.department_id) {
        var filtered = docs.filter(function(d) { return String(d.department_id) === String(t.department_id); });
        if (filtered.length > 0) docs = filtered;
    }

    if (docs.length > 0) {
        var mainCatGroups = {};
        docs.forEach(function(d) {
            var cat = d.main_category || 'TƯ LIỆU CHUNG';
            if (!mainCatGroups[cat]) mainCatGroups[cat] = [];
            mainCatGroups[cat].push(d);
        });
        var mainCatKeys = Object.keys(mainCatGroups);

        var matchedCat = '';

        // Match by sub_category or main_category
        docs.forEach(function(d) {
            if (matchedCat) return;
            var subClean = (d.sub_category || '').toLowerCase().trim();
            var mainClean = (d.main_category || '').replace(/^\d+[\.\s\-]*/, '').trim().toLowerCase();

            (links.length > 0 ? links : [guideLink]).forEach(function(l) {
                if (matchedCat) return;
                var lSub = ((typeof l === 'object' && (l.subCat || l.prefix)) || '').toLowerCase().trim();
                var lMain = ((typeof l === 'object' && l.mainCat) || '').toLowerCase().trim();
                var matchSub = subClean && lSub && (lSub.includes(subClean) || subClean.includes(lSub));
                var matchMain = lMain && mainClean && lMain.includes(mainClean);

                if (matchSub || matchMain) {
                    var cleanCat = d.main_category ? d.main_category.replace(/^\d+[\.\s\-]*/, '').trim() : '';
                    var mainIdx = mainCatKeys.indexOf(d.main_category);
                    matchedCat = '📌 Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;
                }
            });
        });

        if (matchedCat) return matchedCat;

        // Match by URL / Title fallback
        docs.forEach(function(d) {
            if (matchedCat) return;
            var dLinks = d.links;
            if (typeof dLinks === 'string') {
                try { dLinks = JSON.parse(dLinks); } catch(e) { dLinks = []; }
            }
            (dLinks || []).forEach(function(l) {
                if (matchedCat) return;
                var lUrl = typeof l === 'string' ? l : l.url;
                (links.length > 0 ? links : [guideLink]).forEach(function(linkObj) {
                    if (matchedCat) return;
                    var sUrl = typeof linkObj === 'string' ? linkObj : linkObj.url;
                    if (sUrl && lUrl && (lUrl.trim() === sUrl.trim() || sUrl.trim().includes(lUrl.trim()) || lUrl.trim().includes(sUrl.trim()))) {
                        var cleanCat = d.main_category ? d.main_category.replace(/^\d+[\.\s\-]*/, '').trim() : '';
                        var mainIdx = mainCatKeys.indexOf(d.main_category);
                        matchedCat = '📌 Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;
                    }
                });
            });
        });

        if (matchedCat) return matchedCat;
    }

    return '📌 Công Việc Lẻ';
}

// ===== BẢNG CÔNG VIỆC — Kanban Task Board =====
var _bcv = {
    tasks: [],
    users: [],
    departments: [],
    enabledDepts: [],
    tab: null, // set dynamically: 'me' | 'phong' | 'tu_lieu'
    filters: { search: '', assigned_to: '', department_id: '', priority: '', status: '' },
    hoanThanhFilter: {
        mode: 'thang_truoc_va_nay', // mặc định: tháng trước & tháng này
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        quarter: Math.floor(new Date().getMonth() / 3) + 1,
        fromDate: '',
        toDate: ''
    },
    documents: [],
    docFilters: { search: '', department_id: '' },
};

function _bcvNavigateToFullscreen() {
    if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/bangcongviec/hoanthanh');
    }
    var targetArea = document.getElementById('contentArea') || document.getElementById('mainContent') || document.getElementById('main-content');
    renderBangcongviecPage(targetArea);
}

function _bcvNavigateToBoard(targetUrl) {
    if (window.history && window.history.pushState) {
        window.history.pushState({}, '', targetUrl || '/bangcongviec');
    }
    var targetArea = document.getElementById('contentArea') || document.getElementById('mainContent') || document.getElementById('main-content');
    renderBangcongviecPage(targetArea);
}

async function renderBangcongviecPage(content) {
    var c = content || document.getElementById('contentArea') || document.getElementById('mainContent') || document.getElementById('main-content');
    if (!c) return;
    var user = window._currentUser || {};
    var isDirector = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    var greeting = user.full_name || 'Bạn';
    // Khi ấn vào menu Bảng Công Việc từ bất kỳ menu nào khác, luôn luôn mặc định mở mục "📊 Tỉ Lệ Hoàn Thành Deadline"
    var defaultTab = 'deadline';
    _bcv.tab = defaultTab;

    var curPath = window.location.pathname.toLowerCase();
    var isFullscreenHoanThanh = curPath.includes('/hoanthanh') || curPath.includes('/hoan-thanh');

    var styleBlock = `<style>` + "\n/* ===== BẢNG CÔNG VIỆC STYLES — KPI Marketing Inspired ===== */\n.bcv-page{background:#f8fafc;min-height:calc(100vh - 60px);padding:0;font-family:'Inter',sans-serif}\n.bcv-header{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%);padding:22px 28px;color:#fff;box-shadow:0 4px 20px rgba(37,99,235,.25)}\n.bcv-header h2{margin:0 0 4px;font-size:22px;font-weight:900;background:linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.bcv-header-sub{font-size:12px;color:rgba(255,255,255,.75);font-weight:500}\n.bcv-header-sub strong{color:#fff}\n.bcv-top-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:14px}\n.bcv-tabs{display:flex;gap:4px}\n.bcv-tab{padding:8px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.65);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}\n.bcv-tab.active{background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4);box-shadow:0 2px 8px rgba(0,0,0,.1)}\n.bcv-tab:hover{background:rgba(255,255,255,.1);color:#fff}\n.bcv-btn-create{padding:10px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 15px rgba(22,163,74,.35);transition:all .15s;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.5px}\n.bcv-btn-create:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.45)}\n.bcv-btn-config{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}\n.bcv-btn-config:hover{background:rgba(255,255,255,.2);color:#fff}\n\n/* Filter Bar */\n.bcv-filters{padding:12px 28px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;align-items:center}\n.bcv-search{padding:8px 14px 8px 34px;border-radius:10px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;width:220px;outline:none;background:#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2394a3b8' viewBox='0 0 24 24' width='14' height='14'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E\") 12px center no-repeat;transition:all .2s;font-family:'Inter',sans-serif;color:#334155}\n.bcv-search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}\n.bcv-filter-sel{padding:8px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:11px;font-weight:600;background:#f8fafc;cursor:pointer;outline:none;font-family:'Inter',sans-serif;color:#334155}\n.bcv-filter-sel:focus{border-color:#3b82f6}\n\n/* Kanban Board */\n.bcv-board{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:20px 28px;min-height:500px}\n@media(max-width:1100px){.bcv-board{grid-template-columns:repeat(2,1fr)}}\n@media(max-width:600px){.bcv-board{grid-template-columns:1fr}}\n\n/* Kanban Column */\n.bcv-col{background:#fff;border-radius:14px;padding:0;min-height:400px;display:flex;flex-direction:column;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04)}\n.bcv-col-header{padding:14px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;border-bottom:none;border-radius:14px 14px 0 0;border-left:4px solid transparent}\n.bcv-col-header .bcv-col-count{padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700}\n.bcv-col[data-status=\"can_lam\"] .bcv-col-header{background:linear-gradient(135deg,#f1f5f9,#e2e8f0);color:#475569;border-left-color:#64748b}\n.bcv-col[data-status=\"can_lam\"] .bcv-col-count{background:#cbd5e1;color:#475569}\n.bcv-col[data-status=\"dang_lam\"] .bcv-col-header{background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#c2410c;border-left-color:#ea580c}\n.bcv-col[data-status=\"dang_lam\"] .bcv-col-count{background:#fed7aa;color:#c2410c}\n.bcv-col[data-status=\"cho_duyet\"] .bcv-col-header{background:linear-gradient(135deg,#f5f3ff,#ede9fe);color:#7c3aed;border-left-color:#7c3aed}\n.bcv-col[data-status=\"cho_duyet\"] .bcv-col-count{background:#ddd6fe;color:#6d28d9}\n.bcv-col[data-status=\"hoan_thanh\"] .bcv-col-header{background:linear-gradient(135deg,#f0fdf4,#dcfce7);color:#16a34a;border-left-color:#16a34a}\n.bcv-col[data-status=\"hoan_thanh\"] .bcv-col-count{background:#bbf7d0;color:#15803d}\n.bcv-ht-filter-box{margin-top:6px;background:rgba(255,255,255,0.85);border-radius:8px;padding:6px 8px;border:1px solid #a7f3d0;box-shadow:0 1px 3px rgba(0,0,0,0.03)}\n.bcv-ht-select,.bcv-ht-input{width:100%;padding:4px 8px;border-radius:6px;border:1px solid #a7f3d0;font-size:11px;font-weight:700;background:#fff;color:#065f46;outline:none;font-family:'Inter',sans-serif;box-sizing:border-box}\n.bcv-ht-select:focus,.bcv-ht-input:focus{border-color:#10b981;box-shadow:0 0 0 2px rgba(16,185,129,.15)}\n.bcv-ht-sub-inputs{display:flex;gap:4px;margin-top:4px}\n.bcv-btn-expand{padding:2px 8px;border-radius:6px;border:1px solid #86efac;background:#ecfdf5;color:#047857;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:3px}\n.bcv-btn-expand:hover{background:#d1fae5;color:#065f46;transform:translateY(-1px)}\n\n/* ===== FULLSCREEN HOÀN THÀNH PAGE STYLES ===== */\n.bcv-fs-page{background:#f8fafc;min-height:calc(100vh - 60px);padding-bottom:40px;font-family:'Inter',-apple-system,sans-serif}\n.bcv-fs-hero{background:linear-gradient(135deg,#064e3b 0%,#047857 45%,#059669 85%,#10b981 100%);padding:28px 36px 44px;color:#fff;box-shadow:0 10px 30px rgba(4,120,87,.22);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;position:relative;overflow:hidden}\n.bcv-fs-hero::before{content:'';position:absolute;top:-50%;right:-10%;width:400px;height:400px;background:radial-gradient(circle,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 70%);border-radius:50%;pointer-events:none}\n.bcv-fs-title-box h2{margin:0 0 6px;font-size:24px;font-weight:900;color:#fff;display:flex;align-items:center;gap:10px;letter-spacing:-.3px}\n.bcv-fs-title-badge{background:rgba(255,255,255,.22);backdrop-filter:blur(6px);color:#fff;font-size:12px;font-weight:800;padding:3px 12px;border-radius:20px;letter-spacing:.5px;text-transform:uppercase}\n.bcv-fs-sub{font-size:13px;color:rgba(255,255,255,.85);font-weight:500}\n.bcv-fs-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n.bcv-fs-segmented{display:inline-flex;background:rgba(0,0,0,.2);padding:4px;border-radius:12px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.15)}\n.bcv-fs-tab-btn{padding:8px 16px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.75);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;gap:6px;font-family:inherit}\n.bcv-fs-tab-btn:hover{color:#fff;background:rgba(255,255,255,.1)}\n.bcv-fs-tab-btn.active{background:#fff;color:#064e3b;box-shadow:0 4px 12px rgba(0,0,0,.15)}\n.bcv-fs-back-btn{padding:10px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.4);background:#fff;color:#047857;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.12);transition:all .2s;display:flex;align-items:center;gap:8px;font-family:inherit}\n.bcv-fs-back-btn:hover{background:#ecfdf5;color:#065f46;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.18)}\n.bcv-fs-filter-card{background:#fff;border-radius:16px;box-shadow:0 4px 25px rgba(0,0,0,.05),0 1px 3px rgba(0,0,0,.02);border:1px solid #e2e8f0;margin:-24px 36px 24px;padding:16px 24px;position:relative;z-index:10;display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:16px}\n.bcv-fs-filter-group{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.bcv-fs-search{padding:9px 16px 9px 36px;border-radius:10px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;width:240px;outline:none;background:#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2394a3b8' viewBox='0 0 24 24' width='14' height='14'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E\") 12px center no-repeat;transition:all .2s;color:#334155;font-family:inherit}\n.bcv-fs-search:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15);background-color:#fff}\n.bcv-fs-select{padding:9px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;background:#f8fafc;cursor:pointer;outline:none;color:#334155;font-family:inherit;transition:all .2s}\n.bcv-fs-select:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15)}\n.bcv-fs-date-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:8px}\n.bcv-fs-date-lbl{font-size:12px;font-weight:800;color:#047857;white-space:nowrap}\n.bcv-fs-container{padding:0 36px}\n.bcv-fs-section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}\n.bcv-fs-section-title{font-size:15px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:8px;letter-spacing:-.2px}\n.bcv-fs-count-badge{background:#dcfce7;color:#15803d;font-size:13px;font-weight:800;padding:4px 14px;border-radius:20px;border:1px solid #86efac}\n.bcv-fs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;min-height:400px}\n/* Column Body & Empty */\n.bcv-col-body{flex:1;padding:10px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:100px}\n.bcv-col-body.drag-over{background:rgba(59,130,246,.05);border-radius:0 0 14px 14px}\n.bcv-col-empty{color:#94a3b8;font-size:12px;font-weight:600;text-align:center;padding:40px 20px;opacity:.7}\n\n/* Task Card */\n.bcv-card{background:#fff;border-radius:14px;padding:16px;border:1.5px solid #e2e8f0;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04)}\n.bcv-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.1);transform:translateY(-3px);border-color:#93c5fd}\n.bcv-card.bcv-card-overdue{border-color:#fca5a5;background:linear-gradient(135deg,#fff5f5,#fef2f2)}\n.bcv-card.dragging{opacity:.4;transform:rotate(2deg)}\n.bcv-card-tags{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}\n.bcv-tag{padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.3px}\n.bcv-tag-chinh{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af}\n.bcv-tag-phu{background:#f1f5f9;color:#475569}\n.bcv-tag-cao{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b}\n.bcv-tag-trung_binh{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e}\n.bcv-tag-thap{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46}\n.bcv-card-title{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;line-height:1.45;letter-spacing:-.2px}\n.bcv-card-progress{height:6px;background:#e2e8f0;border-radius:6px;margin-bottom:6px;overflow:hidden}\n.bcv-card-progress-bar{height:100%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:6px;transition:width .3s}\n.bcv-card-progress-text{font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:8px}\n.bcv-card-footer{display:flex;flex-direction:column;gap:6px;margin-top:6px}\n.bcv-card-assignee{display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;font-weight:600}\n.bcv-card-avatar{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}\n.bcv-card-avatar.bcv-av-receiver{background:linear-gradient(135deg,#22c55e,#16a34a)}\n.bcv-card-comments{font-size:11px;color:#94a3b8;font-weight:600;display:flex;align-items:center;gap:3px}\n.bcv-card-info-box{margin-top:6px;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:10px;background:#fafbfc}\n.bcv-card-info-row{display:flex;align-items:center;padding:7px 12px;gap:8px}\n.bcv-card-info-row+.bcv-card-info-row{border-top:1px solid #f1f5f9}\n.bcv-card-info-row .info-icon{flex-shrink:0;font-size:13px}\n.bcv-card-info-row .info-label{font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;font-size:9px;min-width:58px}\n.bcv-card-info-row .info-value{font-weight:700;color:#334155;font-size:11px}\n.bcv-card-info-row.overdue{background:linear-gradient(135deg,#dc2626,#b91c1c);animation:bcvPulseOverdue 2s infinite}\n.bcv-card-info-row.overdue .info-label,.bcv-card-info-row.overdue .info-value,.bcv-card-info-row.overdue .info-icon{color:#fff}\n.bcv-card-overdue-days{font-size:9px;font-weight:800;margin-left:auto;background:rgba(255,255,255,.25);color:#fff;padding:2px 6px;border-radius:4px;white-space:nowrap}\n@keyframes bcvPulseOverdue{0%,100%{box-shadow:0 2px 8px rgba(220,38,38,.3)}50%{box-shadow:0 2px 16px rgba(220,38,38,.6)}}\n.bcv-card-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}\n.bcv-card-id{font-size:10px;font-weight:800;color:#6366f1;background:linear-gradient(135deg,#eef2ff,#e0e7ff);padding:3px 10px;border-radius:6px;letter-spacing:.5px}\n.bcv-card-flow{display:flex;align-items:center;gap:4px;font-size:10px;color:#64748b;font-weight:600;flex-wrap:wrap}\n.bcv-card-flow-arrow{color:#3b82f6;font-weight:800;font-size:12px}\n.bcv-card-flow-name{font-weight:700;color:#334155}\n.bcv-card-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:4px}\n@keyframes bcvFlashRejected{0%,100%{background:#dc2626;color:#ffffff;box-shadow:0 0 10px rgba(220,38,38,0.8)}50%{background:#fef2f2;color:#b91c1c;box-shadow:0 0 2px rgba(220,38,38,0.2)}}\n.bcv-tag-rejected-flash{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:900;letter-spacing:0.5px;animation:bcvFlashRejected 1s infinite ease-in-out;border:1px solid #dc2626}\n@keyframes bcvPulseRejectedCard{0%,100%{border-color:#ef4444;box-shadow:0 0 12px rgba(239,68,68,0.4)}50%{border-color:#fca5a5;box-shadow:0 0 4px rgba(239,68,68,0.15)}}\n.bcv-card.bcv-card-rejected{border:2px solid #ef4444 !important;animation:bcvPulseRejectedCard 1.5s infinite ease-in-out;background:#fff5f5 !important}\n\n/* Modal */\n.bcv-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.55);z-index:9990;display:flex;align-items:center;justify-content:center;animation:bcvFadeIn .2s;backdrop-filter:blur(4px)}\n@keyframes bcvFadeIn{from{opacity:0}to{opacity:1}}\n.bcv-modal{background:#fff;border-radius:16px;width:95%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.2);animation:bcvSlideUp .25s cubic-bezier(.18,.89,.32,1.28)}\n@keyframes bcvSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}\n.bcv-modal-header{padding:20px 24px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9}\n.bcv-modal-header h3{margin:0;font-size:17px;font-weight:800;color:#1e293b}\n.bcv-modal-close{width:32px;height:32px;border-radius:8px;border:none;background:#f1f5f9;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s}\n.bcv-modal-close:hover{background:#e2e8f0;color:#1e293b}\n.bcv-modal-body{padding:16px 24px 24px}\n.bcv-form-group{margin-bottom:14px}\n.bcv-form-group label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}\n.bcv-form-input,.bcv-form-select,.bcv-form-textarea{width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;color:#1e293b;outline:none;transition:all .2s;box-sizing:border-box;background:#f8fafc}\n.bcv-form-input:focus,.bcv-form-select:focus,.bcv-form-textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}\n.bcv-form-textarea{resize:vertical;min-height:80px}\n.bcv-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n.bcv-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}\n.bcv-btn{padding:10px 20px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif}\n.bcv-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}\n.bcv-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.4)}\n.bcv-btn-secondary{background:#f1f5f9;color:#334155}\n.bcv-btn-secondary:hover{background:#e2e8f0}\n.bcv-btn-danger{background:#fee2e2;color:#991b1b}\n.bcv-btn-danger:hover{background:#fecaca}\n.bcv-btn-success{background:#16a34a;color:#fff;box-shadow:0 2px 6px rgba(22,163,74,.25)}\n.bcv-btn-success:hover{background:#15803d}\n\n/* Lightbox */\n.bcv-lightbox{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;animation:bcvFadeIn .2s;cursor:pointer}\n.bcv-lightbox img{max-width:92vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.5);object-fit:contain}\n.bcv-lightbox-close{position:fixed;top:16px;right:20px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:100000;backdrop-filter:blur(4px)}\n.bcv-lightbox-close:hover{background:rgba(255,255,255,.3);transform:scale(1.1)}\n\n/* Attachment Thumbnails */\n.bcv-att-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:6px}\n.bcv-att-thumb{position:relative;width:100%;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1.5px solid #e2e8f0;cursor:pointer;transition:all .2s;background:#f8fafc}\n.bcv-att-thumb:hover{border-color:#3b82f6;box-shadow:0 2px 12px rgba(59,130,246,.2);transform:translateY(-2px)}\n.bcv-att-thumb img{width:100%;height:100%;object-fit:cover}\n.bcv-att-thumb-del{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(220,38,38,.85);color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}\n.bcv-att-thumb:hover .bcv-att-thumb-del{opacity:1}\n\n/* Progress Slider Single */\n.bcv-progress-single-wrap{display:flex;align-items:center;gap:12px}\n.bcv-progress-single-slider{flex:1;height:8px;-webkit-appearance:none;appearance:none;background:#e2e8f0;border-radius:6px;outline:none;cursor:pointer}\n.bcv-progress-single-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer;transition:transform .1s}\n.bcv-progress-single-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}\n.bcv-progress-badge{padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;color:#fff;min-width:44px;text-align:center}\n\n/* Info Compact Grid */\n.bcv-info-compact{display:grid;grid-template-columns:1fr 1fr;gap:6px;border:none;border-radius:12px;margin-bottom:14px;background:transparent}\n.bcv-info-cell{padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;transition:all .2s}\n.bcv-info-cell:hover{box-shadow:0 2px 8px rgba(15,23,42,.05);transform:translateY(-1px)}\n.bcv-info-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}\n.bcv-info-val{font-size:12px;font-weight:700;color:#1e293b}\n\n/* Section Titles & Dividers */\n.bcv-section-title{font-size:13px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;display:flex;align-items:center;gap:6px}\n.bcv-section-title .bcv-section-icon{font-size:15px}\n.bcv-section-divider{display:flex;align-items:center;gap:10px;margin:0 -20px 16px;padding:12px 20px;border-bottom:none;border-radius:10px 10px 0 0}\n.bcv-section-title-badge{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,.15)}\n.bcv-card-section1{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(15,23,42,.04);overflow:hidden}\n.bcv-card-section1>.bcv-section-divider{background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);margin-top:-20px}\n.bcv-card-section2{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(15,23,42,.04);overflow:hidden}\n.bcv-card-section2>.bcv-section-divider{background:linear-gradient(135deg,#047857 0%,#059669 100%);margin-top:-20px}\n.bcv-overall-report-card{margin-top:16px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06)}\n.bcv-overall-report-header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#2563eb 100%);background-size:200% 200%;animation:bcvGlowShimmer 5s ease infinite;color:#ffffff;padding:12px 18px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;justify-content:space-between;text-shadow:0 1px 3px rgba(0,0,0,0.4);box-shadow:0 2px 8px rgba(0,0,0,0.15)}\n@keyframes bcvGlowShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}\n\n/* Progress Slider */\n.bcv-progress-wrap{display:flex;align-items:center;gap:14px;padding:6px 0}\n.bcv-progress-slider{-webkit-appearance:none;appearance:none;flex:1;height:10px;border-radius:10px;outline:none;cursor:pointer;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#22c55e 100%);position:relative}\n.bcv-progress-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 8px rgba(59,130,246,.35);cursor:pointer;transition:all .15s}\n.bcv-progress-slider::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 3px 12px rgba(59,130,246,.45)}\n.bcv-progress-slider::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 8px rgba(59,130,246,.35);cursor:pointer}\n.bcv-progress-display{min-width:52px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;font-family:'Inter',sans-serif;color:#fff;flex-shrink:0}\n.bcv-progress-track{flex:1;position:relative;height:10px;border-radius:10px;background:#e2e8f0;overflow:hidden}\n.bcv-progress-fill{height:100%;border-radius:10px;transition:width .2s ease}\n\n/* Report Section */\n.bcv-report-area{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:4px}\n.bcv-report-textarea{width:100%;min-height:80px;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;color:#1e293b;resize:vertical;outline:none;transition:border-color .2s;background:#fff;box-sizing:border-box}\n.bcv-report-textarea:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}\n.bcv-report-textarea::placeholder{color:#94a3b8}\n.bcv-report-link-input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;color:#1e293b;outline:none;transition:border-color .2s;background:#fff;box-sizing:border-box}\n.bcv-report-link-input:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}\n.bcv-report-link-input::placeholder{color:#94a3b8}\n.bcv-report-view{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:13px;color:#334155;font-weight:500;line-height:1.5;white-space:pre-wrap;word-break:break-word}\n\n/* Comments Section */\n.bcv-comments{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px}\n.bcv-comments-title{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:12px;display:flex;align-items:center;gap:6px}\n.bcv-comment-input-wrap{display:flex;gap:8px;margin-top:12px;align-items:center}\n.bcv-comment-input{flex:1;padding:10px 14px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:13px;font-weight:600;font-family:inherit;color:#1e293b;outline:none;transition:all .2s;background:#f8fafc;box-sizing:border-box}\n.bcv-comment-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12);background:#fff}\n.bcv-comment-send{padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(37,99,235,.3);transition:all .15s;font-family:inherit;white-space:nowrap}\n.bcv-comment-send:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(37,99,235,.4)}\n.bcv-comment{padding:10px 14px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:8px;transition:all .2s}\n.bcv-comment:hover{background:#f1f5f9;box-shadow:0 2px 6px rgba(0,0,0,.04)}\n.bcv-comment-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}\n.bcv-comment-user{font-size:12px;font-weight:800;color:#1e293b}\n.bcv-comment-time{font-size:10px;font-weight:600;color:#94a3b8}\n.bcv-comment-text{font-size:12px;font-weight:600;color:#334155;line-height:1.5}\n\n/* Checklist Builder */\n.bcv-cl-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:0;margin-bottom:10px;overflow:hidden;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,.04)}\n.bcv-cl-card:hover{box-shadow:0 3px 12px rgba(0,0,0,.07);border-color:#cbd5e1}\n.bcv-cl-card.done{border-color:#86efac;background:#fafff8}\n.bcv-cl-card.done .bcv-cl-card-head{background:#f0fdf4}\n.bcv-checklist-builder{margin-top:8px}\n.bcv-cl-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#f1f5f9;border-radius:8px 8px 0 0;border:1px solid #e2e8f0;border-bottom:none}\n.bcv-cl-card-title{font-size:12px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:6px;flex:1}\n.bcv-cl-card-time{font-size:10px;font-weight:600;color:#94a3b8;white-space:nowrap}\n.bcv-cl-card-body{padding:10px 12px;background:#fff;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;margin-bottom:8px}\n.bcv-cl-card-save{display:flex;align-items:center;gap:4px}\n.bcv-cl-saved-body{padding:6px 10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;font-size:11px;font-weight:700;color:#065f46;margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.bcv-cl-input{width:100%;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;font-family:inherit;color:#1e293b;outline:none;transition:all .2s;background:#f8fafc;box-sizing:border-box}\n.bcv-cl-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}\n.bcv-cl-add{padding:6px 14px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;color:#3b82f6;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px;margin-top:6px;font-family:inherit}\n.bcv-cl-add:hover{background:#eff6ff;border-color:#93c5fd}\n.bcv-cl-remove{width:24px;height:24px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}\n.bcv-cl-remove:hover{background:#fecaca;transform:scale(1.1)}\n.bcv-cl-report-content{width:100%!important;border:1.5px solid #cbd5e1!important;border-radius:10px!important;padding:10px 14px!important;font-size:13px!important;font-weight:500!important;font-family:'Inter',sans-serif!important;color:#1e293b!important;background:#fff;min-height:72px!important;outline:none!important;transition:all .2s!important;box-sizing:border-box!important;resize:vertical}\n.bcv-cl-report-content:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important;background:#fff!important}\n.bcv-cl-report-content::placeholder{color:#94a3b8!important;font-size:13px!important;font-family:'Inter',sans-serif!important}\n.bcv-cl-report-link{width:100%!important;border:1.5px solid #cbd5e1!important;border-radius:10px!important;padding:10px 14px!important;font-size:13px!important;font-weight:500!important;font-family:'Inter',sans-serif!important;color:#1e293b!important;background:#fff;height:42px!important;outline:none!important;transition:all .2s!important;box-sizing:border-box!important}\n.bcv-cl-report-link:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important;background:#fff!important}\n.bcv-cl-report-link::placeholder{color:#94a3b8!important;font-size:13px!important;font-family:'Inter',sans-serif!important}\n\n/* Config, Assignee, Docs */\n.bcv-config-dept{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;margin-bottom:6px;transition:all .2s}\n.bcv-config-dept:hover{background:#f1f5f9}\n.bcv-config-dept-name{font-size:13px;font-weight:700;color:#1e293b}\n.bcv-assignee-cb{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;cursor:pointer;transition:background .15s}\n.bcv-assignee-cb:hover{background:#f1f5f9}\n.bcv-doc-link-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:#eff6ff;border:1px solid #dbeafe;margin-bottom:4px;flex-wrap:wrap}\n.bcv-doc-task-badge{font-size:10px;font-weight:800;color:#fff;background:#3b82f6;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.3px}\n\n/* Small Buttons */\n.bcv-btn-sm{padding:5px 12px;border-radius:8px;border:none;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit}\n.bcv-btn-edit-sm{padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#3b82f6;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s}\n.bcv-btn-edit-sm:hover{background:#eff6ff;border-color:#93c5fd}\n\n/* Prominent Inputs */\n.bcv-form-input-prominent{width:100%;padding:12px 16px;border-radius:12px;border:2px solid #cbd5e1;font-size:14px;font-weight:700;font-family:inherit;color:#1e293b;outline:none;transition:all .2s;box-sizing:border-box;background:#fff}\n.bcv-form-input-prominent:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.12)}\n.bcv-form-textarea-prominent{width:100%;padding:12px 16px;border-radius:12px;border:2px solid #cbd5e1;font-size:14px;font-weight:700;font-family:inherit;color:#1e293b;outline:none;transition:all .2s;box-sizing:border-box;background:#fff;resize:vertical;min-height:100px}\n.bcv-form-textarea-prominent:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.12)}\n\n/* Paste Area */\n.bcv-paste-area{border:2px dashed #cbd5e1;border-radius:12px;padding:16px;margin-top:8px;background:#fafbfc;transition:all .2s;cursor:pointer}\n.bcv-paste-area:hover{border-color:#93c5fd;background:#eff6ff}\n.bcv-paste-label{font-size:12px;font-weight:700;color:#64748b;text-align:center;margin-bottom:4px}\n.bcv-paste-hint{font-size:10px;font-weight:600;color:#94a3b8;text-align:center}\n.bcv-paste-preview{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}\n.bcv-paste-thumb{position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1.5px solid #e2e8f0}\n.bcv-paste-thumb img{width:100%;height:100%;object-fit:cover}\n.bcv-paste-remove{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(220,38,38,.85);color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center}\n\n/* Toggle */\n.bcv-toggle{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}\n.bcv-toggle input{opacity:0;width:0;height:0}\n.bcv-toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;border-radius:24px;transition:all .25s}\n.bcv-toggle input:checked+.bcv-toggle-slider{background:#22c55e}\n\n/* Misc */\n.bcv-card-deadline{font-size:11px;font-weight:700;color:#475569;padding:4px 0}\n.bcv-card-deadline.overdue{color:#dc2626;font-weight:800}\n.bcv-older-feedbacks{margin-top:8px;padding:8px;background:#fafbfc;border-radius:8px;border:1px solid #e2e8f0}\n.bcv-lb-close{position:fixed;top:16px;right:20px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:100000;backdrop-filter:blur(4px)}\n.bcv-lb-close:hover{background:rgba(255,255,255,.3);transform:scale(1.1)}\n" + `</style>`;

    if (isFullscreenHoanThanh) {
        c.innerHTML = styleBlock + `<div class="bcv-fs-page" id="bcvPage">
    <div class="bcv-fs-hero">
        <div class="bcv-fs-title-box">
            <h2>📋 DANH SÁCH CÔNG VIỆC HOÀN THÀNH <span class="bcv-fs-title-badge">FULL-SCREEN</span></h2>
            <div class="bcv-fs-sub">Tổng hợp tất cả báo cáo & kết quả công việc đã hoàn tất 🌿</div>
        </div>
        <div class="bcv-fs-actions">
            <div class="bcv-fs-segmented">
                <button class="bcv-fs-tab-btn ${(!_bcv.hoanThanhTab || _bcv.hoanThanhTab === 'all') ? 'active' : ''}" data-ht-tab="all" onclick="_bcvSwitchHoanThanhTab('all')">🌐 Tất cả</button>
                <button class="bcv-fs-tab-btn ${_bcv.hoanThanhTab === 'ban_giao' ? 'active' : ''}" data-ht-tab="ban_giao" onclick="_bcvSwitchHoanThanhTab('ban_giao')">📦 CV Bàn Giao</button>
                <button class="bcv-fs-tab-btn ${_bcv.hoanThanhTab === 'me' ? 'active' : ''}" data-ht-tab="me" onclick="_bcvSwitchHoanThanhTab('me')">👤 CV Của Tôi</button>
            </div>
            <button class="bcv-fs-back-btn" onclick="_bcvNavigateToBoard('/bangcongviec')">
                ← Quay lại Bảng Công Việc
            </button>
        </div>
    </div>

    <div class="bcv-fs-filter-card" id="bcvFilters">
        <div class="bcv-fs-filter-group">
            <input class="bcv-fs-search" id="bcvSearch" placeholder="Tìm theo tên task..." oninput="_bcvDebounceSearch()">
            ${isDirector ? `<select class="bcv-fs-select" id="bcvFilterDept" onchange="_bcvApplyFilters()"><option value="">Tất cả phòng</option></select>` : ''}
            <select class="bcv-fs-select" id="bcvFilterAssignee" onchange="_bcvApplyFilters()"><option value="">Tất cả người</option></select>
            <select class="bcv-fs-select" id="bcvFilterPriority" onchange="_bcvApplyFilters()">
                <option value="">Mọi ưu tiên</option>
                <option value="cao">🔴 Cao</option>
                <option value="trung_binh">🟠 Trung bình</option>
                <option value="thap">🟢 Thấp</option>
            </select>
        </div>
        <div class="bcv-fs-date-box">
            <span class="bcv-fs-date-lbl">📅 Thời gian:</span>
            <div class="bcv-ht-filter-box" id="bcvHoanThanhFilterBox" style="margin:0;min-width:220px"></div>
        </div>
    </div>

    <div class="bcv-fs-container">
        <div class="bcv-fs-section-hdr">
            <div class="bcv-fs-section-title">✨ BẢNG TỔNG HỢP CÔNG VIỆC ĐÃ HOÀN THÀNH</div>
            <span class="bcv-fs-count-badge" id="bcvCountHoanThanh">0</span>
        </div>
        <div class="bcv-fs-grid" id="bcvColHoanThanh"></div>
    </div>
</div>`;
        await _bcvLoadData();
        return;
    }

    c.innerHTML = styleBlock + `<div class="bcv-page" id="bcvPage">
    <div class="bcv-header">
        <h2>📋 Bảng Công Việc</h2>
        <div class="bcv-header-sub">Xin chào, <strong>${_esc(greeting)}</strong> 🌿 — kéo thả thẻ để đổi trạng thái.</div>
        <div class="bcv-top-bar">
            <div class="bcv-tabs">
                <button class="bcv-tab ${defaultTab === 'deadline' ? 'active' : ''}" data-tab="deadline" onclick="_bcvSwitchTab('deadline')">📊 Tỉ Lệ Hoàn Thành Deadline</button>
                <button class="bcv-tab ${defaultTab === 'me' ? 'active' : ''}" data-tab="me" onclick="_bcvSwitchTab('me')">Công Việc Của Tôi</button>
                ${isManager ? `<button class="bcv-tab ${defaultTab === 'ban_giao' ? 'active' : ''}" data-tab="ban_giao" onclick="_bcvSwitchTab('ban_giao')">Công Việc Bàn Giao</button>` : ''}
                ${isManager ? `<button class="bcv-tab ${defaultTab === 'tu_lieu' ? 'active' : ''}" data-tab="tu_lieu" onclick="_bcvSwitchTab('tu_lieu')">📚 Tư Liệu</button>` : ''}
            </div>
            <div id="bcvHeaderActionBtns" style="display:flex;gap:8px;align-items:center">
                ${isDirector ? '<button class="bcv-btn-config" onclick="_bcvShowConfig()">⚙️ Cài đặt phòng ban</button>' : ''}
                ${isManager ? '<button class="bcv-btn-create" onclick="_bcvShowCreate()">＋ Tạo task mới</button>' : ''}
            </div>
        </div>
    </div>

    <div class="bcv-filters" id="bcvFilters">
        <input class="bcv-search" id="bcvSearch" placeholder="Tìm theo tên task..." oninput="_bcvDebounceSearch()">
        ${isDirector ? `<select class="bcv-filter-sel" id="bcvFilterDept" onchange="_bcvApplyFilters()"><option value="">Tất cả phòng</option></select>` : ''}
        <select class="bcv-filter-sel" id="bcvFilterAssignee" onchange="_bcvApplyFilters()"><option value="">Tất cả người</option></select>
        <select class="bcv-filter-sel" id="bcvFilterPriority" onchange="_bcvApplyFilters()">
            <option value="">Mọi ưu tiên</option>
            <option value="cao">🔴 Cao</option>
            <option value="trung_binh">🟠 Trung bình</option>
            <option value="thap">🟢 Thấp</option>
        </select>
    </div>

    <div class="bcv-board" id="bcvBoard">
        <div class="bcv-col" data-status="can_lam">
            <div class="bcv-col-header">CẦN LÀM <span class="bcv-col-count" id="bcvCountCanLam">0</span></div>
            <div class="bcv-col-body" id="bcvColCanLam" ondragover="_bcvDragOver(event)" ondrop="_bcvDrop(event,'can_lam')" ondragleave="_bcvDragLeave(event)"></div>
        </div>
        <div class="bcv-col" data-status="dang_lam">
            <div class="bcv-col-header">ĐANG LÀM <span class="bcv-col-count" id="bcvCountDangLam">0</span></div>
            <div class="bcv-col-body" id="bcvColDangLam" ondragover="_bcvDragOver(event)" ondrop="_bcvDrop(event,'dang_lam')" ondragleave="_bcvDragLeave(event)"></div>
        </div>
        <div class="bcv-col" data-status="cho_duyet">
            <div class="bcv-col-header">CHỜ DUYỆT <span class="bcv-col-count" id="bcvCountChoDuyet">0</span></div>
            <div class="bcv-col-body" id="bcvColChoDuyet" ondragover="_bcvDragOver(event)" ondrop="_bcvDrop(event,'cho_duyet')" ondragleave="_bcvDragLeave(event)"></div>
        </div>
        <div class="bcv-col" data-status="hoan_thanh">
            <div class="bcv-col-header" style="flex-direction:column;align-items:stretch;gap:4px;padding-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div style="display:flex;align-items:center;gap:6px">
                        <span>HOÀN THÀNH</span>
                        <button class="bcv-btn-expand" onclick="_bcvNavigateToFullscreen()" title="Mở to trang Hoàn Thành">⛶ Mở to</button>
                    </div>
                    <span class="bcv-col-count" id="bcvCountHoanThanh">0</span>
                </div>
                <div class="bcv-ht-filter-box" id="bcvHoanThanhFilterBox"></div>
            </div>
            <div class="bcv-col-body" id="bcvColHoanThanh" ondragover="_bcvDragOver(event)" ondrop="_bcvDrop(event,'hoan_thanh')" ondragleave="_bcvDragLeave(event)"></div>
        </div>
    </div>
</div>`;

    await _bcvLoadData();
    if (!isFullscreenHoanThanh) {
        await _bcvSwitchTab(defaultTab);
    }
}

// ========== DATA LOADING ==========

async function _bcvLoadData() {
    try {
        var user = window._currentUser || {};
        var isDirector = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);

        // Load config (departments)
        var configRes = await _bcvApi('/api/board-config');
        _bcv.departments = (configRes && configRes.departments) || [];
        _bcv.enabledDepts = _bcv.departments.filter(function(d) { return d.board_enabled; });
        _bcvPopulateDeptFilter();

        // Load users for filters
        var usersRes = await _bcvApi('/api/board-tasks/users');
        _bcv.users = (usersRes && usersRes.users) || [];

        // Load documents for title mapping across board
        var docsRes = await _bcvApi('/api/board-documents');
        _bcv.documents = (docsRes && docsRes.documents) || [];

        // Populate user filter
        _bcvPopulateUserFilter();

        // Load tasks
        await _bcvLoadTasks();
    } catch(e) {
        console.error('[BCV] loadData error:', e);
    }
}

// ========== HOÀN THÀNH COLUMN FILTER FUNCTIONS ==========

function _bcvGetHoanThanhDateRange() {
    var filter = (_bcv && _bcv.hoanThanhFilter) || {};
    var mode = filter.mode || 'thang_truoc_va_nay';

    var now = (typeof _bcvGetVNNow === 'function') ? _bcvGetVNNow() : new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth(); // 0-indexed (0=Jan..11=Dec)

    var fromStr = '';
    var toStr = '';

    function pad2(n) { return String(n).padStart(2, '0'); }

    if (mode === 'thang_truoc_va_nay') {
        var prevMonthDate = new Date(curYear, curMonth - 1, 1);
        var pY = prevMonthDate.getFullYear();
        var pM = prevMonthDate.getMonth() + 1;

        var lastDayCurMonth = new Date(curYear, curMonth + 1, 0).getDate();
        var cY = curYear;
        var cM = curMonth + 1;

        fromStr = pY + '-' + pad2(pM) + '-01 00:00:00';
        toStr = cY + '-' + pad2(cM) + '-' + pad2(lastDayCurMonth) + ' 23:59:59';
    } else if (mode === 'thang_nay') {
        var cY = curYear;
        var cM = curMonth + 1;
        var lastDay = new Date(cY, cM, 0).getDate();
        fromStr = cY + '-' + pad2(cM) + '-01 00:00:00';
        toStr = cY + '-' + pad2(cM) + '-' + pad2(lastDay) + ' 23:59:59';
    } else if (mode === 'thang_truoc') {
        var prevMonthDate = new Date(curYear, curMonth - 1, 1);
        var pY = prevMonthDate.getFullYear();
        var pM = prevMonthDate.getMonth() + 1;
        var lastDayPrev = new Date(pY, pM, 0).getDate();
        fromStr = pY + '-' + pad2(pM) + '-01 00:00:00';
        toStr = pY + '-' + pad2(pM) + '-' + pad2(lastDayPrev) + ' 23:59:59';
    } else if (mode === 'quy_nay') {
        var q = Math.floor(curMonth / 3) + 1;
        var startM = (q - 1) * 3 + 1;
        var endM = q * 3;
        var lastD = new Date(curYear, endM, 0).getDate();
        fromStr = curYear + '-' + pad2(startM) + '-01 00:00:00';
        toStr = curYear + '-' + pad2(endM) + '-' + pad2(lastD) + ' 23:59:59';
    } else if (mode === 'quy_truoc') {
        var curQ = Math.floor(curMonth / 3) + 1;
        var q = curQ === 1 ? 4 : curQ - 1;
        var y = curQ === 1 ? curYear - 1 : curYear;
        var startM = (q - 1) * 3 + 1;
        var endM = q * 3;
        var lastD = new Date(y, endM, 0).getDate();
        fromStr = y + '-' + pad2(startM) + '-01 00:00:00';
        toStr = y + '-' + pad2(endM) + '-' + pad2(lastD) + ' 23:59:59';
    } else if (mode === 'nam') {
        var y = Number(filter.year) || curYear;
        fromStr = y + '-01-01 00:00:00';
        toStr = y + '-12-31 23:59:59';
    } else if (mode === 'thang') {
        var y = Number(filter.year) || curYear;
        var m = Number(filter.month) || (curMonth + 1);
        var lastDay = new Date(y, m, 0).getDate();
        fromStr = y + '-' + pad2(m) + '-01 00:00:00';
        toStr = y + '-' + pad2(m) + '-' + pad2(lastDay) + ' 23:59:59';
    } else if (mode === 'quy') {
        var y = Number(filter.year) || curYear;
        var q = Number(filter.quarter) || (Math.floor(curMonth / 3) + 1);
        var startM = (q - 1) * 3 + 1;
        var endM = q * 3;
        var lastD = new Date(y, endM, 0).getDate();
        fromStr = y + '-' + pad2(startM) + '-01 00:00:00';
        toStr = y + '-' + pad2(endM) + '-' + pad2(lastD) + ' 23:59:59';
    } else if (mode === 'ngay') {
        if (filter.fromDate) fromStr = filter.fromDate + ' 00:00:00';
        if (filter.toDate) toStr = filter.toDate + ' 23:59:59';
    } else if (mode === 'tat_ca') {
        fromStr = '';
        toStr = '';
    }

    return { from: fromStr, to: toStr };
}

function _bcvRenderHoanThanhFilterUI() {
    var container = document.getElementById('bcvHoanThanhFilterBox');
    if (!container) return;

    var filter = (_bcv && _bcv.hoanThanhFilter) || {};
    var mode = filter.mode || 'thang_truoc_va_nay';
    var now = (typeof _bcvGetVNNow === 'function') ? _bcvGetVNNow() : new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth();

    var html = `
        <select class="bcv-ht-select" id="bcvHTMode" onchange="_bcvOnHTModeChange(this.value)">
            <option value="thang_truoc_va_nay" ${mode === 'thang_truoc_va_nay' ? 'selected' : ''}>📅 Tháng trước & tháng này</option>
            <option value="thang_nay" ${mode === 'thang_nay' ? 'selected' : ''}>🗓️ Tháng này</option>
            <option value="thang_truoc" ${mode === 'thang_truoc' ? 'selected' : ''}>🗓️ Tháng trước</option>
            <option value="quy_nay" ${mode === 'quy_nay' ? 'selected' : ''}>📊 Quý này</option>
            <option value="quy_truoc" ${mode === 'quy_truoc' ? 'selected' : ''}>📊 Quý trước</option>
            <option value="thang" ${mode === 'thang' ? 'selected' : ''}>🗓️ Chọn Tháng...</option>
            <option value="quy" ${mode === 'quy' ? 'selected' : ''}>🏢 Chọn Quý...</option>
            <option value="nam" ${mode === 'nam' ? 'selected' : ''}>📈 Chọn Năm...</option>
            <option value="ngay" ${mode === 'ngay' ? 'selected' : ''}>📆 Chọn ngày (Từ - Đến)</option>
            <option value="tat_ca" ${mode === 'tat_ca' ? 'selected' : ''}>🌐 Tất cả thời gian</option>
        </select>
    `;

    var subHtml = '';
    if (mode === 'nam') {
        var yearOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yearOpts += `<option value="${y}" ${filter.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subHtml = `<div class="bcv-ht-sub-inputs"><select class="bcv-ht-select" style="flex:1" onchange="_bcvOnHTSubChange('year', this.value)">${yearOpts}</select></div>`;
    } else if (mode === 'thang') {
        var monthOpts = '';
        for (var m = 1; m <= 12; m++) {
            monthOpts += `<option value="${m}" ${filter.month == m ? 'selected' : ''}>Tháng ${m}</option>`;
        }
        var yearOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yearOpts += `<option value="${y}" ${filter.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subHtml = `<div class="bcv-ht-sub-inputs">
            <select class="bcv-ht-select" style="flex:1" onchange="_bcvOnHTSubChange('month', this.value)">${monthOpts}</select>
            <select class="bcv-ht-select" style="flex:1" onchange="_bcvOnHTSubChange('year', this.value)">${yearOpts}</select>
        </div>`;
    } else if (mode === 'quy') {
        var curQ = Math.floor(curMonth / 3) + 1;
        var qVal = filter.quarter || curQ;
        var quarterOpts = '';
        for (var q = 1; q <= 4; q++) {
            quarterOpts += `<option value="${q}" ${qVal == q ? 'selected' : ''}>Quý ${q}</option>`;
        }
        var yearOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yearOpts += `<option value="${y}" ${filter.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subHtml = `<div class="bcv-ht-sub-inputs">
            <select class="bcv-ht-select" style="flex:1" onchange="_bcvOnHTSubChange('quarter', this.value)">${quarterOpts}</select>
            <select class="bcv-ht-select" style="flex:1" onchange="_bcvOnHTSubChange('year', this.value)">${yearOpts}</select>
        </div>`;
    } else if (mode === 'ngay') {
        subHtml = `<div class="bcv-ht-sub-inputs">
            <input type="date" class="bcv-ht-input" style="flex:1" value="${filter.fromDate || ''}" placeholder="Từ ngày" onchange="_bcvOnHTSubChange('fromDate', this.value)">
            <input type="date" class="bcv-ht-input" style="flex:1" value="${filter.toDate || ''}" placeholder="Đến ngày" onchange="_bcvOnHTSubChange('toDate', this.value)">
        </div>`;
    }

    var isDirectorRole = (window._currentUser && window._currentUser.role === 'giam_doc');
    var readFilterVal = (_bcv && (_bcv.readFilter || _bcv.directorReadFilter)) || 'all';

    var readFilterHtml = `
        <div style="margin-top:4px">
            <select class="bcv-ht-select" id="bcvReadFilterSelect" onchange="_bcvOnReadFilterChange(this.value)" style="border-color:#cbd5e1;color:#1e293b;font-weight:700;background:#f8fafc">
                <option value="all" ${readFilterVal === 'all' ? 'selected' : ''}>👁️ Tất cả (Đã đọc & Chưa xem)</option>
                <option value="unread" ${readFilterVal === 'unread' ? 'selected' : ''}>🔴 Tôi Chưa Xem</option>
                <option value="read" ${readFilterVal === 'read' ? 'selected' : ''}>🟢 Tôi Đã Đọc</option>
                ${isDirectorRole ? `
                    <option value="director_unread" ${readFilterVal === 'director_unread' ? 'selected' : ''}>🔴 Giám Đốc Chưa Xem</option>
                    <option value="director_read" ${readFilterVal === 'director_read' ? 'selected' : ''}>🟢 Giám Đốc Đã Đọc</option>
                ` : ''}
            </select>
        </div>
    `;

    container.innerHTML = html + subHtml + readFilterHtml;
}

function _bcvOnReadFilterChange(val) {
    if (!_bcv) _bcv = {};
    _bcv.readFilter = val;
    _bcv.directorReadFilter = val;
    _bcvRenderBoard();
}

function _bcvOnHTModeChange(val) {
    if (!_bcv.hoanThanhFilter) _bcv.hoanThanhFilter = {};
    _bcv.hoanThanhFilter.mode = val;
    _bcvRenderHoanThanhFilterUI();
    _bcvLoadTasks();
}

function _bcvOnHTSubChange(key, val) {
    if (!_bcv.hoanThanhFilter) _bcv.hoanThanhFilter = {};
    _bcv.hoanThanhFilter[key] = val;
    _bcvLoadTasks();
}

function _bcvSwitchHoanThanhTab(tabVal) {
    _bcv.hoanThanhTab = tabVal;
    document.querySelectorAll('[data-ht-tab]').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-ht-tab') === tabVal);
    });
    _bcvLoadTasks();
}

async function _bcvLoadTasks() {
    var params = new URLSearchParams();

    var curPath = window.location.pathname.toLowerCase();
    var isFullscreenHoanThanh = curPath.includes('/hoanthanh') || curPath.includes('/hoan-thanh');

    if (isFullscreenHoanThanh) {
        params.set('tab', _bcv.hoanThanhTab || 'all');
    } else {
        params.set('tab', _bcv.tab);
    }

    if (_bcv.filters.search) params.set('search', _bcv.filters.search);
    if (_bcv.filters.assigned_to) params.set('assigned_to', _bcv.filters.assigned_to);
    if (_bcv.filters.department_id) params.set('department_id', _bcv.filters.department_id);
    if (_bcv.filters.priority) params.set('priority', _bcv.filters.priority);

    var htRange = _bcvGetHoanThanhDateRange();
    if (htRange.from) params.set('hoan_thanh_from', htRange.from);
    if (htRange.to) params.set('hoan_thanh_to', htRange.to);

    var res = await _bcvApi('/api/board-tasks?' + params.toString());
    _bcv.tasks = (res && res.tasks) || [];
    _bcvRenderBoard();
    _bcvRenderHoanThanhFilterUI();
}

function _bcvRenderBoard() {
    var cols = {
        can_lam: [],
        dang_lam: [],
        cho_duyet: [],
        hoan_thanh: []
    };

    var htRange = _bcvGetHoanThanhDateRange();
    var fromTime = htRange.from ? new Date(htRange.from.replace(' ', 'T')).getTime() : 0;
    var toTime = htRange.to ? new Date(htRange.to.replace(' ', 'T')).getTime() : Infinity;

    var readFilter = (_bcv && (_bcv.readFilter || _bcv.directorReadFilter)) || 'all';

    _bcv.tasks.forEach(function(t) {
        if (t.status === 'hoan_thanh') {
            var passReadFilter = true;
            if (readFilter === 'unread' && t.my_read) passReadFilter = false;
            if (readFilter === 'read' && !t.my_read) passReadFilter = false;
            if (readFilter === 'director_unread' && t.director_read) passReadFilter = false;
            if (readFilter === 'director_read' && !t.director_read) passReadFilter = false;

            if (passReadFilter) {
                if (fromTime || toTime < Infinity) {
                    var taskDateStr = t.completed_at || t.updated_at || t.created_at;
                    var taskTime = taskDateStr ? new Date(taskDateStr).getTime() : 0;
                    if (taskTime >= fromTime && taskTime <= toTime) {
                        cols.hoan_thanh.push(t);
                    }
                } else {
                    cols.hoan_thanh.push(t);
                }
            }
        } else if (cols[t.status]) {
            cols[t.status].push(t);
        }
    });

    // Sort 'dang_lam' column: rejected tasks first (at the very top), then by ID descending
    cols.dang_lam.sort(function(a, b) {
        var aRejected = !!(a.feedback_content && a.feedback_content.trim());
        var bRejected = !!(b.feedback_content && b.feedback_content.trim());
        if (aRejected && !bRejected) return -1;
        if (!aRejected && bRejected) return 1;
        return (b.id - a.id);
    });

    // Sort 'hoan_thanh' column: completed_at descending (newest completed on top)
    cols.hoan_thanh.sort(function(a, b) {
        var aTime = a.completed_at ? new Date(a.completed_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : a.id);
        var bTime = b.completed_at ? new Date(b.completed_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : b.id);
        return bTime - aTime;
    });

    Object.keys(cols).forEach(function(status) {
        var colId = 'bcvCol' + _bcvStatusToId(status);
        var countId = 'bcvCount' + _bcvStatusToId(status);
        var el = document.getElementById(colId);
        var countEl = document.getElementById(countId);
        if (!el) return;

        if (countEl) countEl.textContent = cols[status].length;

        if (cols[status].length === 0) {
            if (status === 'hoan_thanh' && _bcv.tab === 'me') {
                el.innerHTML = '<div class="bcv-col-empty">Trống (Công Việc Của Tôi)<br><a href="javascript:void(0)" onclick="_bcvSwitchTab(\'ban_giao\')" style="color:#2563eb;font-weight:700;margin-top:6px;display:inline-block;font-size:11px">👉 Xem Công Việc Bàn Giao</a></div>';
            } else {
                el.innerHTML = '<div class="bcv-col-empty">Trống</div>';
            }
            return;
        }

        if (status === 'hoan_thanh') {
            var groups = {};
            var docOrder = [];

            cols.hoan_thanh.forEach(function(t) {
                var cat = _bcvGetTaskDocCategory(t);
                if (!groups[cat]) {
                    groups[cat] = [];
                    docOrder.push(cat);
                }
                groups[cat].push(t);
            });

            docOrder.sort(function(a, b) {
                if (a === '📌 Công Việc Lẻ') return 1;
                if (b === '📌 Công Việc Lẻ') return -1;
                return a.localeCompare(b, 'vi', { numeric: true });
            });

            var isFS = el.classList.contains('bcv-fs-grid');

            var html = docOrder.map(function(cat) {
                var catTasks = groups[cat];
                var isLe = (cat === '📌 Công Việc Lẻ');

                var visibleTasks = catTasks.slice(0, 5);
                var extraCount = catTasks.length - 5;

                var codeBadges = visibleTasks.map(function(t) {
                    var code = _bcvGetTaskCode(t);
                    return '<span style="background:' + (isLe ? '#f1f5f9' : '#ede9fe') + ';color:' + (isLe ? '#334155' : '#6b21a8') + ';padding:3px 8px;border-radius:6px;font-weight:800;font-size:11px;border:1px solid ' + (isLe ? '#cbd5e1' : '#d8b4fe') + '">📌 ' + _esc(code) + '</span>';
                }).join(' ');

                if (extraCount > 0) {
                    var allCodes = catTasks.map(function(t) { return _bcvGetTaskCode(t); }).join(', ');
                    codeBadges += ' <span title="Tất cả mã công việc: ' + _escAttr(allCodes) + '" style="background:' + (isLe ? '#e2e8f0' : '#ddd6fe') + ';color:' + (isLe ? '#1e293b' : '#5b21b6') + ';padding:3px 10px;border-radius:6px;font-weight:900;font-size:11px;border:1px solid ' + (isLe ? '#cbd5e1' : '#c4b5fd') + ';cursor:help">+ ' + extraCount + ' task khác...</span>';
                }

                var bgGradient = isLe
                    ? 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)'
                    : 'linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%)';
                var borderClr = isLe ? '#cbd5e1' : '#d8b4fe';
                var titleClr = isLe ? '#334155' : '#6b21a8';
                var badgeBg = isLe ? '#475569' : '#7c3aed';

                var gridStyle = isFS
                    ? 'padding:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px'
                    : 'padding:12px;display:flex;flex-direction:column;gap:12px';

                return '<div style="margin-bottom:20px;background:' + (isLe ? '#ffffff' : '#faf5ff') + ';border:1.5px solid ' + borderClr + ';border-radius:14px;overflow:hidden;box-shadow:0 4px 14px ' + (isLe ? 'rgba(0,0,0,0.04)' : 'rgba(107,33,168,0.06)') + ';' + (isFS ? 'grid-column:1/-1' : '') + '">'
                    + '<div style="background:' + bgGradient + ';padding:12px 18px;border-bottom:1px solid ' + borderClr + ';display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">'
                    + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
                    + '<span style="font-size:14px;font-weight:900;color:' + titleClr + '">' + _esc(cat) + '</span>'
                    + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + codeBadges + '</div>'
                    + '</div>'
                    + '<span style="background:' + badgeBg + ';color:#ffffff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px ' + (isLe ? 'rgba(71,85,105,0.3)' : 'rgba(124,58,237,0.3)') + '">'
                    + catTasks.length + ' công việc'
                    + '</span>'
                    + '</div>'
                    + '<div style="' + gridStyle + '">'
                    + catTasks.map(function(t) { return _bcvRenderCard(t); }).join('')
                    + '</div>'
                    + '</div>';
            }).join('');

            el.innerHTML = html;
        } else {
            el.innerHTML = cols[status].map(function(t) {
                return _bcvRenderCard(t);
            }).join('');
        }
    });
}

// Get current date/time in Vietnam Timezone (Asia/Ho_Chi_Minh GMT+7)
function _bcvGetVNNow() {
    var d = new Date();
    var formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var parts = formatter.formatToParts(d);
    var p = {};
    parts.forEach(function(part) { p[part.type] = part.value; });
    var hr = (p.hour === '24' || p.hour === '24:00') ? '00' : p.hour;
    return new Date(p.year + '-' + p.month + '-' + p.day + 'T' + hr + ':' + p.minute + ':' + p.second + '+07:00');
}

// Validate and normalize URL (Google Sheets, Drive, Docs, Website links)
function _bcvNormalizeAndValidateUrl(str) {
    if (!str || !str.trim()) return { isValid: true, url: '' };
    var s = str.trim();

    // Auto prepend https:// if starts with www. or contains domain pattern like docs.google.com, drive.google.com, etc.
    if (!/^https?:\/\//i.test(s)) {
        if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s) || /^docs\.google\.com/i.test(s) || /^drive\.google\.com/i.test(s)) {
            s = 'https://' + s;
        }
    }

    // Strict URL validation
    try {
        var parsed = new URL(s);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            if (parsed.hostname.includes('.') || parsed.hostname === 'localhost') {
                return { isValid: true, url: s };
            }
        }
    } catch(e) {}

    return { isValid: false, url: str };
}

// Format date to Vietnam Timezone display string
function _bcvFormatVNTime(dateStr, showTime) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
    
    var formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
    var parts = formatter.formatToParts(d);
    var p = {};
    parts.forEach(function(part) { p[part.type] = part.value; });

    var hr = (p.hour === '24' || p.hour === '24:00') ? '00' : p.hour;
    var vnDate = new Date(p.year + '-' + p.month + '-' + p.day + 'T12:00:00+07:00');
    var dayName = daysArr[vnDate.getDay()];
    var dd = String(p.day).padStart(2,'0');
    var mm = String(p.month).padStart(2,'0');
    var hh = String(hr).padStart(2,'0');
    var mi = String(p.minute).padStart(2,'0');

    if (showTime) {
        return dayName + ' - ' + dd + '/' + mm + ' ' + hh + ':' + mi;
    }
    return dayName + ' - ' + dd + '/' + mm;
}

function _bcvRenderCard(t) {
    var now = _bcvGetVNNow();
    var dlDate = t.deadline ? new Date(t.deadline + 'T23:59:59+07:00') : null;
    var isOverdue = dlDate && dlDate < now && t.status !== 'hoan_thanh';
    var isRejected = (t.status === 'dang_lam') && !!(t.feedback_content && t.feedback_content.trim());
    var progress = Number(t.progress || 0);
    var creatorName = t.created_by_name || '?';
    var assigneeName = t.assigned_to_name || 'Chưa giao';
    var commentCount = Number(t.comment_count || 0);

    // CV-MKT-01 format
    var cvId = _bcvGetTaskCode(t);

    // Deadline with full day of week in VN timezone
    var deadlineDisplay = '';
    var overdueDays = 0;
    if (dlDate) {
        deadlineDisplay = _bcvFormatVNTime(t.deadline, false);
        if (isOverdue) {
            var dlMidnight = new Date(t.deadline + 'T00:00:00+07:00');
            var formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
            var parts = formatter.formatToParts(now);
            var p = {}; parts.forEach(function(pt) { p[pt.type] = pt.value; });
            var nowMidnight = new Date(p.year + '-' + p.month + '-' + p.day + 'T00:00:00+07:00');
            var diff = nowMidnight.getTime() - dlMidnight.getTime();
            overdueDays = Math.max(1, Math.floor(diff / (1000*60*60*24)));
        }
    }

    // Created date with day of week = Ngày Bàn Giao (VN timezone)
    var createdDisplay = _bcvFormatVNTime(t.created_at, true);

    // Format accepted_at for card (VN timezone)
    var acceptedDisplay = _bcvFormatVNTime(t.accepted_at, true);

    // Format completed_at for card (VN timezone) - only for hoan_thanh tasks
    var completedDisplay = (t.status === 'hoan_thanh') ? _bcvFormatVNTime(t.completed_at || t.updated_at, true) : '';

    // Read status tag for current user (ONLY show for Giám đốc / Admin & Lê Việt Trinh in "Công Việc Bàn Giao" tab)
    var currentUser = window._currentUser || {};
    var isAllowedReadStatusUser = _bcvCanSeeReadStatus(currentUser);

    var readStatusTag = '';
    if (_bcv.tab === 'ban_giao' && isAllowedReadStatusUser) {
        if (t.director_read || t.my_read) {
            readStatusTag = `<span class="bcv-tag" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-weight:800;font-size:10px;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:2px" title="Giám đốc / Quản lý đã đọc">👁️ GĐ ĐÃ ĐỌC</span>`;
        } else {
            readStatusTag = `<span class="bcv-tag" style="background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;font-weight:800;font-size:10px;padding:2px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:3px" title="Bạn chưa đánh dấu đã đọc">🔴 CHƯA XEM</span>`;
        }
    }

    return `<div class="bcv-card${isRejected ? ' bcv-card-rejected' : (isOverdue ? ' bcv-card-overdue' : '')}" draggable="true" data-task-id="${t.id}"
        ondragstart="_bcvDragStart(event,${t.id})" ondragend="_bcvDragEnd(event)"
        onclick="_bcvShowDetail(${t.id})">
        <div class="bcv-card-meta">
            <span class="bcv-card-id">${cvId}</span>
            <div style="display:flex;align-items:center;gap:4px">
                ${readStatusTag}
            </div>
        </div>
        <div class="bcv-card-tags">
            ${isRejected ? `<span class="bcv-tag-rejected-flash">❌ KHÔNG DUYỆT</span>` : ''}
            <span class="bcv-tag bcv-tag-${t.task_type}">${t.task_type === 'chinh' ? '🔵 Chính' : '🟡 Phụ'}</span>
            <span class="bcv-tag bcv-tag-${t.priority}">${t.priority === 'cao' ? '🔴 Cao' : t.priority === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp'}</span>
            ${t.ads_linh_vuc ? `<span class="bcv-tag" style="background:#e0e7ff;color:#4338ca;border:1px solid #c7d2fe;font-weight:800">🏢 Ads: ${_esc(t.ads_linh_vuc)}</span>` : ''}
            ${t.target_quantity ? `<span class="bcv-tag" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-weight:800">🔢 SL: ${t.target_quantity}</span>` : ''}
        </div>
        <div class="bcv-card-title">${_esc(t.title)}</div>
        <div class="bcv-card-progress"><div class="bcv-card-progress-bar" style="width:${progress}%"></div></div>
        <div class="bcv-card-progress-text">${progress}%</div>
        <div class="bcv-card-info-box">
            <div class="bcv-card-info-row">
                <span class="info-icon">📤</span>
                <span class="info-label">Bàn giao</span>
                <span class="info-value">${createdDisplay}</span>
            </div>
            ${acceptedDisplay ? `<div class="bcv-card-info-row" style="background:#ecfdf5">
                <span class="info-icon">📥</span>
                <span class="info-label">Nhận việc</span>
                <span class="info-value" style="color:#065f46">${acceptedDisplay}</span>
            </div>` : ''}
            ${deadlineDisplay ? `<div class="bcv-card-info-row${isOverdue ? ' overdue' : ''}">
                <span class="info-icon">${isOverdue ? '⚠️' : '📅'}</span>
                <span class="info-label">Deadline</span>
                <span class="info-value">${deadlineDisplay}</span>
                ${isOverdue ? `<span class="bcv-card-overdue-days">Chậm ${overdueDays} ngày!</span>` : ''}
            </div>` : ''}
            ${completedDisplay ? `<div class="bcv-card-info-row" style="background:#f0fdf4">
                <span class="info-icon">✅</span>
                <span class="info-label" style="color:#16a34a">Hoàn thành</span>
                <span class="info-value" style="color:#15803d;font-weight:800">${completedDisplay}</span>
            </div>` : ''}
        </div>
        <div class="bcv-card-footer">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:10px;font-weight:700;margin-top:6px">
                <span style="color:#64748b">Giao:</span>
                <span style="color:#1e293b">${_esc(creatorName)}</span>
                <span style="color:#3b82f6;font-size:12px">➡</span>
                <span style="color:#64748b">Nhận:</span>
                <span style="color:#16a34a">${_esc(assigneeName)}</span>
            </div>
            <div class="bcv-card-bottom">
                ${commentCount > 0 ? `<div class="bcv-card-comments">💬 ${commentCount}</div>` : ''}
            </div>
        </div>
    </div>`;
}

// ========== DRAG & DROP ==========

function _bcvDragStart(e, taskId) {
    _bcv.dragTaskId = taskId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
}

function _bcvDragEnd(e) {
    e.target.classList.remove('dragging');
    _bcv.dragTaskId = null;
    document.querySelectorAll('.bcv-col-body.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function _bcvDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function _bcvDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function _bcvDrop(e, newStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    var taskId = _bcv.dragTaskId || e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/status', 'PATCH', { status: newStatus });
        if (res && res.ok) {
            await _bcvLoadTasks();
        } else {
            alert(res?.error || 'Lỗi đổi trạng thái');
        }
    } catch(err) {
        alert('Lỗi: ' + err.message);
    }
}

// ========== TABS & FILTERS ==========



var _bcvSearchTimer = null;
function _bcvDebounceSearch() {
    clearTimeout(_bcvSearchTimer);
    _bcvSearchTimer = setTimeout(function() {
        _bcv.filters.search = (document.getElementById('bcvSearch') || {}).value || '';
        _bcvLoadTasks();
    }, 300);
}

function _bcvApplyFilters() {
    var deptEl = document.getElementById('bcvFilterDept');
    var assigneeEl = document.getElementById('bcvFilterAssignee');
    var priorityEl = document.getElementById('bcvFilterPriority');
    _bcv.filters.department_id = deptEl ? deptEl.value : '';
    _bcv.filters.assigned_to = assigneeEl ? assigneeEl.value : '';
    _bcv.filters.priority = priorityEl ? priorityEl.value : '';
    _bcvLoadTasks();
}

function _bcvPopulateDeptFilter() {
    var sel = document.getElementById('bcvFilterDept');
    if (!sel) return;
    var h = '<option value="">Tất cả phòng</option>';
    _bcv.enabledDepts.forEach(function(d) {
        h += `<option value="${d.id}">${_esc(d.name)}</option>`;
    });
    sel.innerHTML = h;
}

function _bcvPopulateUserFilter() {
    var sel = document.getElementById('bcvFilterAssignee');
    if (!sel) return;
    var h = '<option value="">Tất cả người</option>';
    _bcv.users.forEach(function(u) {
        h += `<option value="${u.id}">${_esc(u.full_name)}</option>`;
    });
    sel.innerHTML = h;
}

// ========== CREATE TASK MODAL ==========

function _bcvBuildAssigneeCheckboxes(users) {
    if (!users || users.length === 0) {
        return '<div style="font-size:12px;color:#94a3b8;font-style:italic">Không có nhân sự nào trong phòng ban</div>';
    }
    var html = '';
    users.forEach(function(u) {
        var label = _esc(u.full_name) + (u.department_name ? ' (' + _esc(u.department_name) + ')' : '');
        html += `<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;user-select:none;padding:3px 0">
            <input type="checkbox" class="bcv-assignee-cb" value="${u.id}" data-dept-id="${u.department_id || ''}" onchange="_bcvUpdateAssigneeCount()" style="width:16px;height:16px;cursor:pointer">
            <span>${label}</span>
        </label>`;
    });
    return html;
}

function _bcvUpdateAssigneeCount() {
    var cbs = document.querySelectorAll('.bcv-assignee-cb:checked');
    var el = document.getElementById('bcvAssigneeSelectedCount');
    if (el) {
        el.textContent = 'Đã chọn: ' + cbs.length + ' người';
    }

    if (cbs.length > 0) {
        var firstCb = cbs[0];
        var deptId = firstCb.getAttribute('data-dept-id');
        if (deptId) {
            var deptEl = document.getElementById('bcvCreateDept');
            if (deptEl && (!deptEl.value || String(deptEl.value) !== String(deptId))) {
                deptEl.value = deptId;
                _bcvCreateDeptChange();
            } else {
                var badge = document.getElementById('bcvCreateNextCodeBadge');
                if (badge && (badge.textContent.includes('—') || badge.textContent.includes('Chọn phòng ban'))) {
                    badge.textContent = '⌛ Đang tải mã...';
                    _bcvApi('/api/board-tasks/next-id?department_id=' + deptId).then(function(res) {
                        if (res && res.nextCode) {
                            badge.textContent = 'Mã: ' + res.nextCode;
                        }
                    });
                    _bcvLoadCreateDocs(deptId);
                }
            }
        }
    }
}

function _bcvToggleSelectAllAssignees(btn) {
    var cbs = document.querySelectorAll('.bcv-assignee-cb');
    if (!cbs || cbs.length === 0) return;
    var allChecked = Array.from(cbs).every(function(cb) { return cb.checked; });
    cbs.forEach(function(cb) { cb.checked = !allChecked; });
    _bcvUpdateAssigneeCount();
}

async function _bcvShowCreate() {
    var user = window._currentUser || {};
    var isDirector = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);

    if (isDirector) {
        if (!_bcv.enabledDepts || _bcv.enabledDepts.length === 0) {
            var configRes = await _bcvApi('/api/board-config');
            _bcv.departments = (configRes && configRes.departments) || [];
            _bcv.enabledDepts = _bcv.departments.filter(function(d) { return d.board_enabled; });
            _bcvPopulateDeptFilter();
        }
    }

    // Auto-detect default department from active board filter if available
    var activeDeptFilter = _bcv.selectedDeptId || (document.getElementById('bcvDeptFilter') || {}).value || '';
    var deptId = isDirector ? (activeDeptFilter || '') : (user.department_id || activeDeptFilter || '');

    // Load users for assignment
    var usersRes = await _bcvApi('/api/board-tasks/users' + (deptId ? '?department_id=' + deptId : ''));
    var users = (usersRes && usersRes.users) || [];

    var deptOptions = '';
    if (isDirector) {
        deptOptions = '<option value="">— Chọn phòng ban —</option>';
        (_bcv.enabledDepts || []).forEach(function(d) {
            var selected = String(d.id) === String(deptId) ? ' selected' : '';
            deptOptions += `<option value="${d.id}"${selected}>${_esc(d.name)}</option>`;
        });
    }

    // Fetch holidays for validation (dựa theo trang Setup Ngày Lễ /setupngayle)
    var holidaysRes = await _bcvApi('/api/penalty/holidays');
    var holidays = (holidaysRes && holidaysRes.holidays) || [];
    window._bcvHolidays = {};
    holidays.forEach(function(h) {
        var d = h.holiday_date ? h.holiday_date.split('T')[0] : '';
        if (d) window._bcvHolidays[d] = h.holiday_name || 'Ngày lễ';
    });

    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    var maxTaskId = 0;
    (_bcv.tasks || []).forEach(function(t) {
        var idNum = Number(t.id);
        if (!isNaN(idNum) && idNum > maxTaskId) maxTaskId = idNum;
    });
    var nextTaskCode = 'CV-' + String(maxTaskId + 1).padStart(3, '0');
    var initialDeptId = deptId || null;
    var initialBadgeText = initialDeptId ? '⌛ Đang tải mã...' : 'Mã: — Chọn phòng ban —';

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvOverlay';

    overlay.innerHTML = `<div class="bcv-modal">
        <div class="bcv-modal-header">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <h3 style="margin:0">＋ Tạo Task Mới</h3>
                <span id="bcvCreateNextCodeBadge" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:12px;font-weight:900;padding:4px 12px;border-radius:8px;box-shadow:0 2px 8px rgba(37,99,235,0.3);letter-spacing:0.5px">${initialBadgeText}</span>
            </div>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
        </div>
        <div class="bcv-modal-body">

            ${isDirector ? `<div class="bcv-form-group">
                <label>Phòng ban *</label>
                <select class="bcv-form-select" id="bcvCreateDept" onchange="_bcvCreateDeptChange()">${deptOptions}</select>
            </div>` : ''}
            <div class="bcv-form-group" id="bcvAssigneeWrap" style="display:${isDirector ? 'none' : 'block'}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                    <label style="margin:0">Giao cho *</label>
                    <button type="button" onclick="_bcvToggleSelectAllAssignees(this)" style="font-size:11px;font-weight:800;color:#2563eb;background:none;border:none;cursor:pointer;padding:0">☑️ Chọn tất cả / Bỏ chọn</button>
                </div>
                <div id="bcvAssigneeCheckboxList" style="max-height:160px;overflow-y:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:6px">
                    ${_bcvBuildAssigneeCheckboxes(users)}
                </div>
                <div id="bcvAssigneeSelectedCount" style="font-size:11px;font-weight:700;color:#059669;margin-top:4px">Đã chọn: 0 người</div>
            </div>
            <div class="bcv-form-group">
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:4px">📚 Chọn Tư Liệu Hướng Dẫn</label>
                <select class="bcv-form-select" id="bcvCreateDocMainCat" onchange="_bcvCreateDocMainCatChange()" style="margin-top:4px">
                    <option value="">— Chọn phòng ban trước —</option>
                </select>
                <select class="bcv-form-select" id="bcvCreateDocSubCat" onchange="_bcvCreateDocSubCatChange()" style="display:none;margin-top:6px">
                    <option value="">— Tất cả công việc —</option>
                </select>
                <div id="bcvCreateDocLinksPreview" style="margin-top:8px"></div>
                <input type="hidden" id="bcvCreateGuideLink" value="">
            </div>
            <!-- BỘ SƯU TẬP (Bắt buộc chọn riêng cho Chụp Ảnh / Tạo AI - BST) -->
            <div class="bcv-form-group" id="bcvCreateCollectionGroup" style="display:none;margin-top:12px;background:#eff6ff;padding:12px;border-radius:10px;border:1.5px solid #93c5fd">
                <label style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
                    📦 Chọn Bộ Sưu Tập * <span style="font-size:10px;font-weight:700;color:#dc2626">(Bắt buộc chọn Bộ Sưu Tập)</span>
                </label>
                <select class="bcv-form-select" id="bcvCreateCollectionSelect" onchange="_bcvCreateCollectionChange()" style="margin-top:6px;border:2px solid #2563eb;font-weight:700;background:#ffffff;max-width:100%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">
                    <option value="">— Chọn Bộ Sưu Tập —</option>
                </select>
            </div>
            <!-- KHO ADS LĨNH VỰC & SỐ LƯỢNG SẢN XUẤT (Bắt buộc chọn riêng cho Video / Ảnh Ads ở PHÒNG MARKETING) -->
            <div class="bcv-form-group" id="bcvCreateKhoAdsLinhVucGroup" style="display:none;margin-top:12px;background:#f5f3ff;padding:14px;border-radius:12px;border:1.5px solid #c7d2fe">
                <div style="margin-bottom:12px">
                    <label style="font-size:11px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
                        📦 Chọn Lĩnh Vực Ads * <span style="font-size:10px;font-weight:700;color:#dc2626">(Bắt buộc chọn Lĩnh Vực Ads)</span>
                    </label>
                    <select class="bcv-form-select" id="bcvCreateKhoAdsLinhVucSelect" onchange="_bcvCreateKhoAdsLinhVucChange()" style="margin-top:6px;border:2px solid #4338ca;font-weight:700;background:#ffffff;max-width:100%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">
                        <option value="">— Chọn Lĩnh Vực Ads —</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
                        🔢 Số Lượng Cần Sản Xuất * <span style="font-size:10px;font-weight:700;color:#dc2626">(Bắt buộc nhập số lượng)</span>
                    </label>
                    <input type="number" min="1" id="bcvCreateTargetQuantity" class="bcv-form-input" placeholder="Nhập số lượng cần sản xuất (ví dụ: 5, 10, 20...)" style="margin-top:6px;border:2px solid #4338ca;font-weight:700;background:#ffffff">
                </div>
            </div>
            <!-- LĨNH VỰC THIẾT KẾ MẪU - BST (Bắt buộc chọn riêng cho Tư Liệu 2 ở PHÒNG MARKETING) -->
            <div class="bcv-form-group" id="bcvCreateTuLieu2LinhVucGroup" style="display:none;margin-top:12px;background:#f0f9ff;padding:14px;border-radius:12px;border:1.5px solid #60a5fa">
                <div>
                    <label style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
                        📦 CHỌN LĨNH VỰC * <span style="font-size:10px;font-weight:700;color:#dc2626">(BẮT BUỘC CHỌN LĨNH VỰC)</span>
                    </label>
                    <select class="bcv-form-select" id="bcvCreateTuLieu2LinhVucSelect" onchange="_bcvCreateTuLieu2LinhVucChange()" style="margin-top:6px;border:2px solid #2563eb;font-weight:700;background:#ffffff;max-width:100%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">
                        <option value="">— Chọn Lĩnh Vực —</option>
                    </select>
                </div>
            </div>
            <div class="bcv-form-group" id="bcvSubTitleGroup" style="display:none">
                <label>Tiêu đề phụ * <span style="font-weight:400;color:#64748b;font-size:11px">(VD: BST 20, Áo Nhóm ABC...)</span></label>
                <input class="bcv-form-input" id="bcvCreateSubTitle" placeholder="Nhập tiêu đề phụ bắt buộc..." oninput="_bcvUpdateAutoTitle()" style="border:2px solid #f59e0b;background:#fffbeb">
            </div>
            <div class="bcv-form-group">
                <label>Tiêu đề * <span style="font-weight:400;color:#64748b;font-size:11px">(Tự động tạo)</span></label>
                <input class="bcv-form-input" id="bcvCreateTitle" placeholder="Nhập tiêu đề công việc...">
            </div>
            <div class="bcv-form-group">
                <label>Mô tả *</label>
                <textarea class="bcv-form-textarea" id="bcvCreateDesc" placeholder="Mô tả chi tiết công việc..."></textarea>
            </div>
            <div class="bcv-form-group">
                <label id="bcvCreateLinkLbl">🔗 Đường link công việc *</label>
                <input class="bcv-form-input" id="bcvCreateLink" placeholder="https://... hoặc đường dẫn liên quan">
            </div>
            <div class="bcv-form-row">
                <div class="bcv-form-group">
                    <label>Loại *</label>
                    <select class="bcv-form-select" id="bcvCreateType">
                        <option value="">— Chọn loại —</option>
                        <option value="chinh">🔵 Chính</option>
                        <option value="phu">🟡 Phụ</option>
                    </select>
                </div>
                <div class="bcv-form-group">
                    <label>Ưu tiên *</label>
                    <select class="bcv-form-select" id="bcvCreatePriority">
                        <option value="">— Chọn ưu tiên —</option>
                        <option value="cao">🔴 Cao</option>
                        <option value="trung_binh">🟠 Trung bình</option>
                        <option value="thap">🟢 Thấp</option>
                    </select>
                </div>
            </div>
            <div class="bcv-form-group">
                <label>Deadline *</label>
                <input class="bcv-form-input" type="date" id="bcvCreateDeadline" min="${todayStr}" onchange="_bcvCheckDeadlineHoliday(this); _bcvFormatDeadlineDisplay(this.value)">
                <div id="bcvDeadlineDisplay" style="font-size:12px;font-weight:700;color:#3b82f6;margin-top:4px;min-height:16px"></div>
            </div>
            <div class="bcv-form-group">
                <label>✅ Checklist Công Việc</label>
                <div class="bcv-checklist-builder" id="bcvChecklistBuilder"></div>
                <button class="bcv-cl-add" type="button" onclick="_bcvAddChecklistItem()">＋ Thêm mục</button>
            </div>
            <div class="bcv-form-group">
                <label>🖼️ Hình ảnh (Ctrl+V để dán)</label>
                <div class="bcv-paste-area" id="bcvPasteArea" tabindex="0">
                    <div class="bcv-paste-hint" id="bcvPasteHint">📋 Nhấn Ctrl+V để dán hình ảnh từ clipboard</div>
                    <div class="bcv-paste-preview" id="bcvPastePreview"></div>
                </div>
            </div>
            <div class="bcv-form-actions">
                <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()">Hủy</button>
                <button class="bcv-btn bcv-btn-primary" id="bcvSubmitBtn" data-no-debounce="true" onclick="_bcvSubmitCreate()">Tạo Task</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    setTimeout(function() { var el = document.getElementById('bcvCreateTitle'); if(el) el.focus(); }, 100);

    _bcvApi('/api/board-tasks/next-id' + (deptId ? '?department_id=' + deptId : '')).then(function(res) {
        if (res && res.nextCode) {
            var badge = document.getElementById('bcvCreateNextCodeBadge');
            if (badge) badge.textContent = 'Mã: ' + res.nextCode;
        }
    });

    if (deptId) {
        _bcvLoadCreateDocs(deptId);
    }

    // Setup paste event on the paste area
    var pasteArea = document.getElementById('bcvPasteArea');
    if (pasteArea) {
        pasteArea.addEventListener('paste', function(e) {
            var items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    var blob = items[i].getAsFile();
                    if (blob) {
                        _bcvPastedImages.push(blob);
                        _bcvRenderPastePreview();
                    }
                }
            }
            e.preventDefault();
        });
    }
}

// When director changes department in create modal, reload users & update next task code badge
async function _bcvCreateDeptChange() {
    var deptEl = document.getElementById('bcvCreateDept');
    var assigneeWrap = document.getElementById('bcvAssigneeWrap');
    var assigneeList = document.getElementById('bcvAssigneeCheckboxList');
    var badge = document.getElementById('bcvCreateNextCodeBadge');
    if (!deptEl) return;

    var deptId = deptEl.value;
    if (!deptId) {
        if (assigneeWrap) assigneeWrap.style.display = 'none';
        if (assigneeList) assigneeList.innerHTML = '';
        _bcvUpdateAssigneeCount();
        _bcvResetCreateDocPicker('— Chọn phòng ban trước —');
        if (badge) badge.textContent = 'Mã: — Chọn phòng ban —';
        return;
    }

    if (badge) badge.textContent = '⌛ Đang tải mã...';
    _bcvApi('/api/board-tasks/next-id?department_id=' + deptId).then(function(res) {
        if (badge) {
            if (res && res.nextCode) {
                badge.textContent = 'Mã: ' + res.nextCode;
            } else {
                badge.textContent = 'Mã: —';
            }
        }
    }).catch(function() {
        if (badge) badge.textContent = 'Mã: —';
    });

    var usersRes = await _bcvApi('/api/board-tasks/users?department_id=' + deptId);
    var users = (usersRes && usersRes.users) || [];

    if (assigneeList) {
        assigneeList.innerHTML = _bcvBuildAssigneeCheckboxes(users);
    }
    _bcvUpdateAssigneeCount();
    if (assigneeWrap) assigneeWrap.style.display = 'block';

    // Load tư liệu phòng ban đã chọn
    _bcvLoadCreateDocs(deptId);
}

function _bcvCleanCollectionName(colName) {
    if (!colName) return '';
    var clean = colName.trim();
    // Loại bỏ các tiền tố lặp thừa như "Thiết Kế Mẫu - BST - " hoặc "Thiết Kế Mẫu - "
    clean = clean.replace(/^(Thiết Kế Mẫu\s*[\-\–\—]\s*BST\s*[\-\–\—]\s*)/i, '');
    clean = clean.replace(/^(Thiết Kế Mẫu\s*[\-\–\—]\s*)/i, '');
    return clean.trim() || colName.trim();
}

async function _bcvLoadCollectionsForPicker() {
    var sel = document.getElementById('bcvCreateCollectionSelect');
    if (!sel) return;
    if (sel.options.length > 1) return;

    sel.innerHTML = '<option value="">⏳ Đang tải Bộ Sưu Tập...</option>';
    try {
        var res = await _bcvApi('/api/collections');
        var cols = (res && res.collections) || [];
        var h = '<option value="">— Chọn Bộ Sưu Tập —</option>';
        cols.forEach(function(c) {
            var rawName = c.name || ('Bộ Sưu Tập #' + c.id);
            var cleanCode = _bcvCleanCollectionName(rawName);
            var label = (cleanCode !== rawName && cleanCode) ? (cleanCode + ' (' + rawName + ')') : rawName;
            if (c.linh_vuc) label += ' — ' + c.linh_vuc;
            h += '<option value="' + c.id + '" data-name="' + _escAttr(rawName) + '">📦 ' + _esc(label) + '</option>';
        });
        sel.innerHTML = h;
    } catch(e) {
        sel.innerHTML = '<option value="">❌ Lỗi tải Bộ Sưu Tập</option>';
    }
}

function _bcvCreateCollectionChange() {
    var sel = document.getElementById('bcvCreateCollectionSelect');
    if (!sel) return;
    var selectedOpt = sel.options[sel.selectedIndex];
    var rawName = selectedOpt ? selectedOpt.getAttribute('data-name') : '';
    var cleanName = _bcvCleanCollectionName(rawName);
    _bcv._autoTitleCollectionName = cleanName || rawName || '';
    _bcvUpdateAutoTitle();
}

async function _bcvLoadKhoAdsLinhVucForPicker() {
    var sel = document.getElementById('bcvCreateKhoAdsLinhVucSelect');
    if (!sel) return;
    if (sel.options.length > 1) return;

    sel.innerHTML = '<option value="">⏳ Đang tải Lĩnh Vực Ads...</option>';
    try {
        var res = await _bcvApi('/api/kho-ads/linh-vuc');
        var list = (res && res.linh_vuc_list) || [];
        var h = '<option value="">— Chọn Lĩnh Vực Ads —</option>';
        list.forEach(function(item) {
            var label = item.code ? (item.name + ' (' + item.code + ')') : item.name;
            h += '<option value="' + _escAttr(item.name) + '" data-code="' + _escAttr(item.code || '') + '">🏢 ' + _esc(label) + '</option>';
        });
        sel.innerHTML = h;
    } catch(e) {
        sel.innerHTML = '<option value="">❌ Lỗi tải Lĩnh Vực Ads</option>';
    }
}

async function _bcvCreateKhoAdsLinhVucChange() {
    var sel = document.getElementById('bcvCreateKhoAdsLinhVucSelect');
    if (!sel) return;
    var linhVucName = sel.value || '';
    _bcv._autoTitleKhoAdsLinhVucName = linhVucName;

    var selectedOpt = sel.options[sel.selectedIndex];
    var code = selectedOpt ? (selectedOpt.getAttribute('data-code') || '') : '';

    if (linhVucName) {
        try {
            var res = await _bcvApi('/api/board-tasks/next-ads-code?linh_vuc=' + encodeURIComponent(linhVucName) + '&code=' + encodeURIComponent(code));
            if (res && res.formattedCode) {
                _bcv._autoTitleKhoAdsCode = res.formattedCode;
            } else {
                _bcv._autoTitleKhoAdsCode = '';
            }
        } catch(e) {
            _bcv._autoTitleKhoAdsCode = '';
        }
    } else {
        _bcv._autoTitleKhoAdsCode = '';
    }
    _bcvUpdateAutoTitle();
}

// Reset bộ chọn tư liệu
function _bcvResetCreateDocPicker(placeholderText) {
    var mainSel = document.getElementById('bcvCreateDocMainCat');
    var subSel = document.getElementById('bcvCreateDocSubCat');
    var preview = document.getElementById('bcvCreateDocLinksPreview');
    var hidden = document.getElementById('bcvCreateGuideLink');
    if (mainSel) mainSel.innerHTML = '<option value="">' + (placeholderText || '— Chọn tư liệu —') + '</option>';
    if (subSel) { subSel.innerHTML = '<option value="">— Tất cả công việc —</option>'; subSel.style.display = 'none'; }
    if (preview) preview.innerHTML = '';
    if (hidden) hidden.value = '';

    var colGroup = document.getElementById('bcvCreateCollectionGroup');
    var colSel = document.getElementById('bcvCreateCollectionSelect');
    if (colGroup) colGroup.style.display = 'none';
    if (colSel) colSel.value = '';
    _bcv._autoTitleCollectionName = '';

    var khoAdsGroup = document.getElementById('bcvCreateKhoAdsLinhVucGroup');
    var khoAdsSel = document.getElementById('bcvCreateKhoAdsLinhVucSelect');
    var targetQtyInp = document.getElementById('bcvCreateTargetQuantity');
    if (khoAdsGroup) khoAdsGroup.style.display = 'none';
    if (khoAdsSel) khoAdsSel.value = '';
    if (targetQtyInp) targetQtyInp.value = '';
    _bcv._autoTitleKhoAdsLinhVucName = '';
    _bcv._autoTitleKhoAdsCode = '';

    var tuLieu2Group = document.getElementById('bcvCreateTuLieu2LinhVucGroup');
    var tuLieu2Sel = document.getElementById('bcvCreateTuLieu2LinhVucSelect');
    if (tuLieu2Group) tuLieu2Group.style.display = 'none';
    if (tuLieu2Sel) tuLieu2Sel.value = '';
    _bcv._autoTitleTuLieu2LinhVucName = '';
    _bcv._autoTitleTuLieu2Code = '';

    _bcvUpdateAutoTitle('');
    var subTitleEl = document.getElementById('bcvCreateSubTitle');
    if (subTitleEl) subTitleEl.value = '';
    _bcv._autoTitleDocName = '';
    _bcvUpdateTaskLinkLabel(false);
    _bcv._createDocs = [];
}

// Kiểm tra xem phòng ban hiện tại có phải là PHÒNG MARKETING hay không
function _bcvIsMarketingDept(deptId) {
    var dId = deptId;
    var deptEl = document.getElementById('bcvCreateDept');
    if (deptEl && deptEl.value) {
        dId = deptEl.value;
        var selectedOpt = deptEl.options[deptEl.selectedIndex];
        if (selectedOpt && selectedOpt.textContent && selectedOpt.textContent.toLowerCase().includes('marketing')) {
            return true;
        }
    }

    var user = window._currentUser || _bcv.user || {};
    if (user.department_name && user.department_name.toLowerCase().includes('marketing')) {
        return true;
    }

    if (!dId) dId = user.department_id;
    if (!dId) dId = _bcv.selectedDeptId || (document.getElementById('bcvDeptFilter') || {}).value || '';

    if (dId) {
        var depts = _bcv.departments || _bcv.enabledDepts || [];
        var dept = depts.find(function(d) { return String(d.id) === String(dId); });
        if (dept && dept.name && dept.name.toLowerCase().includes('marketing')) {
            return true;
        }
    }

    var listEl = document.getElementById('bcvAssigneeCheckboxList');
    if (listEl && listEl.textContent && listEl.textContent.toLowerCase().includes('marketing')) {
        return true;
    }

    return false;
}

// Load Lĩnh Vực cho Tư Liệu 2 ở PHÒNG MARKETING (lấy từ cấu hình Lĩnh Vực Bộ Sưu Tập)
async function _bcvLoadTuLieu2LinhVucForPicker() {
    var sel = document.getElementById('bcvCreateTuLieu2LinhVucSelect');
    if (!sel) return;
    if (sel.options.length > 1) return;

    sel.innerHTML = '<option value="">⏳ Đang tải Lĩnh Vực...</option>';
    try {
        var res = await _bcvApi('/api/collections/linh-vuc');
        var list = (res && res.linh_vuc_list) || [];
        if (list.length === 0) {
            var adsRes = await _bcvApi('/api/kho-ads/linh-vuc');
            list = (adsRes && adsRes.linh_vuc_list) || [];
        }
        var h = '<option value="">— Chọn Lĩnh Vực —</option>';
        list.forEach(function(item) {
            var codeStr = item.code ? (' (' + item.code + ')') : '';
            var label = item.name + codeStr;
            var codeVal = item.code || item.name;
            h += '<option value="' + _escAttr(codeVal) + '" data-name="' + _escAttr(item.name) + '" data-code="' + _escAttr(codeVal) + '">🏢 ' + _esc(label) + '</option>';
        });
        sel.innerHTML = h;
    } catch(e) {
        sel.innerHTML = '<option value="">❌ Lỗi tải Lĩnh Vực</option>';
    }
}

async function _bcvCreateTuLieu2LinhVucChange() {
    var sel = document.getElementById('bcvCreateTuLieu2LinhVucSelect');
    if (!sel) return;
    var codeVal = sel.value || '';
    var selectedOpt = sel.options[sel.selectedIndex];
    var linhVucName = selectedOpt ? (selectedOpt.getAttribute('data-name') || '') : '';
    var code = selectedOpt ? (selectedOpt.getAttribute('data-code') || codeVal) : codeVal;

    _bcv._autoTitleTuLieu2LinhVucName = linhVucName || codeVal;

    if (codeVal) {
        try {
            var res = await _bcvApi('/api/board-tasks/next-design-code?code=' + encodeURIComponent(code) + '&linh_vuc=' + encodeURIComponent(linhVucName));
            if (res && res.formattedCode) {
                _bcv._autoTitleTuLieu2Code = res.formattedCode;
            } else {
                _bcv._autoTitleTuLieu2Code = code + '001';
            }
        } catch(e) {
            _bcv._autoTitleTuLieu2Code = code + '001';
        }
    } else {
        _bcv._autoTitleTuLieu2Code = '';
    }
    _bcvUpdateAutoTitle();
}

// Cập nhật nhãn Đường link công việc khi chọn tư liệu
function _bcvUpdateTaskLinkLabel(hasDocSelected) {
    var labelEl = document.getElementById('bcvCreateLinkLbl');
    if (!labelEl) return;
    if (hasDocSelected) {
        labelEl.innerHTML = '🔗 Đường link công việc <span style="font-size:10px;font-weight:600;color:#64748b">(không bắt buộc)</span>';
    } else {
        labelEl.innerHTML = '🔗 Đường link công việc *';
    }
}

// Lấy ngày hôm nay định dạng DD/MM/YYYY hoặc DD/MM/YY
function _bcvGetTodayFormattedStr(shortYear) {
    var now = new Date();
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var yyyy = now.getFullYear();
    if (shortYear) {
        var yy = String(yyyy).slice(-2);
        return dd + '/' + mm + '/' + yy;
    }
    return dd + '/' + mm + '/' + yyyy;
}

function _bcvIsVideoAdsCat(catName) {
    if (!catName) return false;
    var lower = String(catName).toLowerCase();
    return lower.includes('video / ảnh ads') ||
           lower.includes('video/ảnh ads') ||
           lower.includes('video ads') ||
           lower.includes('ảnh ads') ||
           (lower.includes('video') && lower.includes('ads')) ||
           (lower.includes('ảnh') && lower.includes('ads'));
}

// Cập nhật tiêu đề tự động theo tên tư liệu + tiêu đề phụ / bộ sưu tập / lĩnh vực ads + ngày/tháng/năm và khóa chỉnh sửa
function _bcvUpdateAutoTitle(docName) {
    // Nếu truyền docName thì lưu lại, nếu không thì dùng giá trị đã lưu
    if (docName !== undefined && typeof docName === 'string') {
        _bcv._autoTitleDocName = docName;
    }
    var storedDocName = _bcv._autoTitleDocName || '';
    var titleEl = document.getElementById('bcvCreateTitle');
    var subTitleEl = document.getElementById('bcvCreateSubTitle');
    if (!titleEl) return;

    var mainSel = document.getElementById('bcvCreateDocMainCat');
    var mainCatVal = mainSel ? mainSel.value : '';
    var isPhotoAiBst = storedDocName.includes('Chụp Ảnh / Tạo AI') || storedDocName.includes('Quay Video / Tạo AI') ||
                       mainCatVal.includes('Chụp Ảnh / Tạo AI') || mainCatVal.includes('Quay Video / Tạo AI');
    var isVideoAdsDoc = _bcvIsVideoAdsCat(storedDocName) || _bcvIsVideoAdsCat(mainCatVal);
    var isTuLieu2Design = (storedDocName.includes('Thiết Kế Mẫu') || storedDocName.includes('Tư Liệu 2') || mainCatVal.includes('Thiết Kế Mẫu') || mainCatVal.includes('Tư Liệu 2')) &&
                          !storedDocName.includes('Chụp Ảnh') && !storedDocName.includes('Tạo AI') && !storedDocName.includes('Video Ads') && !storedDocName.includes('Tư Liệu 3') && !storedDocName.includes('Tư Liệu 5');
    var isMarketing = _bcvIsMarketingDept();
    var isTuLieu2Mkt = isMarketing && isTuLieu2Design;

    var subTitleGroup = document.getElementById('bcvSubTitleGroup');

    if (!storedDocName.trim()) {
        titleEl.value = '';
        titleEl.readOnly = false;
        titleEl.style.background = '#fff';
        titleEl.style.cursor = '';
        if (subTitleGroup) subTitleGroup.style.display = 'none';
        if (subTitleEl) subTitleEl.value = '';
        return;
    }

    if (subTitleGroup) {
        subTitleGroup.style.display = (isPhotoAiBst || isVideoAdsDoc || isTuLieu2Mkt) ? 'none' : 'block';
    }

    var targetName = (isPhotoAiBst && mainCatVal) ? mainCatVal : storedDocName;
    var cleanName = targetName.replace(/^(\d+[\.\s\-]*|Tư Liệu \d+\s*:\s*)/gi, '').trim();

    var subTitle = '';
    if (isPhotoAiBst) {
        subTitle = _bcv._autoTitleCollectionName || '';
    } else if (isVideoAdsDoc) {
        subTitle = _bcv._autoTitleKhoAdsLinhVucName || '';
    } else {
        subTitle = subTitleEl ? subTitleEl.value.trim() : '';
    }

    if (isTuLieu2Mkt) {
        var designCode = _bcv._autoTitleTuLieu2Code || '';
        var todayYYStr = _bcvGetTodayFormattedStr(true); // DD/MM/YY (VD: 22/08/26)
        if (designCode) {
            titleEl.value = cleanName + ' - ' + designCode + ' - ' + todayYYStr;
        } else {
            titleEl.value = cleanName + ' - ' + todayYYStr;
        }
    } else if (isVideoAdsDoc) {
        var adsCodePrefix = _bcv._autoTitleKhoAdsCode || '';
        var todayYYStr = _bcvGetTodayFormattedStr(true); // DD/MM/YY (VD: 22/08/26)

        if (subTitle) {
            var prefixStr = adsCodePrefix ? (adsCodePrefix + ' - ') : '';
            titleEl.value = prefixStr + cleanName + ' - ' + subTitle + ' - ' + todayYYStr;
        } else {
            titleEl.value = cleanName + ' - ' + todayYYStr;
        }
    } else {
        var todayStr = _bcvGetTodayFormattedStr();
        if (subTitle) {
            titleEl.value = cleanName + ' - ' + subTitle + ' - ' + todayStr;
        } else {
            titleEl.value = cleanName + ' - ' + todayStr;
        }
    }

    titleEl.readOnly = true;
    titleEl.style.background = '#f1f5f9';
    titleEl.style.cursor = 'not-allowed';
}

// Load tư liệu theo department_id
async function _bcvLoadCreateDocs(deptId) {
    var mainSel = document.getElementById('bcvCreateDocMainCat');
    if (!mainSel) return;

    mainSel.innerHTML = '<option value="">⏳ Đang tải tư liệu...</option>';

    var res = await _bcvApi('/api/board-documents?department_id=' + deptId);
    var docs = (res && res.documents) || [];
    _bcv._createDocs = docs;

    // Lấy danh sách main_category duy nhất
    var mainCats = [];
    var seen = {};
    docs.forEach(function(doc) {
        if (doc.main_category && !seen[doc.main_category]) {
            seen[doc.main_category] = true;
            mainCats.push(doc.main_category);
        }
    });
    _bcv._editMainCats = mainCats;
    _bcv._createMainCats = mainCats;

    var h = '<option value="">— Chọn tư liệu —</option>';
    mainCats.forEach(function(cat, idx) {
        var cleanCat = cat.replace(/^\d+[\.\s\-]*/, '');
        h += '<option value="' + _escAttr(cat) + '">📌 Tư Liệu ' + (idx + 1) + ' : ' + _esc(cleanCat) + '</option>';
    });
    mainSel.innerHTML = h;

    // Reset sub + preview
    var subSel = document.getElementById('bcvCreateDocSubCat');
    var preview = document.getElementById('bcvCreateDocLinksPreview');
    var hidden = document.getElementById('bcvCreateGuideLink');
    if (subSel) { subSel.style.display = 'none'; subSel.innerHTML = '<option value="">— Tất cả công việc —</option>'; }
    if (preview) preview.innerHTML = '';
    if (hidden) hidden.value = '';
    _bcvUpdateAutoTitle('');
    _bcvUpdateTaskLinkLabel(false);
}

// Khi chọn Tư Liệu (main_category)
function _bcvCreateDocMainCatChange() {
    var mainSel = document.getElementById('bcvCreateDocMainCat');
    var subSel = document.getElementById('bcvCreateDocSubCat');
    var preview = document.getElementById('bcvCreateDocLinksPreview');
    var hidden = document.getElementById('bcvCreateGuideLink');
    if (!mainSel) return;

    var selectedCat = mainSel.value;
    if (!selectedCat) {
        // Reset
        if (subSel) { subSel.style.display = 'none'; subSel.innerHTML = '<option value="">— Tất cả công việc —</option>'; }
        if (preview) preview.innerHTML = '';
        if (hidden) hidden.value = '';
        _bcvUpdateAutoTitle('');
        _bcvUpdateTaskLinkLabel(false);
        _bcvSyncDocToChecklist([]);
        return;
    }

    // Tự động điền tiêu đề & làm mờ bắt buộc cho đường link công việc
    _bcvUpdateAutoTitle(selectedCat);
    _bcvUpdateTaskLinkLabel(true);

    // Hiển thị / Ẩn dropdown chọn Bộ Sưu Tập cho tư liệu Chụp Ảnh / Tạo AI - BST & Quay Video / Tạo AI - BST
    var colGroup = document.getElementById('bcvCreateCollectionGroup');
    var isPhotoAiBst = selectedCat && (selectedCat.includes('Chụp Ảnh / Tạo AI') || selectedCat.includes('Quay Video / Tạo AI'));
    if (isPhotoAiBst) {
        if (colGroup) colGroup.style.display = 'block';
        _bcvLoadCollectionsForPicker();
    } else {
        if (colGroup) {
            colGroup.style.display = 'none';
            var colSel = document.getElementById('bcvCreateCollectionSelect');
            if (colSel) colSel.value = '';
        }
        _bcv._autoTitleCollectionName = '';
        _bcvUpdateAutoTitle();
    }

    // Hiển thị / Ẩn dropdown chọn Lĩnh Vực Ads cho tư liệu Video / Ảnh Ads
    var isVideoAdsDoc = _bcvIsVideoAdsCat(selectedCat);
    var khoAdsGroup = document.getElementById('bcvCreateKhoAdsLinhVucGroup');
    if (isVideoAdsDoc) {
        if (khoAdsGroup) khoAdsGroup.style.display = 'block';
        _bcvLoadKhoAdsLinhVucForPicker();
    } else {
        if (khoAdsGroup) {
            khoAdsGroup.style.display = 'none';
            var khoAdsSel = document.getElementById('bcvCreateKhoAdsLinhVucSelect');
            if (khoAdsSel) khoAdsSel.value = '';
        }
        _bcv._autoTitleKhoAdsLinhVucName = '';
        _bcvUpdateAutoTitle();
    }

    // Hiển thị / Ẩn dropdown chọn Lĩnh Vực cho tư liệu Thiết Kế Mẫu - BST ở PHÒNG MARKETING
    var tuLieu2Group = document.getElementById('bcvCreateTuLieu2LinhVucGroup');
    var isTuLieu2Design = selectedCat && (selectedCat.includes('Thiết Kế Mẫu') || selectedCat.includes('Tư Liệu 2')) &&
                          !selectedCat.includes('Chụp Ảnh') && !selectedCat.includes('Tạo AI') && !selectedCat.includes('Video Ads') && !selectedCat.includes('Tư Liệu 3');
    var isMarketing = _bcvIsMarketingDept();
    var isTuLieu2Mkt = isMarketing && isTuLieu2Design;

    if (isTuLieu2Mkt) {
        if (tuLieu2Group) tuLieu2Group.style.display = 'block';
        _bcvLoadTuLieu2LinhVucForPicker();
    } else {
        if (tuLieu2Group) {
            tuLieu2Group.style.display = 'none';
            var tuLieu2Sel = document.getElementById('bcvCreateTuLieu2LinhVucSelect');
            if (tuLieu2Sel) tuLieu2Sel.value = '';
        }
        _bcv._autoTitleTuLieu2LinhVucName = '';
        _bcv._autoTitleTuLieu2Code = '';
        _bcvUpdateAutoTitle();
    }

    // Lọc documents theo main_category
    var docs = (_bcv._createDocs || []).filter(function(d) { return d.main_category === selectedCat; });

    // Populate sub_category dropdown
    var h = '<option value="">— Tất cả công việc —</option>';
    docs.forEach(function(doc, idx) {
        h += '<option value="' + doc.id + '">📌 ' + (idx + 1) + '. ' + _esc(doc.sub_category) + '</option>';
    });
    if (subSel) {
        subSel.innerHTML = h;
        subSel.style.display = 'block';
    }

    // Hiển thị TẤT CẢ link trong tư liệu này
    _bcvRenderCreateDocLinks(docs, preview, hidden);
}

// Khi chọn Tên Công Việc (sub_category)
function _bcvCreateDocSubCatChange() {
    var subSel = document.getElementById('bcvCreateDocSubCat');
    var preview = document.getElementById('bcvCreateDocLinksPreview');
    var hidden = document.getElementById('bcvCreateGuideLink');
    if (!subSel) return;

    var selectedDocId = subSel.value;
    var mainSel = document.getElementById('bcvCreateDocMainCat');
    var selectedCat = mainSel ? mainSel.value : '';

    if (!selectedDocId) {
        // "Tất cả công việc" → hiển thị tất cả link trong tư liệu & tiêu đề theo main_category
        _bcvUpdateAutoTitle(selectedCat);
        var docs = (_bcv._createDocs || []).filter(function(d) { return d.main_category === selectedCat; });
        _bcvRenderCreateDocLinks(docs, preview, hidden);
        return;
    }

    // Chỉ hiển thị link của công việc được chọn & tiêu đề theo sub_category
    var doc = (_bcv._createDocs || []).find(function(d) { return String(d.id) === String(selectedDocId); });
    if (doc) {
        _bcvUpdateAutoTitle(doc.sub_category || selectedCat);
        _bcvRenderCreateDocLinks([doc], preview, hidden);
    } else {
        if (preview) preview.innerHTML = '';
        if (hidden) hidden.value = '';
        _bcvUpdateAutoTitle(selectedCat);
        _bcvSyncDocToChecklist([]);
    }
}

// Render link preview cho bộ chọn tư liệu & đồng bộ Checklist con
function _bcvRenderCreateDocLinks(docs, previewEl, hiddenEl) {
    if (!previewEl) return;

    var allMainCats = _bcv._createMainCats || [];
    if (allMainCats.length === 0) {
        docs.forEach(function(d) {
            if (d.main_category && !allMainCats.includes(d.main_category)) allMainCats.push(d.main_category);
        });
    }

    var allLinks = [];
    var docChecklistItems = [];

    var docGuideItems = [];
    docs.forEach(function(doc, idx) {
        var links = doc.links || [];
        var mainIdx = allMainCats.indexOf(doc.main_category);
        var cleanCat = doc.main_category ? doc.main_category.replace(/^\d+[\.\s\-]*/, '') : '';
        var formattedMainCat = 'Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;

        docGuideItems.push({
            mainCat: formattedMainCat,
            title: doc.sub_category || doc.title || 'Mục tư liệu',
            content: doc.content || '',
            links: links
        });

        docChecklistItems.push({
            title: doc.sub_category || doc.title || 'Mục tư liệu',
            content: doc.content || '',
            links: links
        });
    });

    if (docChecklistItems.length === 0) {
        previewEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;font-style:italic;padding:6px 0">Không có tư liệu nào</div>';
        if (hiddenEl) hiddenEl.value = '';
        _bcvSyncDocToChecklist(docChecklistItems);
        return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">';
    docChecklistItems.forEach(function(item) {
        var linksHtml = '';
        if (item.links && item.links.length > 0) {
            linksHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
            item.links.forEach(function(link) {
                var title = typeof link === 'string' ? link : (link.title || link.url);
                var url = typeof link === 'string' ? link : link.url;
                linksHtml += '<a href="' + _escAttr(url) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all;width:fit-content">' +
                    '🔗 ' + _esc(title) + ' ↗</a>';
            });
            linksHtml += '</div>';
        }

        var contentStr = item.content != null ? String(item.content).trim() : '';

        html += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #3b82f6;border-radius:8px;padding:8px 10px;font-size:12px">';
        html += '<div style="font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px">📌 ' + _esc(item.title) + '</div>';
        if (contentStr) {
            html += '<div style="color:#475569;font-size:11px;line-height:1.4;margin-top:3px;white-space:pre-wrap">' + _esc(contentStr) + '</div>';
        }
        html += linksHtml;
        html += '</div>';
    });
    html += '</div>';
    previewEl.innerHTML = html;

    // Lưu toàn bộ danh sách tư liệu hướng dẫn dạng mảng JSON
    if (hiddenEl) hiddenEl.value = JSON.stringify(docGuideItems);

    // Tự động đồng bộ các thẻ Checklist con khóa từ Tư Liệu
    _bcvSyncDocToChecklist(docChecklistItems);
}

// Tự động tạo thẻ khóa cho Checklist con dựa trên thông tin Tư Liệu
function _bcvSyncDocToChecklist(items) {
    var builder = document.getElementById('bcvChecklistBuilder');
    if (!builder) return;

    builder.innerHTML = '';
    if (Array.isArray(items) && items.length > 0) {
        items.forEach(function(item) {
            var title = item.title || '';
            var content = item.content || '';
            var links = item.links || [];
            var linksJson = JSON.stringify(links);

            var div = document.createElement('div');
            div.className = 'bcv-cl-doc-item';
            div.setAttribute('data-title', title);
            div.setAttribute('data-content', content);
            div.setAttribute('data-link', linksJson);
            div.style.cssText = 'background:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #3b82f6;border-radius:10px;padding:9px 12px;margin-bottom:8px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.03)';

            var linksHtml = '';
            if (links.length > 0) {
                linksHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">' +
                    links.map(function(l) {
                        var t = typeof l === 'string' ? l : (l.title || l.url);
                        var u = typeof l === 'string' ? l : l.url;
                        return '<a href="' + _escAttr(u) + '" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:2px 7px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;display:inline-flex;align-items:center;gap:3px">🔗 ' + _esc(t) + ' ↗</a>';
                    }).join('') +
                '</div>';
            }

            div.innerHTML = '<div style="flex:1;min-width:0">' +
                '<div style="font-size:12px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px">' +
                    '<span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-weight:800;white-space:nowrap">🔒 Tư Liệu</span>' +
                    '<span style="word-break:break-word">' + _esc(title) + '</span>' +
                '</div>' +
                (content ? '<div style="font-size:11px;color:#475569;margin-top:4px;white-space:pre-wrap;line-height:1.45;word-break:break-word">' + _esc(content) + '</div>' : '') +
                linksHtml +
            '</div>' +
            '<button type="button" class="bcv-cl-remove" onclick="this.parentElement.remove()" title="Xóa mục này" style="width:26px;height:26px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;margin-top:2px">✕</button>';

            builder.appendChild(div);
        });
    }
}

// Check if selected deadline is a holiday (dựa theo trang Setup Ngày Lễ /setupngayle)
function _bcvCheckDeadlineHoliday(input) {
    if (!input || !input.value || !window._bcvHolidays) return true;
    var selected = input.value; // YYYY-MM-DD
    if (window._bcvHolidays[selected]) {
        alert('⚠️ Ngày ' + selected + ' là ngày nghỉ lễ ("' + window._bcvHolidays[selected] + '") theo trang Setup Ngày Lễ.\nVui lòng chọn ngày làm việc khác!');
        input.value = '';
        var disp = document.getElementById('bcvDeadlineDisplay');
        if (disp) disp.textContent = '';
        return false;
    }
    return true;
}

// Format deadline display: "Thứ X - DD/MM/YY"
function _bcvFormatDeadlineDisplay(val) {
    var disp = document.getElementById('bcvDeadlineDisplay');
    if (!disp) return;
    if (!val) { disp.textContent = ''; return; }
    var d = new Date(val + 'T00:00:00');
    var days = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
    var dayName = days[d.getDay()];
    var dd = String(d.getDate()).padStart(2,'0');
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var yy = String(d.getFullYear()).slice(-2);
    disp.textContent = '📅 ' + dayName + ' - ' + dd + '/' + mm + '/' + yy;
}

// ========== CHECKLIST BUILDER (Create Form) ==========

var _bcvPastedImages = [];

function _bcvRenderPastePreview() {
    var container = document.getElementById('bcvPastePreview');
    var hint = document.getElementById('bcvPasteHint');
    if (!container) return;
    if (_bcvPastedImages.length === 0) {
        container.innerHTML = '';
        if (hint) hint.style.display = '';
        return;
    }
    if (hint) hint.style.display = 'none';
    var h = '';
    _bcvPastedImages.forEach(function(blob, i) {
        var url = URL.createObjectURL(blob);
        h += '<div class="bcv-paste-thumb">' +
            '<img src="' + url + '" alt="Hình ' + (i+1) + '">' +
            '<button class="bcv-paste-remove" onclick="_bcvRemovePastedImage(' + i + ')" title="Xóa">✕</button>' +
            '<div class="bcv-paste-label">Hình ' + (i+1) + '</div>' +
        '</div>';
    });
    container.innerHTML = h;
}

function _bcvRemovePastedImage(idx) {
    _bcvPastedImages.splice(idx, 1);
    _bcvRenderPastePreview();
}

function _bcvAddChecklistItem() {
    var builder = document.getElementById('bcvChecklistBuilder');
    if (!builder) return;
    var idx = builder.children.length;
    var div = document.createElement('div');
    div.className = 'bcv-checklist-item';
    div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
    div.innerHTML = '<input type="text" class="bcv-form-input bcv-cl-input" placeholder="Mục ' + (idx + 1) + '..." style="flex:1;margin:0;padding:9px 12px;font-size:13px" data-idx="' + idx + '">' +
        '<button type="button" class="bcv-cl-remove" onclick="this.parentElement.remove()" title="Xóa mục này" style="width:26px;height:26px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s">✕</button>';
    builder.appendChild(div);
    div.querySelector('input').focus();
}


async function _bcvSubmitCreate() {
    var title = (document.getElementById('bcvCreateTitle') || {}).value || '';
    if (!title.trim()) { alert('Vui lòng nhập tiêu đề'); return; }

    var docMainCatForSubTitle = (document.getElementById('bcvCreateDocMainCat') || {}).value || '';
    var isPhotoAiBstDoc = docMainCatForSubTitle && (docMainCatForSubTitle.includes('Chụp Ảnh / Tạo AI') || docMainCatForSubTitle.includes('Quay Video / Tạo AI'));
    var isVideoAdsDoc = docMainCatForSubTitle && _bcvIsVideoAdsCat(docMainCatForSubTitle);
    var isTuLieu2DesignDoc = docMainCatForSubTitle && (docMainCatForSubTitle.includes('Thiết Kế Mẫu') || docMainCatForSubTitle.includes('Tư Liệu 2')) &&
                             !docMainCatForSubTitle.includes('Chụp Ảnh') && !docMainCatForSubTitle.includes('Tạo AI') && !docMainCatForSubTitle.includes('Video Ads') && !docMainCatForSubTitle.includes('Tư Liệu 3');
    var isTuLieu2MktDoc = _bcvIsMarketingDept() && isTuLieu2DesignDoc;

    if (docMainCatForSubTitle && !isPhotoAiBstDoc && !isVideoAdsDoc && !isTuLieu2MktDoc) {
        var subTitle = (document.getElementById('bcvCreateSubTitle') || {}).value || '';
        if (!subTitle.trim()) { alert('Vui lòng nhập tiêu đề phụ (bắt buộc khi chọn tư liệu)'); return; }
    }

    var desc = (document.getElementById('bcvCreateDesc') || {}).value || '';
    if (!desc.trim()) { alert('Vui lòng nhập mô tả công việc'); return; }

    var taskType = (document.getElementById('bcvCreateType') || {}).value || '';
    if (!taskType) { alert('Vui lòng chọn loại công việc'); return; }

    var priority = (document.getElementById('bcvCreatePriority') || {}).value || '';
    if (!priority) { alert('Vui lòng chọn mức ưu tiên'); return; }

    // Collect checked assignees
    var assigneeCbs = document.querySelectorAll('.bcv-assignee-cb:checked');
    var assigneeIds = Array.from(assigneeCbs).map(function(cb) { return cb.value; });
    if (assigneeIds.length === 0) { alert('Vui lòng chọn ít nhất 1 người được giao'); return; }

    var deadline = (document.getElementById('bcvCreateDeadline') || {}).value || '';
    if (!deadline) { alert('Vui lòng chọn deadline'); return; }
    if (window._bcvHolidays && window._bcvHolidays[deadline]) {
        alert('⚠️ Hạn chót (' + deadline + ') rơi vào ngày nghỉ lễ ("' + window._bcvHolidays[deadline] + '") theo trang Setup Ngày Lễ. Vui lòng chọn ngày làm việc khác!');
        return;
    }

    var docMainCat = (document.getElementById('bcvCreateDocMainCat') || {}).value || '';
    var taskLink = (document.getElementById('bcvCreateLink') || {}).value || '';
    if (!docMainCat && !taskLink.trim()) { alert('Vui lòng nhập đường link công việc'); return; }

    // Kiểm tra bắt buộc chọn Bộ Sưu Tập khi tạo task Chụp Ảnh / Tạo AI - BST hoặc Quay Video / Tạo AI - BST
    var colGroup = document.getElementById('bcvCreateCollectionGroup');
    var colSel = document.getElementById('bcvCreateCollectionSelect');
    var collectionId = null;
    if (colGroup && colGroup.style.display !== 'none') {
        collectionId = colSel ? colSel.value : '';
        if (!collectionId) {
            alert('⚠️ Vui lòng chọn Bộ Sưu Tập cho công việc!');
            if (colSel) colSel.focus();
            return;
        }
    }

    // Kiểm tra bắt buộc chọn Lĩnh Vực Ads & Số lượng sản xuất khi tạo task Video / Ảnh Ads
    var khoAdsGroup = document.getElementById('bcvCreateKhoAdsLinhVucGroup');
    var khoAdsSel = document.getElementById('bcvCreateKhoAdsLinhVucSelect');
    var targetQtyInp = document.getElementById('bcvCreateTargetQuantity');
    var adsLinhVuc = null;
    var targetQtyVal = null;
    if (khoAdsGroup && khoAdsGroup.style.display !== 'none') {
        adsLinhVuc = khoAdsSel ? khoAdsSel.value : '';
        if (!adsLinhVuc) {
            alert('⚠️ Vui lòng chọn Lĩnh Vực Ads cho công việc Video / Ảnh Ads!');
            if (khoAdsSel) khoAdsSel.focus();
            return;
        }
        var rawQty = targetQtyInp ? targetQtyInp.value.trim() : '';
        targetQtyVal = Number(rawQty);
        if (!rawQty || isNaN(targetQtyVal) || targetQtyVal <= 0) {
            alert('⚠️ Vui lòng nhập Số Lượng Cần Sản Xuất bắt buộc cho công việc Video / Ảnh Ads!');
            if (targetQtyInp) targetQtyInp.focus();
            return;
        }
    }

    // Kiểm tra bắt buộc chọn Lĩnh Vực cho công việc Thiết Kế Mẫu - BST ở PHÒNG MARKETING
    var tuLieu2Group = document.getElementById('bcvCreateTuLieu2LinhVucGroup');
    var tuLieu2Sel = document.getElementById('bcvCreateTuLieu2LinhVucSelect');
    if (tuLieu2Group && tuLieu2Group.style.display !== 'none') {
        var tuLieu2LinhVuc = tuLieu2Sel ? tuLieu2Sel.value : '';
        if (!tuLieu2LinhVuc) {
            alert('⚠️ Vui lòng chọn Lĩnh Vực bắt buộc cho công việc Thiết Kế Mẫu - BST!');
            if (tuLieu2Sel) tuLieu2Sel.focus();
            return;
        }
        if (!adsLinhVuc) adsLinhVuc = _bcv._autoTitleTuLieu2LinhVucName || tuLieu2LinhVuc;
    }

    var guideLink = (document.getElementById('bcvCreateGuideLink') || {}).value || '';

    var deptEl = document.getElementById('bcvCreateDept');
    if (deptEl && !deptEl.value) { alert('Vui lòng chọn phòng ban'); return; }

    // Collect checklist items (both doc items & manual inputs)
    var checklistItems = [];
    var builder = document.getElementById('bcvChecklistBuilder');
    if (builder) {
        Array.from(builder.children).forEach(function(child) {
            if (child.classList.contains('bcv-cl-doc-item')) {
                var itemTitle = child.getAttribute('data-title') || '';
                var itemContent = child.getAttribute('data-content') || '';
                var itemLinkJson = child.getAttribute('data-link') || '';
                var itemLinks = [];
                try { itemLinks = JSON.parse(itemLinkJson); } catch(e){}
                var firstUrl = '';
                if (itemLinks && itemLinks.length > 0) {
                    var l = itemLinks[0];
                    firstUrl = typeof l === 'string' ? l : (l.url || (typeof l.title === 'string' ? l.title : ''));
                }
                if (itemTitle) {
                    checklistItems.push({
                        title: itemTitle,
                        content: itemContent,
                        link: firstUrl
                    });
                }
            } else {
                var inp = child.querySelector('.bcv-cl-input');
                if (inp && inp.value.trim()) {
                    checklistItems.push(inp.value.trim());
                }
            }
        });
    }

    // Disable submit button
    var btn = document.getElementById('bcvSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo task...'; }

    var body = {
        title: title.trim(),
        description: desc.trim(),
        task_type: taskType,
        priority: priority,
        assigned_to_ids: assigneeIds,
        assigned_to: assigneeIds[0],
        deadline: deadline,
        task_link: taskLink.trim(),
        guide_link: guideLink.trim(),
        checklist: checklistItems,
        collection_id: collectionId ? Number(collectionId) : null,
        ads_linh_vuc: adsLinhVuc ? String(adsLinhVuc).trim() : null,
        target_quantity: targetQtyVal ? Number(targetQtyVal) : null
    };
    if (deptEl) body.department_id = deptEl.value || null;

    var res = await _bcvApi('/api/board-tasks', 'POST', body);
    if (res && res.ok && res.task) {
        // Upload pasted images if any
        if (_bcvPastedImages.length > 0) {
            for (var j = 0; j < _bcvPastedImages.length; j++) {
                var fd = new FormData();
                fd.append('file', _bcvPastedImages[j], 'paste_' + Date.now() + '_' + j + '.png');
                try {
                    await fetch('/api/board-tasks/' + res.task.id + '/attachments', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
                        body: fd
                    });
                } catch(e) { console.error('Upload paste error:', e); }
            }
            _bcvPastedImages = [];
        }
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvLoadTasks();
    } else {
        alert(res?.error || 'Lỗi tạo task. Vui lòng thử lại!');
        if (btn) { btn.disabled = false; btn.textContent = 'Tạo Task'; }
    }
}

function _bcvFormatGuideLinkDisplay(guideLink) {
    if (!guideLink || !guideLink.trim()) {
        return '<div style="font-size:12px;color:#94a3b8">Không có link hướng dẫn</div>';
    }
    var trimmed = guideLink.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            var parsed = JSON.parse(trimmed);
            var items = Array.isArray(parsed) ? parsed : [parsed];
            if (items.length > 0) {
                var groups = {};
                items.forEach(function(it) {
                    var cat = it.mainCat || it.prefix || it.subCat || 'Tài liệu hướng dẫn';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(it);
                });

                var html = '';
                var catKeys = Object.keys(groups);
                catKeys.forEach(function(catName) {
                    html += '<div style="margin-bottom:10px">';
                    if (catKeys.length > 0 && catName) {
                        html += '<div style="font-size:12px;font-weight:800;color:#047857;margin-bottom:6px;display:flex;align-items:center;gap:4px">📂 ' + _esc(catName) + ':</div>';
                    }
                    html += '<div style="display:flex;flex-direction:column;gap:8px">';
                    groups[catName].forEach(function(it) {
                        var title = it.title || it.subCat || it.prefix || 'Xem hướng dẫn';
                        var contentStr = it.content != null ? String(it.content).trim() : '';
                        var links = it.links || [];
                        if (links.length === 0 && it.url) {
                            links = [{ title: title, url: it.url }];
                        }

                        html += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #3b82f6;border-radius:10px;padding:10px 12px">';
                        html += '<div style="font-weight:700;color:#1e293b;font-size:13px;display:flex;align-items:center;gap:6px">📌 ' + _esc(title) + '</div>';
                        if (contentStr) {
                            html += '<div style="color:#475569;font-size:12px;line-height:1.5;margin-top:4px;white-space:pre-wrap">' + _esc(contentStr) + '</div>';
                        }
                        if (links && links.length > 0) {
                            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
                            links.forEach(function(link) {
                                var lTitle = typeof link === 'string' ? link : (link.title || link.url);
                                var lUrl = typeof link === 'string' ? link : link.url;
                                html += '<a href="' + _escAttr(lUrl) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all">🔗 ' + _esc(lTitle) + ' ↗</a>';
                            });
                            html += '</div>';
                        }
                        html += '</div>';
                    });
                    html += '</div></div>';
                });
                return html;
            }
        } catch(e) {}
    }
    return '<a href="' + _escAttr(trimmed) + '" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#059669;font-weight:700;word-break:break-all;padding:6px 12px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;text-decoration:none">📚 ' + _esc(trimmed) + ' ↗</a>';
}

// ========== DETAIL MODAL ==========

async function _bcvShowDetail(taskId) {
    var task = _bcv.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!_bcv.documents || _bcv.documents.length === 0) {
        try {
            var docsRes = await _bcvApi('/api/board-documents');
            _bcv.documents = (docsRes && docsRes.documents) || [];
        } catch(e) {}
    }

    var user = window._currentUser || {};
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    var isCreator = task.created_by === user.id;
    var isAssignee = task.assigned_to === user.id ||
        (task.assigned_to_ids && task.assigned_to_ids.split(',').map(function(id){ return Number(id.trim()); }).includes(user.id));
    var canAccept = isAssignee || !task.assigned_to;
    var canEdit = isManager || isCreator;
    var canDelete = user.role === 'giam_doc' || (user.username && user.username.toLowerCase().includes('giamdoc')) || Boolean(user.is_admin) || (user.username && user.username.toLowerCase() === 'admin');
    var cvId = _bcvGetTaskCode(task);
    var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

    // Format deadline with day of week
    var deadlineText = '';
    var dlDate = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
    var isOverdue = !!(dlDate && dlDate < new Date() && task.status !== 'hoan_thanh');
    if (task.deadline && dlDate) {
        deadlineText = daysArr[dlDate.getDay()] + ' - ' + String(dlDate.getDate()).padStart(2,'0') + '/' + String(dlDate.getMonth()+1).padStart(2,'0');
    }

    // Format accepted_at & created_at
    var acceptedText = '';
    if (task.accepted_at) {
        var at = new Date(task.accepted_at);
        acceptedText = daysArr[at.getDay()] + ' - ' + String(at.getDate()).padStart(2,'0') + '/' + String(at.getMonth()+1).padStart(2,'0') + ' ' + String(at.getHours()).padStart(2,'0') + ':' + String(at.getMinutes()).padStart(2,'0');
    }
    var createdText = '';
    if (task.created_at) {
        var ct = new Date(task.created_at);
        createdText = daysArr[ct.getDay()] + ' - ' + String(ct.getDate()).padStart(2,'0') + '/' + String(ct.getMonth()+1).padStart(2,'0') + ' ' + String(ct.getHours()).padStart(2,'0') + ':' + String(ct.getMinutes()).padStart(2,'0');
    }

    // ========== CẦN LÀM: Modal read-only + nút xác nhận ==========
    if (task.status === 'can_lam') {
        var checklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
        var checklist = (checklistRes && checklistRes.checklist) || [];
        var attachRes = await _bcvApi('/api/board-tasks/' + taskId + '/attachments');
        var attachments = (attachRes && attachRes.attachments) || [];

        var priorityLabel = task.priority === 'cao' ? '🔴 Cao' : task.priority === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp';
        var typeLabel = task.task_type === 'chinh' ? '🔵 Chính' : '🟡 Phụ';

        var overlay = document.createElement('div');
        overlay.className = 'bcv-overlay';
        overlay.id = 'bcvOverlay';

        var myReadAtStr = task.my_read_at ? _bcvFormatVNTime(task.my_read_at, true) : '';
        var readers = task.read_by_users || [];
        var readersStr = readers.length > 0
            ? readers.map(function(r){ return _esc(r.full_name) + ' (' + _bcvFormatVNTime(r.read_at, true) + ')'; }).join(', ')
            : 'Chưa có ai đọc';

        var directorReadBannerHtml = '';
        if (_bcv.tab === 'ban_giao' && _bcvCanSeeReadStatus(user)) {
            directorReadBannerHtml = `
                <div style="background:${task.my_read ? '#f0fdf4' : '#fff1f2'};border:1.5px solid ${task.my_read ? '#86efac' : '#fecdd3'};border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:800;color:${task.my_read ? '#15803d' : '#e11d48'};display:flex;align-items:center;gap:6px">
                            <span>${task.my_read ? '🟢 Bạn đã đọc công việc này' : '🔴 Bạn chưa đánh dấu đã đọc'}</span>
                            ${myReadAtStr ? `<span style="font-size:11px;font-weight:600;color:#047857">(${myReadAtStr})</span>` : ''}
                        </div>
                        ${(user.role === 'giam_doc' || isManager) ? `<div style="font-size:11px;font-weight:700;color:#64748b;margin-top:4px">👥 Người đã đọc (${readers.length}): <span style="color:#334155;font-weight:600">${readersStr}</span></div>` : ''}
                    </div>
                    <button class="bcv-btn" data-no-debounce="true" onclick="_bcvToggleMyRead(${task.id}, ${!task.my_read})" style="padding:${task.my_read ? '6px 14px' : '8px 18px'};font-size:12px;font-weight:800;background:${task.my_read ? '#fff' : 'linear-gradient(135deg,#16a34a,#15803d)'};color:${task.my_read ? '#dc2626' : '#fff'};border:${task.my_read ? '1px solid #fca5a5' : 'none'};border-radius:8px;cursor:pointer;box-shadow:${task.my_read ? 'none' : '0 3px 10px rgba(22,163,74,0.35)'}">
                        ${task.my_read ? '✕ Bỏ đánh dấu đã đọc' : '👁️ Đánh dấu TÔI ĐÃ ĐỌC'}
                    </button>
                </div>
            `;
        }

        overlay.innerHTML = `<div class="bcv-modal">
            <div class="bcv-modal-header">
                <h3>Công Việc: ${cvId}</h3>
                <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
            </div>
            <div class="bcv-modal-body">
                ${directorReadBannerHtml}

                ${acceptedText ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#059669,#10b981);border-radius:10px;margin-bottom:10px;font-size:12px;font-weight:800;color:#ffffff;box-shadow:0 4px 12px rgba(16,185,129,0.25);text-shadow:0 1px 2px rgba(0,0,0,0.2)">
                    <span style="font-size:16px">📥</span> Nhận việc lúc: ${acceptedText}
                </div>` : (createdText ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:10px;margin-bottom:10px;font-size:12px;font-weight:800;color:#ffffff">
                    <span style="font-size:16px">📤</span> Bàn giao lúc: ${createdText}
                </div>` : '')}

                ${task.collection_name ? `<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 8px rgba(37,99,235,0.1)">
                    <div>
                        <div style="font-size:10px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:.5px">📦 Bộ Sưu Tập Liên Kết</div>
                        <div style="font-size:14px;font-weight:800;color:#1e3a8a;margin-top:2px">${_esc(task.collection_name)}</div>
                    </div>
                    <a href="/bosuutap" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:8px 14px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:12px;font-weight:800;border-radius:8px;text-decoration:none;box-shadow:0 2px 6px rgba(37,99,235,0.3)">
                        🔗 Mở Bộ Sưu Tập ↗
                    </a>
                </div>` : ''}

                ${deadlineText ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:${isOverdue ? 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)' : 'linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)'};border-radius:12px;margin-bottom:16px;font-size:14px;font-weight:900;color:#ffffff;box-shadow:0 4px 16px ${isOverdue ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.3)'};text-shadow:0 1px 2px rgba(0,0,0,0.2)">
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:20px">${isOverdue ? '⚠️' : '📅'}</span>
                        <span>Deadline: ${deadlineText}</span>
                    </div>
                    ${isOverdue ? `<span style="font-size:11px;font-weight:900;background:rgba(255,255,255,0.25);padding:4px 12px;border-radius:12px;letter-spacing:0.5px">⚠️ QUÁ HẠN!</span>` : `<span style="font-size:11px;font-weight:800;background:rgba(255,255,255,0.18);padding:4px 12px;border-radius:12px;letter-spacing:0.5px">QUAN TRỌNG</span>`}
                </div>` : ''}
                <!-- 1. Grid 2 cột: LOẠI / ƯU TIÊN (lên trên Tiêu đề) -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
                    <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Loại</div>
                        <div style="font-size:13px;font-weight:700">${typeLabel}</div>
                    </div>
                    <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Ưu tiên</div>
                        <div style="font-size:13px;font-weight:700">${priorityLabel}</div>
                    </div>
                </div>

                <!-- 2. TIÊU ĐỀ -->
                <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Tiêu đề</div>
                    <div style="font-size:15px;font-weight:800;color:#1e293b;line-height:1.4">${_esc(task.title)}</div>
                </div>

                <!-- 3. MÔ TẢ CÔNG VIỆC -->
                ${task.description ? `<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Mô tả công việc</div>
                    <div style="font-size:13px;font-weight:600;color:#334155;line-height:1.6;white-space:pre-wrap">${_esc(task.description)}</div>
                </div>` : ''}

                <!-- 3.5 SỐ LƯỢNG CẦN SẢN XUẤT (Cho Video / Ảnh Ads ở PHÒNG MARKETING) -->
                ${(task.target_quantity && (_bcvIsVideoAdsCat(task.title) || task.ads_linh_vuc)) ? `<div style="background:#f5f3ff;border-radius:12px;padding:14px 16px;border:1.5px solid #c7d2fe;margin-bottom:16px">
                    <div style="font-size:10.5px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔢 SỐ LƯỢNG CẦN SẢN XUẤT</div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="background:#4338ca;color:white;padding:4px 14px;border-radius:20px;font-size:16px;font-weight:900;box-shadow:0 2px 6px rgba(67,56,202,0.3)">${task.target_quantity}</span>
                        <span style="font-size:13.5px;font-weight:700;color:#3730a3">sản phẩm / video / ảnh</span>
                    </div>
                </div>` : ''}

                <!-- 4. ĐƯỜNG LINK CÔNG VIỆC -->
                ${task.task_link ? `<div style="margin-bottom:16px">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔗 Đường link công việc</div>
                    <a href="${_escAttr(task.task_link)}" target="_blank" style="display:block;font-size:12px;color:#3b82f6;font-weight:600;word-break:break-all;padding:8px 12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe">${_esc(task.task_link)} ↗</a>
                </div>` : ''}

                <!-- 5. LINK HƯỚNG DẪN / BIỂU MẪU -->
                ${task.guide_link ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📚 LINK HƯỚNG DẪN / BIỂU MẪU</div>
                    ${_bcvFormatGuideLinkDisplay(task.guide_link)}
                </div>` : ''}



                <!-- 7. HÌNH ẢNH ĐÍNH KÈM (Ẩn khi không có ảnh) -->
                ${(attachments.length > 0 || isManager || isCreator) ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🖼️ Hình ảnh đính kèm (${attachments.length})</div>
                    ${attachments.length > 0 ? `<div class="bcv-att-gallery">
                        ${attachments.map(function(att) {
                            var isImg = (att.file_name || '').match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            if (isImg) {
                                return '<div class="bcv-att-thumb" onclick="_bcvOpenLightbox(\'' + _escAttr(att.file_path) + '\')">' +
                                    '<img src="' + _escAttr(att.file_path) + '" alt="' + _escAttr(att.file_name) + '" loading="lazy">' +
                                    ((isManager || isCreator) ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                                '</div>';
                            } else {
                                var icon = (att.file_name || '').match(/\.pdf$/i) ? '📄' : '📎';
                                return '<div class="bcv-att-thumb" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:default" onclick="window.open(\'' + _escAttr(att.file_path) + '\',\'_blank\')">' +
                                    '<span style="font-size:24px">' + icon + '</span>' +
                                    '<span style="font-size:8px;font-weight:600;color:#64748b;text-align:center;padding:0 4px;word-break:break-all">' + _esc(att.file_name) + '</span>' +
                                    ((isManager || isCreator) ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                                '</div>';
                            }
                        }).join('')}
                    </div>` : ''}
                    ${(isManager || isCreator) ? '<div style="margin-top:8px"><label class="bcv-cl-add" style="cursor:pointer"><input type="file" accept="image/*" style="display:none" onchange="_bcvUploadAttachment(' + task.id + ',this)"> ＋ Thêm hình ảnh</label></div>' : ''}
                </div>` : ''}

                <!-- 8. Box Thông tin Giao/Nhận/Deadline/Phòng ban (nằm dưới Hình ảnh đính kèm) -->
                <div class="bcv-card-info-box" style="margin-bottom:16px">
                    <div class="bcv-card-info-row">
                        <span class="info-icon">📤</span>
                        <span class="info-label">Giao việc</span>
                        <span class="info-value">${_esc(task.created_by_name || '?')}</span>
                    </div>
                    <div class="bcv-card-info-row">
                        <span class="info-icon">📥</span>
                        <span class="info-label">Nhận việc</span>
                        <span class="info-value" style="color:#16a34a">${_esc(task.assigned_to_name || 'Chưa giao')}</span>
                    </div>
                    ${deadlineText ? `<div class="bcv-card-info-row">
                        <span class="info-icon">📅</span>
                        <span class="info-label">Deadline</span>
                        <span class="info-value">${deadlineText}</span>
                    </div>` : ''}
                    ${task.department_name ? `<div class="bcv-card-info-row">
                        <span class="info-icon">🏢</span>
                        <span class="info-label">Phòng ban</span>
                        <span class="info-value">${_esc(task.department_name)}</span>
                    </div>` : ''}
                </div>

                ${canAccept ? `<div style="margin-top:20px;text-align:center">
                    <button class="bcv-btn bcv-btn-success" data-no-debounce="true" onclick="_bcvAcceptTask(${task.id}, this)" style="padding:10px 28px;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                        ✅ NHẬN CÔNG VIỆC
                    </button>
                </div>` : ''}

                <div class="bcv-form-actions" style="margin-top:16px">
                    ${(user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao' || isCreator) ? `<button class="bcv-btn bcv-btn-primary" data-no-debounce="true" onclick="document.getElementById('bcvOverlay').remove();_bcvShowEditTaskModal(${task.id})">✏️ Chỉnh sửa công việc</button>` : ''}
                    ${canDelete ? `<button class="bcv-btn bcv-btn-danger" data-no-debounce="true" onclick="_bcvDeleteTask(${task.id})">🗑 Xóa Công Việc</button>` : ''}
                    <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()">Đóng</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        return;
    }

    // ========== ĐANG LÀM / CHỜ DUYỆT / HOÀN THÀNH: Modal edit bình thường ==========

    // Load comments, checklist, attachments, feedbacks
    var commentsRes = await _bcvApi('/api/board-tasks/' + taskId + '/comments');
    var comments = (commentsRes && commentsRes.comments) || [];
    var checklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
    var checklist = (checklistRes && checklistRes.checklist) || [];
    var attachRes = await _bcvApi('/api/board-tasks/' + taskId + '/attachments');
    var attachments = (attachRes && attachRes.attachments) || [];
    var feedbacksRes = await _bcvApi('/api/board-tasks/' + taskId + '/feedbacks');
    var feedbacks = (feedbacksRes && feedbacksRes.feedbacks) || [];

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var statusOptions = ['can_lam','dang_lam','cho_duyet','hoan_thanh'].map(function(s) {
        var label = s === 'can_lam' ? 'Cần Làm' : s === 'dang_lam' ? 'Đang Làm' : s === 'cho_duyet' ? 'Chờ Duyệt' : 'Hoàn Thành';
        return `<option value="${s}" ${task.status === s ? 'selected' : ''}>${label}</option>`;
    }).join('');

    var priorityOptions = ['cao','trung_binh','thap'].map(function(p) {
        var label = p === 'cao' ? '🔴 Cao' : p === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp';
        return `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${label}</option>`;
    }).join('');

    var commentsHtml = comments.map(function(cm) {
        var timeStr = cm.created_at ? new Date(cm.created_at).toLocaleString('vi-VN') : '';
        return `<div class="bcv-comment">
            <div class="bcv-comment-head">
                <span class="bcv-comment-user">${_esc(cm.user_name || '?')}</span>
                <span class="bcv-comment-time">${timeStr}</span>
            </div>
            <div class="bcv-comment-text">${_esc(cm.content)}</div>
        </div>`;
    }).join('');

    var priorityLabel = task.priority === 'cao' ? '🔴 Cao' : task.priority === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp';
    var typeLabel = task.task_type === 'chinh' ? '🔵 Chính' : '🟡 Phụ';

    var canEditSection1 = (task.status === 'can_lam') && (user.role === 'giam_doc' || isCreator);
    var canEditReport = isAssignee && (task.status === 'dang_lam');

    var myReadAtStr = task.my_read_at ? _bcvFormatVNTime(task.my_read_at, true) : '';
    var readers = task.read_by_users || [];
    var readersStr = readers.length > 0
        ? readers.map(function(r){ return _esc(r.full_name) + ' (' + _bcvFormatVNTime(r.read_at, true) + ')'; }).join(', ')
        : 'Chưa có ai đọc';

    var directorReadBannerHtml = '';
    if (_bcv.tab === 'ban_giao' && _bcvCanSeeReadStatus(user)) {
        directorReadBannerHtml = `
            <div style="background:${task.my_read ? '#f0fdf4' : '#fff1f2'};border:1.5px solid ${task.my_read ? '#86efac' : '#fecdd3'};border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:800;color:${task.my_read ? '#15803d' : '#e11d48'};display:flex;align-items:center;gap:6px">
                        <span>${task.my_read ? '🟢 Bạn đã đọc công việc này' : '🔴 Bạn chưa đánh dấu đã đọc'}</span>
                        ${myReadAtStr ? `<span style="font-size:11px;font-weight:600;color:#047857">(${myReadAtStr})</span>` : ''}
                    </div>
                    ${(user.role === 'giam_doc' || isManager) ? `<div style="font-size:11px;font-weight:700;color:#64748b;margin-top:4px">👥 Người đã đọc (${readers.length}): <span style="color:#334155;font-weight:600">${readersStr}</span></div>` : ''}
                </div>
                <button class="bcv-btn" data-no-debounce="true" onclick="_bcvToggleMyRead(${task.id}, ${!task.my_read})" style="padding:${task.my_read ? '6px 14px' : '8px 18px'};font-size:12px;font-weight:800;background:${task.my_read ? '#fff' : 'linear-gradient(135deg,#16a34a,#15803d)'};color:${task.my_read ? '#dc2626' : '#fff'};border:${task.my_read ? '1px solid #fca5a5' : 'none'};border-radius:8px;cursor:pointer;box-shadow:${task.my_read ? 'none' : '0 3px 10px rgba(22,163,74,0.35)'}">
                    ${task.my_read ? '✕ Bỏ đánh dấu đã đọc' : '👁️ Đánh dấu TÔI ĐÃ ĐỌC'}
                </button>
            </div>
        `;
    }

    overlay.innerHTML = `<div class="bcv-modal">
        <div class="bcv-modal-header">
            <h3>Công Việc: ${cvId}</h3>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
        </div>
        <div class="bcv-modal-body">

            ${directorReadBannerHtml}

            <!-- ═══ KHỐI THÔNG BÁO ĐÁNH GIÁ HOÀN THÀNH (NẾU ĐÃ HOÀN THÀNH) ═══ -->
            ${task.status === 'hoan_thanh' ? `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px 16px;margin-bottom:16px;box-shadow:0 4px 12px rgba(22,163,74,0.08)">
                <div style="font-size:13px;font-weight:800;color:#16a34a;display:flex;align-items:center;gap:6px">
                    <span>⭐ ĐÁNH GIÁ HOÀN THÀNH CỦA QUẢN LÝ</span>
                    ${task.reviewed_at ? `<span style="font-size:11px;font-weight:600;color:#15803d">(${new Date(task.reviewed_at).toLocaleString('vi-VN')})</span>` : ''}
                </div>
                ${task.review_comment ? `<div style="font-size:13px;font-weight:600;color:#334155;margin-top:8px;line-height:1.5;white-space:pre-wrap">${_esc(task.review_comment)}</div>` : '<div style="font-size:12px;font-weight:600;color:#16a34a;margin-top:4px">Đã nghiệm thu công việc thành công.</div>'}
            </div>` : ''}

            <!-- ═══ KHỐI THÔNG BÁO YÊU CẦU SỬA LẠI & LỊCH SỬ CÁC LẦN SỬA (TIMELINE) ═══ -->
            ${feedbacks.length > 0 ? (function() {
                var latestFb = feedbacks[0];
                var olderFbs = feedbacks.slice(1);
                var latestRevNum = feedbacks.length;
                var latestTimeStr = latestFb.created_at ? new Date(latestFb.created_at).toLocaleString('vi-VN') : '';
                var latestRevName = latestFb.reviewer_name || 'Quản Lý';

                return `<div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 4px 14px rgba(225,29,72,0.1)">
                    <div style="font-size:14px;font-weight:900;color:#e11d48;display:flex;align-items:center;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:10px;margin-bottom:12px">
                        <div style="display:flex;align-items:center;gap:6px">
                            <span style="font-size:16px">⚠️</span> YÊU CẦU SỬA LẠI TỪ QUẢN LÝ (${feedbacks.length} lần)
                        </div>
                        <span style="font-size:11px;font-weight:800;background:#ffe4e6;color:#be123c;padding:3px 10px;border-radius:12px;border:1px solid #fecdd3">Lần mới nhất: ${latestTimeStr}</span>
                    </div>

                    <!-- LẦN MỚI NHẤT (HIỂN THỊ MẶC ĐỊNH) -->
                    <div style="background:#ffffff;border:1.5px solid #e11d48;border-radius:10px;padding:12px 14px;box-shadow:0 2px 8px rgba(225,29,72,0.12)">
                        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:6px">
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="background:#e11d48;color:#ffffff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;letter-spacing:0.5px">LẦN ${latestRevNum} (MỚI NHẤT)</span>
                                <span style="font-weight:800;color:#1e293b">👤 ${_esc(latestRevName)}</span>
                            </div>
                            <span style="font-size:11px;font-weight:700;color:#64748b">🕒 ${latestTimeStr}</span>
                        </div>
                        <div style="font-size:13px;font-weight:600;color:#334155;line-height:1.5;white-space:pre-wrap;margin-top:4px">${_esc(latestFb.feedback_content)}</div>
                        ${latestFb.feedback_link ? `<div style="margin-top:8px"><a href="${_escAttr(latestFb.feedback_link)}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#be123c;background:#ffe4e6;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;text-decoration:none">🔗 Link Feedback sửa ↗</a></div>` : ''}
                    </div>

                    <!-- CÁC LẦN CŨ HƠN (THU GỌN MẶC ĐỊNH) -->
                    ${olderFbs.length > 0 ? `
                        <div style="margin-top:10px">
                            <button type="button" onclick="_bcvToggleFeedbackHistory(this)" style="background:#ffe4e6;color:#9f1239;border:1px solid #fecdd3;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;width:100%;justify-content:center;transition:all 0.2s">
                                📜 Xem lịch sử yêu cầu sửa (${olderFbs.length} lần) ▾
                            </button>
                            <div class="bcv-older-feedbacks" style="display:none;margin-top:10px;flex-direction:column;gap:10px">
                                ${olderFbs.map(function(fb, idx) {
                                    var revNum = olderFbs.length - idx;
                                    var timeStr = fb.created_at ? new Date(fb.created_at).toLocaleString('vi-VN') : '';
                                    var revName = fb.reviewer_name || 'Quản Lý';

                                    return `<div style="background:#fff8f8;border:1px solid #fecdd3;border-radius:10px;padding:12px 14px">
                                        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:6px">
                                            <div style="display:flex;align-items:center;gap:6px">
                                                <span style="background:#9f1239;color:#ffffff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;letter-spacing:0.5px">LẦN ${revNum}</span>
                                                <span style="font-weight:800;color:#1e293b">👤 ${_esc(revName)}</span>
                                            </div>
                                            <span style="font-size:11px;font-weight:700;color:#64748b">🕒 ${timeStr}</span>
                                        </div>
                                        <div style="font-size:13px;font-weight:600;color:#334155;line-height:1.5;white-space:pre-wrap;margin-top:4px">${_esc(fb.feedback_content)}</div>
                                        ${fb.feedback_link ? `<div style="margin-top:8px"><a href="${_escAttr(fb.feedback_link)}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#be123c;background:#ffe4e6;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;text-decoration:none">🔗 Link Feedback sửa ↗</a></div>` : ''}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>`;
            })() : ''}

            <!-- ═══ SECTION 1: THÔNG TIN CÔNG VIỆC ═══ -->
            ${acceptedText ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#059669,#10b981);border-radius:10px;margin-bottom:10px;font-size:12px;font-weight:800;color:#ffffff;box-shadow:0 4px 12px rgba(16,185,129,0.25);text-shadow:0 1px 2px rgba(0,0,0,0.2)">
                <span style="font-size:16px">📥</span> Nhận việc lúc: ${acceptedText}
            </div>` : (createdText ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:10px;margin-bottom:10px;font-size:12px;font-weight:800;color:#ffffff">
                <span style="font-size:16px">📤</span> Bàn giao lúc: ${createdText}
            </div>` : '')}

            ${deadlineText ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:${isOverdue ? 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)' : 'linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)'};border-radius:12px;margin-bottom:16px;font-size:14px;font-weight:900;color:#ffffff;box-shadow:0 4px 16px ${isOverdue ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.3)'};text-shadow:0 1px 2px rgba(0,0,0,0.2)">
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:20px">${isOverdue ? '⚠️' : '📅'}</span>
                    <span>Deadline: ${deadlineText}</span>
                </div>
                ${isOverdue ? `<span style="font-size:11px;font-weight:900;background:rgba(255,255,255,0.25);padding:4px 12px;border-radius:12px;letter-spacing:0.5px">⚠️ QUÁ HẠN!</span>` : `<span style="font-size:11px;font-weight:800;background:rgba(255,255,255,0.18);padding:4px 12px;border-radius:12px;letter-spacing:0.5px">QUAN TRỌNG</span>`}
            </div>` : ''}

            <!-- 1. Grid 2 cột: LOẠI / ƯU TIÊN (lên trên Tiêu đề) -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
                <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Loại</div>
                    <div style="font-size:13px;font-weight:700">${typeLabel}</div>
                </div>
                <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Ưu tiên</div>
                    ${canEditSection1 ? `<select class="bcv-form-select" id="bcvDetailPriority" style="padding:2px 6px;font-size:12px;font-weight:700;margin:0;border:none;background:transparent">${priorityOptions}</select>` : `<div style="font-size:13px;font-weight:700">${priorityLabel}</div>`}
                </div>
            </div>

            <!-- 2. TIÊU ĐỀ -->
            <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Tiêu đề</div>
                ${canEditSection1 ? `<input class="bcv-form-input-prominent" id="bcvDetailTitle" value="${_escAttr(task.title)}" style="font-size:15px;font-weight:800;border:none;background:transparent;padding:0;width:100%;outline:none">` : `<div style="font-size:15px;font-weight:800;color:#1e293b;line-height:1.4">${_esc(task.title)}</div>`}
            </div>

            <!-- 3. MÔ TẢ CÔNG VIỆC -->
            ${(task.description || canEditSection1) ? `<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Mô tả công việc</div>
                ${canEditSection1 ? `<textarea class="bcv-form-textarea-prominent" id="bcvDetailDesc" style="font-size:13px;font-weight:600;border:none;background:transparent;padding:0;width:100%;outline:none;min-height:60px">${_esc(task.description || '')}</textarea>` : `<div style="font-size:13px;font-weight:600;color:#334155;line-height:1.6;white-space:pre-wrap">${_esc(task.description)}</div>`}
            </div>` : ''}

            <!-- 3.5 SỐ LƯỢNG CẦN SẢN XUẤT (Cho Video / Ảnh Ads ở PHÒNG MARKETING) -->
            ${(task.target_quantity && (_bcvIsVideoAdsCat(task.title) || task.ads_linh_vuc)) ? `<div style="background:#f5f3ff;border-radius:12px;padding:14px 16px;border:1.5px solid #c7d2fe;margin-bottom:16px">
                <div style="font-size:10.5px;font-weight:800;color:#4338ca;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔢 SỐ LƯỢNG CẦN SẢN XUẤT</div>
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="background:#4338ca;color:white;padding:4px 14px;border-radius:20px;font-size:16px;font-weight:900;box-shadow:0 2px 6px rgba(67,56,202,0.3)">${task.target_quantity}</span>
                    <span style="font-size:13.5px;font-weight:700;color:#3730a3">sản phẩm / video / ảnh</span>
                </div>
            </div>` : ''}

            <!-- 4. ĐƯỜNG LINK CÔNG VIỆC (Ẩn khi không có link) -->
            ${(task.task_link || canEditSection1) ? `<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔗 Đường link công việc</div>
                ${canEditSection1 ? `<div>
                    <input class="bcv-form-input-prominent" id="bcvDetailLink" value="${_escAttr(task.task_link || '')}" placeholder="https://..." style="font-size:13px;font-weight:600;border:none;background:transparent;padding:0;width:100%;outline:none">
                    ${task.task_link ? `<a href="${_escAttr(task.task_link)}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#2563eb;margin-top:8px;text-decoration:underline;word-break:break-all">${_esc(task.task_link)} ↗</a>` : ''}
                </div>` : `<a href="${_escAttr(task.task_link)}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:#2563eb;text-decoration:underline;word-break:break-all">${_esc(task.task_link)} ↗</a>`}
            </div>` : ''}

            <!-- 5. LINK HƯỚNG DẪN / BIỂU MẪU -->
            ${(task.guide_link || canEditSection1) ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📚 LINK HƯỚNG DẪN / BIỂU MẪU</div>
                ${canEditSection1 ? `<div>
                    <input class="bcv-form-input" id="bcvDetailGuideLink" value="${_escAttr(task.guide_link || '')}" placeholder="https://... (link Google Docs, Drive, Video hướng dẫn...)" style="font-size:12px;font-weight:600">
                    <div style="margin-top:6px">${_bcvGetFriendlyGuideLinkHtml(task.guide_link, task.department_id)}</div>
                </div>` : _bcvGetFriendlyGuideLinkHtml(task.guide_link, task.department_id)}
            </div>` : ''}

            <!-- 7. HÌNH ẢNH ĐÍNH KÈM (Ẩn khi không có hình ảnh) -->
            ${attachments.length > 0 ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🖼️ Hình ảnh đính kèm (${attachments.length})</div>
                <div class="bcv-att-gallery">
                    ${attachments.map(function(att) {
                        var isImg = (att.file_name || '').match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        var canManageAtt = isAssignee || isManager || isCreator;
                        if (isImg) {
                            return '<div class="bcv-att-thumb" onclick="_bcvOpenLightbox(\'' + _escAttr(att.file_path) + '\')">' +
                                '<img src="' + _escAttr(att.file_path) + '" alt="' + _escAttr(att.file_name) + '" loading="lazy">' +
                                (canManageAtt ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                            '</div>';
                        } else {
                            var icon = (att.file_name || '').match(/\.pdf$/i) ? '📄' : '📎';
                            return '<div class="bcv-att-thumb" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:default" onclick="window.open(\'' + _escAttr(att.file_path) + '\',\'_blank\')">' +
                                '<span style="font-size:24px">' + icon + '</span>' +
                                '<span style="font-size:8px;font-weight:600;color:#64748b;text-align:center;padding:0 4px;word-break:break-all">' + _esc(att.file_name) + '</span>' +
                                (canManageAtt ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                            '</div>';
                        }
                    }).join('')}
                </div>
            </div>` : ''}

            <!-- 8. Box Thông tin Giao/Nhận/Deadline/Phòng ban (nằm dưới Hình ảnh đính kèm) -->
            <div class="bcv-card-info-box" style="margin-bottom:16px">
                <div class="bcv-card-info-row">
                    <span class="info-icon">📤</span>
                    <span class="info-label">Giao việc</span>
                    <span class="info-value">${_esc(task.created_by_name || '?')}</span>
                </div>
                <div class="bcv-card-info-row">
                    <span class="info-icon">📥</span>
                    <span class="info-label">Nhận việc</span>
                    <span class="info-value" style="color:#16a34a">${_esc(task.assigned_to_name || 'Chưa giao')}</span>
                </div>
                <div class="bcv-card-info-row${isOverdue ? ' overdue' : ''}">
                    <span class="info-icon">📅</span>
                    <span class="info-label">Deadline</span>
                    <span class="info-value">${canEditSection1 ? `<input class="bcv-form-input" type="date" id="bcvDetailDeadline" value="${task.deadline ? task.deadline.split('T')[0] : ''}" style="padding:2px 6px;font-size:11px;font-weight:700;border:none;background:transparent">` : (deadlineText || (task.deadline ? task.deadline.split('T')[0] : '—'))}</span>
                </div>
                ${task.department_name ? `<div class="bcv-card-info-row">
                    <span class="info-icon">🏢</span>
                    <span class="info-label">Phòng ban</span>
                    <span class="info-value">${_esc(task.department_name)}</span>
                </div>` : ''}
            </div>

            <!-- ═══ SECTION 2: BÁO CÁO TIẾN ĐỘ ═══ -->
            <div class="bcv-card-section2">
            <div class="bcv-section-divider">
                <span class="bcv-section-title-badge">📝 BÁO CÁO TIẾN ĐỘ</span>
                ${!isAssignee ? '<span style="margin-left:auto;font-size:10px;font-weight:700;color:#fff;background:rgba(255,255,255,.18);padding:4px 10px;border-radius:8px;letter-spacing:.3px">👁️ Chế độ chỉ xem</span>' : ''}
            </div>

            <!-- Khối 1: Tiến Độ & Checklist -->
            <div class="bcv-report-area">
                <div class="bcv-form-group" style="margin-bottom:14px">
                    <label style="font-weight:700;color:#0f172a">📊 TIẾN ĐỘ HOÀN THÀNH</label>
                    <div class="bcv-progress-single-wrap">
                        <input type="range" class="bcv-progress-single-slider" id="bcvDetailProgress" min="0" max="100" value="${task.progress || 0}" ${!canEditReport ? 'disabled style="cursor:not-allowed"' : ''} oninput="_bcvUpdateProgressDisplay(this.value)">
                        <div class="bcv-progress-badge" id="bcvProgressDisplay" style="background:${(task.progress||0) < 30 ? '#ef4444' : (task.progress||0) < 70 ? '#f59e0b' : '#22c55e'}">${task.progress || 0}%</div>
                    </div>
                </div>

                <!-- Checklist Cards -->
                <div class="bcv-form-group">
                    <label style="font-weight:700;color:#0f172a">✅ CHECKLIST CÔNG VIỆC (${checklist.filter(c => c.is_done).length}/${checklist.length})</label>
                    <div id="bcvReportChecklist">
                        ${checklist.map(function(item) {
                            var doneTime = '';
                            if (item.is_done && item.completed_at) {
                                var d = new Date(item.completed_at);
                                doneTime = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0') + ' ' + String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
                            }
                            var itemContentStr = item.content != null ? String(item.content).trim() : '';
                            var itemLinkStr = item.link != null ? String(item.link).trim() : '';
                            var isDocItem = !!itemContentStr || !!itemLinkStr;

                            var linksHtml = '';
                            if (itemLinkStr) {
                                var linkList = [];
                                if (itemLinkStr.startsWith('[') || itemLinkStr.startsWith('{')) {
                                    try { linkList = JSON.parse(itemLinkStr); } catch(e){}
                                }
                                if (!Array.isArray(linkList) || linkList.length === 0) {
                                    linkList = [{ title: item.title || 'Link công việc', url: itemLinkStr }];
                                }
                                linksHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
                                linkList.forEach(function(l) {
                                    var lTitle = typeof l === 'string' ? l : (l.title || l.url || 'Link công việc');
                                    var lUrl = typeof l === 'string' ? l : (l.url || '#');
                                    linksHtml += '<a href="' + _escAttr(lUrl) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all">🔗 ' + _esc(lTitle) + ' ↗</a>';
                                });
                                linksHtml += '</div>';
                            }

                            return '<div class="bcv-cl-card ' + (item.is_done ? 'done' : '') + '" data-cl-id="' + item.id + '" style="background:#f8fafc;border:1px solid #cbd5e1;' + (isDocItem ? 'border-left:4px solid #3b82f6;' : '') + 'border-radius:10px;padding:12px;margin-bottom:10px">' +
                                '<div class="bcv-cl-card-head" style="display:flex;align-items:center;gap:8px">' +
                                    '<input type="checkbox" ' + (item.is_done ? 'checked' : '') + ' ' + (!canEditReport ? 'disabled style="cursor:not-allowed"' : '') + ' onchange="_bcvToggleChecklist(' + task.id + ',' + item.id + ',this.checked)" style="width:18px;height:18px;cursor:pointer">' +
                                    (isDocItem ? '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;white-space:nowrap">🔒 Tư Liệu</span>' : '') +
                                    '<span class="bcv-cl-card-title" style="font-weight:700;color:#0f172a;font-size:13px;flex:1">' + _esc(item.title) + '</span>' +
                                    (doneTime ? '<span class="bcv-cl-card-time" style="font-size:11px;color:#16a34a;font-weight:700"><span style="color:#16a34a;font-weight:800">✓</span> HT ' + doneTime + '</span>' : '') +
                                    (canEditReport && !isDocItem ? '<button class="bcv-btn-edit-sm" id="bcvClEditBtn_' + item.id + '" data-no-debounce="true" onclick="_bcvToggleClEdit(' + item.id + ')">✏️ Sửa</button>' : '') +
                                '</div>' +
                                '<div id="bcvClForm_' + item.id + '" style="display:none;margin-top:8px;padding-left:26px">' +
                                    '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">' +
                                        '<input class="bcv-form-input" id="bcvClTitle_' + item.id + '" value="' + _escAttr(item.title) + '" placeholder="Sửa tiêu đề mục checklist..." style="font-size:12px;font-weight:700;flex:1">' +
                                        '<button class="bcv-btn" style="padding:4px 10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;border-radius:6px;border:none;cursor:pointer" onclick="_bcvSaveChecklistDetail(' + task.id + ',' + item.id + ')">💾 Lưu tiêu đề</button>' +
                                        '<button class="bcv-btn" style="padding:4px 10px;font-size:11px;font-weight:700;background:#ef4444;color:#fff;border-radius:6px;border:none;cursor:pointer" onclick="_bcvDeleteChecklist(' + task.id + ',' + item.id + ')">🗑️ Xóa</button>' +
                                    '</div>' +
                                '</div>' +
                                (itemContentStr ? '<div style="color:#475569;font-size:12px;line-height:1.5;margin-top:6px;padding-left:26px;white-space:pre-wrap">' + _esc(itemContentStr) + '</div>' : '') +
                                (linksHtml ? '<div style="padding-left:26px;margin-top:4px">' + linksHtml + '</div>' : '') +

                                '<div style="margin-top:12px;padding:14px 16px;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:12px;margin-left:26px;box-shadow:0 1px 4px rgba(15,23,42,0.03)">' +
                                    '<div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">' +
                                        '<span>📝 Báo cáo kết quả <span style="color:#ef4444;font-weight:900">*</span></span>' +
                                        '<span id="bcvClAutoSave_' + item.id + '" style="font-size:11px;font-weight:800;color:#059669;display:none">✓ Đã tự động lưu</span>' +
                                    '</div>' +
                                    '<textarea class="bcv-cl-report-content" id="bcvClReportContent_' + item.id + '" placeholder="Nhập chi tiết kết quả thực hiện cho mục này..." ' + (!canEditReport ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : '') + ' oninput="_bcvDebounceAutoSaveClReport(' + task.id + ',' + item.id + ')" style="width:100% !important;max-width:100% !important;box-sizing:border-box !important;display:block !important;font-size:13px !important;font-weight:500 !important;font-family:\'Inter\',sans-serif !important;padding:10px 14px !important;border:1.5px solid #cbd5e1 !important;border-radius:10px !important;min-height:72px !important;outline:none !important;background:#fff;resize:vertical">' + _esc(item.report_content || '') + '</textarea>' +

                                    '<div style="font-size:12px;font-weight:800;color:#1e293b;margin-top:12px;margin-bottom:6px">' +
                                        '🔗 Link dẫn chứng hoàn thành <span style="color:#ef4444;font-weight:900">*</span>' +
                                    '</div>' +
                                    '<div style="display:flex;gap:8px;flex-direction:column;width:100%">' +
                                        '<input class="bcv-cl-report-link" id="bcvClReportLink_' + item.id + '" value="' + _escAttr(item.report_link || '') + '" placeholder="Dán link Google Docs, Drive, Image minh chứng..." ' + (!canEditReport ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : '') + ' oninput="_bcvDebounceAutoSaveClReport(' + task.id + ',' + item.id + ')" style="width:100% !important;max-width:100% !important;box-sizing:border-box !important;display:block !important;font-size:13px !important;font-weight:500 !important;font-family:\'Inter\',sans-serif !important;padding:10px 14px !important;border:1.5px solid #cbd5e1 !important;border-radius:10px !important;height:42px !important;outline:none !important;background:#fff">' +
                                        (item.report_link ? '<div><a href="' + _escAttr(item.report_link) + '" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;font-weight:800;color:#2563eb;background:#eff6ff;padding:5px 10px;border-radius:6px;border:1px solid #dbeafe;text-decoration:none;display:inline-flex;align-items:center;gap:4px">🔗 Xem link dẫn chứng ↗</a></div>' : '') +
                                    '</div>' +
                                '</div>' +
                            '</div>';
                        }).join('')}
                    </div>
                    ${canEditReport ? '<div style="display:flex;gap:6px;margin-top:6px"><input class="bcv-form-input" id="bcvNewCheckItem" placeholder="Thêm mục mới..." style="font-size:12px" onkeydown="if(event.key===\'Enter\')_bcvAddChecklist(' + task.id + ')"><button class="bcv-btn" data-no-debounce="true" style="padding:6px 14px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;border-radius:8px;border:none;cursor:pointer" onclick="_bcvAddChecklist(' + task.id + ')">Thêm</button></div>' : ''}
                </div>
            </div>

            <!-- Khối 2: Báo Cáo Tổng Thể Công Việc (Độc Lập Độc Tôn với Hiệu Ứng Lấp Lánh) -->
            <div class="bcv-overall-report-card">
                <div class="bcv-overall-report-header">
                    <div style="display:flex;align-items:center;gap:8px">
                        <span>📄 BÁO CÁO TỔNG THỂ CÔNG VIỆC</span>
                        <span id="bcvOverallAutoSaveIndicator" style="font-size:11px;font-weight:800;color:#059669;display:none;background:rgba(255,255,255,0.9);padding:2px 8px;border-radius:6px">✓ Đã tự động lưu</span>
                    </div>
                    <span style="font-size:10px;font-weight:800;background:rgba(255,255,255,0.22);padding:3px 10px;border-radius:12px;letter-spacing:0.5px">MỤC QUAN TRỌNG ★</span>
                </div>
                <div style="padding:18px">
                    <div class="bcv-form-group" style="margin-bottom:16px">
                        <label style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">📝 Nội dung báo cáo toàn bộ công việc <span style="color:#ef4444;font-size:14px;font-weight:900">*</span></label>
                        <textarea class="bcv-report-textarea" id="bcvDetailReportContent" placeholder="Mô tả chi tiết kết quả thực hiện toàn bộ công việc..." oninput="_bcvDebounceAutoSaveOverallReport(${task.id})" ${!canEditReport ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : ''}>${_esc(task.report_content || '')}</textarea>
                    </div>

                    <div class="bcv-form-group">
                        <label style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🔗 Đường link nộp báo cáo tổng thể <span style="color:#ef4444;font-size:14px;font-weight:900">*</span></label>
                        <input class="bcv-report-link-input" id="bcvDetailReportLink" value="${_escAttr(task.report_link || '')}" placeholder="Dán link Google Docs, Drive, Sheet báo cáo tổng thể..." oninput="_bcvDebounceAutoSaveOverallReport(${task.id})" ${!canEditReport ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : ''}>
                        ${task.report_link ? '<div style="margin-top:8px"><a href="' + _escAttr(task.report_link) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#ffffff;font-weight:800;background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:8px 16px;border-radius:8px;box-shadow:0 3px 10px rgba(37,99,235,0.3);text-decoration:none">🔗 Mở link nộp báo cáo tổng thể ↗</a></div>' : ''}
                    </div>
                </div>
            </div>
            </div>



            <div class="bcv-comments">
                <div class="bcv-comments-title">💬 Bình luận (${comments.length})</div>
                <div id="bcvCommentList">${commentsHtml || '<div style="color:#a8a29e;font-size:12px;padding:8px 0">Chưa có bình luận</div>'}</div>
                <div class="bcv-comment-input-wrap">
                    <input class="bcv-comment-input" id="bcvCommentInput" placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter')_bcvAddComment(${task.id})">
                    <button class="bcv-comment-send" onclick="_bcvAddComment(${task.id})">Gửi</button>
                </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0 4px;flex-wrap:wrap">
                ${task.status === 'dang_lam' && isAssignee ? `<button class="bcv-btn" id="bcvSubmitTaskBtn" data-no-debounce="true" onclick="_bcvSubmitTask(${task.id})" style="padding:10px 24px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;border:none;border-radius:10px;box-shadow:0 4px 14px rgba(16,185,129,0.35);cursor:pointer;display:inline-flex;align-items:center;gap:6px">🚀 Nộp Công Việc</button>` : ''}
                ${task.status === 'cho_duyet' && (isCreator || user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao') && !isAssignee ? `
                    <button class="bcv-btn" data-no-debounce="true" onclick="_bcvShowApproveModal(${task.id})" style="padding:10px 20px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:10px;box-shadow:0 4px 12px rgba(22,163,74,0.3);cursor:pointer;display:inline-flex;align-items:center;gap:6px">✅ DUYỆT CÔNG VIỆC</button>
                    <button class="bcv-btn" data-no-debounce="true" onclick="_bcvShowRejectModal(${task.id})" style="padding:10px 20px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:10px;box-shadow:0 4px 12px rgba(220,38,38,0.3);cursor:pointer;display:inline-flex;align-items:center;gap:6px">❌ KHÔNG DUYỆT (YÊU CẦU SỬA)</button>
                ` : ''}
                ${canDelete ? `<button class="bcv-btn bcv-btn-danger" data-no-debounce="true" onclick="_bcvDeleteTask(${task.id})" style="min-width:120px">🗑 Xóa Công Việc</button>` : ''}
                <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()" style="min-width:120px">Đóng</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(overlay);
}

// ========== XÁC NHẬN NHẬN CÔNG VIỆC ==========
async function _bcvAcceptTask(taskId, btnEl) {
    if (btnEl && btnEl.disabled) return;
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '⏳ Đang nhận công việc...';
        btnEl.style.opacity = '0.7';
        btnEl.style.cursor = 'not-allowed';
    }

    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/status', 'PATCH', { status: 'dang_lam' });
        if (res && res.ok) {
            var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
            var now = new Date();
            var timeStr = daysArr[now.getDay()] + ' - ' + String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
            
            var o = document.getElementById('bcvOverlay');
            if (o) o.remove();
            
            alert('✅ Đã nhận công việc thành công!\n\n📥 Nhận việc lúc: ' + timeStr);
            await _bcvLoadTasks();
        } else {
            alert('❌ Lỗi: ' + (res && res.error || 'Không thể nhận công việc'));
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.innerHTML = '✅ NHẬN CÔNG VIỆC';
                btnEl.style.opacity = '1';
                btnEl.style.cursor = 'pointer';
            }
        }
    } catch (err) {
        console.error('[bcvAcceptTask error]', err);
        alert('❌ Lỗi kết nối: ' + (err.message || 'Không thể nhận công việc'));
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '✅ NHẬN CÔNG VIỆC';
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
        }
    }
}

// Open lightbox to view image fullscreen
function _bcvOpenLightbox(src) {
    var lb = document.createElement('div');
    lb.className = 'bcv-lightbox';
    lb.innerHTML = '<button class="bcv-lightbox-close" onclick="this.parentElement.remove()">✕</button><img src="' + src + '">';
    lb.onclick = function(e) { if (e.target === lb) lb.remove(); };
    document.body.appendChild(lb);
    // Close on Escape
    var handler = function(e) { if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', handler); } };
    document.addEventListener('keydown', handler);
}

// Toggle edit form vs compact view for checklist item
function _bcvToggleClEdit(itemId, forceShowEdit) {
    var formEl = document.getElementById('bcvClForm_' + itemId);
    var btnEl = document.getElementById('bcvClEditBtn_' + itemId);
    if (!formEl) return;

    var isEdit = forceShowEdit !== undefined ? forceShowEdit : (formEl.style.display === 'none');
    if (isEdit) {
        formEl.style.display = 'block';
        if (btnEl) btnEl.textContent = '✕ Ẩn form';
    } else {
        formEl.style.display = 'none';
        if (btnEl) btnEl.textContent = '✏️ Sửa';
    }
}

// Save checklist item detail (title)
async function _bcvSaveChecklistDetail(taskId, itemId) {
    var titleInput = document.getElementById('bcvClTitle_' + itemId);
    var title = titleInput ? titleInput.value.trim() : null;

    var btn = event && event.target;
    if (btn && btn.tagName === 'BUTTON') {
        btn.disabled = true;
        btn.textContent = '💾 Đang lưu...';
    }

    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId + '/detail', 'PATCH', {
            title: title
        });
        if (res && res.ok) {
            var titleEl = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"] .bcv-cl-card-title');
            if (titleEl && title) titleEl.textContent = title;
            _bcvToggleClEdit(itemId, false);

            var task = (_bcv.tasks || []).find(function(t) { return t.id === taskId; });
            if (task && task.checklist) {
                var clItem = task.checklist.find(function(c) { return c.id === itemId; });
                if (clItem && title) clItem.title = title;
            }
        } else {
            alert('⚠️ ' + (res?.error || 'Lỗi lưu thông tin checklist'));
        }
    } catch(e) {
        alert('⚠️ ' + (e.message || 'Lỗi lưu thông tin checklist'));
    } finally {
        if (btn && btn.tagName === 'BUTTON') {
            btn.disabled = false;
            btn.textContent = '💾 Lưu tiêu đề';
        }
    }
}

async function _bcvDeleteChecklist(taskId, itemId) {
    if (!confirm('Bạn có chắc muốn xóa mục checklist này?')) return;
    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId, 'DELETE');
        if (res && res.ok) {
            var cardEl = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"]');
            if (cardEl) cardEl.remove();

            var allBoxes = document.querySelectorAll('.bcv-cl-card-head input[type="checkbox"]');
            var checkedBoxes = document.querySelectorAll('.bcv-cl-card-head input[type="checkbox"]:checked');
            var countBadge = document.querySelector('#bcvReportChecklist')?.previousElementSibling;
            if (countBadge) countBadge.textContent = '✅ CHECKLIST CÔNG VIỆC (' + checkedBoxes.length + '/' + allBoxes.length + ')';

            var pct = allBoxes.length > 0 ? Math.round((checkedBoxes.length / allBoxes.length) * 100) : 0;
            var sliderEl = document.getElementById('bcvDetailProgress');
            if (sliderEl) {
                sliderEl.value = pct;
                _bcvUpdateProgressDisplay(pct);
            }
            var task = _bcv.tasks.find(t => t.id === taskId);
            if (task) {
                task.checklist = (task.checklist || []).filter(c => c.id !== itemId);
                task.progress = pct;
            }
        }
    } catch(e) {
        alert('⚠️ ' + (e.message || 'Lỗi xóa checklist'));
    }
}

// Update progress display in real-time when slider moves
function _bcvUpdateProgressDisplay(val) {
    val = parseInt(val, 10);
    var display = document.getElementById('bcvProgressDisplay');
    var color = val < 30 ? '#ef4444' : val < 70 ? '#f59e0b' : '#22c55e';
    if (display) { display.textContent = val + '%'; display.style.background = color; }
}

async function _bcvSaveDetail(taskId) {
    var statusEl = document.getElementById('bcvReportStatus') || document.getElementById('bcvDetailStatus');
    var rawReportLink = (document.getElementById('bcvDetailReportLink') || {}).value || '';
    var reportLink = rawReportLink.trim();

    if (reportLink) {
        var validated = _bcvNormalizeAndValidateUrl(reportLink);
        if (!validated.isValid) {
            alert('⚠️ Đường link nộp báo cáo tổng thể không đúng định dạng link Web hợp lệ!\n\nVui lòng dán đường link chuẩn (Ví dụ: link Google Sheet, Google Drive, Google Docs, Sheet báo cáo... có dạng https://...)');
            var reportInput = document.getElementById('bcvDetailReportLink');
            if (reportInput) reportInput.focus();
            return;
        }
        reportLink = validated.url;
        var reportInput = document.getElementById('bcvDetailReportLink');
        if (reportInput) reportInput.value = reportLink;
    }

    var body = {
        title: (document.getElementById('bcvDetailTitle') || {}).value || '',
        description: (document.getElementById('bcvDetailDesc') || {}).value || '',
        status: statusEl ? statusEl.value : 'can_lam',
        priority: (document.getElementById('bcvDetailPriority') || {}).value || 'trung_binh',
        progress: parseInt((document.getElementById('bcvDetailProgress') || {}).value || '0', 10),
        deadline: (document.getElementById('bcvDetailDeadline') || {}).value || null,
        task_link: (document.getElementById('bcvDetailLink') || {}).value || null,
        guide_link: (document.getElementById('bcvDetailGuideLink') || {}).value || null,
        report_content: (document.getElementById('bcvDetailReportContent') || {}).value || null,
        report_link: reportLink || null
    };

    var res = await _bcvApi('/api/board-tasks/' + taskId, 'PUT', body);
    if (res && res.ok) {
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvLoadTasks();
    } else {
        alert(res?.error || 'Lỗi cập nhật');
    }
}

async function _bcvDeleteTask(taskId) {
    var user = window._currentUser || {};
    var isDirector = user.role === 'giam_doc' || (user.username && user.username.toLowerCase().includes('giamdoc')) || Boolean(user.is_admin) || (user.username && user.username.toLowerCase() === 'admin');
    if (!isDirector) {
        alert('Chỉ Giám đốc mới có quyền xóa công việc!');
        return;
    }
    if (!confirm('Bạn có chắc muốn xóa task này?')) return;
    var res = await _bcvApi('/api/board-tasks/' + taskId, 'DELETE');
    if (res && res.ok) {
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvLoadTasks();
    } else {
        alert(res?.error || 'Lỗi xóa task');
    }
}

async function _bcvAddComment(taskId) {
    var input = document.getElementById('bcvCommentInput');
    if (!input || !input.value.trim()) return;

    var res = await _bcvApi('/api/board-tasks/' + taskId + '/comments', 'POST', { content: input.value.trim() });
    if (res && res.ok) {
        // Re-open detail to refresh comments
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvShowDetail(taskId);
    }
}

// ========== DETAIL — Checklist & Attachment Helpers ==========

var _bcvClAutoSaveTimers = {};
function _bcvDebounceAutoSaveClReport(taskId, itemId) {
    if (_bcvClAutoSaveTimers[itemId]) clearTimeout(_bcvClAutoSaveTimers[itemId]);
    var badge = document.getElementById('bcvClAutoSave_' + itemId);
    if (badge) {
        badge.style.display = 'inline';
        badge.textContent = '⌛ Đang lưu...';
        badge.style.color = '#3b82f6';
    }

    _bcvClAutoSaveTimers[itemId] = setTimeout(function() {
        var contentEl = document.getElementById('bcvClReportContent_' + itemId);
        var linkEl = document.getElementById('bcvClReportLink_' + itemId);
        var repContent = contentEl ? contentEl.value : '';
        var repLink = linkEl ? linkEl.value : '';

        _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId + '/report', 'PATCH', {
            report_content: repContent,
            report_link: repLink
        }).then(function(res) {
            if (badge) {
                badge.style.display = 'inline';
                badge.textContent = '✓ Đã tự động lưu';
                badge.style.color = '#059669';
            }
            var task = (_bcv.tasks || []).find(function(t) { return t.id === taskId; });
            if (task && task.checklist) {
                var clItem = task.checklist.find(function(c) { return c.id === itemId; });
                if (clItem) {
                    clItem.report_content = repContent;
                    clItem.report_link = repLink;
                }
            }
        }).catch(function() {
            if (badge) {
                badge.style.display = 'inline';
                badge.textContent = '❌ Lỗi lưu';
                badge.style.color = '#ef4444';
            }
        });
    }, 500);
}

var _bcvOverallReportTimer = null;
function _bcvDebounceAutoSaveOverallReport(taskId) {
    if (_bcvOverallReportTimer) clearTimeout(_bcvOverallReportTimer);
    var indicator = document.getElementById('bcvOverallAutoSaveIndicator');
    if (indicator) {
        indicator.style.display = 'inline-block';
        indicator.textContent = '⌛ Đang lưu...';
        indicator.style.color = '#d97706';
    }
    _bcvOverallReportTimer = setTimeout(function() {
        var contentEl = document.getElementById('bcvDetailReportContent');
        var linkEl = document.getElementById('bcvDetailReportLink');
        var contentVal = contentEl ? contentEl.value : '';
        var linkVal = linkEl ? linkEl.value : '';

        _bcvApi('/api/board-tasks/' + taskId + '/report-overall', 'PATCH', {
            report_content: contentVal,
            report_link: linkVal
        }).then(function(res) {
            if (indicator) {
                indicator.style.display = 'inline-block';
                indicator.textContent = '✓ Đã tự động lưu';
                indicator.style.color = '#059669';
            }
            var task = (_bcv.tasks || []).find(function(t) { return t.id === taskId; });
            if (task) {
                task.report_content = contentVal;
                task.report_link = linkVal;
            }
        }).catch(function() {
            if (indicator) {
                indicator.style.display = 'inline-block';
                indicator.textContent = '❌ Lỗi lưu';
                indicator.style.color = '#ef4444';
            }
        });
    }, 500);
}

function _bcvIsValidUrl(str) {
    if (!str) return false;
    var s = String(str).trim();
    if (/^https?:\/\/.+/i.test(s)) return true;
    if (/^([\w\-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s)) return true;
    return false;
}

async function _bcvToggleChecklist(taskId, itemId, isDone) {
    if (isDone) {
        var contentEl = document.getElementById('bcvClReportContent_' + itemId);
        var linkEl = document.getElementById('bcvClReportLink_' + itemId);
        var repContent = contentEl ? contentEl.value.trim() : '';
        var repLink = linkEl ? linkEl.value.trim() : '';

        if (!repContent || !repLink) {
            var cb = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"] input[type="checkbox"]');
            if (cb) cb.checked = false;
            
            alert('⚠️ Vui lòng nhập Báo cáo kết quả và Link dẫn chứng hoàn thành cho mục checklist này trước khi tích chọn!');
            if (!repContent && contentEl) contentEl.focus();
            else if (!repLink && linkEl) linkEl.focus();
            return;
        }

        if (!_bcvIsValidUrl(repLink)) {
            var cb = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"] input[type="checkbox"]');
            if (cb) cb.checked = false;

            alert('⚠️ Link dẫn chứng hoàn thành phải là một đường link liên kết hợp lệ (ví dụ: https://... hoặc http://...), không được điền chữ/số thông thường!');
            if (linkEl) linkEl.focus();
            return;
        }
    }

    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId, 'PATCH', { is_done: isDone });
        if (res && res.error) {
            var cb = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"] input[type="checkbox"]');
            if (cb) cb.checked = !isDone;
            alert('⚠️ ' + res.error);
            return;
        }

        var cardEl = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"]');
        if (cardEl) {
            if (isDone) cardEl.classList.add('done');
            else cardEl.classList.remove('done');

            var headEl = cardEl.querySelector('.bcv-cl-card-head');
            var timeEl = cardEl.querySelector('.bcv-cl-card-time');
            if (isDone) {
                var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
                var now = new Date();
                var doneTime = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0') + ' ' + String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0');
                if (!timeEl) {
                    timeEl = document.createElement('span');
                    timeEl.className = 'bcv-cl-card-time';
                    var editBtn = cardEl.querySelector('.bcv-btn-edit-sm');
                    if (editBtn) editBtn.before(timeEl);
                    else if (headEl) headEl.appendChild(timeEl);
                }
                if (timeEl) timeEl.innerHTML = '<span style="color:#16a34a;font-weight:800">✓</span> HT ' + doneTime;
            } else if (timeEl) {
                timeEl.remove();
            }
        }

        // Auto-recalculate progress & update count badge
        var allBoxes = document.querySelectorAll('.bcv-cl-card-head input[type="checkbox"]');
        if (allBoxes.length > 0) {
            var checkedBoxes = document.querySelectorAll('.bcv-cl-card-head input[type="checkbox"]:checked');
            var countBadge = document.querySelector('#bcvReportChecklist')?.previousElementSibling;
            if (countBadge) countBadge.textContent = '✅ CHECKLIST CÔNG VIỆC (' + checkedBoxes.length + '/' + allBoxes.length + ')';

            var pct = Math.round((checkedBoxes.length / allBoxes.length) * 100);
            var sliderEl = document.getElementById('bcvDetailProgress');
            if (sliderEl) {
                sliderEl.value = pct;
                _bcvUpdateProgressDisplay(pct);
            }
            var task = _bcv.tasks.find(t => t.id === taskId);
            if (task) task.progress = pct;
        }
    } catch(e) {
        var cb = document.querySelector('.bcv-cl-card[data-cl-id="' + itemId + '"] input[type="checkbox"]');
        if (cb) cb.checked = !isDone;
        alert('⚠️ ' + (e.message || 'Lỗi khi cập nhật checklist'));
    }
}

async function _bcvAddChecklist(taskId) {
    var input = document.getElementById('bcvNewCheckItem');
    if (!input || !input.value.trim()) return;

    var val = input.value.trim();
    var btn = event && event.target;
    if (btn && btn.tagName === 'BUTTON') {
        btn.disabled = true;
        btn.textContent = '⏳...';
    }

    var curProgress = (document.getElementById('bcvDetailProgress') || {}).value;
    var curReportContent = (document.getElementById('bcvDetailReportContent') || {}).value;
    var curReportLink = (document.getElementById('bcvDetailReportLink') || {}).value;

    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist', 'POST', { title: val });
        if (res && res.ok) {
            await _bcvShowDetail(taskId);
            if (curProgress !== undefined) {
                var sliderEl = document.getElementById('bcvDetailProgress');
                if (sliderEl) { sliderEl.value = curProgress; _bcvUpdateProgressDisplay(curProgress); }
            }
            if (curReportContent !== undefined) {
                var rContentEl = document.getElementById('bcvDetailReportContent');
                if (rContentEl) rContentEl.value = curReportContent;
            }
            if (curReportLink !== undefined) {
                var rLinkEl = document.getElementById('bcvDetailReportLink');
                if (rLinkEl) rLinkEl.value = curReportLink;
            }
        } else {
            alert((res && res.error) || 'Không thể thêm mục checklist');
            if (btn && btn.tagName === 'BUTTON') {
                btn.disabled = false;
                btn.textContent = 'Thêm';
            }
        }
    } catch(e) {
        console.error('[bcvAddChecklist error]', e);
        alert('Lỗi thêm checklist: ' + (e.message || e));
        if (btn && btn.tagName === 'BUTTON') {
            btn.disabled = false;
            btn.textContent = 'Thêm';
        }
    }
}

async function _bcvDeleteChecklist(taskId, itemId) {
    await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId, 'DELETE');
    var el = document.querySelector('.bcv-detail-cl-item[data-cl-id="' + itemId + '"]');
    if (el) el.remove();
}

async function _bcvUploadAttachment(taskId, input) {
    if (!input.files || !input.files.length) return;
    var fd = new FormData();
    fd.append('file', input.files[0]);
    try {
        var resp = await fetch('/api/board-tasks/' + taskId + '/attachments', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
            body: fd
        });
        if (resp.ok) {
            var overlay = document.getElementById('bcvOverlay');
            if (overlay) overlay.remove();
            await _bcvShowDetail(taskId);
        }
    } catch(e) { console.error('Upload error:', e); }
}

async function _bcvDeleteAttachment(taskId, attId) {
    if (!confirm('X\u00f3a file n\u00e0y?')) return;
    var res = await _bcvApi('/api/board-tasks/' + taskId + '/attachments/' + attId, 'DELETE');
    if (res && res.ok) {
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvShowDetail(taskId);
    }
}

// ========== CONFIG MODAL (Director only) ==========

async function _bcvShowConfig() {
    var configRes = await _bcvApi('/api/board-config');
    var departments = (configRes && configRes.departments) || [];

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var deptRows = departments.map(function(d) {
        return `<div class="bcv-config-dept">
            <span class="bcv-config-dept-name">${_esc(d.name)} (${_esc(d.code)})</span>
            <label class="bcv-toggle">
                <input type="checkbox" ${d.board_enabled ? 'checked' : ''} onchange="_bcvToggleDept(${d.id}, this.checked)">
                <span class="bcv-toggle-slider"></span>
            </label>
        </div>`;
    }).join('');

    overlay.innerHTML = `<div class="bcv-modal">
        <div class="bcv-modal-header">
            <h3>⚙️ Cài Đặt Phòng Ban</h3>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
        </div>
        <div class="bcv-modal-body">
            <div style="font-size:12px;color:#78716c;margin-bottom:12px">Bật/tắt phòng ban sử dụng Bảng Công Việc:</div>
            ${deptRows || '<div style="color:#a8a29e;text-align:center;padding:20px">Chưa có phòng ban nào</div>'}
            <div class="bcv-form-actions">
                <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()">Đóng</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(overlay);
}

async function _bcvToggleDept(deptId, enabled) {
    await _bcvApi('/api/board-config', 'POST', { department_id: deptId, is_enabled: enabled });
    // Reload config data
    var configRes = await _bcvApi('/api/board-config');
    _bcv.departments = (configRes && configRes.departments) || [];
    _bcv.enabledDepts = _bcv.departments.filter(d => d.board_enabled);
    _bcvPopulateDeptFilter();
}

// ========== HELPERS ==========

function _bcvStatusToId(status) {
    return { can_lam: 'CanLam', dang_lam: 'DangLam', cho_duyet: 'ChoDuyet', hoan_thanh: 'HoanThanh' }[status] || '';
}

function _bcvFormatDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function _bcvApi(url, method, body) {
    try {
        var opts = { method: method || 'GET', headers: {} };
        var token = localStorage.getItem('token');
        if (token) opts.headers['Authorization'] = 'Bearer ' + token;
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        var res = await fetch(url, opts);
        return await res.json();
    } catch(e) {
        console.error('[BCV API]', e);
        return null;
    }
}

function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _escAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ========== TƯ LIỆU — DOCUMENT LIBRARY FUNCTIONS ==========

async function _bcvSwitchTab(tab) {
    var user = window._currentUser || {};
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    if (!isManager && tab !== 'me') {
        tab = 'me';
    }
    _bcv.tab = tab;
    try { localStorage.setItem('bcv_active_tab', tab); } catch(e){}
    document.querySelectorAll('.bcv-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    var filtersEl = document.getElementById('bcvFilters');
    var boardEl = document.getElementById('bcvBoard');
    var tuLieuEl = document.getElementById('bcvTuLieuView');
    var deadlineStatsEl = document.getElementById('bcvDeadlineStatsView');
    var actionBtnsEl = document.getElementById('bcvHeaderActionBtns');

    var user = window._currentUser || {};
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    var isDirector = ['giam_doc','quan_ly_cap_cao'].includes(user.role);

    if (tab === 'deadline') {
        if (filtersEl) filtersEl.style.display = 'none';
        if (boardEl) boardEl.style.display = 'none';
        if (tuLieuEl) tuLieuEl.style.display = 'none';
        if (!deadlineStatsEl) {
            deadlineStatsEl = document.createElement('div');
            deadlineStatsEl.id = 'bcvDeadlineStatsView';
            document.getElementById('bcvPage').appendChild(deadlineStatsEl);
        }
        deadlineStatsEl.style.display = 'block';
        if (actionBtnsEl) {
            actionBtnsEl.innerHTML = (isDirector ? '<button class="bcv-btn-config" onclick="_bcvShowConfig()">⚙️ Cài đặt phòng ban</button>' : '') +
                (isManager ? '<button class="bcv-btn-create" onclick="_bcvShowCreate()">＋ Tạo task mới</button>' : '');
        }
        await _bcvLoadDeadlineStats();
    } else if (tab === 'tu_lieu') {
        if (deadlineStatsEl) deadlineStatsEl.style.display = 'none';
        if (filtersEl) filtersEl.style.display = 'none';
        if (boardEl) boardEl.style.display = 'none';
        if (!tuLieuEl) {
            tuLieuEl = document.createElement('div');
            tuLieuEl.id = 'bcvTuLieuView';
            document.getElementById('bcvPage').appendChild(tuLieuEl);
        }
        tuLieuEl.style.display = 'block';
        if (actionBtnsEl) {
            var canManageDocs = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);
            actionBtnsEl.innerHTML = canManageDocs ? '<button class="bcv-btn-create" onclick="_bcvShowCreateDocumentModal()">＋ Tạo tư liệu mới</button>' : '';
        }
        await _bcvLoadDocuments();
    } else {
        if (deadlineStatsEl) deadlineStatsEl.style.display = 'none';
        if (tuLieuEl) tuLieuEl.style.display = 'none';
        if (filtersEl) filtersEl.style.display = 'flex';
        if (boardEl) boardEl.style.display = 'grid';
        if (actionBtnsEl) {
            actionBtnsEl.innerHTML = (isDirector ? '<button class="bcv-btn-config" onclick="_bcvShowConfig()">⚙️ Cài đặt phòng ban</button>' : '') +
                (isManager ? '<button class="bcv-btn-create" onclick="_bcvShowCreate()">＋ Tạo task mới</button>' : '');
        }
        await _bcvLoadTasks();
    }
}

async function _bcvLoadDocuments() {
    var tuLieuEl = document.getElementById('bcvTuLieuView');
    if (!tuLieuEl) return;

    var searchVal = (document.getElementById('bcvDocSearch') && document.getElementById('bcvDocSearch').value) || _bcv.docFilters.search || '';
    var deptVal = (document.getElementById('bcvDocFilterDept') && document.getElementById('bcvDocFilterDept').value) || _bcv.docFilters.department_id || '';

    _bcv.docFilters.search = searchVal;
    _bcv.docFilters.department_id = deptVal;

    var params = new URLSearchParams();
    if (searchVal) params.set('search', searchVal);
    if (deptVal) params.set('department_id', deptVal);

    var res = await _bcvApi('/api/board-documents?' + params.toString());
    _bcv.documents = (res && res.documents) || [];
    _bcvRenderTuLieuView(_bcv.documents);
}

function _bcvRenderTuLieuView(documents) {
    var tuLieuEl = document.getElementById('bcvTuLieuView');
    if (!tuLieuEl) return;

    var user = window._currentUser || {};
    var canManageDocs = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);

    // Step 1: Group by Department (Level 1 - Khối lớn nhất)
    var deptGroups = {};
    documents.forEach(function(doc) {
        var deptName = doc.department_name || 'DÙNG CHUNG TOÀN CÔNG TY';
        if (!deptGroups[deptName]) deptGroups[deptName] = [];
        deptGroups[deptName].push(doc);
    });

    var depts = (_bcv.enabledDepts && _bcv.enabledDepts.length > 0) ? _bcv.enabledDepts : (_bcv.departments || []).filter(function(d) { return d.board_enabled; });
    var deptOptions = depts.map(function(d) {
        return '<option value="' + d.id + '" ' + (String(_bcv.docFilters.department_id) === String(d.id) ? 'selected' : '') + '>' + _esc(d.name) + '</option>';
    }).join('');

    var deptNames = Object.keys(deptGroups);

    var html = `
        <div style="padding:16px 28px">
            <!-- Filter Bar for Document Library -->
            <div style="background:#fff;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
                <input class="bcv-search" id="bcvDocSearch" value="${_escAttr(_bcv.docFilters.search)}" placeholder="🔍 Tìm theo tên tư liệu, mục chính, mục phụ, mã CV..." oninput="_bcvDebounceLoadDocs()" style="width:300px">
                <select class="bcv-filter-sel" id="bcvDocFilterDept" onchange="_bcvLoadDocuments()">
                    <option value="">🏢 Tất cả phòng ban</option>
                    ${deptOptions}
                </select>
                <button class="bcv-btn bcv-btn-secondary" onclick="_bcvLoadDocuments()" style="padding:7px 14px;font-size:12px">🔄 Tải lại</button>
            </div>

            ${deptNames.length === 0 ? `
                <div style="background:#fff;border-radius:14px;padding:60px 20px;text-align:center;border:1px dashed #cbd5e1">
                    <div style="font-size:48px;margin-bottom:12px">📚</div>
                    <div style="font-size:16px;font-weight:700;color:#334155;margin-bottom:6px">Chưa có tư liệu nào</div>
                    <div style="font-size:13px;color:#64748b;margin-bottom:16px">Hãy bấm "Tạo tư liệu mới" ở góc phải để thêm quy trình, hướng dẫn hoặc biểu mẫu làm việc.</div>
                    ${canManageDocs ? '<button class="bcv-btn-create" onclick="_bcvShowCreateDocumentModal()" style="margin:0 auto;display:inline-flex">＋ Tạo tư liệu mới</button>' : ''}
                </div>
            ` : ''}

            ${deptNames.map(function(deptName) {
                var docListInDept = deptGroups[deptName];
                var deptId = (docListInDept[0] && docListInDept[0].department_id) || '';
                
                // Step 2: Group by main_category inside Department (Level 2)
                var mainCatGroups = {};
                docListInDept.forEach(function(doc) {
                    var mainCat = doc.main_category || 'TƯ LIỆU CHUNG';
                    if (!mainCatGroups[mainCat]) mainCatGroups[mainCat] = [];
                    mainCatGroups[mainCat].push(doc);
                });

                var mainCatKeys = Object.keys(mainCatGroups);

                return `
                    <!-- 🔴 LEVEL 1: KHỐI PHÒNG BAN (Container lớn nhất) -->
                    <div style="margin-bottom:28px;background:#ffffff;border:2px solid #cbd5e1;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08)">
                        <!-- Level 1 Header: PHÒNG BAN -->
                        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#2563eb 100%);padding:16px 24px;color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
                            <div style="display:flex;align-items:center;gap:10px">
                                <span style="font-size:22px">🏢</span> ${_esc(deptName)}
                            </div>
                            <span style="font-size:12px;font-weight:800;background:rgba(255,255,255,0.2);padding:4px 14px;border-radius:20px;text-transform:none">${docListInDept.length} bài tư liệu</span>
                        </div>

                        <!-- Inside Level 1: List of Level 2 Main Categories -->
                        <div style="padding:20px;display:grid;gap:24px">
                            ${mainCatKeys.map(function(mainCat, mainIdx) {
                                var subDocList = mainCatGroups[mainCat];
                                var cleanCat = mainCat.replace(/^\d+[\.\s\-]*/, '');
                                var mainNum = (mainIdx + 1) + '. ' + cleanCat;

                                // Gộp chung tất cả Mã Công Việc thuộc Tư Liệu này
                                var catLinkedTasks = [];
                                subDocList.forEach(function(doc) {
                                    var linked = doc.linked_tasks || [];
                                    linked.forEach(function(t) {
                                        if (!catLinkedTasks.some(function(x) { return x.cv_code === t.cv_code; })) {
                                            catLinkedTasks.push(t);
                                        }
                                    });
                                    if (doc.task_code) {
                                        var cvCode = doc.task_code.trim();
                                        var matchId = parseInt(cvCode.replace(/\D/g, ''), 10);
                                        if (!catLinkedTasks.some(function(x) { return x.cv_code === cvCode; })) {
                                            catLinkedTasks.push({ id: matchId || null, cv_code: cvCode, title: cvCode });
                                        }
                                    }
                                });

                                 var catTaskBadgesHtml = '';
                                if (catLinkedTasks.length > 0) {
                                    var limit = 5;
                                    var visibleTasks = catLinkedTasks.slice(0, limit);
                                    var hiddenTasks = catLinkedTasks.slice(limit);
                                    var uniqueCatId = 'bcvCatTasks_' + mainIdx + '_' + Math.floor(Math.random()*10000);

                                    catTaskBadgesHtml = '<div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:8px">' +
                                        visibleTasks.map(function(t) {
                                            return '<span class="bcv-doc-task-badge" style="background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;border:1px solid #c7d2fe;display:inline-flex;align-items:center;gap:4px;cursor:pointer;box-shadow:0 1px 3px rgba(99,102,241,0.15);white-space:nowrap" ' +
                                                (t.id ? 'onclick="event.stopPropagation(); _bcvOpenTaskFromDoc(' + t.id + ')"' : 'onclick="event.stopPropagation(); _bcvFilterByTaskCode(\'' + _escAttr(t.cv_code) + '\')"') +
                                                ' title="Bấm để xem chi tiết ' + _escAttr(t.title || t.cv_code) + '">' +
                                                '📌 ' + _esc(t.cv_code) +
                                            '</span>';
                                        }).join('');

                                    if (hiddenTasks.length > 0) {
                                        catTaskBadgesHtml += '<span id="' + uniqueCatId + '_more" style="display:none;align-items:center;gap:6px;flex-wrap:wrap">' +
                                            hiddenTasks.map(function(t) {
                                                return '<span class="bcv-doc-task-badge" style="background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;border:1px solid #c7d2fe;display:inline-flex;align-items:center;gap:4px;cursor:pointer;box-shadow:0 1px 3px rgba(99,102,241,0.15);white-space:nowrap" ' +
                                                    (t.id ? 'onclick="event.stopPropagation(); _bcvOpenTaskFromDoc(' + t.id + ')"' : 'onclick="event.stopPropagation(); _bcvFilterByTaskCode(\'' + _escAttr(t.cv_code) + '\')"') +
                                                    ' title="Bấm để xem chi tiết ' + _escAttr(t.title || t.cv_code) + '">' +
                                                    '📌 ' + _esc(t.cv_code) +
                                                '</span>';
                                            }).join('') +
                                        '</span>';

                                        catTaskBadgesHtml += '<span id="' + uniqueCatId + '_btn" onclick="event.stopPropagation(); _bcvToggleMoreCatTasks(\'' + uniqueCatId + '\', ' + hiddenTasks.length + ')" style="background:#f3e8ff;color:#6b21a8;font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;border:1px solid #d8b4fe;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;box-shadow:0 1px 2px rgba(107,33,168,0.1)" title="Bấm để mở rộng/thu gọn tất cả ' + catLinkedTasks.length + ' mã công việc">+ ' + hiddenTasks.length + ' mã khác ▾</span>';
                                    }

                                    catTaskBadgesHtml += '</div>';
                                }

                                return `
                                    <!-- 🟠 LEVEL 2: TÊN MỤC CHÍNH (Tiêu đề dải băng) -->
                                    <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:14px;overflow:hidden;box-shadow:0 3px 12px rgba(15,23,42,0.05)">
                                        <!-- Main Category Banner Header -->
                                        <div style="background:linear-gradient(135deg,#f5f3ff 0%,#e9d5ff 100%);padding:10px 20px;color:#581c87;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #d8b4fe;flex-wrap:wrap;gap:10px">
                                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                                                <span style="font-size:16px">📌</span> Tư Liệu ${mainIdx + 1} : ${_esc(cleanCat)}
                                                ${catTaskBadgesHtml}
                                            </div>
                                            <div style="display:flex;align-items:center;gap:10px">
                                                ${user.role === 'giam_doc' ? `
                                                    <button class="bcv-btn-sm" style="background:#d97706;color:#ffffff;border:none;padding:5px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(217,119,6,0.3)" onclick="event.stopPropagation();_bcvShowEditMainCategoryModal('${deptId}', '${_escAttr(mainCat)}')" title="Sửa tên tư liệu này (Chỉ Giám Đốc)">
                                                        ✏️ Sửa tên tư liệu
                                                    </button>
                                                ` : ''}
                                                ${canManageDocs ? `
                                                    <button class="bcv-btn-sm" style="background:#7c3aed;color:#ffffff;border:none;padding:5px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(124,58,237,0.3)" onclick="event.stopPropagation();_bcvShowCreateDocumentModal(null, '${deptId}', '${_escAttr(mainCat)}')" title="Thêm mục phụ mới vào danh mục này">
                                                        ➕ Thêm mục phụ
                                                    </button>
                                                ` : ''}
                                                <span style="font-size:12px;font-weight:700;background:#581c87;color:#ffffff;padding:3px 12px;border-radius:12px">${subDocList.length} mục phụ</span>
                                            </div>
                                        </div>

                                        <!-- 📊 BẢNG DỮ LIỆU -->
                                        <div style="width:100%">
                                            <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;table-layout:fixed">
                                                <colgroup>
                                                    <col style="width:45px">
                                                    <col style="width:280px">
                                                    <col style="width:auto">
                                                    <col style="width:200px">
                                                    <col style="width:160px">
                                                    <col style="width:180px">
                                                </colgroup>
                                                <thead>
                                                    <tr style="background:#f1f5f9;color:#0f172a;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">
                                                        <th style="padding:10px 8px;text-align:center;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1">STT</th>
                                                        <th style="padding:10px 10px;text-align:left;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1">Tên Công Việc</th>
                                                        <th style="padding:10px 10px;text-align:left;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1">Nội Dung</th>
                                                        <th style="padding:10px 10px;text-align:left;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1">Link Tư Liệu</th>
                                                        <th style="padding:10px 10px;text-align:center;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1">Hình Ảnh</th>
                                                        <th style="padding:10px 6px;text-align:center;background:#f1f5f9;color:#0f172a;border-bottom:2px solid #cbd5e1;white-space:nowrap">Thao Tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${subDocList.map(function(doc, subIdx) {
                                                        var stt = subIdx + 1;
                                                        var links = doc.links || [];
                                                        var atts = doc.attachments || [];
                                                        var canEdit = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);
                                                        var canDelete = (user.role === 'giam_doc');
                                                        var isFirst = subIdx === 0;
                                                        var isLast = subIdx === subDocList.length - 1;

                                                        return `
                                                            <tr style="border-bottom:1px solid #e2e8f0;background:${stt % 2 === 0 ? '#f8fafc' : '#ffffff'};cursor:pointer" onclick="_bcvShowDocumentDetailModal(${doc.id})" title="Bấm để xem chi tiết mục phụ">
                                                                <td style="padding:12px 8px;text-align:center;font-weight:800;color:#64748b;vertical-align:top">${stt}</td>
                                                                <td style="padding:12px 10px;vertical-align:top;text-align:left">
                                                                    <span style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:800;display:inline-block;border:1px solid #fde68a;word-break:break-word">
                                                                        📌 ${stt}. ${_esc(doc.sub_category)}
                                                                    </span>
                                                                    ${doc.title && doc.title !== doc.sub_category ? '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-top:6px;word-break:break-word">' + _esc(doc.title) + '</div>' : ''}
                                                                </td>
                                                                <td style="padding:12px 10px;color:#0f172a;line-height:1.6;white-space:pre-wrap;font-weight:500;vertical-align:top;text-align:left;word-break:break-word">${doc.content ? _esc(doc.content.trim()) : '<span style="color:#94a3b8">—</span>'}</td>
                                                                <td style="padding:12px 10px;vertical-align:top;text-align:left">
                                                                    ${links.length > 0 ? `
                                                                        <div style="display:flex;flex-direction:column;gap:6px">
                                                                            ${links.map(function(link) {
                                                                                var title = typeof link === 'string' ? link : (link.title || link.url);
                                                                                var url = typeof link === 'string' ? link : link.url;
                                                                                return '<a href="' + _escAttr(url) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:2px 6px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all;width:fit-content">🔗 ' + _esc(title) + ' ↗</a>';
                                                                            }).join('')}
                                                                        </div>
                                                                    ` : '<span style="color:#94a3b8;font-size:12px">—</span>'}
                                                                </td>
                                                                <td style="padding:12px 10px;vertical-align:middle;text-align:center">
                                                                    ${atts.length > 0 ? `
                                                                        <div style="display:inline-flex;align-items:center;justify-content:center;gap:4px;vertical-align:middle">
                                                                            ${atts.map(function(att) {
                                                                                var token = localStorage.getItem('token') || '';
                                                                                var imgSrc = att.file_path ? (att.file_path.startsWith('/') || att.file_path.startsWith('http') || att.file_path.startsWith('data:') ? att.file_path : '/' + att.file_path) : '';
                                                                                if (imgSrc && token && !imgSrc.startsWith('data:')) {
                                                                                    imgSrc += (imgSrc.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
                                                                                }
                                                                                return '<div style="position:relative;width:28px;height:28px;border-radius:6px;overflow:hidden;border:1px solid #cbd5e1;background:#fff;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:inline-block;vertical-align:middle;transition:transform 0.15s ease" onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'" onclick="event.stopPropagation();_bcvOpenLightbox(\'' + _escAttr(imgSrc) + '\')" title="Click để xem ảnh phóng to">' +
                                                                                    '<img src="' + _escAttr(imgSrc) + '" style="width:100%;height:100%;object-fit:cover;display:block">' +
                                                                                '</div>';
                                                                            }).join('')}
                                                                        </div>
                                                                    ` : '<span style="color:#94a3b8;font-size:12px">—</span>'}
                                                                </td>
                                                                <td style="padding:12px 8px;text-align:center;vertical-align:top">
                                                                    ${(canEdit || canDelete) ? `
                                                                        <div style="display:flex;gap:4px;justify-content:center;align-items:center">
                                                                            ${canEdit ? `
                                                                                <button class="bcv-btn-edit-sm" onclick="event.stopPropagation();_bcvReorderDocument(${doc.id}, 'up')" ${isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:4px 7px;background:#f1f5f9;color:#94a3b8;border-color:#cbd5e1"' : 'style="padding:4px 7px;cursor:pointer;background:#eff6ff;color:#2563eb;border-color:#bfdbfe"' } title="${isFirst ? 'Đang ở vị trí đầu tiên' : 'Chuyển công việc này lên trước'}">⬆️</button>
                                                                                <button class="bcv-btn-edit-sm" onclick="event.stopPropagation();_bcvReorderDocument(${doc.id}, 'down')" ${isLast ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:4px 7px;background:#f1f5f9;color:#94a3b8;border-color:#cbd5e1"' : 'style="padding:4px 7px;cursor:pointer;background:#eff6ff;color:#2563eb;border-color:#bfdbfe"' } title="${isLast ? 'Đang ở vị trí cuối cùng' : 'Chuyển công việc này xuống sau'}">⬇️</button>
                                                                                <button class="bcv-btn-edit-sm" onclick="event.stopPropagation();_bcvShowCreateDocumentModal(${doc.id})">✏️ Sửa</button>
                                                                            ` : ''}
                                                                            ${canDelete ? '<button class="bcv-btn-edit-sm" style="color:#dc2626;border-color:#fca5a5;background:#fff5f5" onclick="event.stopPropagation();_bcvDeleteDocument(' + doc.id + ')">🗑 Xóa</button>' : ''}
                                                                        </div>
                                                                    ` : '<span style="color:#94a3b8;font-size:12px">—</span>'}
                                                                </td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    tuLieuEl.innerHTML = html;
}

function _bcvToggleMoreCatTasks(uniqueId, count) {
    var moreEl = document.getElementById(uniqueId + '_more');
    var btnEl = document.getElementById(uniqueId + '_btn');
    if (!moreEl || !btnEl) return;
    if (moreEl.style.display === 'none' || !moreEl.style.display) {
        moreEl.style.display = 'inline-flex';
        btnEl.innerHTML = 'Thu gọn ▴';
        btnEl.style.background = '#e9d5ff';
    } else {
        moreEl.style.display = 'none';
        btnEl.innerHTML = '+ ' + count + ' mã khác ▾';
        btnEl.style.background = '#f3e8ff';
    }
}

function _bcvOpenTaskFromDoc(taskId) {
    if (!taskId) return;
    _bcvShowDetail(taskId);
}

function _bcvToggleFeedbackHistory(btn) {
    if (!btn) return;
    var container = btn.nextElementSibling;
    if (!container) return;
    var isHidden = (container.style.display === 'none' || !container.style.display);
    if (isHidden) {
        container.style.display = 'flex';
        btn.innerHTML = '📜 Thu gọn lịch sử yêu cầu sửa ▴';
    } else {
        container.style.display = 'none';
        var count = container.children.length;
        btn.innerHTML = '📜 Xem lịch sử yêu cầu sửa (' + count + ' lần) ▾';
    }
}

function _bcvFilterByTaskCode(taskCode) {
    _bcvSwitchTab('me');
    var searchInput = document.getElementById('bcvSearchInput');
    if (searchInput) {
        searchInput.value = taskCode;
        _bcv.filters.search = taskCode;
        _bcvLoadTasks();
    }
}

function _bcvShowDocumentDetailModal(docId) {
    var doc = (_bcv.documents || []).find(function(d) { return d.id === docId; });
    if (!doc) return;

    var links = doc.links || [];
    var atts = doc.attachments || [];
    var user = window._currentUser || {};
    var canEdit = ['giam_doc', 'quan_ly_cap_cao'].includes(user.role);
    var canDelete = (user.role === 'giam_doc');

    var mainCat = doc.main_category || '';
    var cleanCat = mainCat.replace(/^\d+[\.\s\-]*/, '');
    
    var deptDocs = (_bcv.documents || []).filter(function(d) { return d.department_id === doc.department_id; });
    var mainCats = [...new Set(deptDocs.map(function(d) { return d.main_category; }).filter(Boolean))];
    var mainIdx = mainCats.indexOf(mainCat);
    var mainDisplay = mainIdx >= 0 ? ('Tư Liệu ' + (mainIdx + 1) + ' : ' + cleanCat) : cleanCat;

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvDocDetailOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:720px;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.25)">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#2563eb 100%);padding:18px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:24px">📄</span>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:0.5px">🏢 ${_esc(doc.department_name || 'Phòng Ban')}</div>
                        <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin:3px 0 0 0">📌 ${_esc(mainDisplay)}</h3>
                    </div>
                </div>
                <button onclick="document.getElementById('bcvDocDetailOverlay').remove()" style="background:rgba(255,255,255,0.18);border:none;color:#ffffff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Body -->
            <div style="padding:24px;max-height:75vh;overflow-y:auto;display:flex;flex-direction:column;gap:18px;background:#f8fafc">
                
                <!-- Tên Công Việc Phụ -->
                <div style="background:#ffffff;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
                    <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase">🏷️ Tên Công Việc</div>
                    <div style="font-size:15px;font-weight:800;color:#d97706;margin-top:4px">${_esc(doc.sub_category || '—')}</div>
                </div>

                ${doc.title && doc.title !== doc.sub_category ? `
                    <div style="background:#ffffff;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0">
                        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase">📌 Tiêu Đề Bài Viết</div>
                        <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:4px">${_esc(doc.title)}</div>
                    </div>
                ` : ''}

                <!-- Nội Dung Chi Tiết -->
                <div style="background:#ffffff;padding:18px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
                    <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                        <span>📝</span> NỘI DUNG CHI TIẾT
                    </div>
                    <div style="font-size:14px;color:#0f172a;line-height:1.7;white-space:pre-wrap;word-break:break-word">${doc.content ? _esc(doc.content.trim()) : '<span style="color:#94a3b8;font-style:italic">Không có nội dung văn bản</span>'}</div>
                </div>

                <!-- Link Tư Liệu (riêng) -->
                ${links.length > 0 ? `
                    <div style="background:#ffffff;padding:18px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
                        <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px">
                            <span>🔗</span> LINK TƯ LIỆU
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            ${links.map(function(l) {
                                var title = typeof l === 'string' ? l : (l.title || l.url);
                                var url = typeof l === 'string' ? l : l.url;
                                return '<a href="' + _escAttr(url) + '" target="_blank" onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#2563eb;background:#eff6ff;padding:9px 14px;border-radius:8px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all">🔗 ' + _esc(title) + ' <span style="margin-left:auto;font-size:11px">Mở link ↗</span></a>';
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Hình Ảnh (đính kèm riêng) -->
                ${atts.length > 0 ? `
                    <div style="background:#ffffff;padding:18px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
                        <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px">
                            <span>🖼️</span> HÌNH ẢNH ĐÍNH KÈM
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:10px">
                            ${atts.map(function(att) {
                                var token = localStorage.getItem('token') || '';
                                var imgSrc = att.file_path ? (att.file_path.startsWith('/') || att.file_path.startsWith('http') || att.file_path.startsWith('data:') ? att.file_path : '/' + att.file_path) : '';
                                if (imgSrc && token && !imgSrc.startsWith('data:')) {
                                    imgSrc += (imgSrc.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
                                }
                                return '<div style="border-radius:8px;overflow:hidden;border:1.5px solid #cbd5e1;cursor:pointer;aspect-ratio:1;box-shadow:0 2px 6px rgba(0,0,0,0.08)" onclick="_bcvOpenLightbox(\'' + _escAttr(imgSrc) + '\')">' +
                                    '<img src="' + _escAttr(imgSrc) + '" style="width:100%;height:100%;object-fit:cover">' +
                                '</div>';
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Associated Task Codes -->
                ${(function() {
                    var linked = doc.linked_tasks || [];
                    var list = linked.slice();
                    if (doc.task_code && !list.some(function(x) { return x.cv_code === doc.task_code; })) {
                        var matchId = parseInt(doc.task_code.replace(/\D/g, ''), 10);
                        list.unshift({ id: matchId || null, cv_code: doc.task_code, title: doc.task_code });
                    }
                    if (list.length === 0) return '';

                    return `
                        <div style="background:#ffffff;padding:16px 18px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
                            <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                                <span>📌</span> MÃ CÔNG VIỆC THỰC HIỆN (${list.length})
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                                ${list.map(function(t) {
                                    return '<span class="bcv-doc-task-badge" style="background:#e0e7ff;color:#3730a3;font-size:12px;font-weight:800;padding:6px 14px;border-radius:8px;border:1px solid #c7d2fe;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 6px rgba(99,102,241,0.15);transition:transform 0.15s ease" ' +
                                        (t.id ? 'onclick="_bcvOpenTaskFromDoc(' + t.id + ')"' : 'onclick="_bcvFilterByTaskCode(\'' + _escAttr(t.cv_code) + '\');document.getElementById(\'bcvDocDetailOverlay\').remove()"') +
                                        ' title="Bấm để xem chi tiết công việc ' + _escAttr(t.title || t.cv_code) + '">' +
                                        '📌 ' + _esc(t.cv_code) + (t.title && t.title !== t.cv_code ? ' — ' + _esc(t.title) : '') +
                                    '</span>';
                                }).join('')}
                            </div>
                        </div>
                    `;
                })()}
            </div>

            <!-- Footer -->
            <div style="padding:14px 24px;background:#ffffff;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
                <button onclick="document.getElementById('bcvDocDetailOverlay').remove()" style="padding:9px 22px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#475569;font-weight:700;font-size:13px;cursor:pointer">Đóng</button>
                ${(canEdit || canDelete) ? `
                    <div style="display:flex;gap:10px">
                        ${canEdit ? '<button onclick="document.getElementById(\'bcvDocDetailOverlay\').remove();_bcvShowCreateDocumentModal(' + doc.id + ')" style="padding:9px 18px;border-radius:8px;border:1px solid #93c5fd;background:#eff6ff;color:#2563eb;font-weight:800;font-size:13px;cursor:pointer">✏️ Sửa bài viết</button>' : ''}
                        ${canDelete ? '<button onclick="document.getElementById(\'bcvDocDetailOverlay\').remove();_bcvDeleteDocument(' + doc.id + ')" style="padding:9px 18px;border-radius:8px;border:1px solid #fca5a5;background:#fff5f5;color:#dc2626;font-weight:800;font-size:13px;cursor:pointer">🗑️ Xóa</button>' : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _bcvShowCreateDocumentModal(docId, presetDeptId, presetMainCat) {
    window._bcvPendingDocFiles = [];
    var user = window._currentUser || {};
    var isDirector = (user.role === 'giam_doc');
    var docToEdit = null;
    if (docId) {
        docToEdit = _bcv.documents.find(d => d.id === docId);
    }

    var targetDept = presetDeptId || (docToEdit ? docToEdit.department_id : '');
    var defaultMainCat = docToEdit ? docToEdit.main_category : (presetMainCat || '');

    var depts = (_bcv.enabledDepts && _bcv.enabledDepts.length > 0) ? _bcv.enabledDepts : (_bcv.departments || []).filter(function(d) { return d.board_enabled; });
    var deptOptions = depts.map(function(d) {
        var selected = String(targetDept) === String(d.id) ? 'selected' : '';
        return `<option value="${d.id}" ${selected}>${_esc(d.name)}</option>`;
    }).join('');

    var existingMainCats = [...new Set(_bcv.documents.map(d => d.main_category).filter(Boolean))];
    var datalistOptions = existingMainCats.map(c => `<option value="${_escAttr(c)}">`).join('');

    var taskOptions = (_bcv.tasks || []).map(t => `<option value="CV-${String(t.id).padStart(3,'0')}">CV-${String(t.id).padStart(3,'0')} — ${_escAttr(t.title)}</option>`).join('');

    var linksList = docToEdit && Array.isArray(docToEdit.links) ? docToEdit.links : [];

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvDocOverlay';

    document.removeEventListener('paste', _bcvGlobalDocPaste);
    document.addEventListener('paste', _bcvGlobalDocPaste);

    var isAddSubDoc = !docToEdit && presetMainCat;
    var lockDept = docToEdit || isAddSubDoc;
    var lockMainCat = (docToEdit && !isDirector) || isAddSubDoc;

    overlay.innerHTML = `<div class="bcv-modal" style="max-width:680px">
        <div class="bcv-modal-header" style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:16px 20px;border-radius:14px 14px 0 0">
            <h3 style="color:#ffffff;font-size:16px;font-weight:900;letter-spacing:0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.3)">${docToEdit ? '✏️ SỬA TƯ LIỆU' : '📚 TẠO TƯ LIỆU MỚI'}</h3>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvDocOverlay').remove()" style="color:#ffffff;background:rgba(255,255,255,0.2)">✕</button>
        </div>
        <div class="bcv-modal-body" style="padding:20px">
            
            <!-- 1. Chọn Phòng Ban -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">🏢 1. CHỌN PHÒNG BAN <span style="color:#ef4444">*</span></label>
                <select class="bcv-form-select" id="bcvDocFormDept" ${lockDept ? 'disabled' : ''} style="width:100%;padding:9px 12px;font-size:13px${lockDept ? ';background:#f1f5f9;color:#64748b;cursor:not-allowed;border-color:#cbd5e1;opacity:0.85' : ''}">
                    <option value="">-- Dùng chung toàn công ty --</option>
                    ${deptOptions}
                </select>
                ${lockDept ? '<div style="font-size:11px;color:#94a3b8;margin-top:4px">🔒 Không thể thay đổi phòng ban</div>' : ''}
            </div>

            <!-- 2. Tên Mục Chính -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">📌 2. TÊN MỤC CHÍNH CỦA TƯ LIỆU <span style="color:#ef4444">*</span></label>
                <input class="bcv-form-input" id="bcvDocFormMainCat" list="bcvMainCatList" value="${_escAttr(defaultMainCat)}" ${lockMainCat ? 'disabled' : ''} placeholder="Nhập tên mục chính (Ví dụ: Quy Trình Vận Hành, Biểu Mẫu Sale...)" style="width:100%;padding:9px 12px;font-size:13px${lockMainCat ? ';background:#f1f5f9;color:#64748b;cursor:not-allowed;border-color:#cbd5e1;opacity:0.85' : ''}">
                ${lockMainCat ? '<div style="font-size:11px;color:#94a3b8;margin-top:4px">🔒 Tên mục chính đã được chọn sẵn</div>' : (docToEdit && isDirector) ? '<div style="font-size:11px;color:#d97706;margin-top:4px">✏️ Giám Đốc có quyền chỉnh sửa tên tư liệu này</div>' : ''}
                <datalist id="bcvMainCatList">${datalistOptions}</datalist>
            </div>

            <!-- 3. Tên Mục Phụ -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">🏷️ 3. TÊN MỤC PHỤ CỦA TƯ LIỆU <span style="color:#ef4444">*</span></label>
                <input class="bcv-form-input" id="bcvDocFormSubCat" value="${_escAttr(docToEdit ? docToEdit.sub_category : '')}" placeholder="Nhập tên mục phụ (Ví dụ: Quy trình tư vấn KH mới, Mẫu hợp đồng...)" style="width:100%;padding:9px 12px;font-size:13px">
            </div>

            <!-- 4. Các Đường Link / Biểu Mẫu -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase;display:flex;justify-content:space-between">
                    <span>🔗 4. CÁC ĐƯỜNG LINK / BIỂU MẪU</span>
                    <button type="button" onclick="_bcvAddDocLinkForm()" style="background:#eff6ff;color:#2563eb;border:1px solid #dbeafe;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">＋ Thêm link</button>
                </label>
                <div id="bcvDocLinksWrap" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
                    ${linksList.length > 0 ? linksList.map(function(link) {
                        var title = typeof link === 'string' ? link : (link.title || '');
                        var url = typeof link === 'string' ? link : (link.url || '');
                        return `<div class="bcv-doc-link-row" style="display:flex;gap:6px">
                            <input class="bcv-form-input bcv-doc-link-title" value="${_escAttr(title)}" placeholder="Tên hiển thị link (VD: Mẫu Sheet)" style="flex:1;font-size:12px">
                            <input class="bcv-form-input bcv-doc-link-url" value="${_escAttr(url)}" placeholder="https://..." style="flex:2;font-size:12px">
                            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;padding:0 8px;border-radius:6px;cursor:pointer">✕</button>
                        </div>`;
                    }).join('') : `<div class="bcv-doc-link-row" style="display:flex;gap:6px">
                        <input class="bcv-form-input bcv-doc-link-title" placeholder="Tên hiển thị link (VD: Google Sheet mẫu)" style="flex:1;font-size:12px">
                        <input class="bcv-form-input bcv-doc-link-url" placeholder="https://..." style="flex:2;font-size:12px">
                        <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;padding:0 8px;border-radius:6px;cursor:pointer">✕</button>
                    </div>`}
                </div>
            </div>

            <!-- 5. Nội Dung Chi Tiết -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">📝 5. NỘI DUNG CHI TIẾT TƯ LIỆU</label>
                <textarea class="bcv-form-input" id="bcvDocFormContent" rows="5" placeholder="Nhập ghi chú, hướng dẫn hoặc lưu ý chi tiết..." style="width:100%;padding:9px 12px;font-size:13px;resize:vertical">${_esc(docToEdit ? docToEdit.content : '')}</textarea>
            </div>

            <!-- 6. Mã Công Việc Liên Quan (KHÓA) -->
            <div class="bcv-form-group" style="margin-bottom:14px">
                <label style="font-weight:800;color:#64748b;font-size:12px;text-transform:uppercase;display:flex;align-items:center;gap:4px">
                    🔒 6. GẮN MÃ CÔNG VIỆC <span style="font-size:11px;font-weight:600;color:#94a3b8">(Tự động liên kết từ Mã Công Việc sau)</span>
                </label>
                <input class="bcv-form-input" id="bcvDocFormTaskCode" disabled value="${_escAttr(docToEdit ? (docToEdit.task_code || '') : '')}" placeholder="🔒 Trường này tạm khóa — Sẽ tự động liên kết sau" style="width:100%;padding:9px 12px;font-size:13px;background:#f1f5f9;color:#94a3b8;cursor:not-allowed;border-color:#e2e8f0">
            </div>

            <!-- 7. Tải / Dán Ảnh Đính Kèm -->
            <div class="bcv-form-group">
                <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">🖼️ 7. HÌNH ÁNH ĐÍNH KÈM (Ctrl + V dán ảnh trực tiếp)</label>
                
                <div id="bcvDocPasteZone" style="border:2px dashed #3b82f6;border-radius:12px;padding:20px;text-align:center;background:#eff6ff;transition:all 0.2s;margin-top:6px">
                    <div style="font-size:26px;margin-bottom:4px">📋 🖼️</div>
                    <div style="font-size:14px;font-weight:800;color:#1e3a5f">Nhấn Ctrl + V ở bất kỳ đâu để dán hình ảnh trực tiếp</div>
                    <div style="font-size:11.5px;color:#64748b;margin-top:4px">Hình ảnh từ bộ nhớ tạm (Clipboard / Chụp màn hình) sẽ lập tức được đính kèm vào đây</div>
                </div>

                <div id="bcvDocPastePreviewWrap" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px"></div>
            </div>

            <div class="bcv-form-actions" style="margin-top:20px">
                <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvDocOverlay').remove()">Hủy</button>
                <button class="bcv-btn bcv-btn-primary" onclick="_bcvSubmitDocument(${docToEdit ? docToEdit.id : 'null'})">💾 ${docToEdit ? 'Cập Nhật' : 'Tạo Tư Liệu'}</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(overlay);
}

function _bcvAddDocLinkForm() {
    var wrap = document.getElementById('bcvDocLinksWrap');
    if (!wrap) return;
    var row = document.createElement('div');
    row.className = 'bcv-doc-link-row';
    row.style.cssText = 'display:flex;gap:6px';
    row.innerHTML = `<input class="bcv-form-input bcv-doc-link-title" placeholder="Tên hiển thị link" style="flex:1;font-size:12px">
        <input class="bcv-form-input bcv-doc-link-url" placeholder="https://..." style="flex:2;font-size:12px">
        <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;padding:0 8px;border-radius:6px;cursor:pointer">✕</button>`;
    wrap.appendChild(row);
}

window._bcvPendingDocFiles = [];

function _bcvShowImageLightbox(src) {
    _bcvOpenLightbox(src);
}

function _bcvOpenLightbox(src) {
    if (!src) return;
    var existing = document.getElementById('bcvLightboxOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'bcvLightboxOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:bcvFadeIn 0.2s ease';
    overlay.onclick = function(e) {
        if (e.target === overlay || e.target.classList.contains('bcv-lb-close')) {
            overlay.remove();
        }
    };

    overlay.innerHTML = `
        <div style="position:relative;max-width:92vw;max-height:90vh;display:flex;align-items:center;justify-content:center">
            <button class="bcv-lb-close" onclick="document.getElementById('bcvLightboxOverlay').remove()" style="position:absolute;top:-16px;right:-16px;width:38px;height:38px;border-radius:50%;background:#ef4444;color:#ffffff;border:2.5px solid #ffffff;font-size:20px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(239,68,68,0.6);z-index:10;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Tắt xem ảnh (Esc)">✕</button>
            <img src="${_escAttr(src)}" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5);border:2px solid rgba(255,255,255,0.2)">
        </div>
    `;

    document.body.appendChild(overlay);

    var escHandler = function(e) {
        if (e.key === 'Escape') {
            var el = document.getElementById('bcvLightboxOverlay');
            if (el) el.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function _bcvResizeImageFile(file, maxWidth, maxHeight, quality) {
    maxWidth = maxWidth || 1200;
    maxHeight = maxHeight || 1200;
    quality = quality || 0.85;

    return new Promise(function(resolve) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var width = img.width;
                var height = img.height;

                if (width <= maxWidth && height <= maxHeight) {
                    resolve(file);
                    return;
                }

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(function(blob) {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    var resizedFile = new File([blob], file.name || ('resized_image_' + Date.now() + '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(resizedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = function() { resolve(file); };
            img.src = e.target.result;
        };
        reader.onerror = function() { resolve(file); };
        reader.readAsDataURL(file);
    });
}

function _bcvGlobalDocPaste(e) {
    if (!document.getElementById('bcvDocOverlay')) {
        document.removeEventListener('paste', _bcvGlobalDocPaste);
        return;
    }
    _bcvHandleDocPaste(e);
}

async function _bcvHandleDocPaste(e) {
    var items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData)) ? (e.clipboardData || e.originalEvent.clipboardData).items : null;
    if (!items) return;
    var hasImage = false;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
            hasImage = true;
            var file = items[i].getAsFile();
            if (file) {
                var fileName = 'pasted_image_' + Date.now() + '_' + (window._bcvPendingDocFiles.length + 1) + '.jpg';
                var renamedFile = new File([file], fileName, { type: file.type || 'image/jpeg' });
                var resizedFile = await _bcvResizeImageFile(renamedFile, 1200, 1200, 0.85);
                window._bcvPendingDocFiles.push(resizedFile);
            }
        }
    }
    if (hasImage) {
        if (e.preventDefault) e.preventDefault();
        _bcvRenderDocFilePreviews();
    }
}

async function _bcvHandleDocFileSelect(input) {
    if (input.files && input.files.length > 0) {
        for (var i = 0; i < input.files.length; i++) {
            var resizedFile = await _bcvResizeImageFile(input.files[i], 1200, 1200, 0.85);
            window._bcvPendingDocFiles.push(resizedFile);
        }
        input.value = '';
        _bcvRenderDocFilePreviews();
    }
}

function _bcvRenderDocFilePreviews() {
    var wrap = document.getElementById('bcvDocPastePreviewWrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!window._bcvPendingDocFiles || window._bcvPendingDocFiles.length === 0) return;

    window._bcvPendingDocFiles.forEach(function(file, index) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var div = document.createElement('div');
            div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;overflow:hidden;border:1.5px solid #cbd5e1;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.08);flex-shrink:0;cursor:pointer';
            var imgSrc = e.target.result;
            div.innerHTML = '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover" onclick="event.stopPropagation();_bcvOpenLightbox(\'' + _escAttr(imgSrc) + '\')" title="Click để phóng to xem chi tiết">' +
                '<button type="button" onclick="event.stopPropagation();_bcvRemovePendingDocFile(' + index + ')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.95);color:#fff;border:none;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Xóa ảnh này">✕</button>';
            wrap.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function _bcvRemovePendingDocFile(index) {
    if (window._bcvPendingDocFiles) {
        window._bcvPendingDocFiles.splice(index, 1);
        _bcvRenderDocFilePreviews();
    }
}

async function _bcvSubmitDocument(docId) {
    // Temporarily enable disabled fields to read their values
    var deptEl = document.getElementById('bcvDocFormDept');
    var mainCatEl = document.getElementById('bcvDocFormMainCat');
    var deptWasDisabled = deptEl && deptEl.disabled;
    var mainCatWasDisabled = mainCatEl && mainCatEl.disabled;
    if (deptWasDisabled) deptEl.disabled = false;
    if (mainCatWasDisabled) mainCatEl.disabled = false;

    var deptId = deptEl ? deptEl.value : '';
    var mainCat = mainCatEl ? mainCatEl.value : '';

    if (deptWasDisabled) deptEl.disabled = true;
    if (mainCatWasDisabled) mainCatEl.disabled = true;
    var subCat = document.getElementById('bcvDocFormSubCat').value;
    var content = document.getElementById('bcvDocFormContent').value;
    var taskCode = (document.getElementById('bcvDocFormTaskCode') && document.getElementById('bcvDocFormTaskCode').value) || '';

    if (!mainCat || !mainCat.trim()) {
        alert('Vui lòng nhập Tên Mục Chính!');
        return;
    }
    if (!subCat || !subCat.trim()) {
        alert('Vui lòng nhập Tên Mục Phụ!');
        return;
    }

    var linkRows = document.querySelectorAll('.bcv-doc-link-row');
    var links = [];
    linkRows.forEach(function(row) {
        var tInput = row.querySelector('.bcv-doc-link-title');
        var uInput = row.querySelector('.bcv-doc-link-url');
        var t = tInput ? tInput.value.trim() : '';
        var u = uInput ? uInput.value.trim() : '';
        if (u) {
            links.push({ title: t || u, url: u });
        }
    });

    var payload = {
        department_id: deptId ? Number(deptId) : null,
        main_category: mainCat.trim(),
        sub_category: subCat.trim(),
        title: subCat.trim(),
        content: content ? content.trim() : '',
        links: links,
        task_code: taskCode ? taskCode.trim() : ''
    };

    var method = docId ? 'PUT' : 'POST';
    var url = docId ? ('/api/board-documents/' + docId) : '/api/board-documents';

    var res = await _bcvApi(url, method, payload);
    if (!res || !res.ok) {
        alert((res && res.error) || 'Không thể lưu tư liệu');
        return;
    }

    var targetDocId = docId || (res.document && res.document.id);

    // Upload files if selected or pasted
    if (window._bcvPendingDocFiles && window._bcvPendingDocFiles.length > 0 && targetDocId) {
        for (var i = 0; i < window._bcvPendingDocFiles.length; i++) {
            var fd = new FormData();
            fd.append('file', window._bcvPendingDocFiles[i]);
            try {
                await fetch('/api/board-documents/' + targetDocId + '/attachments', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
                    body: fd
                });
            } catch(e) { console.error('Upload doc file err:', e); }
        }
        window._bcvPendingDocFiles = [];
    }

    var overlay = document.getElementById('bcvDocOverlay');
    if (overlay) overlay.remove();

    await _bcvLoadDocuments();
}

async function _bcvDeleteDocument(docId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tư liệu này?')) return;
    var res = await _bcvApi('/api/board-documents/' + docId, 'DELETE');
    if (res && res.ok) {
        await _bcvLoadDocuments();
    } else {
        alert((res && res.error) || 'Lỗi khi xóa tư liệu');
    }
}

async function _bcvReorderDocument(docId, direction) {
    try {
        var res = await _bcvApi('/api/board-documents/reorder', 'POST', { id: docId, direction: direction });
        if (res && res.ok) {
            await _bcvLoadDocuments();
        } else {
            alert((res && res.error) || 'Không thể sắp xếp vị trí công việc');
        }
    } catch(e) {
        console.error('[bcvReorderDocument]', e);
        alert('Lỗi khi sắp xếp vị trí công việc');
    }
}

async function _bcvDeleteDocAttachment(docId, attId) {
    if (!confirm('Xóa ảnh đính kèm này?')) return;
    var res = await _bcvApi('/api/board-documents/attachments/' + attId, 'DELETE');
    if (res && res.ok) {
        await _bcvLoadDocuments();
    }
}

function _bcvShowEditMainCategoryModal(deptId, oldMainCat) {
    var user = window._currentUser || {};
    if (user.role !== 'giam_doc') {
        alert('Chỉ tài khoản Giám Đốc mới có quyền sửa tên tư liệu!');
        return;
    }

    var cleanCat = oldMainCat ? oldMainCat.replace(/^\d+[\.\s\-]*/, '').trim() : '';

    var existing = document.getElementById('bcvEditCatOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvEditCatOverlay';

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:500px">
            <div class="bcv-modal-header" style="background:linear-gradient(135deg,#d97706 0%,#b45309 100%);padding:16px 20px;border-radius:14px 14px 0 0">
                <h3 style="color:#ffffff;font-size:16px;font-weight:900;letter-spacing:0.5px">✏️ SỬA TÊN TƯ LIỆU (CHỈ GIÁM ĐỐC)</h3>
                <button class="bcv-modal-close" onclick="document.getElementById('bcvEditCatOverlay').remove()" style="color:#ffffff;background:rgba(255,255,255,0.2)">✕</button>
            </div>
            <div class="bcv-modal-body" style="padding:20px">
                <div class="bcv-form-group" style="margin-bottom:14px">
                    <label style="font-weight:800;color:#64748b;font-size:12px;text-transform:uppercase">Tên tư liệu hiện tại</label>
                    <input class="bcv-form-input" disabled value="${_escAttr(cleanCat)}" style="width:100%;padding:9px 12px;font-size:13px;background:#f1f5f9;color:#64748b;cursor:not-allowed;border-color:#cbd5e1">
                </div>

                <div class="bcv-form-group" style="margin-bottom:18px">
                    <label style="font-weight:800;color:#0f172a;font-size:12px;text-transform:uppercase">Tên tư liệu mới <span style="color:#ef4444">*</span></label>
                    <input class="bcv-form-input" id="bcvEditCatNewName" value="${_escAttr(cleanCat)}" placeholder="Nhập tên tư liệu mới..." style="width:100%;padding:9px 12px;font-size:13px" autofocus>
                </div>

                <div class="bcv-form-actions">
                    <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvEditCatOverlay').remove()">Hủy</button>
                    <button class="bcv-btn bcv-btn-primary" style="background:linear-gradient(135deg,#d97706,#b45309)" onclick="_bcvSubmitRenameMainCategory('${deptId}', '${_escAttr(oldMainCat)}')">💾 Cập Nhật Tên</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

async function _bcvSubmitRenameMainCategory(deptId, oldMainCat) {
    var input = document.getElementById('bcvEditCatNewName');
    if (!input) return;
    var newName = input.value.trim();

    if (!newName) {
        alert('Vui lòng nhập tên tư liệu mới!');
        return;
    }

    var res = await _bcvApi('/api/board-documents/category/rename', 'PUT', {
        department_id: deptId || null,
        old_main_category: oldMainCat,
        new_main_category: newName
    });

    if (res && res.ok) {
        var overlay = document.getElementById('bcvEditCatOverlay');
        if (overlay) overlay.remove();
        await _bcvLoadDocuments();
    } else {
        alert((res && res.error) || 'Lỗi khi cập nhật tên tư liệu');
    }
}

var _bcvDocSearchTimer = null;
function _bcvDebounceLoadDocs() {
    if (_bcvDocSearchTimer) clearTimeout(_bcvDocSearchTimer);
    _bcvDocSearchTimer = setTimeout(function() {
        _bcvLoadDocuments();
    }, 300);
}

window.renderBangcongviecPage = renderBangcongviecPage;


// ========== EDIT TASK MODAL (Chỉ dành cho CẦN LÀM) ==========

async function _bcvShowEditTaskModal(taskId) {
    var task = _bcv.tasks.find(function(t) { return t.id === taskId; });
    if (!task) return;

    if (task.status !== 'can_lam') {
        alert('Chỉ có thể chỉnh sửa công việc khi ở trạng thái CẦN LÀM');
        return;
    }

    var user = window._currentUser || {};
    var isDirector = user.role === 'giam_doc';
    var isCreator = task.created_by === user.id;

    if (!isDirector && !isCreator) {
        alert('Chỉ người giao việc mới có quyền chỉnh sửa công việc này!');
        return;
    }

    var deptId = isDirector ? (task.department_id || '') : (user.department_id || '');
    var usersRes = await _bcvApi('/api/board-tasks/users' + (deptId ? '?department_id=' + deptId : ''));
    var users = (usersRes && usersRes.users) || [];

    var deptOptions = '';
    if (isDirector) {
        deptOptions = '<option value="">— Chọn phòng ban —</option>';
        _bcv.enabledDepts.forEach(function(d) {
            deptOptions += '<option value="' + d.id + '" ' + (String(task.department_id) === String(d.id) ? 'selected' : '') + '>' + _esc(d.name) + '</option>';
        });
    }

    var userOptions = '<option value="">— Chọn người —</option>';
    users.forEach(function(u) {
        userOptions += '<option value="' + u.id + '" ' + (String(task.assigned_to) === String(u.id) ? 'selected' : '') + '>' + _esc(u.full_name) + (u.department_name ? ' (' + _esc(u.department_name) + ')' : '') + '</option>';
    });

    var checklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
    var checklist = (checklistRes && checklistRes.checklist) || [];

    var cvId = _bcvGetTaskCode(task);

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvEditOverlay';

    overlay.innerHTML = '<div class="bcv-modal">' +
        '<div class="bcv-modal-header">' +
            '<h3>✏️ Chỉnh Sửa Công Việc: ' + cvId + '</h3>' +
            '<button class="bcv-modal-close" onclick="document.getElementById(\'bcvEditOverlay\').remove()">✕</button>' +
        '</div>' +
        '<div class="bcv-modal-body">' +
            (isDirector ? '<div class="bcv-form-group">' +
                '<label>Phòng ban *</label>' +
                '<select class="bcv-form-select" id="bcvEditDept" onchange="_bcvEditDeptChange()">' + deptOptions + '</select>' +
            '</div>' : '') +
            '<div class="bcv-form-group" id="bcvEditAssigneeWrap" style="display:' + (isDirector && !task.department_id ? 'none' : 'block') + '">' +
                '<label>Giao cho *</label>' +
                '<select class="bcv-form-select" id="bcvEditAssignee">' + userOptions + '</select>' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label>Tiêu đề *</label>' +
                '<input class="bcv-form-input" id="bcvEditTitle" value="' + _escAttr(task.title || '') + '" placeholder="Nhập tiêu đề công việc...">' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label>Mô tả *</label>' +
                '<textarea class="bcv-form-textarea" id="bcvEditDesc" placeholder="Mô tả chi tiết công việc...">' + _esc(task.description || '') + '</textarea>' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label>🔗 Đường link công việc *</label>' +
                '<input class="bcv-form-input" id="bcvEditLink" value="' + _escAttr(task.task_link || '') + '" placeholder="https://... hoặc đường dẫn liên quan">' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:4px">📚 Chọn Tư Liệu Hướng Dẫn</label>' +
                '<select class="bcv-form-select" id="bcvEditDocMainCat" onchange="_bcvEditDocMainCatChange()" style="margin-top:4px">' +
                    '<option value="">— Chọn phòng ban trước —</option>' +
                '</select>' +
                '<select class="bcv-form-select" id="bcvEditDocSubCat" onchange="_bcvEditDocSubCatChange()" style="display:none;margin-top:6px">' +
                    '<option value="">— Tất cả công việc —</option>' +
                '</select>' +
                '<div id="bcvEditDocLinksPreview" style="margin-top:8px"></div>' +
                '<input type="hidden" id="bcvEditGuideLink" value="' + _escAttr(task.guide_link || '') + '">' +
            '</div>' +
            '<div class="bcv-form-row">' +
                '<div class="bcv-form-group">' +
                    '<label>Loại *</label>' +
                    '<select class="bcv-form-select" id="bcvEditType">' +
                        '<option value="chinh" ' + (task.task_type === 'chinh' ? 'selected' : '') + '>🔵 Chính</option>' +
                        '<option value="phu" ' + (task.task_type === 'phu' ? 'selected' : '') + '>🟡 Phụ</option>' +
                    '</select>' +
                '</div>' +
                '<div class="bcv-form-group">' +
                    '<label>Ưu tiên *</label>' +
                    '<select class="bcv-form-select" id="bcvEditPriority">' +
                        '<option value="cao" ' + (task.priority === 'cao' ? 'selected' : '') + '>🔴 Cao</option>' +
                        '<option value="trung_binh" ' + (task.priority === 'trung_binh' ? 'selected' : '') + '>🟠 Trung bình</option>' +
                        '<option value="thap" ' + (task.priority === 'thap' ? 'selected' : '') + '>🟢 Thấp</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label>Deadline *</label>' +
                '<input class="bcv-form-input" type="date" id="bcvEditDeadline" value="' + (task.deadline || '') + '" onchange="_bcvCheckDeadlineHoliday(this)">' +
            '</div>' +
            '<div class="bcv-form-group">' +
                '<label>✅ Checklist Công Việc</label>' +
                '<div class="bcv-checklist-builder" id="bcvEditChecklistBuilder"></div>' +
                '<button class="bcv-cl-add" type="button" onclick="_bcvAddEditChecklistItem()">＋ Thêm mục</button>' +
            '</div>' +
            '<div class="bcv-form-actions">' +
                '<button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById(\'bcvEditOverlay\').remove()">Hủy</button>' +
                '<button class="bcv-btn bcv-btn-primary" id="bcvSubmitEditBtn" data-no-debounce="true" onclick="_bcvSubmitEditTask(' + task.id + ')">💾 Cập Nhật Task</button>' +
            '</div>' +
        '</div>' +
    '</div>';

    document.body.appendChild(overlay);

    // Populate checklist items
    var builder = document.getElementById('bcvEditChecklistBuilder');
    if (builder && checklist.length > 0) {
        checklist.forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'bcv-cl-item';
            div.innerHTML = '<input class="bcv-form-input bcv-cl-input" value="' + _escAttr(item.title) + '" placeholder="Mục checklist...">' +
                '<button class="bcv-cl-remove" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
            builder.appendChild(div);
        });
    }

    // Load docs for selected department
    var targetDeptId = isDirector ? (task.department_id || '') : (user.department_id || '');
    if (targetDeptId) {
        _bcvLoadEditDocs(targetDeptId, task.guide_link);
    }
}

function _bcvAddEditChecklistItem() {
    var builder = document.getElementById('bcvEditChecklistBuilder');
    if (!builder) return;
    var div = document.createElement('div');
    div.className = 'bcv-cl-item';
    div.innerHTML = '<input class="bcv-form-input bcv-cl-input" placeholder="Mục checklist...">' +
        '<button class="bcv-cl-remove" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
    builder.appendChild(div);
    div.querySelector('input').focus();
}

async function _bcvEditDeptChange() {
    var deptEl = document.getElementById('bcvEditDept');
    var assigneeEl = document.getElementById('bcvEditAssignee');
    var assigneeWrap = document.getElementById('bcvEditAssigneeWrap');
    if (!deptEl || !assigneeEl) return;

    var deptId = deptEl.value;
    if (!deptId) {
        if (assigneeWrap) assigneeWrap.style.display = 'none';
        assigneeEl.innerHTML = '<option value="">— Chọn người —</option>';
        _bcvResetEditDocPicker('— Chọn phòng ban trước —');
        return;
    }

    var usersRes = await _bcvApi('/api/board-tasks/users?department_id=' + deptId);
    var users = (usersRes && usersRes.users) || [];

    var h = '<option value="">— Chọn người —</option>';
    users.forEach(function(u) {
        h += '<option value="' + u.id + '">' + _esc(u.full_name) + '</option>';
    });
    assigneeEl.innerHTML = h;
    if (assigneeWrap) assigneeWrap.style.display = 'block';

    _bcvLoadEditDocs(deptId);
}

function _bcvResetEditDocPicker(placeholderText) {
    var mainSel = document.getElementById('bcvEditDocMainCat');
    var subSel = document.getElementById('bcvEditDocSubCat');
    var preview = document.getElementById('bcvEditDocLinksPreview');
    var hidden = document.getElementById('bcvEditGuideLink');
    if (mainSel) mainSel.innerHTML = '<option value="">' + (placeholderText || '— Chọn tư liệu —') + '</option>';
    if (subSel) { subSel.innerHTML = '<option value="">— Tất cả công việc —</option>'; subSel.style.display = 'none'; }
    if (preview) preview.innerHTML = '';
    if (hidden) hidden.value = '';
    _bcv._editDocs = [];
}

async function _bcvLoadEditDocs(deptId, initialGuideLink) {
    var mainSel = document.getElementById('bcvEditDocMainCat');
    if (!mainSel) return;

    mainSel.innerHTML = '<option value="">⏳ Đang tải tư liệu...</option>';

    var res = await _bcvApi('/api/board-documents?department_id=' + deptId);
    var docs = (res && res.documents) || [];
    _bcv._editDocs = docs;

    var mainCats = [];
    var seen = {};
    docs.forEach(function(doc) {
        if (doc.main_category && !seen[doc.main_category]) {
            seen[doc.main_category] = true;
            mainCats.push(doc.main_category);
        }
    });

    var h = '<option value="">— Chọn tư liệu —</option>';
    mainCats.forEach(function(cat, idx) {
        var cleanCat = cat.replace(/^\d+[\.\s\-]*/, '');
        h += '<option value="' + _escAttr(cat) + '">📌 Tư Liệu ' + (idx + 1) + ' : ' + _esc(cleanCat) + '</option>';
    });
    mainSel.innerHTML = h;

    var subSel = document.getElementById('bcvEditDocSubCat');
    var preview = document.getElementById('bcvEditDocLinksPreview');
    var hidden = document.getElementById('bcvEditGuideLink');

    // If initial guide link exists, auto-select matching document & category using URL + Title
    if (initialGuideLink) {
        if (hidden) hidden.value = initialGuideLink;
        var matchedDoc = null;
        var firstUrl = initialGuideLink;
        var firstTitle = '';
        if (initialGuideLink.trim().startsWith('[')) {
            try {
                var parsed = JSON.parse(initialGuideLink);
                if (parsed.length > 0) {
                    if (parsed[0].url) firstUrl = parsed[0].url;
                    if (parsed[0].title) firstTitle = parsed[0].title;
                }
            } catch(e) {}
        }
        docs.forEach(function(doc) {
            var links = doc.links || [];
            links.forEach(function(l) {
                var url = typeof l === 'string' ? l : l.url;
                var title = typeof l === 'string' ? l : (l.title || l.url);
                var matchUrl = url && (url.trim() === firstUrl.trim() || firstUrl.trim().includes(url.trim()));
                var matchTitle = !firstTitle || (title && title.trim() === firstTitle.trim());
                if (matchUrl && matchTitle) {
                    matchedDoc = doc;
                }
            });
        });

        if (matchedDoc) {
            mainSel.value = matchedDoc.main_category;
            _bcvEditDocMainCatChange();
            if (subSel) {
                subSel.value = matchedDoc.id;
                _bcvEditDocSubCatChange();
            }
        }
    }
}

function _bcvEditDocMainCatChange() {
    var mainSel = document.getElementById('bcvEditDocMainCat');
    var subSel = document.getElementById('bcvEditDocSubCat');
    var preview = document.getElementById('bcvEditDocLinksPreview');
    var hidden = document.getElementById('bcvEditGuideLink');
    if (!mainSel) return;

    var selectedCat = mainSel.value;
    if (!selectedCat) {
        if (subSel) { subSel.style.display = 'none'; subSel.innerHTML = '<option value="">— Tất cả công việc —</option>'; }
        if (preview) preview.innerHTML = '';
        if (hidden) hidden.value = '';
        return;
    }

    var docs = (_bcv._editDocs || []).filter(function(d) { return d.main_category === selectedCat; });

    var h = '<option value="">— Tất cả công việc —</option>';
    docs.forEach(function(doc, idx) {
        h += '<option value="' + doc.id + '">📌 ' + (idx + 1) + '. ' + _esc(doc.sub_category) + '</option>';
    });
    if (subSel) {
        subSel.innerHTML = h;
        subSel.style.display = 'block';
    }

    _bcvRenderEditDocLinks(docs, preview, hidden);
}

function _bcvEditDocSubCatChange() {
    var subSel = document.getElementById('bcvEditDocSubCat');
    var preview = document.getElementById('bcvEditDocLinksPreview');
    var hidden = document.getElementById('bcvEditGuideLink');
    if (!subSel) return;

    var selectedDocId = subSel.value;
    var mainSel = document.getElementById('bcvEditDocMainCat');
    var selectedCat = mainSel ? mainSel.value : '';

    if (!selectedDocId) {
        var docs = (_bcv._editDocs || []).filter(function(d) { return d.main_category === selectedCat; });
        _bcvRenderEditDocLinks(docs, preview, hidden);
        return;
    }

    var doc = (_bcv._editDocs || []).find(function(d) { return String(d.id) === String(selectedDocId); });
    if (doc) {
        _bcvRenderEditDocLinks([doc], preview, hidden);
    } else {
        if (preview) preview.innerHTML = '';
        if (hidden) hidden.value = '';
    }
}

function _bcvRenderEditDocLinks(docs, previewEl, hiddenEl) {
    if (!previewEl) return;

    var allMainCats = _bcv._editMainCats || [];
    if (allMainCats.length === 0) {
        docs.forEach(function(d) {
            if (d.main_category && !allMainCats.includes(d.main_category)) allMainCats.push(d.main_category);
        });
    }

    var allLinks = [];
    docs.forEach(function(doc, idx) {
        var links = doc.links || [];
        var prefix = doc.sub_category ? ((idx + 1) + '. ' + doc.sub_category) : '';
        var mainIdx = allMainCats.indexOf(doc.main_category);
        var cleanCat = doc.main_category ? doc.main_category.replace(/^\d+[\.\s\-]*/, '') : '';
        var formattedMainCat = 'Tư Liệu ' + (mainIdx >= 0 ? mainIdx + 1 : 1) + ' : ' + cleanCat;

        links.forEach(function(link) {
            var title = typeof link === 'string' ? link : (link.title || link.url);
            var url = typeof link === 'string' ? link : link.url;
            allLinks.push({ mainCat: formattedMainCat, subCat: doc.sub_category, prefix: prefix, title: title, url: url });
        });
    });

    if (allLinks.length === 0) {
        previewEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;font-style:italic;padding:6px 0">Không có link tư liệu nào</div>';
        if (hiddenEl) hiddenEl.value = '';
        return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:4px">';
    allLinks.forEach(function(link) {
        html += '<a href="' + _escAttr(link.url) + '" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:5px;border:1px solid #dbeafe;text-decoration:none;word-break:break-all;width:fit-content">' +
            '🔗 ' + _esc(link.title) + ' ↗</a>';
    });
    html += '</div>';
    previewEl.innerHTML = html;

    if (hiddenEl) hiddenEl.value = JSON.stringify(allLinks);
}

async function _bcvSubmitEditTask(taskId) {
    var title = (document.getElementById('bcvEditTitle') || {}).value || '';
    if (!title.trim()) { alert('Vui lòng nhập tiêu đề'); return; }

    var desc = (document.getElementById('bcvEditDesc') || {}).value || '';
    if (!desc.trim()) { alert('Vui lòng nhập mô tả công việc'); return; }

    var taskType = (document.getElementById('bcvEditType') || {}).value || '';
    if (!taskType) { alert('Vui lòng chọn loại công việc'); return; }

    var priority = (document.getElementById('bcvEditPriority') || {}).value || '';
    if (!priority) { alert('Vui lòng chọn mức ưu tiên'); return; }

    var assignee = (document.getElementById('bcvEditAssignee') || {}).value || '';
    if (!assignee) { alert('Vui lòng chọn người được giao'); return; }

    var deadline = (document.getElementById('bcvEditDeadline') || {}).value || '';
    if (!deadline) { alert('Vui lòng chọn deadline'); return; }
    if (window._bcvHolidays && window._bcvHolidays[deadline]) {
        alert('⚠️ Hạn chót (' + deadline + ') rơi vào ngày nghỉ lễ ("' + window._bcvHolidays[deadline] + '") theo trang Setup Ngày Lễ. Vui lòng chọn ngày làm việc khác!');
        return;
    }

    var taskLink = (document.getElementById('bcvEditLink') || {}).value || '';
    if (!taskLink.trim()) { alert('Vui lòng nhập đường link công việc'); return; }

    var guideLink = (document.getElementById('bcvEditGuideLink') || {}).value || '';
    var deptEl = document.getElementById('bcvEditDept');

    var btn = document.getElementById('bcvSubmitEditBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang lưu...'; }

    var body = {
        title: title.trim(),
        description: desc.trim(),
        task_type: taskType,
        priority: priority,
        assigned_to: assignee,
        deadline: deadline,
        task_link: taskLink.trim(),
        guide_link: guideLink.trim()
    };

    if (deptEl && deptEl.value) body.department_id = deptEl.value;

    var res = await _bcvApi('/api/board-tasks/' + taskId, 'PUT', body);

    if (res && res.ok) {
        // Save new checklist items safely
        var clInputs = document.querySelectorAll('#bcvEditChecklistBuilder .bcv-cl-input');
        if (clInputs.length > 0) {
            try {
                var existingChecklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
                var existingTitles = ((existingChecklistRes && existingChecklistRes.checklist) || []).map(function(c) { return (c.title || '').trim(); });
                for (var i = 0; i < clInputs.length; i++) {
                    var val = clInputs[i].value.trim();
                    if (val && !existingTitles.includes(val)) {
                        await _bcvApi('/api/board-tasks/' + taskId + '/checklist', 'POST', { title: val });
                    }
                }
            } catch(e) { console.error('Checklist edit save error:', e); }
        }

        var overlay = document.getElementById('bcvEditOverlay');
        if (overlay) overlay.remove();
        await _bcvLoadTasks();
    } else {
        alert(res?.error || 'Lỗi cập nhật task');
        if (btn) { btn.disabled = false; btn.textContent = '💾 Cập Nhật Task'; }
    }
}


// ========== NỘP CÔNG VIỆC (CHUYỂN SANG CHỜ DUYỆT) ==========
async function _bcvSubmitTask(taskId) {
    var reportContentEl = document.getElementById('bcvDetailReportContent');
    var reportLinkEl = document.getElementById('bcvDetailReportLink');
    var progressEl = document.getElementById('bcvDetailProgress');
    var reportContent = reportContentEl ? reportContentEl.value.trim() : '';
    var reportLink = reportLinkEl ? reportLinkEl.value.trim() : '';
    var progressVal = progressEl ? parseInt(progressEl.value, 10) : 100;

    // Check checklist progress
    var clCards = document.querySelectorAll('.bcv-cl-card');
    var totalCl = clCards.length;
    var doneCl = document.querySelectorAll('.bcv-cl-card.done').length;

    if (totalCl > 0 && doneCl < totalCl) {
        alert('⚠️ Vui lòng hoàn thành 100% mục Checklist công việc trước khi nộp!');
        return;
    }

    if (totalCl > 0 && doneCl === totalCl) {
        progressVal = 100;
    }

    if (!reportContent) {
        alert('⚠️ Vui lòng nhập Nội dung báo cáo toàn bộ công việc trước khi nộp!');
        if (reportContentEl) reportContentEl.focus();
        return;
    }

    if (!reportLink) {
        alert('⚠️ Vui lòng dán Đường link nộp báo cáo tổng thể trước khi nộp!');
        if (reportLinkEl) reportLinkEl.focus();
        return;
    }

    var submitBtn = document.getElementById('bcvSubmitTaskBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Đang nộp công việc...';
        submitBtn.style.opacity = '0.7';
    }

    try {
        // Save report details AND progress together
        await _bcvApi('/api/board-tasks/' + taskId, 'PUT', {
            report_content: reportContent,
            report_link: reportLink,
            progress: progressVal
        });

        // Update status to cho_duyet
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/status', 'PATCH', { status: 'cho_duyet' });
        if (res && res.ok) {
            alert('🎉 Đã nộp công việc thành công! Công việc đã được chuyển sang cột Chờ Duyệt.');
            var overlay = document.getElementById('bcvOverlay');
            if (overlay) overlay.remove();
            await _bcvLoadTasks();
        } else {
            alert((res && res.error) || 'Lỗi khi nộp công việc');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '🚀 Nộp Công Việc';
                submitBtn.style.opacity = '1';
            }
        }
    } catch(e) {
        console.error(e);
        alert('Lỗi hệ thống khi nộp công việc');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🚀 Nộp Công Việc';
            submitBtn.style.opacity = '1';
        }
    }
}


// ========== HIỂN THỊ POPUP CẢNH BÁO 2 ĐIỀU KIỆN ĐẸP SANG TRỌNG ==========
function _bcvShowConditionWarningModal(opts) {
    var old = document.getElementById('bcvConditionWarningOverlay');
    if (old) old.remove();

    var colName = opts.collectionName || 'Bộ Sưu Tập';
    var cond1Met = !!opts.condition1Met;
    var cond2Met = !!opts.condition2Met;

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvConditionWarningOverlay';
    overlay.style.zIndex = '100020';
    overlay.style.background = 'rgba(15, 23, 42, 0.75)';
    overlay.style.backdropFilter = 'blur(10px)';

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:540px;border-radius:20px;padding:0;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);background:#ffffff">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%);padding:20px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:26px;background:rgba(255,255,255,0.2);width:44px;height:44px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)">⚠️</span>
                    <div>
                        <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;color:#ffffff;text-transform:uppercase">KHÔNG THỂ DUYỆT CÔNG VIỆC</div>
                        <div style="font-size:12px;opacity:0.9;margin-top:2px;font-weight:600">Yêu cầu hoàn thành đủ 2 điều kiện bắt buộc</div>
                    </div>
                </div>
                <button onclick="document.getElementById('bcvConditionWarningOverlay').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Modal Body -->
            <div style="padding:22px 24px;display:flex;flex-direction:column;gap:16px">
                <div style="font-size:13px;color:#334155;line-height:1.5;font-weight:600">
                    Công việc thuộc nhóm <b style="color:#4338ca">"Tư Liệu 2 : Thiết Kế Mẫu - BST"</b> yêu cầu người dùng phải thỏa mãn <b>đủ 2 điều kiện</b> dưới đây:
                </div>

                <!-- 2 Conditions Cards -->
                <div style="display:flex;flex-direction:column;gap:10px;background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e2e8f0">
                    <!-- Condition 1 -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond1Met ? '#86efac' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond1Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">1. Tạo Bộ Sưu Tập cho công việc</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">${cond1Met ? `Đã tạo: <b style="color:#15803d">"${_esc(colName)}"</b>` : 'Người nhận việc chưa tạo Bộ Sưu Tập'}</div>
                            </div>
                        </div>
                        <span style="background:${cond1Met ? '#dcfce7' : '#fff1f2'};color:${cond1Met ? '#15803d' : '#e11d48'};border:1px solid ${cond1Met ? '#86efac' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond1Met ? '✅ ĐÃ TẠO ĐK1' : '❌ CHƯA TẠO'}
                        </span>
                    </div>

                    <!-- Condition 2 -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond2Met ? '#86efac' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond2Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">2. Người giao việc Duyệt Bộ Sưu Tập</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">${cond2Met ? 'Đã ấn Duyệt Bộ Sưu Tập' : 'Người giao việc chưa ấn nút Duyệt Bộ Sưu Tập'}</div>
                            </div>
                        </div>
                        <span style="background:${cond2Met ? '#dcfce7' : '#fff1f2'};color:${cond2Met ? '#15803d' : '#e11d48'};border:1px solid ${cond2Met ? '#86efac' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond2Met ? '✅ ĐÃ DUYỆT ĐK2' : '❌ CHƯA DUYỆT'}
                        </span>
                    </div>
                </div>

                <!-- Guidance Box -->
                <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 14px;border-radius:10px;color:#1e40af;font-size:12px;line-height:1.5;display:flex;align-items:flex-start;gap:8px">
                    <span style="font-size:16px;line-height:1">💡</span>
                    <div>
                        <b>Hướng dẫn khắc phục:</b><br>
                        ${!cond1Met 
                            ? 'Người nhận việc cần sang menu <b>"Bộ Sưu Tập / BST"</b> $\\rightarrow$ bấm <b>"Tạo Bộ Sưu Tập Mới"</b> chọn đúng mã công việc này.'
                            : 'Người giao việc cần sang menu <b>"Bộ Sưu Tập / BST"</b> $\\rightarrow$ mở <b>"👁️ Xem Chi Tiết"</b> bộ sưu tập <b>"' + _esc(colName) + '"</b> $\\rightarrow$ ấn nút <b>"✅ Duyệt Bộ Sưu Tập"</b> trước khi quay lại duyệt công việc.'}
                    </div>
                </div>

                <!-- Action Footer Buttons -->
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
                    <button onclick="document.getElementById('bcvConditionWarningOverlay').remove()" style="padding:9px 18px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;font-size:12.5px;cursor:pointer">Đóng</button>
                    <button onclick="document.getElementById('bcvConditionWarningOverlay').remove(); window.location.href='/bosuutap';" style="padding:9px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#3730a3);color:#ffffff;font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(67,56,202,0.35)">
                        🚀 Sang Trang "Bộ Sưu Tập / BST" ↗
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function _bcvShowTuLieu3ConditionWarningModal(opts) {
    opts = opts || {};
    var colName = opts.collectionName || 'Bộ Sưu Tập';
    var cond1Met = !!opts.condition1Met;
    var cond2Met = !!opts.condition2Met;

    var old = document.getElementById('bcvTuLieu3WarningOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvTuLieu3WarningOverlay';
    overlay.style.zIndex = '100020';
    overlay.style.background = 'rgba(15, 23, 42, 0.75)';
    overlay.style.backdropFilter = 'blur(10px)';

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:560px;border-radius:20px;padding:0;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);background:#ffffff">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%);padding:20px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:26px;background:rgba(255,255,255,0.2);width:44px;height:44px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)">⚠️</span>
                    <div>
                        <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;color:#ffffff;text-transform:uppercase">KHÔNG THỂ DUYỆT CÔNG VIỆC</div>
                        <div style="font-size:12px;opacity:0.9;margin-top:2px;font-weight:600">Yêu cầu hoàn thành đủ 2 điều kiện bắt buộc</div>
                    </div>
                </div>
                <button onclick="document.getElementById('bcvTuLieu3WarningOverlay').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Modal Body -->
            <div style="padding:22px 24px;display:flex;flex-direction:column;gap:16px">
                <div style="font-size:13px;color:#334155;line-height:1.5;font-weight:600">
                    Công việc <b style="color:#0284c7">"Tư Liệu 3 : Chụp Ảnh / Tạo AI - BST"</b> liên kết với Bộ Sưu Tập <b style="color:#4338ca">"${_esc(colName)}"</b> yêu cầu <b>đủ 2 điều kiện</b> dưới đây trước khi Duyệt:
                </div>

                <!-- 2 Conditions Cards -->
                <div style="display:flex;flex-direction:column;gap:10px;background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e2e8f0">
                    <!-- Condition 1 -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond1Met ? '#86efac' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond1Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">1. 📷 Thêm Ảnh Mẫu BST (Mục 8 ở Bộ Sưu Tập)</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">${cond1Met ? 'Đã có hình ảnh mẫu BST tại Mục 8' : 'Chưa có hình ảnh mẫu nào được tải lên ở Mục 8 (📷 Chụp Ảnh Mẫu BST)'}</div>
                            </div>
                        </div>
                        <span style="background:${cond1Met ? '#dcfce7' : '#fff1f2'};color:${cond1Met ? '#15803d' : '#e11d48'};border:1px solid ${cond1Met ? '#86efac' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond1Met ? '✅ ĐÃ CÓ ÁNH' : '❌ CHƯA CÓ ÁNH'}
                        </span>
                    </div>

                    <!-- Condition 2 -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond2Met ? '#86efac' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond2Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">2. 🤝 Đã Họp Bàn Giao & Họp Với Sale (Mục 9 & 10)</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">${cond2Met ? 'Đã hoàn thành cuộc họp ở Quy trình cuộc họp' : 'Chưa họp hoặc chưa có biên bản cuộc họp ở Quy trình cuộc họp'}</div>
                            </div>
                        </div>
                        <span style="background:${cond2Met ? '#dcfce7' : '#fff1f2'};color:${cond2Met ? '#15803d' : '#e11d48'};border:1px solid ${cond2Met ? '#86efac' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond2Met ? '✅ ĐÃ HỌP' : '❌ CHƯA HỌP'}
                        </span>
                    </div>
                </div>

                <!-- Guidance Box -->
                <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 14px;border-radius:10px;color:#1e40af;font-size:12px;line-height:1.5;display:flex;align-items:flex-start;gap:8px">
                    <span style="font-size:16px;line-height:1">💡</span>
                    <div>
                        <b>Hướng dẫn khắc phục:</b><br>
                        ${!cond1Met ? '• Cần sang trang <b>"Bộ Sưu Tập / BST"</b> $\\rightarrow$ mở Bộ Sưu Tập <b>"' + _esc(colName) + '"</b> $\\rightarrow$ tại Mục 8 bấm <b>"📷 + Thêm Ảnh Mẫu BST"</b>.<br>' : ''}
                        ${!cond2Met ? '• Cần sang <b>"Quy Trình Cuộc Họp"</b> $\\rightarrow$ tổ chức và hoàn thành cuộc họp cho Bộ Sưu Tập <b>"' + _esc(colName) + '"</b>.' : ''}
                    </div>
                </div>

                <!-- Action Footer Buttons -->
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
                    <button onclick="document.getElementById('bcvTuLieu3WarningOverlay').remove()" style="padding:9px 18px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;font-size:12.5px;cursor:pointer">Đóng</button>
                    ${!cond1Met ? `<button onclick="document.getElementById('bcvTuLieu3WarningOverlay').remove(); window.location.href='/bosuutap';" style="padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px">📷 Tải Ảnh Mục 8 ↗</button>` : ''}
                    ${!cond2Met ? `<button onclick="document.getElementById('bcvTuLieu3WarningOverlay').remove(); window.location.href='/quytrinhcuochop';" style="padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px">🤝 Xem Cuộc Họp ↗</button>` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function _bcvShowTuLieu4VideoWarningModal(opts) {
    opts = opts || {};
    var colName = opts.collectionName || 'Bộ Sưu Tập';

    var old = document.getElementById('bcvTuLieu4WarningOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvTuLieu4WarningOverlay';
    overlay.style.zIndex = '100020';
    overlay.style.background = 'rgba(15, 23, 42, 0.75)';
    overlay.style.backdropFilter = 'blur(10px)';

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:560px;border-radius:20px;padding:0;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);background:#ffffff">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%);padding:20px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:26px;background:rgba(255,255,255,0.2);width:44px;height:44px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)">⚠️</span>
                    <div>
                        <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;color:#ffffff;text-transform:uppercase">KHÔNG THỂ DUYỆT CÔNG VIỆC</div>
                        <div style="font-size:12px;opacity:0.9;margin-top:2px;font-weight:600">Yêu cầu hoàn thành mục VIDEO BỘ SƯU TẬP (Google Drive)</div>
                    </div>
                </div>
                <button onclick="document.getElementById('bcvTuLieu4WarningOverlay').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Modal Body -->
            <div style="padding:22px 24px;display:flex;flex-direction:column;gap:16px">
                <div style="font-size:13px;color:#334155;line-height:1.5;font-weight:600">
                    Công việc <b style="color:#0284c7">"Tư Liệu 4 : Quay Video / Tạo AI - BST"</b> liên kết với Bộ Sưu Tập <b style="color:#4338ca">"${_esc(colName)}"</b> yêu cầu <b>bắt buộc phải có link video</b> tại mục <b>VIDEO BỘ SƯU TẬP (Google Drive):</b> trước khi Duyệt:
                </div>

                <!-- Condition Card -->
                <div style="display:flex;flex-direction:column;gap:10px;background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e2e8f0">
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid #fecdd3;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">❌</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">🎥 Link Video Bộ Sưu Tập (Google Drive)</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">Chưa có link video nào được bổ sung cho Bộ Sưu Tập này</div>
                            </div>
                        </div>
                        <span style="background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ❌ CHƯA CÓ VIDEO
                        </span>
                    </div>
                </div>

                <!-- Guidance Box -->
                <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 14px;border-radius:10px;color:#1e40af;font-size:12px;line-height:1.5;display:flex;align-items:flex-start;gap:8px">
                    <span style="font-size:16px;line-height:1">💡</span>
                    <div>
                        <b>Hướng dẫn khắc phục:</b><br>
                        • Cần sang trang <b>"Bộ Sưu Tập / BST"</b> $\rightarrow$ mở Bộ Sưu Tập <b>"${_esc(colName)}"</b> $\rightarrow$ tại mục <b>🎥 VIDEO BỘ SƯU TẬP (Google Drive):</b> dán link video Google Drive và lưu lại.
                    </div>
                </div>

                <!-- Action Footer Buttons -->
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
                    <button onclick="document.getElementById('bcvTuLieu4WarningOverlay').remove()" style="padding:9px 18px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;font-size:12.5px;cursor:pointer">Đóng</button>
                    <button onclick="document.getElementById('bcvTuLieu4WarningOverlay').remove(); window.location.href='/bosuutap';" style="padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px">📹 Thêm Link Video ↗</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function _bcvShowTuLieu5KhoAdsWarningModal(opts) {
    opts = opts || {};
    var cond1Met = !!opts.condition1Met;
    var cond2Met = !!opts.condition2Met;
    var currentItems = opts.currentItems || 0;
    var targetQty = opts.targetQty || 1;
    var assignerName = opts.assignerName || 'Người giao việc';

    var old = document.getElementById('bcvTuLieu5WarningOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvTuLieu5WarningOverlay';
    overlay.style.zIndex = '100020';
    overlay.style.background = 'rgba(15, 23, 42, 0.75)';
    overlay.style.backdropFilter = 'blur(10px)';

    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:580px;border-radius:20px;padding:0;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);background:#ffffff">
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%);padding:20px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:26px;background:rgba(255,255,255,0.2);width:44px;height:44px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)">⚠️</span>
                    <div>
                        <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;color:#ffffff;text-transform:uppercase">CHƯA ĐỦ ĐIỀU KIỆN DUYỆT CÔNG VIỆC</div>
                        <div style="font-size:12px;opacity:0.9;margin-top:2px;font-weight:600">Yêu cầu hoàn thành 2 Điều kiện tại Kho Video/Ảnh Ads</div>
                    </div>
                </div>
                <button onclick="document.getElementById('bcvTuLieu5WarningOverlay').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>

            <!-- Modal Body -->
            <div style="padding:22px 24px;display:flex;flex-direction:column;gap:16px">
                <div style="font-size:13px;color:#334155;line-height:1.5;font-weight:600">
                    Công việc thuộc loại <b style="color:#4338ca">"Tư Liệu 5 : Video / Ảnh Ads"</b> bắt buộc phải đáp ứng <b>đủ 2 điều kiện</b> trước khi bấm Phê Duyệt:
                </div>

                <!-- Condition Cards List -->
                <div style="display:flex;flex-direction:column;gap:10px;background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e2e8f0">
                    <!-- Condition 1 Card -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond1Met ? '#a7f3d0' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond1Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">1. 📦 Tạo & Nộp Tư Liệu Ads ở Kho Ads</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">Tiến độ tạo tư liệu: <strong>${currentItems} / ${targetQty}</strong> tư liệu</div>
                            </div>
                        </div>
                        <span style="background:${cond1Met ? '#ecfdf5' : '#fff1f2'};color:${cond1Met ? '#059669' : '#e11d48'};border:1px solid ${cond1Met ? '#a7f3d0' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond1Met ? '✅ ĐÃ ĐỦ' : '❌ CHƯA ĐỦ'}
                        </span>
                    </div>

                    <!-- Condition 2 Card -->
                    <div style="background:#ffffff;padding:12px 14px;border-radius:10px;border:1.5px solid ${cond2Met ? '#a7f3d0' : '#fecdd3'};display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 5px rgba(0,0,0,0.02)">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:20px">${cond2Met ? '✅' : '❌'}</span>
                            <div>
                                <div style="font-size:13px;font-weight:800;color:#0f172a">2. 👑 Phê Duyệt từ Người Giao Việc</div>
                                <div style="font-size:11.5px;color:#64748b;margin-top:2px">Người giao việc (<strong>${_esc(assignerName)}</strong>) vào Kho Ads bấm <i>"Duyệt Tư Liệu Ads"</i></div>
                            </div>
                        </div>
                        <span style="background:${cond2Met ? '#ecfdf5' : '#fff1f2'};color:${cond2Met ? '#059669' : '#e11d48'};border:1px solid ${cond2Met ? '#a7f3d0' : '#fecdd3'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap">
                            ${cond2Met ? '✅ ĐÃ DUYỆT' : '❌ CHƯA DUYỆT'}
                        </span>
                    </div>
                </div>

                <!-- Guidance Box -->
                <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 14px;border-radius:10px;color:#1e40af;font-size:12px;line-height:1.5;display:flex;align-items:flex-start;gap:8px">
                    <span style="font-size:16px;line-height:1">💡</span>
                    <div>
                        <b>Hướng dẫn xử lý từng bước:</b><br>
                        ${!cond1Met ? `• <b>Bước 1:</b> Mở trang <b>"Kho Video/Ảnh Ads"</b> $\rightarrow$ Bấm <i>"Thêm Tư Liệu Ads Mới"</i> để nộp đủ ${targetQty} tư liệu Ads.<br>` : ''}
                        ${!cond2Met ? `• <b>Bước 2:</b> Yêu cầu Người Giao Việc (<b>${_esc(assignerName)}</b>) mở trang <b>"Kho Video/Ảnh Ads"</b> $\rightarrow$ Bấm <i>"Xem Chi Tiết"</i> công việc này $\rightarrow$ Bấm nút <b>"✅ DUYỆT TƯ LIỆU ADS CÔNG VIỆC"</b>.` : ''}
                    </div>
                </div>

                <!-- Action Footer Buttons -->
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
                    <button onclick="document.getElementById('bcvTuLieu5WarningOverlay').remove()" style="padding:9px 18px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;font-size:12.5px;cursor:pointer">Đóng</button>
                    <button onclick="document.getElementById('bcvTuLieu5WarningOverlay').remove(); window.location.href='/khoads';" style="padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#3730a3);color:#ffffff;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(67,56,202,0.3)">📦 Mở Kho Video/Ảnh Ads ↗</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

// ========== HIỂN THỊ MODAL DUYỆT CÔNG VIỆC ==========
async function _bcvShowApproveModal(taskId) {
    var task = (_bcv.tasks || []).find(function(t) { return t.id === taskId; });
    if (task) {
        let guides = [];
        try {
            guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
        } catch(e){}
        let isTuLieu2Task = false;
        if (Array.isArray(guides) && guides.length > 0) {
            isTuLieu2Task = guides.some(g => {
                const gMain = (g.mainCat || '').toLowerCase();
                const gSub = (g.subCat || g.title || '').toLowerCase();
                const fullStr = (gMain + ' ' + gSub).toLowerCase();
                if (fullStr.includes('tư liệu 3') || fullStr.includes('chụp ảnh') || fullStr.includes('tạo ai')) {
                    return false;
                }
                return fullStr.includes('tư liệu 2') || fullStr.includes('thiết kế mẫu');
            });
        }
        if (!isTuLieu2Task && task.title) {
            const tLower = task.title.toLowerCase();
            if ((tLower.includes('thiết kế mẫu') || tLower.includes('tư liệu 2')) && !tLower.includes('chụp ảnh') && !tLower.includes('tạo ai') && !tLower.includes('tư liệu 3')) {
                isTuLieu2Task = true;
            }
        }

        if (isTuLieu2Task) {
            try {
                var colsRes = await _bcvApi('/api/collections');
                var collections = (colsRes && colsRes.collections) || [];
                var linkedCollection = collections.find(function(c) { return Number(c.task_id) === Number(taskId); });

                if (!linkedCollection) {
                    _bcvShowConditionWarningModal({
                        collectionName: '',
                        condition1Met: false,
                        condition2Met: false
                    });
                    return;
                }

                if (!linkedCollection.is_approved) {
                    _bcvShowConditionWarningModal({
                        collectionName: linkedCollection.name,
                        collectionId: linkedCollection.id,
                        condition1Met: true,
                        condition2Met: false
                    });
                    return;
                }
            } catch(e) {
                console.error('[pre-check approve task error]', e);
            }
        }

        // Pre-check 2 approval conditions for "Tư Liệu 3 : Chụp Ảnh / Tạo AI - BST"
        let isTuLieu3Task = false;
        if (Array.isArray(guides) && guides.length > 0) {
            isTuLieu3Task = guides.some(g => {
                const gMain = (g.mainCat || '').toLowerCase();
                const gSub = (g.subCat || g.title || '').toLowerCase();
                const fullStr = (gMain + ' ' + gSub).toLowerCase();
                if (fullStr.includes('quay video') || fullStr.includes('tư liệu 4')) return false;
                return fullStr.includes('tư liệu 3') || fullStr.includes('chụp ảnh');
            });
        }
        if (!isTuLieu3Task && task.title) {
            const tLower = task.title.toLowerCase();
            if ((tLower.includes('chụp ảnh') || tLower.includes('tư liệu 3')) && !tLower.includes('quay video') && !tLower.includes('tư liệu 4')) {
                isTuLieu3Task = true;
            }
        }

        if (isTuLieu3Task) {
            try {
                var colsRes3 = await _bcvApi('/api/collections');
                var collections3 = (colsRes3 && colsRes3.collections) || [];
                var linkedCol3 = collections3.find(function(c) {
                    if (task.collection_id && Number(c.id) === Number(task.collection_id)) return true;
                    if (Number(c.task_id) === Number(taskId)) return true;
                    return false;
                });

                if (!linkedCol3) {
                    _bcvShowTuLieu3ConditionWarningModal({
                        collectionName: 'Chưa chọn Bộ Sưu Tập',
                        condition1Met: false,
                        condition2Met: false
                    });
                    return;
                }

                // Check Condition 1: Section 8 photos exist (chup_anh_mau_bst)
                var chupRaw = typeof linkedCol3.chup_anh_mau_bst === 'string' ? JSON.parse(linkedCol3.chup_anh_mau_bst) : (linkedCol3.chup_anh_mau_bst || []);
                var chupPhotoCount = 0;
                if (Array.isArray(chupRaw)) {
                    chupPhotoCount = chupRaw.length;
                } else if (chupRaw && typeof chupRaw === 'object') {
                    var urls = Array.isArray(chupRaw.image_urls) ? chupRaw.image_urls : (chupRaw.image_url ? [chupRaw.image_url] : []);
                    chupPhotoCount = urls.filter(Boolean).length;
                }
                var cond1Met = chupPhotoCount > 0;

                // Check Condition 2: Section 9 & 10 meeting completed (completed_meeting or hop_voi_sale status da_ket_thuc)
                var cond2Met = !!(linkedCol3.completed_meeting || (linkedCol3.hop_voi_sale && (linkedCol3.hop_voi_sale.status === 'da_ket_thuc' || (typeof linkedCol3.hop_voi_sale === 'string' && linkedCol3.hop_voi_sale.includes('da_ket_thuc')))));

                if (!cond1Met || !cond2Met) {
                    _bcvShowTuLieu3ConditionWarningModal({
                        collectionName: linkedCol3.name,
                        condition1Met: cond1Met,
                        condition2Met: cond2Met
                    });
                    return;
                }

                var tuLieu3ApprovalHtml = `
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;padding:12px 14px;border-radius:12px;margin-bottom:14px;box-shadow:0 2px 6px rgba(22,163,74,0.06)">
                        <div style="font-size:12.5px;font-weight:800;color:#166534;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                            <span>🎉</span> ĐÃ XÁC NHẬN ĐỦ 2 ĐIỀU KIỆN DUYỆT:
                        </div>
                        <div style="font-size:11.5px;color:#15803d;display:flex;flex-direction:column;gap:5px;font-weight:600">
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="color:#16a34a">✅</span> <b>Điều kiện 1:</b> 📷 Đã thêm ${chupPhotoCount} ảnh mẫu BST (Mục 8)
                            </div>
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="color:#16a34a">✅</span> <b>Điều kiện 2:</b> 🤝 Đã họp bàn giao & họp với Sale (Mục 9 & 10)
                            </div>
                        </div>
                    </div>
                `;
                _bcv._currentTuLieu3ApprovalHtml = tuLieu3ApprovalHtml;
            } catch(e) {
                console.error('[pre-check approve task 3 error]', e);
            }
        }

        // Pre-check video condition for "Tư Liệu 4 : Quay Video / Tạo AI - BST"
        let isTuLieu4Task = false;
        if (Array.isArray(guides) && guides.length > 0) {
            isTuLieu4Task = guides.some(g => {
                const gMain = (g.mainCat || '').toLowerCase();
                const gSub = (g.subCat || g.title || '').toLowerCase();
                const fullStr = (gMain + ' ' + gSub).toLowerCase();
                return fullStr.includes('tư liệu 4') || fullStr.includes('quay video');
            });
        }
        if (!isTuLieu4Task && task.title) {
            const tLower = task.title.toLowerCase();
            if (tLower.includes('quay video') || tLower.includes('tư liệu 4')) {
                isTuLieu4Task = true;
            }
        }

        if (isTuLieu4Task) {
            try {
                var colsRes4 = await _bcvApi('/api/collections');
                var collections4 = (colsRes4 && colsRes4.collections) || [];
                var linkedCol4 = collections4.find(function(c) {
                    if (task.collection_id && Number(c.id) === Number(task.collection_id)) return true;
                    if (Number(c.task_id) === Number(taskId)) return true;
                    return false;
                });

                if (!linkedCol4) {
                    _bcvShowTuLieu4VideoWarningModal({
                        collectionName: 'Chưa chọn Bộ Sưu Tập'
                    });
                    return;
                }

                var vBst = linkedCol4.video_bst || {};
                var vLink = '';
                if (typeof vBst === 'string') { try { vBst = JSON.parse(vBst); } catch(e){} }
                if (typeof vBst === 'object' && vBst !== null) {
                    vLink = Array.isArray(vBst) ? (vBst[0] || '') : (vBst.link || '');
                } else if (typeof vBst === 'string') {
                    vLink = vBst;
                }
                var hasVideo = Boolean(vLink && String(vLink).trim());

                if (!hasVideo) {
                    _bcvShowTuLieu4VideoWarningModal({
                        collectionName: linkedCol4.name
                    });
                    return;
                }

                var tuLieu4ApprovalHtml = `
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;padding:12px 14px;border-radius:12px;margin-bottom:14px;box-shadow:0 2px 6px rgba(22,163,74,0.06)">
                        <div style="font-size:12.5px;font-weight:800;color:#166534;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                            <span>🎉</span> ĐÃ XÁC NHẬN ĐỦ ĐIỀU KIỆN DUYỆT:
                        </div>
                        <div style="font-size:11.5px;color:#15803d;display:flex;flex-direction:column;gap:5px;font-weight:600">
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="color:#16a34a">✅</span> <b>Điều kiện Video:</b> 🎥 Đã có link Video Bộ Sưu Tập (Google Drive)
                            </div>
                        </div>
                    </div>
                `;
                _bcv._currentTuLieu4ApprovalHtml = tuLieu4ApprovalHtml;
            } catch(e) {
                console.error('[pre-check approve task 4 error]', e);
            }
        }

        // Pre-check 2 approval conditions for "Tư Liệu 5 : Video / Ảnh Ads"
        let isTuLieu5Task = false;
        if (Array.isArray(guides) && guides.length > 0) {
            isTuLieu5Task = guides.some(g => {
                const gMain = (g.mainCat || '').toLowerCase();
                const gSub = (g.subCat || g.title || '').toLowerCase();
                const fullStr = (gMain + ' ' + gSub).toLowerCase();
                return fullStr.includes('tư liệu 5') || fullStr.includes('video / ảnh ads') || fullStr.includes('video/ảnh ads');
            });
        }
        if (!isTuLieu5Task && task.title) {
            const tLower = task.title.toLowerCase();
            const gLinkLower = (task.guide_link || '').toLowerCase();
            if (tLower.includes('tư liệu 5') || tLower.includes('video / ảnh ads') || tLower.includes('video/ảnh ads') ||
                gLinkLower.includes('tư liệu 5') || gLinkLower.includes('video / ảnh ads') || gLinkLower.includes('video/ảnh ads')) {
                isTuLieu5Task = true;
            }
        }

        if (isTuLieu5Task) {
            try {
                var khoAdsRes = await _bcvApi('/api/kho-ads/tasks-grouped');
                var khoAdsTasks = (khoAdsRes && khoAdsRes.tasks) || [];
                var khoTask = khoAdsTasks.find(function(t) { return Number(t.id) === Number(taskId); });

                var itemsCount = khoTask && khoTask.items ? khoTask.items.length : 0;
                var targetQty = (khoTask && khoTask.target_quantity) || task.target_quantity || 1;
                var cond1Met = itemsCount >= targetQty && itemsCount > 0;
                var cond2Met = khoTask ? !!khoTask.kho_ads_approved : !!task.kho_ads_approved;
                var assignerName = (khoTask && khoTask.creator_name) || task.creator_name || task.created_by_name || 'Người giao việc';

                if (!cond1Met || !cond2Met) {
                    _bcvShowTuLieu5KhoAdsWarningModal({
                        condition1Met: cond1Met,
                        condition2Met: cond2Met,
                        currentItems: itemsCount,
                        targetQty: targetQty,
                        assignerName: assignerName
                    });
                    return;
                }

                var tuLieu5ApprovalHtml = `
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;padding:12px 14px;border-radius:12px;margin-bottom:14px;box-shadow:0 2px 6px rgba(22,163,74,0.06)">
                        <div style="font-size:12.5px;font-weight:800;color:#166534;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                            <span>🎉</span> ĐÃ XÁC NHẬN ĐỦ 2 ĐIỀU KIỆN DUYỆT KHO ADS:
                        </div>
                        <div style="font-size:11.5px;color:#15803d;display:flex;flex-direction:column;gap:5px;font-weight:600">
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="color:#16a34a">✅</span> <b>Điều kiện 1:</b> 📦 Đã tạo & nộp đủ ${itemsCount}/${targetQty} Tư Liệu Ads tại Kho Ads
                            </div>
                            <div style="display:flex;align-items:center;gap:6px">
                                <span style="color:#16a34a">✅</span> <b>Điều kiện 2:</b> 👑 Người giao việc (${_esc(assignerName)}) đã bấm Phê Duyệt ở Kho Ads
                            </div>
                        </div>
                    </div>
                `;
                _bcv._currentTuLieu5ApprovalHtml = tuLieu5ApprovalHtml;
            } catch(e) {
                console.error('[pre-check approve task 5 error]', e);
            }
        }
    }

    var old = document.getElementById('bcvApproveOverlay');
    if (old) old.remove();

    var extraCondHtml = (_bcv._currentTuLieu3ApprovalHtml || '') + (_bcv._currentTuLieu4ApprovalHtml || '') + (_bcv._currentTuLieu5ApprovalHtml || '');
    _bcv._currentTuLieu3ApprovalHtml = '';
    _bcv._currentTuLieu4ApprovalHtml = '';
    _bcv._currentTuLieu5ApprovalHtml = '';

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvApproveOverlay';
    overlay.style.zIndex = '100010';
    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:500px;border-radius:16px;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3)">
            <div style="font-size:16px;font-weight:800;color:#16a34a;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                ✅ ĐÁNH GIÁ & PHÊ DUYỆT CÔNG VIỆC
            </div>
            ${extraCondHtml}
            <div style="font-size:12px;color:#64748b;margin-bottom:14px;line-height:1.4">
                Nhập nội dung đánh giá nghiệm thu công việc (khen thưởng, nhận xét...):
            </div>
            <textarea id="bcvApproveComment" placeholder="Nội dung đánh giá hoàn thành công việc..." style="width:100%;min-height:90px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:16px;box-sizing:border-box"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:10px">
                <button style="padding:8px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;cursor:pointer" onclick="document.getElementById('bcvApproveOverlay').remove()">Hủy</button>
                <button style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-weight:800;cursor:pointer" onclick="_bcvConfirmApprove(${taskId})">✅ Phê Duyệt & Hoàn Thành</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _bcvConfirmApprove(taskId) {
    var commentEl = document.getElementById('bcvApproveComment');
    var comment = commentEl ? commentEl.value.trim() : '';

    var res = await _bcvApi('/api/board-tasks/' + taskId + '/review', 'PATCH', {
        action: 'approve',
        review_comment: comment
    });

    if (res && res.ok) {
        alert('🎉 Đã phê duyệt công việc thành công! Công việc đã chuyển sang cột Hoàn Thành.');
        var ov1 = document.getElementById('bcvApproveOverlay'); if (ov1) ov1.remove();
        var ov2 = document.getElementById('bcvOverlay'); if (ov2) ov2.remove();
        _bcvLoadTasks();
    } else {
        if (res && res.is_tulieu5) {
            _bcvShowTuLieu5KhoAdsWarningModal({
                condition1Met: res.condition1_met,
                condition2Met: res.condition2_met,
                currentItems: res.current_items || 0,
                targetQty: res.target_qty || 1,
                assignerName: res.assigner_name || 'Người giao việc'
            });
        } else if (res && res.condition1_met !== undefined) {
            _bcvShowConditionWarningModal({
                collectionName: res.collection_name || '',
                collectionId: res.collection_id || null,
                condition1Met: res.condition1_met,
                condition2Met: res.condition2_met
            });
        } else {
            alert((res && res.error) || 'Lỗi khi phê duyệt công việc');
        }
    }
}

// ========== HIỂN THỊ MODAL KHÔNG DUYỆT (YÊU CẦU SỬA) ==========
function _bcvShowRejectModal(taskId) {
    var old = document.getElementById('bcvRejectOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvRejectOverlay';
    overlay.style.zIndex = '100010';
    overlay.innerHTML = `
        <div class="bcv-modal" style="max-width:550px;border-radius:16px;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3)">
            <div style="font-size:16px;font-weight:800;color:#dc2626;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                ❌ FEEDBACK YÊU CẦU SỬA CÔNG VIỆC
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:14px;line-height:1.4">
                Nhập rõ lý do chưa đạt và hướng dẫn các nội dung người nhận việc cần sửa lại:
            </div>
            
            <div style="margin-bottom:12px">
                <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;display:block;margin-bottom:4px">📝 Nội dung Feedback Sửa công việc (*)</label>
                <textarea id="bcvRejectContent" placeholder="Mô tả chi tiết các mục cần sửa lại..." style="width:100%;min-height:90px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></textarea>
            </div>

            <div style="margin-bottom:18px">
                <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;display:block;margin-bottom:4px">🔗 Đường link Feedback sửa (nếu có)</label>
                <input type="text" id="bcvRejectLink" placeholder="Dán link Google Docs, Drive, Sheet, Figma góp ý..." style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit;outline:none;box-sizing:border-box">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px">
                <button style="padding:8px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#475569;font-weight:700;cursor:pointer" onclick="document.getElementById('bcvRejectOverlay').remove()">Hủy</button>
                <button style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;font-weight:800;cursor:pointer" onclick="_bcvConfirmReject(${taskId})">🔄 Gửi Feedback & Yêu Cầu Sửa</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _bcvConfirmReject(taskId) {
    var contentEl = document.getElementById('bcvRejectContent');
    var linkEl = document.getElementById('bcvRejectLink');
    var content = contentEl ? contentEl.value.trim() : '';
    var link = linkEl ? linkEl.value.trim() : '';

    if (!content) {
        alert('⚠️ Vui lòng nhập Nội dung Feedback Sửa công việc!');
        if (contentEl) contentEl.focus();
        return;
    }

    if (link) {
        // Kiểm tra xem có phải là đường link hợp lệ hay không
        var isUrl = /^https?:\/\/.+/i.test(link) || /^([\w\-]+\.)+[\w\-]+(\/.*)?$/i.test(link);
        if (!isUrl) {
            alert('⚠️ Đường link Feedback sửa phải là một đường link hợp lệ (ví dụ: https://... hoặc http://...)');
            if (linkEl) linkEl.focus();
            return;
        }
        if (!/^https?:\/\//i.test(link)) {
            link = 'http://' + link;
        }
    }

    var res = await _bcvApi('/api/board-tasks/' + taskId + '/review', 'PATCH', {
        action: 'reject',
        feedback_content: content,
        feedback_link: link
    });

    if (res && res.ok) {
        alert('↩️ Đã gửi Feedback thành công! Công việc đã được trả về cột Đang Làm để nhân viên sửa lại.');
        var ov1 = document.getElementById('bcvRejectOverlay'); if (ov1) ov1.remove();
        var ov2 = document.getElementById('bcvOverlay'); if (ov2) ov2.remove();
        _bcvLoadTasks();
    } else {
        alert((res && res.error) || 'Lỗi khi gửi Feedback yêu cầu sửa');
    }
}

// ========== HÀM ĐÁNH DẤU GIÁM ĐỐC ĐÃ ĐỌC (DIRECTOR ONLY) ==========
async function _bcvToggleDirectorRead(taskId, isRead) {
    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/director-read', 'PATCH', { director_read: isRead });
        if (res && res.ok) {
            var task = _bcv.tasks.find(function(t) { return t.id === taskId; });
            if (task) {
                task.director_read = isRead;
                task.director_read_at = isRead ? new Date().toISOString() : null;
            }
            _bcvRenderBoard();
            var o = document.getElementById('bcvOverlay');
            if (o) {
                o.remove();
                _bcvShowDetail(taskId);
            }
        } else {
            alert('Lỗi: ' + ((res && res.error) || 'Không thể cập nhật trạng thái đã đọc'));
        }
    } catch(e) {
        alert('Có lỗi xảy ra: ' + (e.message || e));
    }
}

// ========== HÀM ĐÁNH DẤU TÔI ĐÃ ĐỌC (MULTI-USER READ TRACKING) ==========
async function _bcvToggleMyRead(taskId, isRead) {
    try {
        var res = await _bcvApi('/api/board-tasks/' + taskId + '/read', 'PATCH', { is_read: isRead });
        if (res && res.ok) {
            var task = (_bcv.tasks || []).find(function(t) { return t.id === taskId; });
            if (task) {
                task.my_read = res.my_read;
                task.my_read_at = res.my_read_at;
                if (res.read_by_users) {
                    task.read_by_users = res.read_by_users;
                }
                if (window._currentUser && window._currentUser.role === 'giam_doc') {
                    task.director_read = res.my_read;
                    task.director_read_at = res.my_read_at;
                }
            }
            _bcvRenderBoard();
            var o = document.getElementById('bcvOverlay');
            if (o) {
                o.remove();
                _bcvShowDetail(taskId);
            }
        } else {
            alert('Lỗi: ' + ((res && res.error) || 'Không thể cập nhật trạng thái đã đọc'));
        }
    } catch(e) {
        alert('Có lỗi xảy ra: ' + (e.message || e));
    }
}

// ========== HÀM BÁO CÁO TỈ LỆ HOÀN THÀNH DEADLINE PHÂN TẦNG ==========
if (!_bcv.deadlineStatsFilters) {
    var _now = new Date();
    _bcv.deadlineStatsFilters = {
        mode: 'thang',
        month: _now.getMonth() + 1,
        quarter: Math.floor(_now.getMonth() / 3) + 1,
        year: _now.getFullYear(),
        fromDate: '',
        toDate: '',
        department_id: ''
    };
}

async function _bcvLoadDeadlineStats() {
    var el = document.getElementById('bcvDeadlineStatsView');
    if (!el) return;

    var f = _bcv.deadlineStatsFilters;
    var params = new URLSearchParams();
    params.set('mode', f.mode);
    if (f.month) params.set('month', f.month);
    if (f.quarter) params.set('quarter', f.quarter);
    if (f.year) params.set('year', f.year);
    if (f.fromDate) params.set('fromDate', f.fromDate);
    if (f.toDate) params.set('toDate', f.toDate);
    if (f.department_id) params.set('department_id', f.department_id);

    el.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#64748b;font-weight:700;font-size:14px">⌛ Đang tải dữ liệu báo cáo tỉ lệ hoàn thành deadline...</div>';

    var res = await _bcvApi('/api/board-tasks/deadline-stats?' + params.toString());
    if (res && res.ok) {
        _bcvRenderDeadlineStatsUI(res);
    } else {
        el.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#ef4444;font-weight:700;font-size:14px">❌ Không thể tải dữ liệu tỉ lệ deadline</div>';
    }
}

function _bcvOnDeadlineFilterChange(key, value) {
    _bcv.deadlineStatsFilters[key] = value;
    _bcvLoadDeadlineStats();
}

function _bcvRenderDeadlineStatsUI(data) {
    var container = document.getElementById('bcvDeadlineStatsView');
    if (!container) return;

    var f = _bcv.deadlineStatsFilters;
    var summary = data.summary || {};
    var depts = data.departments || [];
    var curYear = new Date().getFullYear();

    // Mode options
    var modeOptions = `
        <button class="bcv-btn ${f.mode === 'thang' ? 'bcv-btn-primary' : 'bcv-btn-secondary'}" onclick="_bcvOnDeadlineFilterChange('mode', 'thang')" style="padding:6px 14px;font-size:12px;font-weight:800;border-radius:8px">Hàng Tháng</button>
        <button class="bcv-btn ${f.mode === 'quy' ? 'bcv-btn-primary' : 'bcv-btn-secondary'}" onclick="_bcvOnDeadlineFilterChange('mode', 'quy')" style="padding:6px 14px;font-size:12px;font-weight:800;border-radius:8px">Hàng Quý</button>
        <button class="bcv-btn ${f.mode === 'nam' ? 'bcv-btn-primary' : 'bcv-btn-secondary'}" onclick="_bcvOnDeadlineFilterChange('mode', 'nam')" style="padding:6px 14px;font-size:12px;font-weight:800;border-radius:8px">Hàng Năm</button>
        <button class="bcv-btn ${f.mode === 'ngay' ? 'bcv-btn-primary' : 'bcv-btn-secondary'}" onclick="_bcvOnDeadlineFilterChange('mode', 'ngay')" style="padding:6px 14px;font-size:12px;font-weight:800;border-radius:8px">Tùy Chọn Ngày</button>
    `;

    // Sub filter inputs based on mode
    var subInputsHtml = '';
    if (f.mode === 'thang') {
        var mOpts = '';
        for (var m = 1; m <= 12; m++) {
            mOpts += `<option value="${m}" ${f.month == m ? 'selected' : ''}>Tháng ${m}</option>`;
        }
        var yOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yOpts += `<option value="${y}" ${f.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subInputsHtml = `
            <select class="bcv-ht-select" onchange="_bcvOnDeadlineFilterChange('month', this.value)" style="padding:6px 12px;font-weight:700">${mOpts}</select>
            <select class="bcv-ht-select" onchange="_bcvOnDeadlineFilterChange('year', this.value)" style="padding:6px 12px;font-weight:700">${yOpts}</select>
        `;
    } else if (f.mode === 'quy') {
        var qOpts = '';
        for (var q = 1; q <= 4; q++) {
            qOpts += `<option value="${q}" ${f.quarter == q ? 'selected' : ''}>Quý ${q}</option>`;
        }
        var yOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yOpts += `<option value="${y}" ${f.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subInputsHtml = `
            <select class="bcv-ht-select" onchange="_bcvOnDeadlineFilterChange('quarter', this.value)" style="padding:6px 12px;font-weight:700">${qOpts}</select>
            <select class="bcv-ht-select" onchange="_bcvOnDeadlineFilterChange('year', this.value)" style="padding:6px 12px;font-weight:700">${yOpts}</select>
        `;
    } else if (f.mode === 'nam') {
        var yOpts = '';
        for (var y = curYear + 1; y >= curYear - 4; y--) {
            yOpts += `<option value="${y}" ${f.year == y ? 'selected' : ''}>Năm ${y}</option>`;
        }
        subInputsHtml = `
            <select class="bcv-ht-select" onchange="_bcvOnDeadlineFilterChange('year', this.value)" style="padding:6px 12px;font-weight:700">${yOpts}</select>
        `;
    } else if (f.mode === 'ngay') {
        subInputsHtml = `
            <input type="date" class="bcv-ht-input" value="${f.fromDate || ''}" onchange="_bcvOnDeadlineFilterChange('fromDate', this.value)" style="padding:5px 10px">
            <span style="color:#64748b;font-weight:700">đến</span>
            <input type="date" class="bcv-ht-input" value="${f.toDate || ''}" onchange="_bcvOnDeadlineFilterChange('toDate', this.value)" style="padding:5px 10px">
        `;
    }

    // Rate Rating Badge
    var rateVal = summary.on_time_rate || 0;
    var ratingBadgeHtml = '';
    if (rateVal >= 90) {
        ratingBadgeHtml = '<span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;border:1px solid #bbf7d0">🟢 Tỷ lệ xuất sắc</span>';
    } else if (rateVal >= 75) {
        ratingBadgeHtml = '<span style="background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;border:1px solid #bae6fd">🔵 Tỷ lệ khá tốt</span>';
    } else if (rateVal >= 50) {
        ratingBadgeHtml = '<span style="background:#fef9c3;color:#a16207;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;border:1px solid #fef08a">🟡 Cần cải thiện</span>';
    } else {
        ratingBadgeHtml = '<span style="background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;border:1px solid #fca5a5">🔴 Mức báo động</span>';
    }

    var html = `
        <div style="padding:20px 28px">
            <!-- Filter Bar -->
            <div style="background:#ffffff;padding:16px 20px;border-radius:14px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:13px;font-weight:800;color:#0f172a">📅 Kỳ Báo Cáo:</span>
                    ${modeOptions}
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    ${subInputsHtml}
                    <button class="bcv-btn bcv-btn-secondary" onclick="_bcvLoadDeadlineStats()" style="padding:6px 14px;font-size:12px">🔄 Cập nhật</button>
                </div>
            </div>

            <!-- Header Title -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px">
                <div>
                    <h3 style="font-size:18px;font-weight:900;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px">
                        <span>📊</span> BÁO CÁO TỈ LỆ HOÀN THÀNH DEADLINE CÔNG VIỆC
                    </h3>
                    <div style="font-size:12px;color:#64748b;font-weight:700;margin-top:4px">
                        Thời gian đánh giá: <span style="color:#2563eb;font-weight:800">${_esc(data.time_label || '')}</span>
                    </div>
                </div>
                <div>${ratingBadgeHtml}</div>
            </div>

            <!-- Top Executive KPI Summary Cards -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px">
                <!-- KPI 1: Tỷ lệ hoàn thành đúng hạn -->
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:18px 20px;border-radius:16px;box-shadow:0 4px 16px rgba(15,23,42,0.15);position:relative;overflow:hidden">
                    <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">TỈ LỆ ĐÚNG HẠN TỔNG THỂ</div>
                    <div style="font-size:32px;font-weight:900;margin-top:6px;color:#38bdf8">${rateVal}%</div>
                    <div style="margin-top:8px;background:rgba(255,255,255,0.15);height:6px;border-radius:10px;overflow:hidden">
                        <div style="background:#38bdf8;height:100%;width:${rateVal}%"></div>
                    </div>
                </div>

                <!-- KPI 2: Hoàn thành đúng hạn / sớm -->
                <div style="background:#ffffff;border:1.5px solid #bbf7d0;padding:18px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(34,197,94,0.06)">
                    <div style="font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.5px">🟢 ĐÃ XONG ĐÚNG / SỚM HẠN</div>
                    <div style="font-size:28px;font-weight:900;color:#16a34a;margin-top:6px">${summary.on_time_count || 0} <span style="font-size:13px;font-weight:700;color:#64748b">task</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600">Đã nộp bài trước/đúng deadline</div>
                </div>

                <!-- KPI 3: Đang tiến hành trong hạn -->
                <div style="background:#ffffff;border:1.5px solid #bae6fd;padding:18px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(14,165,233,0.06)">
                    <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:.5px">⏳ ĐANG TIẾN HÀNH TRONG HẠN</div>
                    <div style="font-size:28px;font-weight:900;color:#0284c7;margin-top:6px">${summary.in_progress_count || 0} <span style="font-size:13px;font-weight:700;color:#64748b">task</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600">Đang làm & chưa đến deadline</div>
                </div>

                <!-- KPI 4: Hoàn thành trễ hạn -->
                <div style="background:#ffffff;border:1.5px solid #fed7aa;padding:18px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(249,115,22,0.06)">
                    <div style="font-size:11px;font-weight:800;color:#c2410c;text-transform:uppercase;letter-spacing:.5px">🔴 HOÀN THÀNH TRỄ HẠN</div>
                    <div style="font-size:28px;font-weight:900;color:#ea580c;margin-top:6px">${summary.late_count || 0} <span style="font-size:13px;font-weight:700;color:#64748b">task</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600">Đã nộp bài nhưng trễ deadline</div>
                </div>

                <!-- KPI 5: Quá hạn chưa xong -->
                <div style="background:#ffffff;border:1.5px solid #fca5a5;padding:18px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(239,68,68,0.06)">
                    <div style="font-size:11px;font-weight:800;color:#b91c1c;text-transform:uppercase;letter-spacing:.5px">⚠️ ĐANG QUÁ HẠN CHƯA XONG</div>
                    <div style="font-size:28px;font-weight:900;color:#dc2626;margin-top:6px">${summary.overdue_count || 0} <span style="font-size:13px;font-weight:700;color:#64748b">task</span></div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600">Quá deadline nhưng chưa nộp</div>
                </div>
            </div>

            <!-- List of Departments (Phần 1: Thống Kê Tỷ Lệ Theo Phòng Ban) -->
            ${depts.length === 0 ? `
                <div style="background:#fff;border-radius:14px;padding:60px 20px;text-align:center;border:1px dashed #cbd5e1;color:#64748b;font-weight:700">
                    Chưa có dữ liệu phòng ban nào trong khoảng thời gian này.
                </div>
            ` : depts.map(function(dept, deptIdx) {
                var dRate = dept.on_time_rate || 0;
                var users = (dept.users || []).slice();
                var rolePriority = { 'quan_ly': 1, 'quan_ly_cap_cao': 1, 'giam_doc': 1, 'truong_phong': 2, 'nhan_vien': 3 };
                users.sort(function(a, b) {
                    var pA = rolePriority[a.role] || 4;
                    var pB = rolePriority[b.role] || 4;
                    if (pA !== pB) return pA - pB;
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                return `
                    <div style="margin-bottom:32px;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06)">
                        <!-- Department Banner Header -->
                        <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:16px 24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
                            <div style="display:flex;align-items:center;gap:10px">
                                <span style="font-size:22px">🏢</span>
                                <div>
                                    <div style="font-size:16px;font-weight:900;letter-spacing:0.5px">${_esc(dept.name)}</div>
                                    <div style="font-size:12px;color:#cbd5e1;font-weight:600">Tổng số lượt công việc: ${dept.total_tasks} task</div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                                <div style="text-align:right">
                                    <div style="font-size:11px;color:#94a3b8;font-weight:800;text-transform:uppercase">Tỷ lệ đúng hạn phòng</div>
                                    <div style="font-size:20px;font-weight:900;color:${dRate >= 80 ? '#4ade80' : (dRate >= 60 ? '#facc15' : '#f87171')}">${dRate}%</div>
                                </div>
                                <div style="width:120px;background:rgba(255,255,255,0.15);height:8px;border-radius:10px;overflow:hidden">
                                    <div style="background:${dRate >= 80 ? '#4ade80' : (dRate >= 60 ? '#facc15' : '#f87171')};height:100%;width:${dRate}%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Department Summary Badges -->
                        <div style="padding:14px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:12px;font-weight:700">
                            <span style="color:#16a34a">🟢 Đúng / Sớm hạn: <strong>${dept.on_time_count}</strong></span>
                            <span style="color:#64748b">•</span>
                            <span style="color:#0284c7">⏳ Đang tiến hành: <strong>${dept.in_progress_count || 0}</strong></span>
                            <span style="color:#64748b">•</span>
                            <span style="color:#ea580c">🔴 Hoàn thành trễ: <strong>${dept.late_completed_count}</strong></span>
                            <span style="color:#64748b">•</span>
                            <span style="color:#dc2626">⚠️ Đang quá hạn: <strong>${dept.overdue_pending_count}</strong></span>
                        </div>

                        <!-- User Breakdown Table (Phần 2: Chi Tiết Nhân Sự Trong Phòng Ban) -->
                        <div style="width:100%;overflow-x:auto">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
                                <thead>
                                    <tr style="background:#0f172a;color:#ffffff;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
                                        <th style="padding:14px 14px;text-align:center;width:50px;color:#ffffff">STT</th>
                                        <th style="padding:14px 14px;color:#ffffff">Nhân Sự</th>
                                        <th style="padding:14px 14px;text-align:center;color:#ffffff">Chức Vụ</th>
                                        <th style="padding:14px 14px;text-align:center;color:#ffffff">Tổng Task Giao</th>
                                        <th style="padding:14px 14px;text-align:center"><span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:6px;font-weight:900;border:1px solid #bbf7d0">🟢 Đúng Hạn</span></th>
                                        <th style="padding:14px 14px;text-align:center"><span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:6px;font-weight:900;border:1px solid #bae6fd">⏳ Đang Làm</span></th>
                                        <th style="padding:14px 14px;text-align:center"><span style="background:#ffedd5;color:#c2410c;padding:4px 10px;border-radius:6px;font-weight:900;border:1px solid #fed7aa">🔴 Xong Trễ</span></th>
                                        <th style="padding:14px 14px;text-align:center"><span style="background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:6px;font-weight:900;border:1px solid #fca5a5">⚠️ Quá Hạn</span></th>
                                        <th style="padding:14px 14px;text-align:center;color:#ffffff">Tỷ Lệ Đúng Hạn</th>
                                        <th style="padding:14px 14px;text-align:center;color:#ffffff">Đánh Giá Hiệu Suất</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.length === 0 ? `
                                        <tr><td colspan="10" style="padding:20px;text-align:center;color:#94a3b8">Chưa có nhân sự trong phòng ban này</td></tr>
                                    ` : users.map(function(u, uIdx) {
                                        var uRate = u.on_time_rate || 0;
                                        var evalBadge = '';
                                        if (u.total_tasks === 0) {
                                            evalBadge = '<span style="color:#94a3b8;font-size:11px">—</span>';
                                        } else if (uRate >= 90) {
                                            evalBadge = '<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800">🌟 Xuất Sắc</span>';
                                        } else if (uRate >= 75) {
                                            evalBadge = '<span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800">🟢 Tốt</span>';
                                        } else if (uRate >= 50) {
                                            evalBadge = '<span style="background:#fef9c3;color:#a16207;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800">🟡 Trung Bình</span>';
                                        } else {
                                            evalBadge = '<span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800">🔴 Cần Cải Thiện</span>';
                                        }

                                        var roleBadge = '';
                                        if (u.role === 'truong_phong') {
                                            roleBadge = '<span style="background:#f3e8ff;color:#6b21a8;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:800;border:1px solid #d8b4fe">👑 Trưởng Phòng</span>';
                                        } else if (u.role === 'quan_ly') {
                                            roleBadge = '<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:800;border:1px solid #bfdbfe">👔 Quản Lý</span>';
                                        } else {
                                            roleBadge = '<span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid #cbd5e1">👤 Nhân Viên</span>';
                                        }

                                        var totalTasksHtml = u.total_tasks > 0 
                                            ? `<span style="background:#f1f5f9;color:#0f172a;padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;min-width:28px;border:1px solid #cbd5e1">${u.total_tasks}</span>`
                                            : `<span style="font-weight:800;color:#0f172a">0</span>`;

                                        var onTimeHtml = u.on_time_count > 0 
                                            ? `<span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;min-width:28px;border:1px solid #bbf7d0">${u.on_time_count}</span>`
                                            : `<span style="font-weight:800;color:#0f172a">0</span>`;

                                        var inProgressHtml = (u.in_progress_count || 0) > 0 
                                            ? `<span style="background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;min-width:28px;border:1px solid #bae6fd">${u.in_progress_count}</span>`
                                            : `<span style="font-weight:800;color:#0f172a">0</span>`;

                                        var lateCompletedHtml = u.late_completed_count > 0 
                                            ? `<span style="background:#ffedd5;color:#c2410c;padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;min-width:28px;border:1px solid #fed7aa">${u.late_completed_count}</span>`
                                            : `<span style="font-weight:800;color:#0f172a">0</span>`;

                                        var overduePendingHtml = u.overdue_pending_count > 0 
                                            ? `<span style="background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;min-width:28px;border:1px solid #fca5a5">${u.overdue_pending_count}</span>`
                                            : `<span style="font-weight:800;color:#0f172a">0</span>`;

                                        return `
                                            <tr style="border-bottom:1px solid #e2e8f0;background:${uIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}">
                                                <td style="padding:12px 14px;text-align:center;font-weight:800;color:#64748b">${uIdx + 1}</td>
                                                <td style="padding:12px 14px;font-weight:800;color:#0f172a">
                                                    <div>${_esc(u.full_name)}</div>
                                                    <div style="font-size:11px;color:#64748b;font-weight:600">@${_esc(u.username)}</div>
                                                </td>
                                                <td style="padding:12px 14px;text-align:center">${roleBadge}</td>
                                                <td style="padding:12px 14px;text-align:center">${totalTasksHtml}</td>
                                                <td style="padding:12px 14px;text-align:center">${onTimeHtml}</td>
                                                <td style="padding:12px 14px;text-align:center">${inProgressHtml}</td>
                                                <td style="padding:12px 14px;text-align:center">${lateCompletedHtml}</td>
                                                <td style="padding:12px 14px;text-align:center">${overduePendingHtml}</td>
                                                <td style="padding:12px 14px;text-align:center">
                                                    <span style="background:${uRate >= 80 ? '#dcfce7' : (uRate >= 60 ? '#fef9c3' : '#fee2e2')};color:${uRate >= 80 ? '#15803d' : (uRate >= 60 ? '#a16207' : '#b91c1c')};padding:4px 12px;border-radius:12px;font-weight:900;display:inline-block;border:1px solid ${uRate >= 80 ? '#bbf7d0' : (uRate >= 60 ? '#fef08a' : '#fca5a5')}">${uRate}%</span>
                                                </td>
                                                <td style="padding:12px 14px;text-align:center">${evalBadge}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}
