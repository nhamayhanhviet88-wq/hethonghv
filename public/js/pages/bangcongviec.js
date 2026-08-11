// ===== BẢNG CÔNG VIỆC — Kanban Task Board =====
var _bcv = {
    tasks: [],
    users: [],
    departments: [],
    enabledDepts: [],
    tab: null, // set dynamically: 'me' | 'phong'
    filters: { search: '', assigned_to: '', department_id: '', priority: '', status: '' },
    dragTaskId: null
};

async function renderBangcongviecPage(content) {
    var c = content || document.getElementById('main-content');
    if (!c) return;
    var user = window._currentUser || {};
    var isDirector = user.role === 'giam_doc';
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    var greeting = user.full_name || 'Bạn';
    var defaultTab = 'me';
    _bcv.tab = defaultTab;

    c.innerHTML = `<style>
/* ===== BẢNG CÔNG VIỆC STYLES — KPI Marketing Inspired ===== */
.bcv-page{background:#f8fafc;min-height:calc(100vh - 60px);padding:0;font-family:'Inter',sans-serif}
.bcv-header{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%);padding:22px 28px;color:#fff;box-shadow:0 4px 20px rgba(37,99,235,.25)}
.bcv-header h2{margin:0 0 4px;font-size:22px;font-weight:900;background:linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.bcv-header-sub{font-size:12px;color:rgba(255,255,255,.75);font-weight:500}
.bcv-header-sub strong{color:#fff}
.bcv-top-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:14px}
.bcv-tabs{display:flex;gap:4px}
.bcv-tab{padding:8px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.65);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}
.bcv-tab.active{background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4);box-shadow:0 2px 8px rgba(0,0,0,.1)}
.bcv-tab:hover{background:rgba(255,255,255,.1);color:#fff}
.bcv-btn-create{padding:10px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 15px rgba(22,163,74,.35);transition:all .15s;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.5px}
.bcv-btn-create:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.45)}
.bcv-btn-config{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px)}
.bcv-btn-config:hover{background:rgba(255,255,255,.2);color:#fff}

/* Filter Bar */
.bcv-filters{padding:12px 28px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bcv-search{padding:8px 14px 8px 34px;border-radius:10px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;width:220px;outline:none;background:#f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2394a3b8' viewBox='0 0 24 24' width='14' height='14'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E") 12px center no-repeat;transition:all .2s;font-family:'Inter',sans-serif;color:#334155}
.bcv-search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.bcv-filter-sel{padding:8px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:11px;font-weight:600;background:#f8fafc;cursor:pointer;outline:none;font-family:'Inter',sans-serif;color:#334155}
.bcv-filter-sel:focus{border-color:#3b82f6}

/* Kanban Board */
.bcv-board{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:20px 28px;min-height:500px}
@media(max-width:1100px){.bcv-board{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.bcv-board{grid-template-columns:1fr}}

/* Kanban Column */
.bcv-col{background:#fff;border-radius:14px;padding:0;min-height:400px;display:flex;flex-direction:column;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.bcv-col-header{padding:14px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;border-bottom:none;border-radius:14px 14px 0 0;border-left:4px solid transparent}
.bcv-col-header .bcv-col-count{padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700}
.bcv-col[data-status="can_lam"] .bcv-col-header{background:linear-gradient(135deg,#f1f5f9,#e2e8f0);color:#475569;border-left-color:#64748b}
.bcv-col[data-status="can_lam"] .bcv-col-count{background:#cbd5e1;color:#475569}
.bcv-col[data-status="dang_lam"] .bcv-col-header{background:linear-gradient(135deg,#fff7ed,#ffedd5);color:#c2410c;border-left-color:#ea580c}
.bcv-col[data-status="dang_lam"] .bcv-col-count{background:#fed7aa;color:#c2410c}
.bcv-col[data-status="cho_duyet"] .bcv-col-header{background:linear-gradient(135deg,#f5f3ff,#ede9fe);color:#7c3aed;border-left-color:#7c3aed}
.bcv-col[data-status="cho_duyet"] .bcv-col-count{background:#ddd6fe;color:#6d28d9}
.bcv-col[data-status="hoan_thanh"] .bcv-col-header{background:linear-gradient(135deg,#f0fdf4,#dcfce7);color:#16a34a;border-left-color:#16a34a}
.bcv-col[data-status="hoan_thanh"] .bcv-col-count{background:#bbf7d0;color:#15803d}
.bcv-col-body{flex:1;padding:10px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:100px}
.bcv-col-body.drag-over{background:rgba(59,130,246,.05);border-radius:0 0 14px 14px}
.bcv-col-empty{color:#94a3b8;font-size:12px;font-weight:600;text-align:center;padding:40px 20px;opacity:.7}

/* Task Card */
.bcv-card{background:#fff;border-radius:12px;padding:14px;border:1.5px solid #cbd5e1;cursor:grab;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.06)}
.bcv-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-2px);border-color:#cbd5e1}
.bcv-card.bcv-card-overdue{border-color:#fca5a5;background:#fff5f5}
.bcv-card.dragging{opacity:.4;transform:rotate(2deg)}
.bcv-card-tags{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}
.bcv-tag{padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase}
.bcv-tag-chinh{background:#dbeafe;color:#1e40af}
.bcv-tag-phu{background:#f1f5f9;color:#475569}
.bcv-tag-cao{background:#fee2e2;color:#991b1b}
.bcv-tag-trung_binh{background:#fef3c7;color:#92400e}
.bcv-tag-thap{background:#d1fae5;color:#065f46}
.bcv-card-title{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;line-height:1.4}
.bcv-card-progress{height:4px;background:#e2e8f0;border-radius:4px;margin-bottom:8px;overflow:hidden}
.bcv-card-progress-bar{height:100%;background:linear-gradient(90deg,#3b82f6,#2563eb);border-radius:4px;transition:width .3s}
.bcv-card-progress-text{font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:8px}
.bcv-card-footer{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.bcv-card-assignee{display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;font-weight:600}
.bcv-card-avatar{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.bcv-card-avatar.bcv-av-receiver{background:linear-gradient(135deg,#22c55e,#16a34a)}
.bcv-card-comments{font-size:11px;color:#94a3b8;font-weight:600;display:flex;align-items:center;gap:3px}
.bcv-card-info-box{margin-top:6px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:10px}
.bcv-card-info-row{display:flex;align-items:center;padding:5px 10px;gap:6px}
.bcv-card-info-row+.bcv-card-info-row{border-top:1px solid #f1f5f9}
.bcv-card-info-row .info-icon{flex-shrink:0;font-size:12px}
.bcv-card-info-row .info-label{font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;font-size:9px;min-width:58px}
.bcv-card-info-row .info-value{font-weight:700;color:#334155;font-size:11px}
.bcv-card-info-row.overdue{background:linear-gradient(135deg,#dc2626,#b91c1c);animation:bcvPulseOverdue 2s infinite}
.bcv-card-info-row.overdue .info-label,.bcv-card-info-row.overdue .info-value,.bcv-card-info-row.overdue .info-icon{color:#fff}
.bcv-card-overdue-days{font-size:9px;font-weight:800;margin-left:auto;background:rgba(255,255,255,.25);color:#fff;padding:2px 6px;border-radius:4px;white-space:nowrap}
@keyframes bcvPulseOverdue{0%,100%{box-shadow:0 2px 8px rgba(220,38,38,.3)}50%{box-shadow:0 2px 16px rgba(220,38,38,.6)}}
.bcv-card-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.bcv-card-id{font-size:10px;font-weight:800;color:#6366f1;background:linear-gradient(135deg,#eef2ff,#e0e7ff);padding:2px 8px;border-radius:4px;letter-spacing:.5px}
.bcv-card-flow{display:flex;align-items:center;gap:4px;font-size:10px;color:#64748b;font-weight:600;flex-wrap:wrap}
.bcv-card-flow-arrow{color:#3b82f6;font-weight:800;font-size:12px}
.bcv-card-flow-name{font-weight:700;color:#334155}
.bcv-card-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:4px}

/* Modal */
.bcv-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.55);z-index:9990;display:flex;align-items:center;justify-content:center;animation:bcvFadeIn .2s;backdrop-filter:blur(4px)}
@keyframes bcvFadeIn{from{opacity:0}to{opacity:1}}
.bcv-modal{background:#fff;border-radius:16px;width:95%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.2);animation:bcvSlideUp .25s cubic-bezier(.18,.89,.32,1.28)}
@keyframes bcvSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.bcv-modal-header{padding:20px 24px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9}
.bcv-modal-header h3{margin:0;font-size:17px;font-weight:800;color:#1e293b}
.bcv-modal-close{width:32px;height:32px;border-radius:8px;border:none;background:#f1f5f9;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s}
.bcv-modal-close:hover{background:#e2e8f0;color:#1e293b}
.bcv-modal-body{padding:16px 24px 24px}
.bcv-form-group{margin-bottom:14px}
.bcv-form-group label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.bcv-form-input,.bcv-form-select,.bcv-form-textarea{width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;color:#1e293b;outline:none;transition:all .2s;box-sizing:border-box;background:#f8fafc}
.bcv-form-input:focus,.bcv-form-select:focus,.bcv-form-textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.bcv-form-textarea{resize:vertical;min-height:80px}
.bcv-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bcv-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.bcv-btn{padding:10px 20px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif}
.bcv-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}
.bcv-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.4)}
.bcv-btn-secondary{background:#f1f5f9;color:#334155}
.bcv-btn-secondary:hover{background:#e2e8f0}
.bcv-btn-danger{background:#fee2e2;color:#991b1b}
.bcv-btn-danger:hover{background:#fecaca}
.bcv-btn-success{background:#16a34a;color:#fff;box-shadow:0 2px 6px rgba(22,163,74,.25)}
.bcv-btn-success:hover{background:#15803d}

/* Lightbox */
.bcv-lightbox{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;animation:bcvFadeIn .2s;cursor:pointer}
.bcv-lightbox img{max-width:92vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.5);object-fit:contain}
.bcv-lightbox-close{position:fixed;top:16px;right:20px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:100000;backdrop-filter:blur(4px)}
.bcv-lightbox-close:hover{background:rgba(255,255,255,.3);transform:scale(1.1)}

/* Attachment Thumbnails */
.bcv-att-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:6px}
.bcv-att-thumb{position:relative;width:100%;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1.5px solid #e2e8f0;cursor:pointer;transition:all .2s;background:#f8fafc}
.bcv-att-thumb:hover{border-color:#3b82f6;box-shadow:0 2px 12px rgba(59,130,246,.2);transform:translateY(-2px)}
.bcv-att-thumb img{width:100%;height:100%;object-fit:cover}
.bcv-att-thumb-del{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(220,38,38,.85);color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.bcv-att-thumb:hover .bcv-att-thumb-del{opacity:1}

/* Progress Slider Single Bar */
.bcv-progress-single-wrap{display:flex;align-items:center;gap:12px}
.bcv-progress-single-slider{flex:1;height:8px;-webkit-appearance:none;appearance:none;background:#e2e8f0;border-radius:6px;outline:none;cursor:pointer}
.bcv-progress-single-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer;transition:transform .1s}
.bcv-progress-single-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
.bcv-progress-badge{padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;color:#fff;min-width:44px;text-align:center}

/* Info Compact Grid — Distinct Colored Cell Backgrounds */
.bcv-info-compact{display:grid;grid-template-columns:1fr 1fr;gap:6px;border:none;border-radius:12px;margin-bottom:14px;background:transparent}
.bcv-info-cell{padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;transition:all .2s}
.bcv-info-cell:hover{box-shadow:0 2px 8px rgba(15,23,42,.05);transform:translateY(-1px)}

/* Individual Cell Background Themes */
.bcv-cell-status{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe}
.bcv-cell-status .bcv-info-lbl{color:#1d4ed8;font-weight:800}

.bcv-cell-priority{background:linear-gradient(135deg,#fffbe6,#fef3c7);border-color:#fde68a}
.bcv-cell-priority .bcv-info-lbl{color:#b45309;font-weight:800}

.bcv-cell-deadline{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-color:#bae6fd}
.bcv-cell-deadline .bcv-info-lbl{color:#0369a1;font-weight:800}
.bcv-cell-deadline.overdue{background:linear-gradient(135deg,#fef2f2,#fee2e2);border-color:#fca5a5}
.bcv-cell-deadline.overdue .bcv-info-lbl{color:#b91c1c;font-weight:800}

.bcv-cell-dept{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-color:#ddd6fe}
.bcv-cell-dept .bcv-info-lbl{color:#6d28d9;font-weight:800}

.bcv-cell-assigner{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-color:#cbd5e1}
.bcv-cell-assigner .bcv-info-lbl{color:#334155;font-weight:800}

.bcv-cell-assignee{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#bbf7d0}
.bcv-cell-assignee .bcv-info-lbl{color:#15803d;font-weight:800}

.bcv-cell-link{grid-column:1/-1;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-color:#bae6fd}
.bcv-cell-link .bcv-info-lbl{color:#0284c7;font-weight:800}

/* Prominent Title & Description Fields */
.bcv-form-input-prominent{width:100%;padding:11px 16px;border-radius:10px;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%);font-size:14px;font-weight:800;font-family:'Inter',sans-serif;color:#0f172a;outline:none;box-shadow:0 2px 8px rgba(37,99,235,.08);transition:all .2s;box-sizing:border-box}
.bcv-form-input-prominent:disabled{background:#f8fafc;border-color:#cbd5e1;color:#0f172a;opacity:1;font-weight:800}
.bcv-form-textarea-prominent{width:100%;min-height:80px;padding:11px 16px;border-radius:10px;border:1.5px solid #cbd5e1;background:#f8fafc;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;color:#1e293b;outline:none;resize:vertical;transition:all .2s;box-sizing:border-box}
.bcv-form-textarea-prominent:focus{border-color:#2563eb;background:#ffffff;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.bcv-form-textarea-prominent:disabled{background:#f8fafc;border-color:#e2e8f0;color:#1e293b;opacity:1}


/* Report Section — Enterprise Neutral Card */
.bcv-report-area{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-top:8px;box-shadow:inset 0 1px 2px rgba(0,0,0,.02)}
.bcv-report-textarea{width:100%;min-height:85px;border:1px solid #cbd5e1;border-radius:10px;padding:10px 14px;font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;color:#0f172a;resize:vertical;outline:none;transition:all .2s;background:#fff}
.bcv-report-textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12);background:#fff}
.bcv-report-textarea::placeholder{color:#94a3b8}
.bcv-report-link-input{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;color:#0f172a;outline:none;transition:all .2s;background:#fff}
.bcv-report-link-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12);background:#fff}
.bcv-report-link-input::placeholder{color:#94a3b8}
.bcv-report-view{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#334155;font-weight:500;line-height:1.5;white-space:pre-wrap;word-break:break-word}

/* Checklist Cards — Jira/ClickUp Modern Corporate Style */
.bcv-cl-card{border:1px solid #e2e8f0;border-radius:10px;padding:11px 14px;margin-bottom:8px;background:#fff;transition:all .2s;box-shadow:0 1px 3px rgba(15,23,42,.03)}
.bcv-cl-card:hover{border-color:#cbd5e1;box-shadow:0 2px 8px rgba(15,23,42,.06)}
.bcv-cl-card.done{background:#fafbfc;border-color:#cbd5e1}
.bcv-cl-card-head{display:flex;align-items:center;gap:10px}
.bcv-cl-card-head input[type=checkbox]{width:17px;height:17px;cursor:pointer;accent-color:#2563eb;flex-shrink:0;border-radius:4px}
.bcv-cl-card-title{flex:1;font-size:13px;font-weight:600;color:#0f172a;letter-spacing:-.1px}
.bcv-cl-card.done .bcv-cl-card-title{color:#475569}
.bcv-cl-card-time{font-size:10px;font-weight:600;color:#15803d;white-space:nowrap;background:#f0fdf4;padding:3px 9px;border-radius:6px;border:1px solid #dcfce7;display:inline-flex;align-items:center;gap:4px}
.bcv-cl-card-body{margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;display:grid;gap:8px}
.bcv-cl-card-body textarea{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:500;font-family:'Inter',sans-serif;color:#0f172a;outline:none;resize:vertical;min-height:48px;box-sizing:border-box;background:#fff}
.bcv-cl-card-body textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.bcv-cl-card-body input[type=text]{width:100%;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;font-size:12px;font-weight:500;font-family:'Inter',sans-serif;color:#0f172a;outline:none;box-sizing:border-box;background:#fff}
.bcv-cl-card-body input[type=text]:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.bcv-cl-card-save{padding:5px 14px;border-radius:7px;border:none;background:#2563eb;color:#fff;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;box-shadow:0 1px 3px rgba(37,99,235,.2)}
.bcv-cl-card-save:hover{background:#1d4ed8}

/* Checklist Compact Saved View */
.bcv-cl-saved-body{margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#334155}
.bcv-cl-content-preview{background:#f8fafc;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-word;color:#334155;font-size:11.5px;font-weight:500;line-height:1.5}
.bcv-cl-link-preview{font-weight:600;font-size:11.5px;padding:4px 0}
.bcv-cl-link-preview a{color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.bcv-cl-link-preview a:hover{text-decoration:underline}
.bcv-btn-edit-sm{padding:4px 10px;border-radius:7px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.bcv-btn-edit-sm:hover{background:#f8fafc;border-color:#94a3b8;color:#0f172a}

/* Comments */
.bcv-comments{margin-top:16px;border-top:1px solid #f1f5f9;padding-top:12px}
.bcv-comments-title{font-size:12px;font-weight:800;color:#334155;margin-bottom:10px}
.bcv-comment{padding:10px 12px;background:#f8fafc;border-radius:10px;margin-bottom:8px;border:1px solid #f1f5f9}
.bcv-comment-head{display:flex;justify-content:space-between;margin-bottom:4px}
.bcv-comment-user{font-size:11px;font-weight:700;color:#334155}
.bcv-comment-time{font-size:10px;color:#94a3b8}
.bcv-comment-text{font-size:12px;color:#475569;line-height:1.5}
.bcv-comment-input-wrap{display:flex;gap:8px;margin-top:8px}
.bcv-comment-input{flex:1;padding:8px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:12px;font-weight:600;outline:none;font-family:'Inter',sans-serif;background:#fff;color:#334155}
.bcv-comment-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.bcv-comment-send{padding:8px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.bcv-comment-send:hover{box-shadow:0 2px 8px rgba(37,99,235,.3)}

/* Config Modal */
.bcv-config-dept{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:#f8fafc;margin-bottom:6px;border:1px solid #f1f5f9}
.bcv-config-dept-name{font-size:13px;font-weight:700;color:#334155}
.bcv-toggle{position:relative;width:44px;height:24px;cursor:pointer}
.bcv-toggle input{opacity:0;width:0;height:0}
.bcv-toggle-slider{position:absolute;top:0;left:0;right:0;bottom:0;background:#cbd5e1;border-radius:24px;transition:all .2s}
.bcv-toggle-slider::before{content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;left:3px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.bcv-toggle input:checked+.bcv-toggle-slider{background:#16a34a}
.bcv-toggle input:checked+.bcv-toggle-slider::before{transform:translateX(20px)}

/* Checklist Builder */
.bcv-checklist-builder{margin-top:4px}
.bcv-checklist-item{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f1f5f9;border-radius:8px;margin-bottom:4px;animation:bcvSlideUp .15s ease}
.bcv-checklist-item input[type=text]{flex:1;border:none;background:transparent;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;color:#1e293b;outline:none}
.bcv-checklist-item .bcv-cl-remove{width:22px;height:22px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.bcv-checklist-item .bcv-cl-remove:hover{background:#fecaca}
.bcv-cl-add{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;border:1px dashed #cbd5e1;background:transparent;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;margin-top:4px}
.bcv-cl-add:hover{border-color:#3b82f6;color:#3b82f6;background:#eff6ff}


/* Paste Image Area */
.bcv-paste-area{border:2px dashed #cbd5e1;border-radius:10px;padding:14px;text-align:center;cursor:text;transition:all .2s;min-height:60px;outline:none}
.bcv-paste-area:focus{border-color:#3b82f6;background:#eff6ff;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.bcv-paste-hint{font-size:12px;color:#94a3b8;font-weight:600;padding:8px 0}
.bcv-paste-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.bcv-paste-thumb{position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #e2e8f0;background:#f8fafc}
.bcv-paste-thumb img{width:100%;height:100%;object-fit:cover}
.bcv-paste-remove{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(220,38,38,.85);color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.bcv-paste-remove:hover{background:#dc2626}
.bcv-paste-label{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:#fff;font-size:9px;font-weight:700;text-align:center;padding:2px 0}

/* Checklist in detail view */
.bcv-detail-checklist{margin-top:12px}
.bcv-detail-cl-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9}
.bcv-detail-cl-item input[type=checkbox]{width:16px;height:16px;accent-color:#3b82f6;cursor:pointer}
.bcv-detail-cl-item .bcv-cl-text{font-size:12px;font-weight:600;color:#334155;flex:1}
.bcv-detail-cl-item .bcv-cl-text.done{text-decoration:line-through;color:#94a3b8}
.bcv-detail-cl-item .bcv-cl-del{width:20px;height:20px;border-radius:4px;border:none;background:transparent;color:#cbd5e1;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.bcv-detail-cl-item .bcv-cl-del:hover{background:#fee2e2;color:#dc2626}

/* Attachments in detail view */
.bcv-detail-attachments{margin-top:12px}
.bcv-att-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;border-radius:8px;margin-bottom:4px;border:1px solid #f1f5f9}
.bcv-att-icon{font-size:16px}
.bcv-att-info{flex:1}
.bcv-att-name{font-size:12px;font-weight:600;color:#3b82f6;text-decoration:none}
.bcv-att-name:hover{text-decoration:underline}
.bcv-att-meta{font-size:10px;color:#94a3b8}
.bcv-att-del{width:22px;height:22px;border-radius:4px;border:none;background:transparent;color:#cbd5e1;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.bcv-att-del:hover{background:#fee2e2;color:#dc2626}

/* Shimmer & Glow Animations for Executive Elements */
@keyframes bcvGlowShimmer {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.bcv-section-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 18px 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e2e8f0;
}

.bcv-section-title-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 10px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1d4ed8 100%);
    background-size: 200% 200%;
    animation: bcvGlowShimmer 6s ease infinite;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    box-shadow: 0 4px 14px rgba(37,99,235,0.25);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Outstanding Task Report Header Badge */
.bcv-overall-report-card {
    margin-top: 16px;
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15,23,42,0.06);
}

.bcv-overall-report-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%);
    background-size: 200% 200%;
    animation: bcvGlowShimmer 5s ease infinite;
    color: #ffffff;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* Section Titles */
.bcv-section-title{font-size:13px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;display:flex;align-items:center;gap:6px}
.bcv-section-title .bcv-section-icon{font-size:15px}

/* Progress Slider */
.bcv-progress-wrap{display:flex;align-items:center;gap:14px;padding:6px 0}
.bcv-progress-slider{-webkit-appearance:none;appearance:none;flex:1;height:10px;border-radius:10px;outline:none;cursor:pointer;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#22c55e 100%);position:relative}
.bcv-progress-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 8px rgba(59,130,246,.35);cursor:pointer;transition:all .15s}
.bcv-progress-slider::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 3px 12px rgba(59,130,246,.45)}
.bcv-progress-slider::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #3b82f6;box-shadow:0 2px 8px rgba(59,130,246,.35);cursor:pointer}
.bcv-progress-display{min-width:52px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;font-family:'Inter',sans-serif;color:#fff;flex-shrink:0}
.bcv-progress-track{flex:1;position:relative;height:10px;border-radius:10px;background:#e2e8f0;overflow:hidden}
.bcv-progress-fill{height:100%;border-radius:10px;transition:width .2s ease}

/* Report Section */
.bcv-report-area{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:4px}
.bcv-report-textarea{width:100%;min-height:80px;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;color:#1e293b;resize:vertical;outline:none;transition:border-color .2s;background:#fff}
.bcv-report-textarea:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}
.bcv-report-textarea::placeholder{color:#94a3b8}
.bcv-report-link-input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;color:#1e293b;outline:none;transition:border-color .2s;background:#fff}
.bcv-report-link-input:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}
.bcv-report-link-input::placeholder{color:#94a3b8}
.bcv-report-view{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:13px;color:#334155;font-weight:500;line-height:1.5;white-space:pre-wrap;word-break:break-word}
</style>

<div class="bcv-page" id="bcvPage">
    <div class="bcv-header">
        <h2>📋 Bảng Công Việc</h2>
        <div class="bcv-header-sub">Xin chào, <strong>${_esc(greeting)}</strong> 🌿 — kéo thả thẻ để đổi trạng thái.</div>
        <div class="bcv-top-bar">
            <div class="bcv-tabs">
                <button class="bcv-tab active" data-tab="me" onclick="_bcvSwitchTab('me')">Công Việc Của Tôi</button>
                <button class="bcv-tab" data-tab="ban_giao" onclick="_bcvSwitchTab('ban_giao')">Công Việc Bàn Giao</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
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
            <div class="bcv-col-header">HOÀN THÀNH <span class="bcv-col-count" id="bcvCountHoanThanh">0</span></div>
            <div class="bcv-col-body" id="bcvColHoanThanh" ondragover="_bcvDragOver(event)" ondrop="_bcvDrop(event,'hoan_thanh')" ondragleave="_bcvDragLeave(event)"></div>
        </div>
    </div>
</div>`;

    await _bcvLoadData();
}

