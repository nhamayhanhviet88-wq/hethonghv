/* ===== MỤC TIÊU NĂM — EXECUTIVE YEARLY GOALS (SALE/KD, MARKETING, SẢN XUẤT) ===== */

(function() {
    window._mtnYear = new Date().getFullYear();
    window._mtnCategory = 'sale_kd'; // 'sale_kd', 'marketing', 'san_xuat'
    window._mtnSegment = 'all'; // 'dong_phuc', 'tem_pet', 'all'
    window._mtnData = {}; // month -> { target_revenue, target_orders, target_notes }

    // Format currency VND
    function formatVND(num) {
        if (!num || isNaN(num)) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

    // Format number
    function formatNum(num) {
        if (!num || isNaN(num)) return '0';
        return Number(num).toLocaleString('vi-VN');
    }

    // Render full page
    window.renderMucTieuNamPage = async function(container) {
        if (!container) return;
        container.innerHTML = '<div id="mtnApp"></div>';
        await window._mtnRenderExecutiveGrid();
    };

    // Helper to calculate exact Vietnam Time (Asia/Ho_Chi_Minh / UTC+7)
    function _mtnGetVNTime() {
        try {
            var d = new Date();
            var vnDateStr = d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
            var vnDate = new Date(vnDateStr);
            var yr = vnDate.getFullYear();
            var mo = vnDate.getMonth() + 1;
            return { year: yr, month: mo, quarter: Math.ceil(mo / 3) };
        } catch(e) {
            var d2 = new Date();
            var yr2 = d2.getFullYear();
            var mo2 = d2.getMonth() + 1;
            return { year: yr2, month: mo2, quarter: Math.ceil(mo2 / 3) };
        }
    }

    // Render Main Executive Summary Grid & Control Filter Bar
    window._mtnRenderExecutiveGrid = async function() {
        var container = document.getElementById('mtnApp');
        if (!container) return;

        var vnTime = _mtnGetVNTime();
        var selectedYr = Number(window._mtnYear);

        function getQTitle(qNum, qName, rangeStr) {
            var badgeHtml = '';
            if (selectedYr === vnTime.year) {
                if (qNum === vnTime.quarter) {
                    badgeHtml = `<span class="mtn-q-pulse-badge">🔥 QUÝ HIỆN TẠI</span>`;
                } else if (qNum < vnTime.quarter) {
                    badgeHtml = `<span class="mtn-past-badge">✅ Đã qua</span>`;
                } else {
                    badgeHtml = `<span class="mtn-future-badge">⏳ Chưa đến</span>`;
                }
            } else if (selectedYr < vnTime.year) {
                badgeHtml = `<span class="mtn-past-badge">✅ Đã qua</span>`;
            } else {
                badgeHtml = `<span class="mtn-future-badge">⏳ Chưa đến</span>`;
            }
            return `📊 ${qName} (${rangeStr}) ${badgeHtml}`;
        }

        function getQCardClass(qNum) {
            if (selectedYr === vnTime.year && qNum === vnTime.quarter) {
                return `mtn-summary-card q${qNum} mtn-current-quarter`;
            }
            return `mtn-summary-card q${qNum}`;
        }

        var style = `<style>
            .mtn-page { background: #f8fafc; min-height: calc(100vh - 60px); padding-bottom: 50px; font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; }
            .mtn-hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #2563eb 85%, #3b82f6 100%); padding: 28px 36px 36px; color: #fff; box-shadow: 0 10px 30px rgba(37,99,235,0.22); position: relative; overflow: hidden; }
            .mtn-hero::before { content: ''; position: absolute; top: -50%; right: -10%; width: 450px; height: 450px; background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; pointer-events: none; }
            .mtn-hero-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
            .mtn-hero-title h2 { margin: 0 0 6px; font-size: 24px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 10px; letter-spacing: -0.3px; }
            .mtn-hero-sub { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500; }
            
            /* Tabs */
            .mtn-tabs { display: flex; background: rgba(0,0,0,0.25); padding: 5px; border-radius: 14px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); gap: 4px; flex-wrap: wrap; }
            .mtn-tab-btn { padding: 10px 22px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 8px; font-family: inherit; }
            .mtn-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.12); }
            .mtn-tab-btn.active { background: #fff; color: #1e3a5f; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }

            /* Year & Segment Actions Filter Bar */
            .mtn-filter-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin: -20px 36px 28px; padding: 16px 24px; position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
            .mtn-year-select { padding: 9px 16px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 800; background: #f8fafc; color: #1e293b; outline: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }
            .mtn-year-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); background: #fff; }

            .mtn-seg-pill { padding: 6px 16px; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: inherit; }
            .mtn-seg-pill:hover { background: #f1f5f9; color: #1e293b; }
            .mtn-seg-pill.active { background: #2563eb; color: #fff; border-color: #2563eb; box-shadow: 0 2px 8px rgba(37,99,235,0.3); }

            .mtn-btn-save { padding: 10px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 16px rgba(22,163,74,0.35); transition: all 0.2s; display: flex; align-items: center; gap: 8px; font-family: inherit; }
            .mtn-btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.45); }

            /* Executive KPI Summary Matrix (5 Cards Grid - Clean White Minimalist) */
            .mtn-summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin: 0 36px 28px; }
            @media(max-width: 1250px) { .mtn-summary-grid { grid-template-columns: repeat(3, 1fr); } }
            @media(max-width: 800px) { .mtn-summary-grid { grid-template-columns: 1fr; } }

            .mtn-summary-card { background: #fff; border-radius: 16px; border: 1.5px solid #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; position: relative; }
            .mtn-summary-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #94a3b8; }
            .mtn-summary-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4.5px; z-index: 2; }
            .mtn-summary-card.full-year::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
            .mtn-summary-card.q1::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
            .mtn-summary-card.q2::before { background: linear-gradient(90deg, #10b981, #047857); }
            .mtn-summary-card.q3::before { background: linear-gradient(90deg, #8b5cf6, #6d28d9); }
            .mtn-summary-card.q4::before { background: linear-gradient(90deg, #ec4899, #be185d); }

            .mtn-card-title { font-size: 11.5px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.4px; padding: 0 14px; border-bottom: 1px solid #f1f5f9; background: #fff; height: 42px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 4px; }

            /* Block 1: Target (Fixed 72px) */
            .mtn-block-target { padding: 0 14px; background: #fff; height: 72px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
            .mtn-block-lbl { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
            .mtn-block-val { font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.2; }
            .mtn-block-sub { font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 2px; }

            /* Block 2: Actual (Fixed 72px - Light Blue Accent) */
            .mtn-block-actual { padding: 0 14px; background: #eff6ff; border-top: 1px dashed #bfdbfe; border-bottom: 1px dashed #bfdbfe; height: 72px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
            .mtn-act-val { font-size: 16px; font-weight: 900; color: #1d4ed8; line-height: 1.2; }
            .mtn-act-sub { font-size: 11.5px; font-weight: 800; color: #1e40af; margin-top: 2px; }

            /* Real-Time Vietnam Time Tracker Animations & Glowing Badges */
            @keyframes mtnPulse {
                0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(22, 163, 74, 0.4)); }
                50% { transform: scale(1.22); filter: drop-shadow(0 0 8px rgba(22, 163, 74, 0.9)); }
                100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(22, 163, 74, 0.4)); }
            }
            @keyframes mtnGlowActive {
                0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); border-color: #22c55e !important; }
                50% { box-shadow: 0 0 16px 4px rgba(34, 197, 94, 0.65); border-color: #16a34a !important; }
                100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); border-color: #22c55e !important; }
            }
            @keyframes mtnGlowQActive {
                0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.35); border-color: #a855f7 !important; }
                50% { box-shadow: 0 0 18px 4px rgba(124, 58, 237, 0.65); border-color: #7c3aed !important; }
                100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.35); border-color: #a855f7 !important; }
            }
            .mtn-pulse-icon { display: inline-block; animation: mtnPulse 1.4s infinite ease-in-out; margin-right: 3px; font-size: 12px; }
            .mtn-now-pulse-badge {
                display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 12px;
                font-size: 10.5px; font-weight: 900; background: linear-gradient(135deg, #dcfce7, #bbf7d0);
                color: #15803d; border: 1.2px solid #86efac; animation: mtnPulse 1.4s infinite ease-in-out;
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3); text-transform: uppercase; letter-spacing: 0.3px;
            }
            .mtn-q-pulse-badge {
                display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 12px;
                font-size: 10px; font-weight: 900; background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
                color: #6b21a8; border: 1.2px solid #d8b4fe;
                box-shadow: 0 1px 4px rgba(124, 58, 237, 0.15); text-transform: uppercase; letter-spacing: 0.3px;
            }
            .mtn-past-badge {
                display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 8px;
                font-size: 10px; font-weight: 800; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;
            }
            .mtn-future-badge {
                display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 8px;
                font-size: 10px; font-weight: 800; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
            }
            .mtn-month-card.mtn-current-month {
                animation: mtnGlowActive 2s infinite ease-in-out !important;
                background: #ffffff !important;
                border-width: 2px !important;
            }
            .mtn-summary-card.mtn-current-quarter {
                border-color: #8b5cf6 !important;
                border-width: 2px !important;
                box-shadow: 0 0 16px rgba(139, 92, 246, 0.45) !important;
                background: #ffffff !important;
            }
            .mtn-quarter-block.mtn-current-quarter-block {
                border: 2px solid #8b5cf6 !important;
                box-shadow: 0 0 16px rgba(139, 92, 246, 0.25) !important;
            }

            /* Block 3: Variance & Completion (Fixed 115px - Single Horizontal Line Badges) */
            .mtn-block-cmp { margin: 6px 8px 8px; padding: 8px 10px; background: #f8fafc; border-radius: 12px; border: 1.2px solid #e2e8f0; display: flex; flex-direction: column; gap: 3px; height: 115px; box-sizing: border-box; justify-content: center; }
            .mtn-cmp-hdr { font-size: 10px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; }
            .mtn-cmp-row-surplus { font-size: 11px; font-weight: 800; color: #15803d; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac; padding: 2.5px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(22,163,74,0.12); width: fit-content; white-space: nowrap !important; }
            .mtn-cmp-row-deficit { font-size: 11px; font-weight: 800; color: #dc2626; background: linear-gradient(135deg, #fee2e2, #fecdd3); border: 1px solid #fca5a5; padding: 2.5px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(220,38,38,0.12); width: fit-content; white-space: nowrap !important; }
            .mtn-cmp-ord-surplus { font-size: 11px; font-weight: 800; color: #15803d; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac; padding: 2.5px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(22,163,74,0.12); width: fit-content; white-space: nowrap !important; }
            .mtn-cmp-ord-deficit { font-size: 11px; font-weight: 800; color: #dc2626; background: linear-gradient(135deg, #fee2e2, #fecdd3); border: 1px solid #fca5a5; padding: 2.5px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(220,38,38,0.12); width: fit-content; white-space: nowrap !important; }

            /* Quarters Layout Accordion */
            .mtn-container { padding: 0 36px; display: flex; flex-direction: column; gap: 20px; }
            .mtn-quarter-block { background: #fff; border-radius: 18px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.25s ease; }
            .mtn-quarter-block.collapsed .mtn-months-grid { display: none !important; }
            .mtn-quarter-hdr { padding: 16px 24px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; cursor: pointer; user-select: none; transition: background 0.2s; }
            .mtn-quarter-hdr:hover { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); }
            .mtn-quarter-block.collapsed .mtn-quarter-hdr { border-bottom: none; }
            .mtn-quarter-hdr h3 { margin: 0; font-size: 15px; font-weight: 900; color: #1e293b; display: flex; align-items: center; gap: 10px; }
            .mtn-quarter-badge { font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
            .mtn-q1-badge { background: #dbeafe; color: #1e40af; }
            .mtn-q2-badge { background: #dcfce7; color: #15803d; }
            .mtn-q3-badge { background: #f3e8ff; color: #6b21a8; }
            .mtn-q4-badge { background: #fce7f3; color: #9d174d; }

            .mtn-q-toggle-btn { font-size: 12px; font-weight: 800; color: #2563eb; background: #eff6ff; border: 1.2px solid #bfdbfe; padding: 6px 16px; border-radius: 20px; cursor: pointer; transition: all 0.2s; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(37,99,235,0.08); }
            .mtn-q-toggle-btn:hover { background: #dbeafe; color: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(37,99,235,0.15); }

            /* Months Grid inside Quarter */
            .mtn-months-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 20px; }
            @media(max-width: 900px) { .mtn-months-grid { grid-template-columns: 1fr; } }
            
            .mtn-month-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; transition: all 0.2s; }
            .mtn-month-card:hover { border-color: #93c5fd; box-shadow: 0 4px 12px rgba(59,130,246,0.1); background: #fff; }
            .mtn-month-title { font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .mtn-month-title .m-badge { font-size: 10px; font-weight: 800; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 6px; }

            .mtn-field-group { margin-bottom: 10px; }
            .mtn-field-group label { display: block; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
            .mtn-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 14px; font-weight: 900; font-family: inherit; color: #0f172a; outline: none; background: #fff; transition: all 0.2s; box-sizing: border-box; }
            .mtn-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
            .mtn-input:disabled { background: #ffffff !important; color: #0f172a !important; font-weight: 900 !important; font-size: 14px !important; border-color: #cbd5e1 !important; cursor: default !important; box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important; opacity: 1 !important; }

            .mtn-textarea { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12.5px; font-weight: 700; font-family: inherit; color: #1e293b; outline: none; background: #fff; transition: all 0.2s; box-sizing: border-box; resize: vertical; min-height: 52px; }
            .mtn-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
            .mtn-textarea:disabled { background: #ffffff !important; color: #1e293b !important; font-weight: 700 !important; border-color: #cbd5e1 !important; cursor: default !important; box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important; opacity: 1 !important; }

            .mtn-month-footer { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .mtn-lock-badge { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
            .mtn-lock-badge.locked { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .mtn-lock-badge.editing { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

            .mtn-btn-month-save { padding: 6px 14px; border-radius: 8px; border: none; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; font-family: inherit; box-shadow: 0 2px 8px rgba(22,163,74,0.25); }
            .mtn-btn-month-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(22,163,74,0.35); }
            .mtn-btn-month-edit { padding: 6px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #2563eb; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; font-family: inherit; }
            .mtn-btn-month-edit:hover { background: #eff6ff; border-color: #93c5fd; transform: translateY(-1px); }

            /* Actual vs Target Comparison Box */
            .mtn-actual-box { margin-top: 14px; padding: 12px 14px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1.5px solid #cbd5e1; border-radius: 12px; transition: all 0.2s; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02); }
            .mtn-actual-title { font-size: 11.5px; font-weight: 900; color: #0f172a; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
            .mtn-actual-row { font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; }
            .mtn-cmp-badge { font-size: 11px; font-weight: 900; padding: 3px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
            .mtn-cmp-badge.surplus { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .mtn-cmp-badge.deficit { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
            .mtn-cmp-badge.neutral { background: #e2e8f0; color: #475569; }

            .mtn-progress-bar-bg { width: 100%; height: 7px; background: #cbd5e1; border-radius: 4px; overflow: hidden; margin-top: 8px; }
            .mtn-progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
            .mtn-progress-bar-fill.surplus { background: linear-gradient(90deg, #10b981, #059669); }
            .mtn-progress-bar-fill.deficit { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }

            /* Executive KPI Summary Card Comparison Subtext */
            .mtn-summary-card .mtn-summary-act { font-size: 12px; font-weight: 800; color: #2563eb; margin-top: 4px; }
            .mtn-summary-card .mtn-summary-cmp { margin-top: 6px; }
        </style>`;

        var html = style + `
        <div class="mtn-page">
            <!-- Hero Header -->
            <div class="mtn-hero">
                <div class="mtn-hero-top">
                    <div class="mtn-hero-title">
                        <h2>🎯 MỤC TIÊU NĂM BẮT BỘ SỐ KINH DOANH</h2>
                        <div class="mtn-hero-sub">Thiết lập & Theo dõi chỉ tiêu chiến lược theo 12 Tháng & 4 Quý</div>
                    </div>
                    <!-- Category Tabs -->
                    <div class="mtn-tabs">
                        <button class="mtn-tab-btn ${window._mtnCategory === 'sale_kd' ? 'active' : ''}" onclick="_mtnSwitchTab('sale_kd')">📈 Mục Tiêu Sale/KD</button>
                        <button class="mtn-tab-btn ${window._mtnCategory === 'marketing' ? 'active' : ''}" onclick="_mtnSwitchTab('marketing')">📢 Mục Tiêu Marketing</button>
                        <button class="mtn-tab-btn ${window._mtnCategory === 'san_xuat' ? 'active' : ''}" onclick="_mtnSwitchTab('san_xuat')">🏭 Mục Tiêu Sản Xuất</button>
                    </div>
                </div>
            </div>

            <!-- Filter Card -->
            <div class="mtn-filter-card">
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                    <span style="font-size:13px;font-weight:800;color:#475569">📅 Chọn Năm:</span>
                    <select class="mtn-year-select" id="mtnYearSelect" onchange="_mtnChangeYear(this.value)">
                        <option value="2024" ${window._mtnYear === 2024 ? 'selected' : ''}>Năm 2024</option>
                        <option value="2025" ${window._mtnYear === 2025 ? 'selected' : ''}>Năm 2025</option>
                        <option value="2026" ${window._mtnYear === 2026 ? 'selected' : ''}>Năm 2026</option>
                        <option value="2027" ${window._mtnYear === 2027 ? 'selected' : ''}>Năm 2027</option>
                    </select>
                </div>

                <!-- Segment Filter Pills -->
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#f8fafc;padding:5px 12px;border-radius:14px;border:1px solid #e2e8f0">
                    <span style="font-size:12px;font-weight:800;color:#334155">🏷️ PHÂN KHÚC:</span>
                    <button type="button" class="mtn-seg-pill ${window._mtnSegment === 'all' ? 'active' : ''}" onclick="_mtnSwitchSegment('all')">🏢 Tất Cả (Cả 2 Lĩnh Vực)</button>
                    <button type="button" class="mtn-seg-pill ${window._mtnSegment === 'dong_phuc' ? 'active' : ''}" onclick="_mtnSwitchSegment('dong_phuc')">👔 Lĩnh Vực Đồng Phục</button>
                    <button type="button" class="mtn-seg-pill ${window._mtnSegment === 'tem_pet' ? 'active' : ''}" onclick="_mtnSwitchSegment('tem_pet')">🏷️ Lĩnh Vực TEM/PET</button>
                </div>

                ${window._mtnSegment === 'all' ? `
                    <button class="mtn-btn-save" disabled style="opacity:0.65;cursor:not-allowed;background:#64748b;box-shadow:none" title="Vui lòng chuyển sang Lĩnh Vực Đồng Phục hoặc TEM/PET để chỉnh sửa">
                        🔒 Tab Tất Cả (Tự Động Tính Target)
                    </button>
                ` : `
                    <button class="mtn-btn-save" onclick="_mtnSaveTargets()">
                        💾 Lưu Mục Tiêu Năm ${window._mtnYear}
                    </button>
                `}
            </div>

            <!-- Executive KPI Summary: 1 ROW OF 5 COMBINED CARDS -->
            <div class="mtn-summary-grid">
                <!-- Full Year -->
                <div class="mtn-summary-card full-year">
                    <div class="mtn-card-title">🏆 TỔNG NĂM ${window._mtnYear}</div>
                    <div class="mtn-block-target">
                        <div class="mtn-block-lbl">🎯 MỤC TIÊU:</div>
                        <div class="mtn-block-val" id="mtnSumYearRev">0 đ</div>
                        <div class="mtn-block-sub" id="mtnSumYearOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-actual">
                        <div class="mtn-block-lbl" style="color:#1e40af">📊 THỰC TẾ:</div>
                        <div class="mtn-act-val" id="mtnSumYearActRev">0 đ</div>
                        <div class="mtn-act-sub" id="mtnSumYearActOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-cmp" id="mtnSumYearCmp"></div>
                </div>

                <!-- Q1 -->
                <div class="${getQCardClass(1)}">
                    <div class="mtn-card-title">${getQTitle(1, 'QUÝ 1', 'THÁNG 1 - 3')}</div>
                    <div class="mtn-block-target">
                        <div class="mtn-block-lbl">🎯 MỤC TIÊU:</div>
                        <div class="mtn-block-val" id="mtnSumQ1Rev">0 đ</div>
                        <div class="mtn-block-sub" id="mtnSumQ1Orders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-actual">
                        <div class="mtn-block-lbl" style="color:#1e40af">📊 THỰC TẾ:</div>
                        <div class="mtn-act-val" id="mtnSumQ1ActRev">0 đ</div>
                        <div class="mtn-act-sub" id="mtnSumQ1ActOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-cmp" id="mtnSumQ1Cmp"></div>
                </div>

                <!-- Q2 -->
                <div class="${getQCardClass(2)}">
                    <div class="mtn-card-title">${getQTitle(2, 'QUÝ 2', 'THÁNG 4 - 6')}</div>
                    <div class="mtn-block-target">
                        <div class="mtn-block-lbl">🎯 MỤC TIÊU:</div>
                        <div class="mtn-block-val" id="mtnSumQ2Rev">0 đ</div>
                        <div class="mtn-block-sub" id="mtnSumQ2Orders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-actual">
                        <div class="mtn-block-lbl" style="color:#1e40af">📊 THỰC TẾ:</div>
                        <div class="mtn-act-val" id="mtnSumQ2ActRev">0 đ</div>
                        <div class="mtn-act-sub" id="mtnSumQ2ActOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-cmp" id="mtnSumQ2Cmp"></div>
                </div>

                <!-- Q3 -->
                <div class="${getQCardClass(3)}">
                    <div class="mtn-card-title">${getQTitle(3, 'QUÝ 3', 'THÁNG 7 - 9')}</div>
                    <div class="mtn-block-target">
                        <div class="mtn-block-lbl">🎯 MỤC TIÊU:</div>
                        <div class="mtn-block-val" id="mtnSumQ3Rev">0 đ</div>
                        <div class="mtn-block-sub" id="mtnSumQ3Orders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-actual">
                        <div class="mtn-block-lbl" style="color:#1e40af">📊 THỰC TẾ:</div>
                        <div class="mtn-act-val" id="mtnSumQ3ActRev">0 đ</div>
                        <div class="mtn-act-sub" id="mtnSumQ3ActOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-cmp" id="mtnSumQ3Cmp"></div>
                </div>

                <!-- Q4 -->
                <div class="${getQCardClass(4)}">
                    <div class="mtn-card-title">${getQTitle(4, 'QUÝ 4', 'THÁNG 10 - 12')}</div>
                    <div class="mtn-block-target">
                        <div class="mtn-block-lbl">🎯 MỤC TIÊU:</div>
                        <div class="mtn-block-val" id="mtnSumQ4Rev">0 đ</div>
                        <div class="mtn-block-sub" id="mtnSumQ4Orders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-actual">
                        <div class="mtn-block-lbl" style="color:#1e40af">📊 THỰC TẾ:</div>
                        <div class="mtn-act-val" id="mtnSumQ4ActRev">0 đ</div>
                        <div class="mtn-act-sub" id="mtnSumQ4ActOrders">📦 0 đơn</div>
                    </div>
                    <div class="mtn-block-cmp" id="mtnSumQ4Cmp"></div>
                </div>
            </div>

            <!-- Main Quarters Grid -->
            <div class="mtn-container" id="mtnQuartersContainer">
                <div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;font-weight:700">⏳ Đang tải dữ liệu mục tiêu năm...</div>
            </div>
        </div>`;

        container.innerHTML = html;
        await _mtnFetchAndRenderData();
    };

    // Fetch targets data from server
    async function _mtnFetchAndRenderData() {
        var container = document.getElementById('mtnQuartersContainer');
        if (!container) return;

        try {
            var res = await fetch(`/api/yearly-targets?year=${window._mtnYear}&category=${window._mtnCategory}&segment=${window._mtnSegment || 'all'}`, { credentials: 'include' });
            var data = await res.json();
            var targets = (data && data.targets) || [];

            window._mtnData = {};
            targets.forEach(function(t) {
                window._mtnData[t.month] = t;
            });

            _mtnRenderQuartersUI(container);
            _mtnRecalculateTotals();
        } catch(e) {
            console.error('Err fetch yearly targets:', e);
            if (container) container.innerHTML = `<div style="text-align:center;color:#ef4444;font-weight:800;padding:40px">❌ Lỗi tải dữ liệu: ${e.message}</div>`;
        }
    }

    // Toggle Quarter Accordion Expand/Collapse
    window._mtnToggleQuarter = function(qId) {
        var block = document.getElementById('mtnQBlock_' + qId);
        if (!block) return;
        var isCollapsed = block.classList.contains('collapsed');
        var btn = document.getElementById('mtnQToggleBtn_' + qId);
        if (isCollapsed) {
            block.classList.remove('collapsed');
            if (btn) btn.innerHTML = '▼ Thu Gọn Chi Tiết';
        } else {
            block.classList.add('collapsed');
            if (btn) btn.innerHTML = '▶️ Mở Xem 3 Tháng';
        }
    };

    // Format notes display for segment ALL tab
    function _mtnFormatNotesForDisplay(notes, month) {
        if (!notes) return '';
        var str = String(notes).trim();
        if (!str) return '';
        if (str.includes('|')) {
            var parts = str.split('|');
            var dpNote = (parts[0] || '').trim();
            var petNote = (parts[1] || '').trim();
            var out = [];
            if (dpNote) out.push('👔 Chiến Lược LV Đồng Phục - Tháng ' + month + ':\n' + dpNote);
            if (petNote) out.push('🏷️ Chiến Lược LV TEM/PET - Tháng ' + month + ':\n' + petNote);
            return out.join('\n\n');
        }
        if (!str.includes('Chiến Lược LV')) {
            return '👔 Chiến Lược LV Đồng Phục - Tháng ' + month + ':\n' + str;
        }
        return str;
    }

    // Render Quarters and Months UI
    function _mtnRenderQuartersUI(container) {
        var vnTime = _mtnGetVNTime();
        var selectedYr = Number(window._mtnYear);

        var quarters = [
            { id: 'q1', num: 1, name: 'QUÝ 1', months: [1, 2, 3], badgeClass: 'mtn-q1-badge' },
            { id: 'q2', num: 2, name: 'QUÝ 2', months: [4, 5, 6], badgeClass: 'mtn-q2-badge' },
            { id: 'q3', num: 3, name: 'QUÝ 3', months: [7, 8, 9], badgeClass: 'mtn-q3-badge' },
            { id: 'q4', num: 4, name: 'QUÝ 4', months: [10, 11, 12], badgeClass: 'mtn-q4-badge' }
        ];

        var categoryLabels = {
            'sale_kd': { revLabel: 'Mục tiêu Doanh số (VND)', orderLabel: 'Mục tiêu Số đơn hàng', revPlaceholder: 'Nhập số tiền...', orderPlaceholder: 'Nhập số lượng...' },
            'marketing': { revLabel: '📉 Mục tiêu % Chi phí / Doanh thu Ads (%) *', orderLabel: '🎯 Mục tiêu Giá / Đơn CPO (VND)', revPlaceholder: 'Ví dụ: 15%', orderPlaceholder: 'Ví dụ: 150.000 đ' },
            'san_xuat': { revLabel: 'Mục tiêu Giá trị Sản xuất (VND)', orderLabel: 'Mục tiêu Sản lượng (Bộ/Áo)', revPlaceholder: 'Nhập số tiền...', orderPlaceholder: 'Nhập số lượng...' }
        };
        var currentLabels = categoryLabels[window._mtnCategory] || categoryLabels['sale_kd'];

        var html = '';
        quarters.forEach(function(q) {
            var isCurrentQuarterHeader = (selectedYr === vnTime.year && q.num === vnTime.quarter);
            var isCollapsed = !isCurrentQuarterHeader;
            var qHeaderBadge = isCurrentQuarterHeader ? ` <span class="mtn-q-pulse-badge">⚡ QUÝ HIỆN TẠI</span>` : '';
            var qBlockClass = 'mtn-quarter-block' + (isCurrentQuarterHeader ? ' mtn-current-quarter-block' : '') + (isCollapsed ? ' collapsed' : '');

            html += `<div class="${qBlockClass}" id="mtnQBlock_${q.id}">
                <div class="mtn-quarter-hdr" onclick="_mtnToggleQuarter('${q.id}')">
                    <h3>
                        <span class="mtn-quarter-badge ${q.badgeClass}">${q.name}</span>
                        <span>Chi Tiết Chỉ Tiêu Các Tháng ${q.months.join(', ')}</span>
                        ${qHeaderBadge}
                    </h3>
                    <button type="button" class="mtn-q-toggle-btn" id="mtnQToggleBtn_${q.id}" onclick="event.stopPropagation(); _mtnToggleQuarter('${q.id}')">
                        ${isCollapsed ? '▶️ Mở Xem 3 Tháng' : '▼ Thu Gọn Chi Tiết'}
                    </button>
                </div>
                <div class="mtn-months-grid">`;

            q.months.forEach(function(m) {
                var mData = window._mtnData[m] || { target_revenue: 0, target_orders: 0, target_notes: '', is_locked: 0, actual_revenue: 0, actual_orders: 0, is_readonly: false };
                var isAllTab = window._mtnSegment === 'all';
                var isLocked = isAllTab || Number(mData.is_locked) === 1;

                var isCurrentMonth = (selectedYr === vnTime.year && m === vnTime.month);
                var isPastMonth = (selectedYr < vnTime.year || (selectedYr === vnTime.year && m < vnTime.month));

                var timeBadge = '';
                var monthCardClass = 'mtn-month-card';
                var monthIcon = '📅';

                if (isCurrentMonth) {
                    timeBadge = `<span class="mtn-now-pulse-badge">🟢 HIỆN TẠI</span>`;
                    monthCardClass += ' mtn-current-month';
                    monthIcon = '📍';
                } else if (isPastMonth) {
                    timeBadge = `<span class="mtn-past-badge">✅ Đã qua</span>`;
                } else {
                    timeBadge = `<span class="mtn-future-badge">⏳ Chưa đến</span>`;
                }

                var badgeText = '✏️ Chưa lưu';
                var badgeClass = 'editing';
                if (isAllTab) {
                    badgeText = '🔒 Tự động tính';
                    badgeClass = 'locked';
                } else if (isLocked) {
                    badgeText = '🔒 Đã lưu';
                    badgeClass = 'locked';
                }

                var displayNotes = isAllTab ? _mtnFormatNotesForDisplay(mData.target_notes, m) : (mData.target_notes || '');

                var inputsHtml = '';
                if (window._mtnCategory === 'marketing') {
                    inputsHtml = `
                    <div class="mtn-field-group">
                        <label>${currentLabels.orderLabel}</label>
                        <input class="mtn-input" type="number" step="any" id="mtnOrders_${m}" value="${mData.target_orders || ''}" placeholder="${isAllTab ? '' : currentLabels.orderPlaceholder}" oninput="_mtnRecalculateTotals()" ${isLocked ? 'disabled' : ''}>
                    </div>
                    <div class="mtn-field-group">
                        <label>${currentLabels.revLabel} *</label>
                        <input class="mtn-input" type="number" step="any" id="mtnRev_${m}" value="${mData.target_revenue || ''}" placeholder="${isAllTab ? '' : currentLabels.revPlaceholder}" oninput="_mtnRecalculateTotals()" ${isLocked ? 'disabled' : ''}>
                    </div>`;
                } else {
                    inputsHtml = `
                    <div class="mtn-field-group">
                        <label>${currentLabels.revLabel} *</label>
                        <input class="mtn-input" type="number" step="any" id="mtnRev_${m}" value="${mData.target_revenue || ''}" placeholder="${isAllTab ? '' : currentLabels.revPlaceholder}" oninput="_mtnRecalculateTotals()" ${isLocked ? 'disabled' : ''}>
                    </div>
                    <div class="mtn-field-group">
                        <label>${currentLabels.orderLabel}</label>
                        <input class="mtn-input" type="number" step="any" id="mtnOrders_${m}" value="${mData.target_orders || ''}" placeholder="${isAllTab ? '' : currentLabels.orderPlaceholder}" oninput="_mtnRecalculateTotals()" ${isLocked ? 'disabled' : ''}>
                    </div>`;
                }

                html += `
                <div class="${monthCardClass}">
                    <div class="mtn-month-title">
                        <span>${monthIcon} THÁNG ${m}/${window._mtnYear}</span>
                        <div style="display:flex;align-items:center;gap:6px">
                            ${timeBadge}
                            <span class="m-badge">T${m}</span>
                            <span class="mtn-lock-badge ${badgeClass}" id="mtnBadge_${m}">
                                ${badgeText}
                            </span>
                        </div>
                    </div>
                    ${inputsHtml}
                    <div class="mtn-field-group">
                        <label>📝 Ghi chú chiến lược tháng ${m}</label>
                        <textarea class="mtn-textarea" id="mtnNotes_${m}" rows="${isAllTab ? 5 : 2}" placeholder="${isAllTab ? '' : 'Nội dung kế hoạch/chỉ tiêu chi tiết...'}" ${isLocked ? 'disabled' : ''}>${displayNotes}</textarea>
                    </div>
                    <!-- Actual vs Target Comparison Box -->
                    <div class="mtn-actual-box" id="mtnActualBox_${m}"></div>

                    <div class="mtn-month-footer" id="mtnFooter_${m}">
                        ${isAllTab ? `
                            <span style="font-size:11px;color:#64748b;font-weight:700;display:flex;align-items:center;gap:4px">🔒 Tự động tổng hợp từ 2 Lĩnh Vực</span>
                        ` : (isLocked ? `
                            <span style="font-size:11px;color:#64748b;font-weight:600">Đã khóa chỉnh sửa</span>
                            <button class="mtn-btn-month-edit" onclick="_mtnUnlockMonth(${m})">✏️ Sửa</button>
                        ` : `
                            <span style="font-size:11px;color:#b45309;font-weight:600">Cho phép nhập</span>
                            <button class="mtn-btn-month-save" onclick="_mtnSaveMonth(${m})">💾 Lưu Tháng ${m}</button>
                        `)}
                    </div>
                </div>`;
            });

            html += `</div>
            </div>`;
        });

        container.innerHTML = html;
    }

    // Render single month actual vs target comparison box
    function _mtnRenderMonthActualBox(m) {
        var box = document.getElementById('mtnActualBox_' + m);
        if (!box) return;

        var mData = window._mtnData[m] || { target_revenue: 0, target_orders: 0, actual_revenue: 0, actual_orders: 0 };
        var revEl = document.getElementById('mtnRev_' + m);
        var ordEl = document.getElementById('mtnOrders_' + m);

        var targetRev = revEl ? (Number(revEl.value) || 0) : (Number(mData.target_revenue) || 0);
        var targetOrd = ordEl ? (Number(ordEl.value) || 0) : (Number(mData.target_orders) || 0);
        var actualRev = Number(mData.actual_revenue) || 0;
        var actualOrd = Number(mData.actual_orders) || 0;

        var isMkt = window._mtnCategory === 'marketing';

        var diffRev = actualRev - targetRev;
        var diffOrd = actualOrd - targetOrd;

        var pctRev = targetRev > 0 ? ((actualRev / targetRev) * 100) : 0;
        var pctOrd = targetOrd > 0 ? ((actualOrd / targetOrd) * 100) : 0;

        var actRevDisplay = isMkt ? (actualRev.toFixed(2) + '%') : formatVND(actualRev);
        var actOrdDisplay = isMkt ? (actualOrd > 0 ? formatVND(actualOrd) : '0 đ') : (formatNum(actualOrd) + ' đơn');

        var lblRev = isMkt ? '📉 % CP / Doanh Thu Ads:' : '💵 Doanh số thực tế:';
        var lblOrd = isMkt ? '🎯 Giá / Đơn (CPO):' : '📦 Số đơn thực tế:';

        var revBadge = '';
        if (targetRev > 0) {
            if (isMkt) {
                if (actualRev <= targetRev) {
                    revBadge = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Tối ưu: ${actualRev.toFixed(1)}% (Mục tiêu <= ${targetRev}%)</span>`;
                } else {
                    revBadge = `<span class="mtn-cmp-row-deficit">🚨 Vượt mốc: ${actualRev.toFixed(1)}% (Mục tiêu <= ${targetRev}%)</span>`;
                }
            } else {
                if (diffRev >= 0) {
                    revBadge = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Vượt: +${formatVND(diffRev)} (${pctRev.toFixed(1)}%)</span>`;
                } else {
                    revBadge = `<span class="mtn-cmp-row-deficit">🚨 Thiếu: -${formatVND(Math.abs(diffRev))} (${pctRev.toFixed(1)}%)</span>`;
                }
            }
        } else {
            revBadge = actualRev > 0 ? `<span class="mtn-cmp-badge neutral">Thực tế: ${actRevDisplay}</span>` : `<span class="mtn-cmp-badge neutral">Chưa phát sinh</span>`;
        }

        var ordBadge = '';
        if (targetOrd > 0) {
            if (isMkt) {
                if (actualOrd <= targetOrd) {
                    ordBadge = `<span class="mtn-cmp-ord-surplus"><span class="mtn-pulse-icon">🎯</span>Rẻ hơn chỉ tiêu (${formatVND(actualOrd)})</span>`;
                } else {
                    ordBadge = `<span class="mtn-cmp-ord-deficit">🎯 Cao hơn chỉ tiêu (${formatVND(actualOrd)})</span>`;
                }
            } else {
                if (diffOrd >= 0) {
                    ordBadge = `<span class="mtn-cmp-ord-surplus"><span class="mtn-pulse-icon">📦</span>Vượt: +${formatNum(diffOrd)} đơn (${pctOrd.toFixed(1)}%)</span>`;
                } else {
                    ordBadge = `<span class="mtn-cmp-ord-deficit">📦 Thiếu: -${formatNum(Math.abs(diffOrd))} đơn (${pctOrd.toFixed(1)}%)</span>`;
                }
            }
        } else {
            ordBadge = actualOrd > 0 ? `<span style="font-size:11px;font-weight:800;color:#475569">🎯 Thực tế: ${actOrdDisplay}</span>` : '';
        }

        var fillWidth = Math.min(Math.max(pctRev, 0), 100);
        var fillClass = isMkt ? (actualRev <= targetRev ? 'surplus' : 'deficit') : (diffRev >= 0 ? 'surplus' : 'deficit');

        if (isMkt) {
            var actualSpent = Number(mData.actual_spent || 0);
            var actualRevAds = Number(mData.actual_revenue_ads || 0);
            var actualOrdersAds = Number(mData.actual_orders_ads || 0);
            var actualLeads = Number(mData.actual_leads || 0);
            var actualCpl = Number(mData.actual_cpl || 0);

            box.innerHTML = `
                <div class="mtn-actual-title">
                    <span>📊 THỰC TẾ ĐẠT ĐƯỢC THÁNG ${m}</span>
                    <span style="font-size:10px;font-weight:900;color:${targetRev > 0 ? (actualRev <= targetRev ? '#15803d' : '#dc2626') : '#1e40af'}">${pctRev > 0 ? pctRev.toFixed(1) + '%' : '0.0%'}</span>
                </div>
                <div class="mtn-actual-row" style="margin-bottom:6px">
                    <span style="font-weight:700;color:#334155">${lblOrd} <strong style="color:#4338ca;font-weight:900;font-size:13.5px;background:#e0e7ff;padding:2px 8px;border-radius:6px;border:1px solid #c7d2fe;display:inline-block">${actOrdDisplay}</strong></span>
                    ${ordBadge}
                </div>
                <div class="mtn-actual-row">
                    <span style="font-weight:700;color:#334155">${lblRev} <strong style="color:#1d4ed8;font-weight:900;font-size:13.5px;background:#eff6ff;padding:2px 8px;border-radius:6px;border:1px solid #bfdbfe;display:inline-block">${actRevDisplay}</strong></span>
                    ${revBadge}
                </div>
                <div style="font-size:11px;color:#475569;font-weight:700;margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <span>📢 CP Ads: <strong style="color:#e11d48">${formatVND(actualSpent)}</strong></span>
                    <span>💵 DS Ads: <strong style="color:#16a34a">${formatVND(actualRevAds)}</strong></span>
                    <span>📦 Đơn: <strong style="color:#d97706">${actualOrdersAds} đơn</strong></span>
                    <span>📥 Lead: <strong style="color:#0284c7">${actualLeads} khách</strong></span>
                    ${actualCpl > 0 ? `<span>⚡ CPL: <strong style="color:#7c3aed">${formatVND(actualCpl)}</strong></span>` : ''}
                </div>
                ${targetRev > 0 ? `
                    <div class="mtn-progress-bar-bg" title="Đạt chỉ tiêu">
                        <div class="mtn-progress-bar-fill ${fillClass}" style="width: ${fillWidth}%"></div>
                    </div>
                ` : ''}
            `;
            return;
        }

        box.innerHTML = `
            <div class="mtn-actual-title">
                <span>📊 THỰC TẾ ĐẠT ĐƯỢC THÁNG ${m}</span>
                <span style="font-size:10px;font-weight:900;color:${diffRev >= 0 ? '#15803d' : '#dc2626'}">${pctRev > 0 ? pctRev.toFixed(1) + '%' : '0.0%'}</span>
            </div>
            <div class="mtn-actual-row" style="margin-bottom:6px">
                <span style="font-weight:700;color:#334155">${lblRev} <strong style="color:#1d4ed8;font-weight:900;font-size:13.5px;background:#eff6ff;padding:2px 8px;border-radius:6px;border:1px solid #bfdbfe;display:inline-block">${actRevDisplay}</strong></span>
                ${revBadge}
            </div>
            <div class="mtn-actual-row">
                <span style="font-weight:700;color:#334155">${lblOrd} <strong style="color:#4338ca;font-weight:900;font-size:13.5px;background:#e0e7ff;padding:2px 8px;border-radius:6px;border:1px solid #c7d2fe;display:inline-block">${actOrdDisplay}</strong></span>
                ${ordBadge}
            </div>
            ${targetRev > 0 ? `
                <div class="mtn-progress-bar-bg" title="Đạt chỉ tiêu">
                    <div class="mtn-progress-bar-fill ${fillClass}" style="width: ${fillWidth}%"></div>
                </div>
            ` : ''}
        `;
    }

    // Unlock a specific month for editing
    window._mtnUnlockMonth = function(m) {
        var revEl = document.getElementById('mtnRev_' + m);
        var ordEl = document.getElementById('mtnOrders_' + m);
        var noteEl = document.getElementById('mtnNotes_' + m);
        var badgeEl = document.getElementById('mtnBadge_' + m);
        var footerEl = document.getElementById('mtnFooter_' + m);

        if (revEl) revEl.disabled = false;
        if (ordEl) ordEl.disabled = false;
        if (noteEl) noteEl.disabled = false;

        if (badgeEl) {
            badgeEl.className = 'mtn-lock-badge editing';
            badgeEl.innerHTML = '✏️ Đang sửa';
        }

        if (footerEl) {
            footerEl.innerHTML = `
                <span style="font-size:11px;color:#b45309;font-weight:600">Đang cho phép sửa</span>
                <button class="mtn-btn-month-save" onclick="_mtnSaveMonth(${m})">💾 Lưu Tháng ${m}</button>
            `;
        }

        if (window._mtnData[m]) {
            window._mtnData[m].is_locked = 0;
        }

        if (revEl) revEl.focus();
    };

    // Save a specific single month
    window._mtnSaveMonth = async function(m) {
        var revEl = document.getElementById('mtnRev_' + m);
        var ordEl = document.getElementById('mtnOrders_' + m);
        var noteEl = document.getElementById('mtnNotes_' + m);

        var existingActRev = (window._mtnData[m] && window._mtnData[m].actual_revenue) || 0;
        var existingActOrd = (window._mtnData[m] && window._mtnData[m].actual_orders) || 0;

        var item = {
            month: m,
            target_revenue: revEl ? (Number(revEl.value) || 0) : 0,
            target_orders: ordEl ? (Number(ordEl.value) || 0) : 0,
            target_notes: noteEl ? (noteEl.value || '') : '',
            is_locked: 1,
            actual_revenue: existingActRev,
            actual_orders: existingActOrd
        };

        try {
            var res = await fetch('/api/yearly-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    year: window._mtnYear,
                    category: window._mtnCategory,
                    segment: window._mtnSegment || 'all',
                    items: [item]
                })
            });

            var data = await res.json();
            if (res.ok && data.success) {
                window._mtnData[m] = item;

                if (revEl) revEl.disabled = true;
                if (ordEl) ordEl.disabled = true;
                if (noteEl) noteEl.disabled = true;

                var badgeEl = document.getElementById('mtnBadge_' + m);
                var footerEl = document.getElementById('mtnFooter_' + m);

                if (badgeEl) {
                    badgeEl.className = 'mtn-lock-badge locked';
                    badgeEl.innerHTML = '🔒 Đã lưu';
                }

                if (footerEl) {
                    footerEl.innerHTML = `
                        <span style="font-size:11px;color:#64748b;font-weight:600">Đã khóa chỉnh sửa</span>
                        <button class="mtn-btn-month-edit" onclick="_mtnUnlockMonth(${m})">✏️ Sửa</button>
                    `;
                }

                _mtnRecalculateTotals();

                if (typeof showToast === 'function') {
                    showToast(`✅ Đã lưu thành công mục tiêu Tháng ${m}/${window._mtnYear}!`, 'success');
                } else {
                    alert(`✅ Đã lưu thành công mục tiêu Tháng ${m}/${window._mtnYear}!`);
                }
            } else {
                alert('❌ Lỗi lưu mục tiêu: ' + (data.error || 'Không xác định'));
            }
        } catch(e) {
            alert('❌ Lỗi kết nối máy chủ: ' + e.message);
        }
    };

    // Calculate totals across 12 months & 4 Quarters
    window._mtnRecalculateTotals = function() {
        var totalYearTargetRev = 0;
        var totalYearActualRev = 0;
        var totalYearTargetOrders = 0;
        var totalYearActualOrders = 0;

        var yearTotalSpent = 0;
        var yearTotalRevenueAds = 0;
        var yearTotalOrdersAds = 0;
        var yearTotalLeads = 0;

        var quarters = [
            { id: 'q1', months: [1, 2, 3] },
            { id: 'q2', months: [4, 5, 6] },
            { id: 'q3', months: [7, 8, 9] },
            { id: 'q4', months: [10, 11, 12] }
        ];

        quarters.forEach(function(q) {
            var qTargetRev = 0;
            var qActualRev = 0;
            var qTargetOrders = 0;
            var qActualOrders = 0;

            var qTotalSpent = 0;
            var qTotalRevenueAds = 0;
            var qTotalOrdersAds = 0;
            var qTotalLeads = 0;

            q.months.forEach(function(m) {
                // Update month comparison box
                _mtnRenderMonthActualBox(m);

                var revEl = document.getElementById('mtnRev_' + m);
                var ordEl = document.getElementById('mtnOrders_' + m);
                var mData = window._mtnData[m] || {};

                var revVal = revEl ? (Number(revEl.value) || 0) : (Number(mData.target_revenue) || 0);
                var ordVal = ordEl ? (Number(ordEl.value) || 0) : (Number(mData.target_orders) || 0);
                var actRev = Number(mData.actual_revenue) || 0;
                var actOrd = Number(mData.actual_orders) || 0;

                qTargetRev += revVal;
                qTargetOrders += ordVal;
                qActualRev += actRev;
                qActualOrders += actOrd;

                qTotalSpent += Number(mData.actual_spent || 0);
                qTotalRevenueAds += Number(mData.actual_revenue_ads || 0);
                qTotalOrdersAds += Number(mData.actual_orders_ads || 0);
                qTotalLeads += Number(mData.actual_leads || 0);
            });

            totalYearTargetRev += qTargetRev;
            totalYearTargetOrders += qTargetOrders;
            totalYearActualRev += qActualRev;
            totalYearActualOrders += qActualOrders;

            yearTotalSpent += qTotalSpent;
            yearTotalRevenueAds += qTotalRevenueAds;
            yearTotalOrdersAds += qTotalOrdersAds;
            yearTotalLeads += qTotalLeads;

            var isMkt = window._mtnCategory === 'marketing';

            // Phương án B: Weighted Real Totals for Marketing Quarter
            var qActualCpo = isMkt ? (qTotalOrdersAds > 0 ? Math.round(qTotalSpent / qTotalOrdersAds) : 0) : qActualOrders;
            var qActualCostRatio = isMkt ? (qTotalRevenueAds > 0 ? Math.round((qTotalSpent / qTotalRevenueAds) * 10000) / 100 : 0) : qActualRev;

            var targetCpoAvg = isMkt ? (qTargetOrders > 0 ? Math.round(qTargetOrders / 3) : 0) : qTargetOrders;
            var targetCostRatioAvg = isMkt ? (qTargetRev > 0 ? Math.round((qTargetRev / 3) * 100) / 100 : 0) : qTargetRev;

            var diffQRev = qActualCostRatio - targetCostRatioAvg;
            var diffQOrd = qActualCpo - targetCpoAvg;
            var pctQRev = targetCostRatioAvg > 0 ? ((qActualCostRatio / targetCostRatioAvg) * 100) : 0;
            var pctQOrd = targetCpoAvg > 0 ? ((qActualCpo / targetCpoAvg) * 100) : 0;

            // Update Header Quý
            var qHdrRev = document.getElementById('mtnQHeaderRev_' + q.id);
            var qHdrOrd = document.getElementById('mtnQHeaderOrders_' + q.id);
            if (qHdrRev) qHdrRev.textContent = isMkt ? ('CPO: ' + formatVND(targetCpoAvg)) : formatVND(qTargetRev);
            if (qHdrOrd) qHdrOrd.textContent = isMkt ? (targetCostRatioAvg > 0 ? targetCostRatioAvg.toFixed(1) + '%' : '0%') : (formatNum(qTargetOrders) + ' đơn');

            // Update Executive Summary Row 1 (Targets) & Row 2 (Actuals)
            var sumRev = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Rev');
            var sumOrd = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Orders');
            var sumActRev = document.getElementById('mtnSum' + q.id.toUpperCase() + 'ActRev');
            var sumActOrd = document.getElementById('mtnSum' + q.id.toUpperCase() + 'ActOrders');
            var sumCmp = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Cmp');

            if (sumRev) sumRev.textContent = isMkt ? ('🎯 CPO: ' + formatVND(targetCpoAvg)) : formatVND(qTargetRev);
            if (sumOrd) sumOrd.textContent = isMkt ? (targetCostRatioAvg > 0 ? targetCostRatioAvg.toFixed(1) + '%' : '0%') : ('📦 ' + formatNum(qTargetOrders) + ' đơn');
            if (sumActRev) sumActRev.textContent = isMkt ? ('🎯 CPO: ' + (qActualCpo > 0 ? formatVND(qActualCpo) : '0 đ')) : formatVND(qActualRev);
            if (sumActOrd) sumActOrd.textContent = isMkt ? (qActualCostRatio.toFixed(2) + '%') : ('📦 ' + formatNum(qActualOrders) + ' đơn');

            if (sumCmp) {
                var fillWidth = Math.min(Math.max(pctQRev, 0), 100);
                var fillClass = isMkt ? (qActualCostRatio <= targetCostRatioAvg ? 'surplus' : 'deficit') : (diffQRev >= 0 ? 'surplus' : 'deficit');

                var revBadgeText = '';
                if (targetCostRatioAvg > 0) {
                    if (isMkt) {
                        revBadgeText = qActualCostRatio <= targetCostRatioAvg ? `<span class="mtn-cmp-row-surplus">🔥 CP/DS: ${qActualCostRatio.toFixed(1)}%</span>` : `<span class="mtn-cmp-row-deficit">🚨 CP/DS: ${qActualCostRatio.toFixed(1)}%</span>`;
                    } else if (diffQRev >= 0) {
                        revBadgeText = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Vượt: +${formatVND(diffQRev)} (${pctQRev.toFixed(1)}%)</span>`;
                    } else {
                        revBadgeText = `<span class="mtn-cmp-row-deficit">🚨 Thiếu: -${formatVND(Math.abs(diffQRev))} (${pctQRev.toFixed(1)}%)</span>`;
                    }
                } else {
                    revBadgeText = qActualCostRatio > 0 ? `<span class="mtn-cmp-badge neutral">Thực tế: ${isMkt ? qActualCostRatio.toFixed(2) + '%' : formatVND(qActualRev)}</span>` : `<span class="mtn-cmp-badge neutral">Chưa phát sinh</span>`;
                }

                var ordBadgeText = '';
                if (targetCpoAvg > 0) {
                    if (isMkt) {
                        ordBadgeText = `<span class="mtn-cmp-ord-surplus">🎯 CPO Quý: ${formatVND(qActualCpo)}</span>`;
                    } else if (diffQOrd >= 0) {
                        ordBadgeText = `<span class="mtn-cmp-ord-surplus"><span class="mtn-pulse-icon">📦</span>Vượt: +${formatNum(diffQOrd)} đơn (${pctQOrd.toFixed(1)}%)</span>`;
                    } else {
                        ordBadgeText = `<span class="mtn-cmp-ord-deficit">📦 Thiếu: -${formatNum(Math.abs(diffQOrd))} đơn (${pctQOrd.toFixed(1)}%)</span>`;
                    }
                } else {
                    ordBadgeText = qActualCpo > 0 ? `<span style="font-size:11px;font-weight:800;color:#475569">${isMkt ? '🎯 CPO Quý: ' + formatVND(qActualCpo) : '📦 Thực tế: ' + formatNum(qActualOrders) + ' đơn'}</span>` : '';
                }

                sumCmp.innerHTML = `
                    <div class="mtn-cmp-hdr">
                        <span>⚖️ TỶ LỆ HOÀN THÀNH</span>
                        <span style="font-size:10px;font-weight:900;color:${(isMkt ? qActualCostRatio <= targetCostRatioAvg : diffQRev >= 0) ? '#15803d' : '#dc2626'}">${pctQRev > 0 ? pctQRev.toFixed(1) + '%' : '0.0%'}</span>
                    </div>
                    <div>${isMkt ? ordBadgeText : revBadgeText}</div>
                    <div style="margin-top:2px">${isMkt ? revBadgeText : ordBadgeText}</div>
                    ${targetCostRatioAvg > 0 ? `<div class="mtn-progress-bar-bg" title="Đạt chỉ tiêu"><div class="mtn-progress-bar-fill ${fillClass}" style="width:${fillWidth}%"></div></div>` : ''}
                `;
            }
        });

        // Update Full Year Executive Row Panels
        var isMktYr = window._mtnCategory === 'marketing';
        var yearActualCpo = isMktYr ? (yearTotalOrdersAds > 0 ? Math.round(yearTotalSpent / yearTotalOrdersAds) : 0) : totalYearActualOrders;
        var yearActualCostRatio = isMktYr ? (yearTotalRevenueAds > 0 ? Math.round((yearTotalSpent / yearTotalRevenueAds) * 10000) / 100 : 0) : totalYearActualRev;

        var yearTargetCpoAvg = isMktYr ? (totalYearTargetOrders > 0 ? Math.round(totalYearTargetOrders / 12) : 0) : totalYearTargetOrders;
        var yearTargetCostRatioAvg = isMktYr ? (totalYearTargetRev > 0 ? Math.round((totalYearTargetRev / 12) * 100) / 100 : 0) : totalYearTargetRev;

        var diffYrRev = yearActualCostRatio - yearTargetCostRatioAvg;
        var diffYrOrd = yearActualCpo - yearTargetCpoAvg;
        var pctYrRev = yearTargetCostRatioAvg > 0 ? ((yearActualCostRatio / yearTargetCostRatioAvg) * 100) : 0;
        var pctYrOrd = yearTargetCpoAvg > 0 ? ((yearActualCpo / yearTargetCpoAvg) * 100) : 0;

        var yrRev = document.getElementById('mtnSumYearRev');
        var yrOrd = document.getElementById('mtnSumYearOrders');
        var yrActRev = document.getElementById('mtnSumYearActRev');
        var yrActOrd = document.getElementById('mtnSumYearActOrders');
        var yrCmp = document.getElementById('mtnSumYearCmp');

        if (yrRev) yrRev.textContent = isMktYr ? ('🎯 CPO: ' + formatVND(yearTargetCpoAvg)) : formatVND(totalYearTargetRev);
        if (yrOrd) yrOrd.textContent = isMktYr ? (yearTargetCostRatioAvg > 0 ? yearTargetCostRatioAvg.toFixed(1) + '%' : '0%') : ('📦 ' + formatNum(totalYearTargetOrders) + ' đơn');
        if (yrActRev) yrActRev.textContent = isMktYr ? ('🎯 CPO: ' + (yearActualCpo > 0 ? formatVND(yearActualCpo) : '0 đ')) : formatVND(totalYearActualRev);
        if (yrActOrd) yrActOrd.textContent = isMktYr ? (yearActualCostRatio.toFixed(2) + '%') : ('📦 ' + formatNum(totalYearActualOrders) + ' đơn');

        if (yrCmp) {
            var fillWidthYr = Math.min(Math.max(pctYrRev, 0), 100);
            var fillClassYr = isMktYr ? (totalYearActualRev <= totalYearTargetRev ? 'surplus' : 'deficit') : (diffYrRev >= 0 ? 'surplus' : 'deficit');

            var revBadgeTextYr = '';
            if (totalYearTargetRev > 0) {
                if (isMktYr) {
                    revBadgeTextYr = totalYearActualRev <= totalYearTargetRev ? `<span class="mtn-cmp-row-surplus">🔥 TB: ${(totalYearActualRev / 12).toFixed(1)}%</span>` : `<span class="mtn-cmp-row-deficit">🚨 TB: ${(totalYearActualRev / 12).toFixed(1)}%</span>`;
                } else if (diffYrRev >= 0) {
                    revBadgeTextYr = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Vượt: +${formatVND(diffYrRev)} (${pctYrRev.toFixed(1)}%)</span>`;
                } else {
                    revBadgeTextYr = `<span class="mtn-cmp-row-deficit">🚨 Thiếu: -${formatVND(Math.abs(diffYrRev))} (${pctYrRev.toFixed(1)}%)</span>`;
                }
            } else {
                revBadgeTextYr = totalYearActualRev > 0 ? `<span class="mtn-cmp-badge neutral">Thực tế: ${isMktYr ? (totalYearActualRev / 12).toFixed(2) + '%' : formatVND(totalYearActualRev)}</span>` : `<span class="mtn-cmp-badge neutral">Chưa phát sinh</span>`;
            }

            var ordBadgeTextYr = '';
            if (totalYearTargetOrders > 0) {
                if (isMktYr) {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-surplus">🎯 CPO TB: ${formatVND(Math.round(totalYearActualOrders / 12))}</span>`;
                } else if (diffYrOrd >= 0) {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-surplus"><span class="mtn-pulse-icon">📦</span>Vượt: +${formatNum(diffYrOrd)} đơn (${pctYrOrd.toFixed(1)}%)</span>`;
                } else {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-deficit">📦 Thiếu: -${formatNum(Math.abs(diffYrOrd))} đơn (${pctYrOrd.toFixed(1)}%)</span>`;
                }
            } else {
                ordBadgeTextYr = totalYearActualOrders > 0 ? `<span style="font-size:11px;font-weight:800;color:#475569">${isMktYr ? '🎯 CPO TB: ' + formatVND(Math.round(totalYearActualOrders / 12)) : '📦 Thực tế: ' + formatNum(totalYearActualOrders) + ' đơn'}</span>` : '';
            }

            yrCmp.innerHTML = `
                <div class="mtn-cmp-hdr">
                    <span>⚖️ TỶ LỆ HOÀN THÀNH</span>
                    <span style="font-size:10px;font-weight:900;color:${(isMktYr ? totalYearActualRev <= totalYearTargetRev : diffYrRev >= 0) ? '#15803d' : '#dc2626'}">${pctYrRev > 0 ? pctYrRev.toFixed(1) + '%' : '0.0%'}</span>
                </div>
                <div>${revBadgeTextYr}</div>
                <div style="margin-top:2px">${ordBadgeTextYr}</div>
                ${totalYearTargetRev > 0 ? `<div class="mtn-progress-bar-bg" title="Đạt chỉ tiêu cả năm"><div class="mtn-progress-bar-fill ${fillClassYr}" style="width:${fillWidthYr}%"></div></div>` : ''}
            `;
        }
    };

    // Switch Category Tab
    window._mtnSwitchTab = function(category) {
        window._mtnCategory = category;
        var page = document.querySelector('.mtn-page');
        if (page && page.parentElement) {
            renderMucTieuNamPage(page.parentElement);
        }
    };

    // Switch Segment Tab
    window._mtnSwitchSegment = function(segment) {
        window._mtnSegment = segment;
        var page = document.querySelector('.mtn-page');
        if (page && page.parentElement) {
            renderMucTieuNamPage(page.parentElement);
        }
    };

    // Switch Year Filter
    window._mtnChangeYear = function(year) {
        window._mtnYear = Number(year);
        var page = document.querySelector('.mtn-page');
        if (page && page.parentElement) {
            renderMucTieuNamPage(page.parentElement);
        }
    };

    // Save all targets for the full year
    window._mtnSaveTargets = async function() {
        var items = [];
        for (var m = 1; m <= 12; m++) {
            var revEl = document.getElementById('mtnRev_' + m);
            var ordEl = document.getElementById('mtnOrders_' + m);
            var noteEl = document.getElementById('mtnNotes_' + m);

            items.push({
                month: m,
                target_revenue: revEl ? (Number(revEl.value) || 0) : 0,
                target_orders: ordEl ? (Number(ordEl.value) || 0) : 0,
                target_notes: noteEl ? (noteEl.value || '') : '',
                is_locked: 1
            });
        }

        try {
            var res = await fetch('/api/yearly-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    year: window._mtnYear,
                    category: window._mtnCategory,
                    segment: window._mtnSegment || 'all',
                    items: items
                })
            });

            var data = await res.json();
            if (res.ok && data.success) {
                items.forEach(function(item) {
                    window._mtnData[item.month] = item;
                    var revEl = document.getElementById('mtnRev_' + item.month);
                    var ordEl = document.getElementById('mtnOrders_' + item.month);
                    var noteEl = document.getElementById('mtnNotes_' + item.month);
                    if (revEl) revEl.disabled = true;
                    if (ordEl) ordEl.disabled = true;
                    if (noteEl) noteEl.disabled = true;

                    var badgeEl = document.getElementById('mtnBadge_' + item.month);
                    var footerEl = document.getElementById('mtnFooter_' + item.month);
                    if (badgeEl) {
                        badgeEl.className = 'mtn-lock-badge locked';
                        badgeEl.innerHTML = '🔒 Đã lưu';
                    }
                    if (footerEl) {
                        footerEl.innerHTML = `
                            <span style="font-size:11px;color:#64748b;font-weight:600">Đã khóa chỉnh sửa</span>
                            <button class="mtn-btn-month-edit" onclick="_mtnUnlockMonth(${item.month})">✏️ Sửa</button>
                        `;
                    }
                });

                _mtnRecalculateTotals();
                alert(`✅ Đã lưu thành công Mục Tiêu Năm ${window._mtnYear} cho danh mục!`);
            } else {
                alert('❌ Lỗi lưu mục tiêu: ' + (data.error || 'Không xác định'));
            }
        } catch(e) {
            alert('❌ Lỗi kết nối máy chủ: ' + e.message);
        }
    };

})();