// ========== DATA LOADING ==========

async function _bcvLoadData() {
    try {
        var user = window._currentUser || {};
        var isDirector = user.role === 'giam_doc';

        // Load users for filters
        var usersRes = await _bcvApi('/api/board-tasks/users');
        _bcv.users = (usersRes && usersRes.users) || [];

        // Load departments (for director filter)
        if (isDirector) {
            var configRes = await _bcvApi('/api/board-config');
            _bcv.departments = (configRes && configRes.departments) || [];
            _bcv.enabledDepts = _bcv.departments.filter(d => d.board_enabled);
            _bcvPopulateDeptFilter();
        }

        // Populate user filter
        _bcvPopulateUserFilter();

        // Load tasks
        await _bcvLoadTasks();
    } catch(e) {
        console.error('[BCV] loadData error:', e);
    }
}

async function _bcvLoadTasks() {
    var params = new URLSearchParams();
    params.set('tab', _bcv.tab);
    if (_bcv.filters.search) params.set('search', _bcv.filters.search);
    if (_bcv.filters.assigned_to) params.set('assigned_to', _bcv.filters.assigned_to);
    if (_bcv.filters.department_id) params.set('department_id', _bcv.filters.department_id);
    if (_bcv.filters.priority) params.set('priority', _bcv.filters.priority);

    var res = await _bcvApi('/api/board-tasks?' + params.toString());
    _bcv.tasks = (res && res.tasks) || [];
    _bcvRenderBoard();
}

function _bcvRenderBoard() {
    var cols = {
        can_lam: [],
        dang_lam: [],
        cho_duyet: [],
        hoan_thanh: []
    };

    _bcv.tasks.forEach(function(t) {
        if (cols[t.status]) cols[t.status].push(t);
    });

    Object.keys(cols).forEach(function(status) {
        var colId = 'bcvCol' + _bcvStatusToId(status);
        var countId = 'bcvCount' + _bcvStatusToId(status);
        var el = document.getElementById(colId);
        var countEl = document.getElementById(countId);
        if (!el) return;

        if (countEl) countEl.textContent = cols[status].length;

        if (cols[status].length === 0) {
            el.innerHTML = '<div class="bcv-col-empty">Trống</div>';
            return;
        }

        el.innerHTML = cols[status].map(function(t) {
            return _bcvRenderCard(t);
        }).join('');
    });
}

function _bcvRenderCard(t) {
    var now = new Date();
    var dlDate = t.deadline ? new Date(t.deadline + 'T00:00:00') : null;
    var isOverdue = dlDate && dlDate < now && t.status !== 'hoan_thanh';
    var progress = Number(t.progress || 0);
    var creatorName = t.created_by_name || '?';
    var assigneeName = t.assigned_to_name || 'Chưa giao';
    var commentCount = Number(t.comment_count || 0);
    var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

    // CV-001 format
    var cvId = 'CV-' + String(t.id).padStart(3,'0');

    // Deadline with full day of week
    var deadlineDisplay = '';
    var overdueDays = 0;
    if (dlDate) {
        var dayName = daysArr[dlDate.getDay()];
        var dd = String(dlDate.getDate()).padStart(2,'0');
        var mm = String(dlDate.getMonth()+1).padStart(2,'0');
        var yy = String(dlDate.getFullYear()).slice(-2);
        deadlineDisplay = dayName + ' - ' + dd + '/' + mm;
        if (isOverdue) {
            var diff = now.getTime() - dlDate.getTime();
            overdueDays = Math.ceil(diff / (1000*60*60*24));
        }
    }

    // Created date with day of week = Ngày Bàn Giao
    var createdDisplay = '';
    if (t.created_at) {
        var cd = new Date(t.created_at);
        var cdDay = daysArr[cd.getDay()];
        var cdd = String(cd.getDate()).padStart(2,'0');
        var cmm = String(cd.getMonth()+1).padStart(2,'0');
        var chh = String(cd.getHours()).padStart(2,'0');
        var cmi = String(cd.getMinutes()).padStart(2,'0');
        createdDisplay = cdDay + ' - ' + cdd + '/' + cmm + ' ' + chh + ':' + cmi;
    }

    // Format accepted_at for card
    var acceptedDisplay = '';
    if (t.accepted_at) {
        var ac = new Date(t.accepted_at);
        var acDay = daysArr[ac.getDay()];
        acceptedDisplay = acDay + ' - ' + String(ac.getDate()).padStart(2,'0') + '/' + String(ac.getMonth()+1).padStart(2,'0') + ' ' + String(ac.getHours()).padStart(2,'0') + ':' + String(ac.getMinutes()).padStart(2,'0');
    }

    // Overdue HTML
    var deadlineHtml = '';
    if (deadlineDisplay) {
        if (isOverdue) {
            deadlineHtml = `<div class="bcv-card-deadline overdue">⚠️ Deadline: ${deadlineDisplay} <span class="bcv-card-overdue-days">Chậm ${overdueDays} ngày!</span></div>`;
        } else {
            deadlineHtml = `<div class="bcv-card-deadline">📅 Deadline: ${deadlineDisplay}</div>`;
        }
    }

    return `<div class="bcv-card${isOverdue ? ' bcv-card-overdue' : ''}" draggable="true" data-task-id="${t.id}"
        ondragstart="_bcvDragStart(event,${t.id})" ondragend="_bcvDragEnd(event)"
        onclick="_bcvShowDetail(${t.id})">
        <div class="bcv-card-meta">
            <span class="bcv-card-id">${cvId}</span>
        </div>
        <div class="bcv-card-tags">
            <span class="bcv-tag bcv-tag-${t.task_type}">${t.task_type === 'chinh' ? '🔵 Chính' : '🟡 Phụ'}</span>
            <span class="bcv-tag bcv-tag-${t.priority}">${t.priority === 'cao' ? '🔴 Cao' : t.priority === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp'}</span>
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

function _bcvSwitchTab(tab) {
    _bcv.tab = tab;
    document.querySelectorAll('.bcv-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    _bcvLoadTasks();
}

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

async function _bcvShowCreate() {
    var user = window._currentUser || {};
    var isDirector = user.role === 'giam_doc';

    // Load users for assignment
    var deptId = isDirector ? '' : (user.department_id || '');
    var usersRes = await _bcvApi('/api/board-tasks/users' + (deptId ? '?department_id=' + deptId : ''));
    var users = (usersRes && usersRes.users) || [];

    var deptOptions = '';
    if (isDirector) {
        deptOptions = '<option value="">— Chọn phòng ban —</option>';
        _bcv.enabledDepts.forEach(function(d) {
            deptOptions += `<option value="${d.id}">${_esc(d.name)}</option>`;
        });
    }

    var userOptions = '<option value="">— Chọn người —</option>';
    users.forEach(function(u) {
        userOptions += `<option value="${u.id}">${_esc(u.full_name)}${u.department_name ? ' (' + _esc(u.department_name) + ')' : ''}</option>`;
    });

    // Fetch holidays for validation
    var holidaysRes = await _bcvApi('/api/holidays');
    var holidays = (holidaysRes && holidaysRes.holidays) || [];
    window._bcvHolidays = {};
    holidays.forEach(function(h) {
        var d = h.holiday_date ? h.holiday_date.split('T')[0] : '';
        if (d) window._bcvHolidays[d] = h.holiday_name || 'Ngày lễ';
    });

    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    var overlay = document.createElement('div');
    overlay.className = 'bcv-overlay';
    overlay.id = 'bcvOverlay';

    overlay.innerHTML = `<div class="bcv-modal">
        <div class="bcv-modal-header">
            <h3>＋ Tạo Task Mới</h3>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
        </div>
        <div class="bcv-modal-body">
            <div class="bcv-form-group">
                <label>Tiêu đề *</label>
                <input class="bcv-form-input" id="bcvCreateTitle" placeholder="Nhập tiêu đề công việc...">
            </div>
            <div class="bcv-form-group">
                <label>Mô tả *</label>
                <textarea class="bcv-form-textarea" id="bcvCreateDesc" placeholder="Mô tả chi tiết công việc..."></textarea>
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
            ${isDirector ? `<div class="bcv-form-group">
                <label>Phòng ban *</label>
                <select class="bcv-form-select" id="bcvCreateDept" onchange="_bcvCreateDeptChange()">${deptOptions}</select>
            </div>` : ''}
            <div class="bcv-form-group" id="bcvAssigneeWrap" style="display:${isDirector ? 'none' : 'block'}">
                <label>Giao cho *</label>
                <select class="bcv-form-select" id="bcvCreateAssignee">${userOptions}</select>
            </div>
            <div class="bcv-form-group">
                <label>Deadline *</label>
                <input class="bcv-form-input" type="date" id="bcvCreateDeadline" min="${todayStr}" onchange="_bcvCheckDeadlineHoliday(this); _bcvFormatDeadlineDisplay(this.value)">
                <div id="bcvDeadlineDisplay" style="font-size:12px;font-weight:700;color:#3b82f6;margin-top:4px;min-height:16px"></div>
            </div>
            <div class="bcv-form-group">
                <label>🔗 Đường link công việc *</label>
                <input class="bcv-form-input" id="bcvCreateLink" placeholder="https://... hoặc đường dẫn liên quan">
            </div>
            <div class="bcv-form-group">
                <label>✅ Checklist con</label>
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

// When director changes department in create modal, reload users
async function _bcvCreateDeptChange() {
    var deptEl = document.getElementById('bcvCreateDept');
    var assigneeEl = document.getElementById('bcvCreateAssignee');
    var assigneeWrap = document.getElementById('bcvAssigneeWrap');
    if (!deptEl || !assigneeEl) return;

    var deptId = deptEl.value;
    if (!deptId) {
        // Chưa chọn phòng ban → ẩn Giao cho
        if (assigneeWrap) assigneeWrap.style.display = 'none';
        assigneeEl.innerHTML = '<option value="">— Chọn người —</option>';
        return;
    }

    var usersRes = await _bcvApi('/api/board-tasks/users?department_id=' + deptId);
    var users = (usersRes && usersRes.users) || [];

    var h = '<option value="">— Chọn người —</option>';
    users.forEach(function(u) {
        h += `<option value="${u.id}">${_esc(u.full_name)}</option>`;
    });
    assigneeEl.innerHTML = h;
    if (assigneeWrap) assigneeWrap.style.display = 'block';
}

// Check if selected deadline is a holiday
function _bcvCheckDeadlineHoliday(input) {
    if (!input.value || !window._bcvHolidays) return;
    var selected = input.value; // YYYY-MM-DD
    if (window._bcvHolidays[selected]) {
        alert('⚠️ Ngày ' + selected + ' là ngày lễ: "' + window._bcvHolidays[selected] + '"\nVui lòng chọn ngày khác!');
        input.value = '';
        var disp = document.getElementById('bcvDeadlineDisplay');
        if (disp) disp.textContent = '';
    }
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
    div.innerHTML = '<input type="text" class="bcv-cl-input" placeholder="Mục ' + (idx + 1) + '..." data-idx="' + idx + '">' +
        '<button class="bcv-cl-remove" onclick="this.parentElement.remove()" title="Xóa">✕</button>';
    builder.appendChild(div);
    div.querySelector('input').focus();
}


async function _bcvSubmitCreate() {
    var title = (document.getElementById('bcvCreateTitle') || {}).value || '';
    if (!title.trim()) { alert('Vui lòng nhập tiêu đề'); return; }

    var desc = (document.getElementById('bcvCreateDesc') || {}).value || '';
    if (!desc.trim()) { alert('Vui lòng nhập mô tả công việc'); return; }

    var taskType = (document.getElementById('bcvCreateType') || {}).value || '';
    if (!taskType) { alert('Vui lòng chọn loại công việc'); return; }

    var priority = (document.getElementById('bcvCreatePriority') || {}).value || '';
    if (!priority) { alert('Vui lòng chọn mức ưu tiên'); return; }

    var assignee = (document.getElementById('bcvCreateAssignee') || {}).value || '';
    if (!assignee) { alert('Vui lòng chọn người được giao'); return; }

    var deadline = (document.getElementById('bcvCreateDeadline') || {}).value || '';
    if (!deadline) { alert('Vui lòng chọn deadline'); return; }

    var taskLink = (document.getElementById('bcvCreateLink') || {}).value || '';
    if (!taskLink.trim()) { alert('Vui lòng nhập đường link công việc'); return; }

    var deptEl = document.getElementById('bcvCreateDept');
    if (deptEl && !deptEl.value) { alert('Vui lòng chọn phòng ban'); return; }

    // Collect checklist items
    var checklistItems = [];
    var clInputs = document.querySelectorAll('#bcvChecklistBuilder .bcv-cl-input');
    clInputs.forEach(function(inp) { if (inp.value.trim()) checklistItems.push(inp.value.trim()); });

    var body = {
        title: title.trim(),
        description: desc.trim(),
        task_type: taskType,
        priority: priority,
        assigned_to: assignee,
        deadline: deadline,
        task_link: taskLink.trim(),
        checklist: checklistItems
    };

    if (deptEl) body.department_id = deptEl.value || null;

    // Disable submit button
    var btn = document.getElementById('bcvSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo...'; }

    var res = await _bcvApi('/api/board-tasks', 'POST', body);
    if (res && res.ok) {
        // Upload pasted images if any
        if (_bcvPastedImages.length > 0) {
            for (var i = 0; i < _bcvPastedImages.length; i++) {
                var fd = new FormData();
                fd.append('file', _bcvPastedImages[i], 'paste_' + Date.now() + '_' + i + '.png');
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
        alert(res?.error || 'Lỗi tạo task');
        if (btn) { btn.disabled = false; btn.textContent = 'Tạo Task'; }
    }
}

// ========== DETAIL MODAL ==========

async function _bcvShowDetail(taskId) {
    var task = _bcv.tasks.find(t => t.id === taskId);
    if (!task) return;

    var user = window._currentUser || {};
    var isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(user.role);
    var isCreator = task.created_by === user.id;
    var isAssignee = task.assigned_to === user.id;
    var canAccept = isAssignee || !task.assigned_to;
    var canEdit = isManager || isCreator;
    var canDelete = user.role === 'giam_doc' || isCreator;
    var cvId = 'CV-' + String(task.id).padStart(3,'0');
    var daysArr = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

    // Format deadline with day of week
    var deadlineText = '';
    if (task.deadline) {
        var dl = new Date(task.deadline + 'T00:00:00');
        deadlineText = daysArr[dl.getDay()] + ' - ' + String(dl.getDate()).padStart(2,'0') + '/' + String(dl.getMonth()+1).padStart(2,'0');
    }

    // Format accepted_at
    var acceptedText = '';
    if (task.accepted_at) {
        var at = new Date(task.accepted_at);
        acceptedText = daysArr[at.getDay()] + ' - ' + String(at.getDate()).padStart(2,'0') + '/' + String(at.getMonth()+1).padStart(2,'0') + ' ' + String(at.getHours()).padStart(2,'0') + ':' + String(at.getMinutes()).padStart(2,'0');
    }

    // ========== CẦN LÀM: Modal read-only + nút xác nhận ==========
    if (task.status === 'can_lam') {
        var checklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
        var checklist = (checklistRes && checklistRes.checklist) || [];

        var priorityLabel = task.priority === 'cao' ? '🔴 Cao' : task.priority === 'trung_binh' ? '🟠 Trung bình' : '🟢 Thấp';
        var typeLabel = task.task_type === 'chinh' ? '🔵 Chính' : '🟡 Phụ';

        var overlay = document.createElement('div');
        overlay.className = 'bcv-overlay';
        overlay.id = 'bcvOverlay';

        overlay.innerHTML = `<div class="bcv-modal">
            <div class="bcv-modal-header">
                <h3>Công Việc: ${cvId}</h3>
                <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
            </div>
            <div class="bcv-modal-body">
                <div style="text-align:center;margin-bottom:16px">
                    <span style="display:inline-block;background:linear-gradient(135deg,#eef2ff,#e0e7ff);color:#6366f1;font-weight:800;font-size:12px;padding:4px 14px;border-radius:20px;letter-spacing:.5px">${cvId}</span>
                </div>

                <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                    <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Tiêu đề</div>
                    <div style="font-size:15px;font-weight:800;color:#1e293b;line-height:1.4">${_esc(task.title)}</div>
                </div>

                ${task.description ? `<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
                    <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Mô tả công việc</div>
                    <div style="font-size:13px;font-weight:600;color:#334155;line-height:1.6;white-space:pre-wrap">${_esc(task.description)}</div>
                </div>` : ''}

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
                    <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Loại</div>
                        <div style="font-size:13px;font-weight:700">${typeLabel}</div>
                    </div>
                    <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Ưu tiên</div>
                        <div style="font-size:13px;font-weight:700">${priorityLabel}</div>
                    </div>
                </div>

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

                ${task.task_link ? `<div style="margin-bottom:16px">
                    <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🔗 Đường link công việc</div>
                    <a href="${_escAttr(task.task_link)}" target="_blank" style="display:block;font-size:12px;color:#3b82f6;font-weight:600;word-break:break-all;padding:8px 12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe">${_esc(task.task_link)}</a>
                </div>` : ''}

                ${checklist.length > 0 ? `<div style="margin-bottom:16px">
                    <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✅ Checklist (${checklist.filter(c => c.is_done).length}/${checklist.length})</div>
                    ${checklist.map(function(item) {
                        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px;font-weight:600;color:#334155">' +
                            '<span style="color:' + (item.is_done ? '#22c55e' : '#cbd5e1') + '">' + (item.is_done ? '✅' : '⬜') + '</span>' +
                            '<span>' + _esc(item.title) + '</span></div>';
                    }).join('')}
                </div>` : ''}

                ${canAccept ? `<div style="margin-top:20px;text-align:center">
                    <button class="bcv-btn bcv-btn-success" data-no-debounce="true" onclick="_bcvAcceptTask(${task.id}, this)" style="padding:10px 28px;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                        ✅ NHẬN CÔNG VIỆC
                    </button>
                </div>` : ''}

                <div class="bcv-form-actions" style="margin-top:16px">
                    ${(user.role === 'giam_doc' || isCreator) ? `<button class="bcv-btn bcv-btn-danger" data-no-debounce="true" onclick="_bcvDeleteTask(${task.id})">🗑 Xóa Công Việc</button>` : ''}
                    <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()">Đóng</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        return;
    }

    // ========== ĐANG LÀM / CHỜ DUYỆT / HOÀN THÀNH: Modal edit bình thường ==========

    // Load comments, checklist, attachments
    var commentsRes = await _bcvApi('/api/board-tasks/' + taskId + '/comments');
    var comments = (commentsRes && commentsRes.comments) || [];
    var checklistRes = await _bcvApi('/api/board-tasks/' + taskId + '/checklist');
    var checklist = (checklistRes && checklistRes.checklist) || [];
    var attachRes = await _bcvApi('/api/board-tasks/' + taskId + '/attachments');
    var attachments = (attachRes && attachRes.attachments) || [];

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

    var canEditSection1 = (task.status === 'can_lam') && (isManager || isCreator);

    overlay.innerHTML = `<div class="bcv-modal">
        <div class="bcv-modal-header">
            <h3>Công Việc: ${cvId}</h3>
            <button class="bcv-modal-close" onclick="document.getElementById('bcvOverlay').remove()">✕</button>
        </div>
        <div class="bcv-modal-body">

            <!-- ═══ SECTION 1: THÔNG TIN CÔNG VIỆC ═══ -->
            <div class="bcv-section-divider">
                <span class="bcv-section-title-badge">📌 THÔNG TIN CÔNG VIỆC</span>
            </div>

            ${acceptedText ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg,#059669,#10b981);border-radius:10px;margin-bottom:14px;font-size:12px;font-weight:800;color:#ffffff;box-shadow:0 4px 12px rgba(16,185,129,0.25);text-shadow:0 1px 2px rgba(0,0,0,0.2)">
                <span style="font-size:16px">📥</span> Nhận việc lúc: ${acceptedText}
            </div>` : ''}

            <div class="bcv-form-group">
                <label style="font-size:11px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.6px;display:flex;align-items:center;gap:4px">🏷️ TIÊU ĐỀ CÔNG VIỆC</label>
                <input class="bcv-form-input-prominent" id="bcvDetailTitle" value="${_escAttr(task.title)}" ${!canEditSection1 ? 'disabled' : ''}>
            </div>
            <div class="bcv-form-group">
                <label style="font-size:11px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.6px;display:flex;align-items:center;gap:4px">📝 MÔ TẢ CHI TIẾT CÔNG VIỆC</label>
                <textarea class="bcv-form-textarea-prominent" id="bcvDetailDesc" ${!canEditSection1 ? 'disabled' : ''}>${_esc(task.description || '')}</textarea>
            </div>

            <div class="bcv-info-compact">
                <div class="bcv-info-cell bcv-cell-status">
                    <div class="bcv-info-lbl">📌 TRẠNG THÁI</div>
                    <div><select class="bcv-form-select" id="bcvDetailStatus" style="padding:4px 6px;font-size:12px;font-weight:700;margin:0;border:none;background:transparent" ${!canEditSection1 ? 'disabled' : ''}>${statusOptions}</select></div>
                </div>
                <div class="bcv-info-cell bcv-cell-priority">
                    <div class="bcv-info-lbl">🔥 ƯU TIÊN</div>
                    <div><select class="bcv-form-select" id="bcvDetailPriority" style="padding:4px 6px;font-size:12px;font-weight:700;margin:0;border:none;background:transparent" ${!canEditSection1 ? 'disabled' : ''}>${priorityOptions}</select></div>
                </div>
                <div class="bcv-info-cell bcv-cell-deadline ${isOverdue ? 'overdue' : ''}">
                    <div class="bcv-info-lbl">📅 DEADLINE</div>
                    ${canEditSection1 ? `<input class="bcv-form-input" type="date" id="bcvDetailDeadline" value="${task.deadline ? task.deadline.split('T')[0] : ''}" style="padding:4px 6px;font-size:11px;font-weight:700;border:none;background:transparent">`
                    : `<div class="bcv-info-val" style="color:${isOverdue ? '#dc2626' : '#0369a1'};font-weight:800">📅 ${deadlineText || (task.deadline ? task.deadline.split('T')[0] : '—')}</div>`}
                </div>
                <div class="bcv-info-cell bcv-cell-dept">
                    <div class="bcv-info-lbl">🏢 PHÒNG BAN</div>
                    <div class="bcv-info-val" style="color:#6d28d9;font-weight:800">${_esc(task.department_name || '—')}</div>
                </div>
                <div class="bcv-info-cell bcv-cell-assigner">
                    <div class="bcv-info-lbl">👤 NGƯỜI GIAO</div>
                    <div class="bcv-info-val" style="color:#334155;font-weight:800">${_esc(task.created_by_name || '?')}</div>
                </div>
                <div class="bcv-info-cell bcv-cell-assignee">
                    <div class="bcv-info-lbl">👤 NGƯỜI NHẬN</div>
                    <div class="bcv-info-val" style="color:#15803d;font-weight:800">${_esc(task.assigned_to_name || 'Chưa giao')}</div>
                </div>
                <!-- Đường link công việc integrated into grid -->
                <div class="bcv-info-cell bcv-cell-link">
                    <div class="bcv-info-lbl">🔗 ĐƯỜNG LINK CÔNG VIỆC</div>
                    ${canEditSection1 ? `<div>
                        <input class="bcv-form-input" id="bcvDetailLink" value="${_escAttr(task.task_link || '')}" placeholder="https://..." style="padding:4px 6px;font-size:12px;font-weight:700;border:none;background:transparent">
                        ${task.task_link ? `<a href="${_escAttr(task.task_link)}" target="_blank" style="font-size:11px;color:#0284c7;font-weight:800;display:inline-block;margin-top:2px">🔗 Mở link công việc ↗</a>` : ''}
                    </div>` : (task.task_link ? `<a href="${_escAttr(task.task_link)}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#0284c7;font-weight:800;background:#e0f2fe;padding:4px 12px;border-radius:6px;word-break:break-all">${_esc(task.task_link)} ↗</a>` : '<div style="font-size:12px;color:#94a3b8">Không có link</div>')}
                </div>
            </div>

            <!-- Checklist Read-Only Card -->
            ${checklist.length > 0 ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✅ Checklist (${checklist.filter(c => c.is_done).length}/${checklist.length})</div>
                <div style="display:grid;gap:6px">
                    ${checklist.map(function(item) {
                        var doneTime = '';
                        if (item.is_done && item.completed_at) {
                            var d = new Date(item.completed_at);
                            doneTime = ' — ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ' ' + String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
                        }
                        return '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:' + (item.is_done ? '#f0fdf4' : '#f8fafc') + ';border:1px solid ' + (item.is_done ? '#bbf7d0' : '#f1f5f9') + '">' +
                            '<span style="font-size:14px">' + (item.is_done ? '✅' : '⬜') + '</span>' +
                            '<span style="font-size:12px;font-weight:600;color:' + (item.is_done ? '#15803d' : '#1e293b') + '">' + _esc(item.title) + '</span>' +
                            (doneTime ? '<span style="margin-left:auto;font-size:9px;font-weight:700;color:#16a34a">' + doneTime + '</span>' : '') +
                        '</div>';
                    }).join('')}
                </div>
            </div>` : ''}

            <!-- Hình ảnh đính kèm Card -->
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;margin-bottom:14px">
                <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🖼️ Hình ảnh đính kèm (${attachments.length})</div>
                ${attachments.length > 0 ? `<div class="bcv-att-gallery">
                    ${attachments.map(function(att) {
                        var isImg = (att.file_name || '').match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        if (isImg) {
                            return '<div class="bcv-att-thumb" onclick="_bcvOpenLightbox(\'' + _escAttr(att.file_path) + '\')">' +
                                '<img src="' + _escAttr(att.file_path) + '" alt="' + _escAttr(att.file_name) + '" loading="lazy">' +
                                (canEditSection1 ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                            '</div>';
                        } else {
                            var icon = (att.file_name || '').match(/\.pdf$/i) ? '📄' : '📎';
                            return '<div class="bcv-att-thumb" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:default" onclick="window.open(\'' + _escAttr(att.file_path) + '\',\'_blank\')">' +
                                '<span style="font-size:24px">' + icon + '</span>' +
                                '<span style="font-size:8px;font-weight:600;color:#64748b;text-align:center;padding:0 4px;word-break:break-all">' + _esc(att.file_name) + '</span>' +
                                (canEditSection1 ? '<button class="bcv-att-thumb-del" onclick="event.stopPropagation();_bcvDeleteAttachment(' + task.id + ',' + att.id + ')" title="Xóa">✕</button>' : '') +
                            '</div>';
                        }
                    }).join('')}
                </div>` : '<div style="color:#94a3b8;font-size:11px">Chưa có hình ảnh</div>'}
                ${canEditSection1 ? '<div style="margin-top:8px"><label class="bcv-cl-add" style="cursor:pointer"><input type="file" accept="image/*" style="display:none" onchange="_bcvUploadAttachment(' + task.id + ',this)"> ＋ Thêm hình ảnh</label></div>' : ''}
            </div>

            <!-- ═══ SECTION 2: BÁO CÁO TIẾN ĐỘ ═══ -->
            <div class="bcv-section-divider">
                <span class="bcv-section-title-badge">📝 BÁO CÁO TIẾN ĐỘ</span>
                ${!isAssignee ? '<span style="margin-left:auto;font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;padding:4px 10px;border-radius:8px;border:1px solid #cbd5e1">👁️ Chế độ chỉ xem</span>' : ''}
            </div>

            <!-- Khối 1: Tiến Độ & Checklist -->
            <div class="bcv-report-area">
                <div class="bcv-form-group" style="margin-bottom:14px">
                    <label style="font-weight:700;color:#0f172a">📊 TIẾN ĐỘ HOÀN THÀNH</label>
                    <div class="bcv-progress-single-wrap">
                        <input type="range" class="bcv-progress-single-slider" id="bcvDetailProgress" min="0" max="100" value="${task.progress || 0}" ${!isAssignee ? 'disabled style="cursor:not-allowed"' : ''} oninput="_bcvUpdateProgressDisplay(this.value)">
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
                                doneTime = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ' ' + String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
                            }
                            var hasData = !!(item.content && item.content.trim()) || !!(item.link && item.link.trim());
                            var contentHtml = item.content && item.content.trim() ? '<div class="bcv-cl-content-preview"><span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px">Nội dung đính kèm:</span>' + _esc(item.content.trim()) + '</div>' : '';
                            var linkHtml = item.link && item.link.trim() ? '<div class="bcv-cl-link-preview"><span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px">Đường link đính kèm:</span><a href="' + _escAttr(item.link.trim()) + '" target="_blank">🔗 ' + _esc(item.link.trim()) + ' ↗</a></div>' : '';

                            var showSavedView = !isAssignee || hasData;

                            return '<div class="bcv-cl-card ' + (item.is_done ? 'done' : '') + '" data-cl-id="' + item.id + '">' +
                                '<div class="bcv-cl-card-head">' +
                                    '<input type="checkbox" ' + (item.is_done ? 'checked' : '') + ' ' + (!isAssignee ? 'disabled style="cursor:not-allowed"' : '') + ' onchange="_bcvToggleChecklist(' + task.id + ',' + item.id + ',this.checked)">' +
                                    '<span class="bcv-cl-card-title">' + _esc(item.title) + '</span>' +
                                    (doneTime ? '<span class="bcv-cl-card-time"><span style="color:#16a34a;font-weight:800">✓</span> Hoàn thành ' + doneTime + '</span>' : '') +
                                    (isAssignee ? '<button class="bcv-btn-edit-sm" id="bcvClEditBtn_' + item.id + '" data-no-debounce="true" onclick="_bcvToggleClEdit(' + item.id + ')">' + (hasData ? '✏️ Sửa' : '✏️ Nhập') + '</button>' : '') +
                                '</div>' +

                                '<!-- Compact Saved Preview -->' +
                                '<div class="bcv-cl-saved-body" id="bcvClSaved_' + item.id + '" style="display:' + (showSavedView ? 'block' : 'none') + '">' +
                                    contentHtml + linkHtml +
                                '</div>' +

                                '<!-- Edit Form (Only for Assignee) -->' +
                                (isAssignee ? '<div class="bcv-cl-card-body" id="bcvClForm_' + item.id + '" style="display:' + (hasData ? 'none' : 'block') + '">' +
                                    '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Mô tả / Ghi chú</div>' +
                                    '<textarea id="bcvClContent_' + item.id + '" placeholder="Nhập ghi chú chi tiết...">' + _esc(item.content || '') + '</textarea>' +
                                    '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Đường link đính kèm</div>' +
                                    '<input type="text" id="bcvClLink_' + item.id + '" value="' + _escAttr(item.link || '') + '" placeholder="https://...">' +
                                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">' +
                                        '<button style="padding:4px 10px;border-radius:6px;border:none;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:700;cursor:pointer" onclick="_bcvToggleClEdit(' + item.id + ', false)">Thu gọn</button>' +
                                        '<button class="bcv-cl-card-save" data-no-debounce="true" onclick="_bcvSaveChecklistDetail(' + task.id + ',' + item.id + ')">💾 Lưu</button>' +
                                    '</div>' +
                                '</div>' : '') +
                            '</div>';
                        }).join('')}
                    </div>
                    ${isAssignee ? '<div style="display:flex;gap:6px;margin-top:6px"><input class="bcv-form-input" id="bcvNewCheckItem" placeholder="Thêm mục mới..." style="font-size:12px" onkeydown="if(event.key===\'Enter\')_bcvAddChecklist(' + task.id + ')"><button class="bcv-btn" style="padding:6px 12px;font-size:11px;background:#3b82f6;color:#fff;border-radius:8px" onclick="_bcvAddChecklist(' + task.id + ')">Thêm</button></div>' : ''}
                </div>
            </div>

            <!-- Khối 2: Báo Cáo Tổng Thể Công Việc (Độc Lập Độc Tôn với Hiệu Ứng Lấp Lánh) -->
            <div class="bcv-overall-report-card">
                <div class="bcv-overall-report-header">
                    <span>📄 BÁO CÁO TỔNG THỂ CÔNG VIỆC</span>
                    <span style="font-size:10px;font-weight:800;background:rgba(255,255,255,0.22);padding:3px 10px;border-radius:12px;letter-spacing:0.5px">MỤC QUAN TRỌNG ★</span>
                </div>
                <div style="padding:18px">
                    <div class="bcv-form-group" style="margin-bottom:16px">
                        <label style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">📝 Nội dung báo cáo toàn bộ công việc</label>
                        <textarea class="bcv-report-textarea" id="bcvDetailReportContent" placeholder="Mô tả chi tiết kết quả thực hiện toàn bộ công việc..." ${!isAssignee ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : ''}>${_esc(task.report_content || '')}</textarea>
                    </div>

                    <div class="bcv-form-group">
                        <label style="font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🔗 Đường link nộp báo cáo tổng thể</label>
                        <input class="bcv-report-link-input" id="bcvDetailReportLink" value="${_escAttr(task.report_link || '')}" placeholder="Dán link Google Docs, Drive, Sheet báo cáo tổng thể..." ${!isAssignee ? 'disabled style="background:#f8fafc;cursor:not-allowed"' : ''}>
                        ${task.report_link ? '<div style="margin-top:8px"><a href="' + _escAttr(task.report_link) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#ffffff;font-weight:800;background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:8px 16px;border-radius:8px;box-shadow:0 3px 10px rgba(37,99,235,0.3);text-decoration:none">🔗 Mở link nộp báo cáo tổng thể ↗</a></div>' : ''}
                    </div>
                </div>
            </div>

            <div class="bcv-form-actions">
                ${user.role === 'giam_doc' ? `<button class="bcv-btn bcv-btn-danger" data-no-debounce="true" onclick="_bcvDeleteTask(${task.id})">🗑 Xóa</button>` : ''}
                <button class="bcv-btn bcv-btn-secondary" onclick="document.getElementById('bcvOverlay').remove()">Đóng</button>
                ${(isAssignee || canEditSection1) ? `<button class="bcv-btn bcv-btn-primary" onclick="_bcvSaveDetail(${task.id})">💾 Lưu</button>` : ''}
            </div>

            <div class="bcv-comments">
                <div class="bcv-comments-title">💬 Bình luận (${comments.length})</div>
                <div id="bcvCommentList">${commentsHtml || '<div style="color:#a8a29e;font-size:12px;padding:8px 0">Chưa có bình luận</div>'}</div>
                <div class="bcv-comment-input-wrap">
                    <input class="bcv-comment-input" id="bcvCommentInput" placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter')_bcvAddComment(${task.id})">
                    <button class="bcv-comment-send" onclick="_bcvAddComment(${task.id})">Gửi</button>
                </div>
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
    var savedEl = document.getElementById('bcvClSaved_' + itemId);
    var btnEl = document.getElementById('bcvClEditBtn_' + itemId);
    if (!formEl || !savedEl) return;

    var isEdit = forceShowEdit !== undefined ? forceShowEdit : (formEl.style.display === 'none');
    if (isEdit) {
        formEl.style.display = 'block';
        savedEl.style.display = 'none';
        if (btnEl) btnEl.textContent = '✕ Thu gọn';
    } else {
        formEl.style.display = 'none';
        savedEl.style.display = 'block';
        var hasContent = savedEl.children.length > 0;
        if (btnEl) btnEl.textContent = hasContent ? '✏️ Sửa' : '✏️ Nhập';
    }
}

// Save checklist item detail (content + link)
async function _bcvSaveChecklistDetail(taskId, itemId) {
    var content = (document.getElementById('bcvClContent_' + itemId) || {}).value || '';
    var link = (document.getElementById('bcvClLink_' + itemId) || {}).value || '';
    var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId + '/detail', 'PATCH', { content: content, link: link });
    if (res && res.ok) {
        // Update compact saved view HTML
        var savedEl = document.getElementById('bcvClSaved_' + itemId);
        if (savedEl) {
            var html = '';
            if (content.trim()) {
                html += '<div class="bcv-cl-content-preview"><span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px">Nội dung đính kèm:</span>' + _esc(content.trim()) + '</div>';
            }
            if (link.trim()) {
                html += '<div class="bcv-cl-link-preview"><span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px">Đường link đính kèm:</span><a href="' + _escAttr(link.trim()) + '" target="_blank">🔗 ' + _esc(link.trim()) + ' ↗</a></div>';
            }
            savedEl.innerHTML = html;
        }
        // Show saved feedback & collapse back to compact mode
        var btn = event && event.target;
        if (btn) {
            btn.textContent = '✅ Đã lưu';
            setTimeout(function(){
                btn.textContent = '💾 Lưu';
                _bcvToggleClEdit(itemId, false);
            }, 600);
        } else {
            _bcvToggleClEdit(itemId, false);
        }
    } else {
        alert(res?.error || 'Lỗi lưu chi tiết checklist');
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
    var body = {
        title: (document.getElementById('bcvDetailTitle') || {}).value || '',
        description: (document.getElementById('bcvDetailDesc') || {}).value || '',
        status: statusEl ? statusEl.value : 'can_lam',
        priority: (document.getElementById('bcvDetailPriority') || {}).value || 'trung_binh',
        progress: parseInt((document.getElementById('bcvDetailProgress') || {}).value || '0', 10),
        deadline: (document.getElementById('bcvDetailDeadline') || {}).value || null,
        task_link: (document.getElementById('bcvDetailLink') || {}).value || null,
        report_content: (document.getElementById('bcvDetailReportContent') || {}).value || null,
        report_link: (document.getElementById('bcvDetailReportLink') || {}).value || null
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

async function _bcvToggleChecklist(taskId, itemId, isDone) {
    await _bcvApi('/api/board-tasks/' + taskId + '/checklist/' + itemId, 'PATCH', { is_done: isDone });
    // Update UI inline
    var item = document.querySelector('.bcv-detail-cl-item[data-cl-id="' + itemId + '"]');
    if (item) {
        var text = item.querySelector('.bcv-cl-text');
        if (text) { text.className = 'bcv-cl-text ' + (isDone ? 'done' : ''); }
    }
}

async function _bcvAddChecklist(taskId) {
    var input = document.getElementById('bcvNewCheckItem');
    if (!input || !input.value.trim()) return;
    var res = await _bcvApi('/api/board-tasks/' + taskId + '/checklist', 'POST', { title: input.value.trim() });
    if (res && res.ok) {
        var overlay = document.getElementById('bcvOverlay');
        if (overlay) overlay.remove();
        await _bcvShowDetail(taskId);
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

window.renderBangcongviecPage = renderBangcongviecPage;
