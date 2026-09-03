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
                    <button class="mtn-btn-save" style="background:linear-gradient(135deg,#2563eb,#1e40af);box-shadow:0 4px 16px rgba(37,99,235,0.35)" onclick="_mtnOpenConfigWizard()">
                        ⚙️ Thiết Lập Cấu Hình Mục Tiêu Top-Down
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

            <!-- ====== WIZARD MODAL CẤU HÌNH MỤC TIÊU TOP-DOWN ====== -->
            <div id="mtnWizardOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
                <style>
                    #mtnWizardOverlay,
                    #mtnWizardOverlay button,
                    #mtnWizardOverlay input,
                    #mtnWizardOverlay textarea,
                    #mtnWizardOverlay label,
                    #mtnWizardOverlay span,
                    #mtnWizardOverlay th,
                    #mtnWizardOverlay td,
                    #mtnWizardOverlay div,
                    #mtnWizardOverlay b,
                    #mtnWizardOverlay strong {
                        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }
                </style>
                <div style="background:#ffffff; width:100%; max-width:720px; border-radius:18px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; font-family:'Plus Jakarta Sans','Inter',sans-serif;">
                    <!-- Header -->
                    <div style="background:linear-gradient(135deg,#1e293b,#0f172a); color:#ffffff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
                        <div id="mtnWizardTitle" style="font-size:15px; font-weight:900; letter-spacing:.2px;">⚙️ Cấu Hình Mục Tiêu Top-Down</div>
                        <button onclick="window._mtnCloseConfigWizard()" style="background:none; border:none; color:#94a3b8; font-size:20px; font-weight:900; cursor:pointer; line-height:1;">✕</button>
                    </div>
                    <!-- Wizard Tabs -->
                    <div style="display:flex; background:#0f172a; border-bottom:1.5px solid #334155; padding:6px 12px; gap:6px; flex-wrap:wrap;">
                        <button type="button" id="mtnWizTab1" onclick="window._mtnSetWizardStep(1)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#38bdf8; color:#0f172a;">1. 🎯 Cấu Hình Cả Năm</button>
                        <button type="button" id="mtnWizTab2" onclick="window._mtnSetWizardStep(2)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#334155; color:#94a3b8;">2. 📊 Phân Bổ 4 Quý</button>
                        <button type="button" id="mtnWizTab3" onclick="window._mtnSetWizardStep(3)" style="flex:1; padding:8px 10px; border-radius:8px; border:none; font-size:12px; font-weight:900; cursor:pointer; transition:all 0.2s; background:#334155; color:#94a3b8;">3. 📅 Phân Bổ 12 Tháng</button>
                    </div>
                    <!-- Body -->
                    <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
                        <!-- STEP 1 -->
                        <div id="mtnWizStep1" style="display:flex; flex-direction:column; gap:14px;">
                            <div id="mtnWizBenchmarkYear" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Số Liệu Thực Tế Năm Trước:</div>
                                <div id="mtnWizBenchmarkYearContent" style="font-size:12px; font-weight:700; color:#15803d;">⏳ Đang tải...</div>
                            </div>
                            <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:12px;">🎯 Tùy Chỉnh Mục Tiêu TỔNG Cả Năm ${window._mtnYear}:</label>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <label id="mtnWizYearRevLabel" style="font-size:12.5px; font-weight:800; color:#0284c7; min-width:200px;">Mục Tiêu Doanh Số (VND):</label>
                                        <input type="number" id="mtnWizYearRev" min="0" placeholder="Ví dụ: 4500000000" style="flex:1; padding:8px 12px; border:1.5px solid #bae6fd; border-radius:8px; font-size:14px; font-weight:900; color:#0284c7; text-align:center; max-width:220px;" oninput="window._mtnWizRecalcYear()">
                                    </div>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <label id="mtnWizYearOrdLabel" style="font-size:12.5px; font-weight:800; color:#b45309; min-width:200px;">Mục Tiêu Số Đơn Hàng:</label>
                                        <input type="number" id="mtnWizYearOrd" min="0" placeholder="Ví dụ: 8000" style="flex:1; padding:8px 12px; border:1.5px solid #fde68a; border-radius:8px; font-size:14px; font-weight:900; color:#b45309; text-align:center; max-width:220px;" oninput="window._mtnWizRecalcYear()">
                                    </div>
                                </div>
                            </div>
                            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; padding:12px; border-radius:12px;">
                                <label style="font-size:12.5px; font-weight:900; color:#0f172a; display:block; margin-bottom:6px;">📝 Ghi Chú Chiến Lược Cả Năm (tuỳ chọn):</label>
                                <textarea id="mtnWizYearNotes" rows="3" placeholder="Chiến lược, trọng tâm kinh doanh cả năm..." style="width:100%; padding:8px 12px; border-radius:8px; border:1.5px solid #cbd5e1; font-size:12.5px; font-weight:700; color:#1e293b; resize:vertical; box-sizing:border-box;"></textarea>
                            </div>
                        </div>
                        <!-- STEP 2 -->
                        <div id="mtnWizStep2" style="display:none; flex-direction:column; gap:14px;">
                            <div id="mtnWizBenchmarkQ" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Tỷ Trọng 4 Quý Năm Trước:</div>
                                <div id="mtnWizBenchmarkQContent" style="font-size:12px; font-weight:700; color:#15803d;">⏳ Đang tải...</div>
                            </div>
                            <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:8px;">⚙️ Lựa Chọn Phương Thức Phân Bổ Cho 4 Quý:</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizQMethod" value="equal" checked onchange="window._mtnWizApplyQMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>🔹 <b>Chia đều Năm</b> (25% mỗi Quý)</span></label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizQMethod" value="growth" onchange="window._mtnWizApplyQMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>📈 <b>Theo tỷ trọng năm trước</b></span></label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizQMethod" value="custom" onchange="window._mtnWizApplyQMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>✏️ <b>Tự điền chỉ tiêu từng Quý</b></span></label>
                                </div>
                            </div>
                            <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:10px;">📊 Bảng Chỉ Tiêu Chi Tiết 4 Quý:</label>
                                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                    <thead style="background:#0f172a; color:#ffffff;"><tr>
                                        <th style="padding:8px 10px; text-align:left;">Quý</th>
                                        <th id="mtnWizQRevTh" style="padding:8px 10px; text-align:center; color:#38bdf8;">Doanh Số (VND)</th>
                                        <th id="mtnWizQOrdTh" style="padding:8px 10px; text-align:center; color:#fbbf24;">Số Đơn</th>
                                    </tr></thead>
                                    <tbody>
                                        <tr><td style="padding:8px 10px; font-weight:800;">Quý 1</td><td style="text-align:center;"><input type="number" id="mtnWizQ1Rev" class="mtn-wiz-q-rev" min="0" style="width:140px; padding:6px 10px; border:1.5px solid #bae6fd; border-radius:8px; font-size:13px; font-weight:900; color:#0284c7; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'revenue')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td><td style="text-align:center;"><input type="number" id="mtnWizQ1Ord" class="mtn-wiz-q-ord" min="0" style="width:100px; padding:6px 10px; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:900; color:#b45309; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'orders')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td></tr>
                                        <tr><td style="padding:8px 10px; font-weight:800;">Quý 2</td><td style="text-align:center;"><input type="number" id="mtnWizQ2Rev" class="mtn-wiz-q-rev" min="0" style="width:140px; padding:6px 10px; border:1.5px solid #bae6fd; border-radius:8px; font-size:13px; font-weight:900; color:#0284c7; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'revenue')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td><td style="text-align:center;"><input type="number" id="mtnWizQ2Ord" class="mtn-wiz-q-ord" min="0" style="width:100px; padding:6px 10px; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:900; color:#b45309; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'orders')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td></tr>
                                        <tr><td style="padding:8px 10px; font-weight:800;">Quý 3</td><td style="text-align:center;"><input type="number" id="mtnWizQ3Rev" class="mtn-wiz-q-rev" min="0" style="width:140px; padding:6px 10px; border:1.5px solid #bae6fd; border-radius:8px; font-size:13px; font-weight:900; color:#0284c7; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'revenue')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td><td style="text-align:center;"><input type="number" id="mtnWizQ3Ord" class="mtn-wiz-q-ord" min="0" style="width:100px; padding:6px 10px; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:900; color:#b45309; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'orders')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td></tr>
                                        <tr><td style="padding:8px 10px; font-weight:800;">Quý 4</td><td style="text-align:center;"><input type="number" id="mtnWizQ4Rev" class="mtn-wiz-q-rev" min="0" style="width:140px; padding:6px 10px; border:1.5px solid #bae6fd; border-radius:8px; font-size:13px; font-weight:900; color:#0284c7; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'revenue')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td><td style="text-align:center;"><input type="number" id="mtnWizQ4Ord" class="mtn-wiz-q-ord" min="0" style="width:100px; padding:6px 10px; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:900; color:#b45309; text-align:center;" oninput="window._mtnWizUpdateQTotals()" onfocus="window._mtnShowSmartHintQ(this, 'orders')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td></tr>
                                    </tbody>
                                    <tfoot style="font-weight:900; font-size:12px;">
                                        <tr style="background:#f1f5f9;"><td style="padding:8px 10px; font-weight:900; color:#0f172a; border-top:2px solid #cbd5e1;">TỔNG</td><td id="mtnWizQTotalRev" style="padding:8px; text-align:center; color:#0284c7; font-weight:900; border-top:2px solid #cbd5e1;">0</td><td id="mtnWizQTotalOrd" style="padding:8px; text-align:center; color:#b45309; font-weight:900; border-top:2px solid #cbd5e1;">0</td></tr>
                                        <tr style="background:#e0f2fe;"><td style="padding:6px 10px; font-weight:800; color:#0369a1;">🎯 NĂM</td><td id="mtnWizQYearRefRev" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td><td id="mtnWizQYearRefOrd" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td></tr>
                                        <tr style="background:#fef9c3;"><td style="padding:6px 10px; font-weight:800; color:#92400e;">⚖️ CHÊNH LỆCH</td><td id="mtnWizQDiffRev" style="padding:6px; text-align:center; font-weight:800;">—</td><td id="mtnWizQDiffOrd" style="padding:6px; text-align:center; font-weight:800;">—</td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <!-- STEP 3 -->
                        <div id="mtnWizStep3" style="display:none; flex-direction:column; gap:14px;">
                            <div id="mtnWizBenchmarkM" style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px;">
                                <div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:4px;">💡 Gợi Ý Số Liệu 12 Tháng Năm Trước:</div>
                                <div id="mtnWizBenchmarkMContent" style="font-size:12px; font-weight:700; color:#15803d; overflow-x:auto;">⏳ Đang tải...</div>
                            </div>
                            <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:8px;">⚙️ Lựa Chọn Phương Thức Phân Bổ Cho 12 Tháng:</label>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizMMethod" value="equal" checked onchange="window._mtnWizApplyMMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>🔹 <b>Chia đều Quý</b> (33.3%/Tháng trong Quý)</span></label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizMMethod" value="growth" onchange="window._mtnWizApplyMMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>📈 <b>Theo tỷ lệ tháng năm trước</b></span></label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:700; color:#1e293b;"><input type="radio" name="mtnWizMMethod" value="custom" onchange="window._mtnWizApplyMMethod()" style="accent-color:#2563eb; transform:scale(1.15);"><span>✏️ <b>Tự điền chỉ tiêu từng Tháng</b></span></label>
                                </div>
                            </div>
                            <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px; max-height:340px; overflow-y:auto;">
                                <label style="font-size:13px; font-weight:900; color:#0f172a; display:block; margin-bottom:10px;">📊 Bảng Chỉ Tiêu Chi Tiết 12 Tháng (Năm ${window._mtnYear}):</label>
                                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                    <thead style="background:#0f172a; color:#ffffff; position:sticky; top:0; z-index:2;"><tr>
                                        <th style="padding:8px 10px; text-align:left;">Tháng</th>
                                        <th id="mtnWizMRevTh" style="padding:8px 10px; text-align:center; color:#38bdf8;">Doanh Số (VND)</th>
                                        <th id="mtnWizMOrdTh" style="padding:8px 10px; text-align:center; color:#fbbf24;">Số Đơn</th>
                                    </tr></thead>
                                    <tbody id="mtnWizMonthsTableBody"></tbody>
                                    <tfoot style="font-weight:900; font-size:12px;">
                                        <tr style="background:#f1f5f9;"><td style="padding:8px 10px; font-weight:900; color:#0f172a; border-top:2px solid #cbd5e1;">TỔNG</td><td id="mtnWizMTotalRev" style="padding:8px; text-align:center; color:#0284c7; font-weight:900; border-top:2px solid #cbd5e1;">0</td><td id="mtnWizMTotalOrd" style="padding:8px; text-align:center; color:#b45309; font-weight:900; border-top:2px solid #cbd5e1;">0</td></tr>
                                        <tr style="background:#e0f2fe;"><td style="padding:6px 10px; font-weight:800; color:#0369a1;">🎯 NĂM</td><td id="mtnWizMYearRefRev" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td><td id="mtnWizMYearRefOrd" style="padding:6px; text-align:center; color:#0369a1; font-weight:800;">0</td></tr>
                                        <tr style="background:#fef9c3;"><td style="padding:6px 10px; font-weight:800; color:#92400e;">⚖️ CHÊNH LỆCH</td><td id="mtnWizMDiffRev" style="padding:6px; text-align:center; font-weight:800;">—</td><td id="mtnWizMDiffOrd" style="padding:6px; text-align:center; font-weight:800;">—</td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                    <!-- Footer -->
                    <div style="background:#f8fafc; padding:12px 20px; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" onclick="window._mtnCloseConfigWizard()" style="padding:9px 16px; background:#ffffff; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer;">Hủy / Đóng</button>
                            <span id="mtnWizLockBadge" style="display:none; font-size:12px; font-weight:900; color:#dc2626; background:#fef2f2; border:1.5px solid #fca5a5; padding:5px 12px; border-radius:8px;">🔒 ĐÃ KHÓA CẤU HÌNH</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" id="mtnWizEditBtn" onclick="window._mtnWizEnableEdit()" style="display:none; padding:9px 18px; background:linear-gradient(135deg,#d97706,#b45309); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(217,119,6,0.35);">✏️ Mở Chỉnh Sửa Cấu Hình (Giám Đốc)</button>
                            <button type="button" id="mtnWizPrevBtn" onclick="window._mtnWizPrevStep()" style="display:none; padding:9px 16px; background:#f1f5f9; color:#334155; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer;">⬅ Quay Lại</button>
                            <button type="button" id="mtnWizNextBtn" onclick="window._mtnWizNextStep()" style="padding:9px 20px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.35);">Tiếp Theo: Phân Bổ Quý ➔</button>
                            <button type="button" id="mtnWizSaveBtn" onclick="window._mtnWizSaveConfig()" style="display:none; padding:9px 22px; background:linear-gradient(135deg,#16a34a,#15803d); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(22,163,74,0.35);">💾 Lưu Cấu Hình</button>
                        </div>
                    </div>
                </div>
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

    // Helper to extract clean user note string from metadata JSON if present
    function _mtnCleanNotesText(rawNotes) {
        if (!rawNotes) return '';
        var str = String(rawNotes).trim();
        if (!str) return '';
        if (str.startsWith('{') && str.endsWith('}')) {
            try {
                var parsed = JSON.parse(str);
                if (parsed && typeof parsed === 'object') {
                    return parsed.notes !== undefined ? String(parsed.notes).trim() : '';
                }
            } catch(e) {}
        }
        return str;
    }

    // Format notes display for segment ALL tab
    function _mtnFormatNotesForDisplay(notes, month) {
        var str = _mtnCleanNotesText(notes);
        if (!str) return '';
        if (str.includes('|')) {
            var parts = str.split('|');
            var dpNote = _mtnCleanNotesText(parts[0]);
            var petNote = _mtnCleanNotesText(parts[1]);
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
                var monthIcon = '🗓️';

                if (isCurrentMonth) {
                    timeBadge = `<span class="mtn-current-badge">🔥 HIỆN TẠI</span>`;
                    monthCardClass += ' mtn-current-month-card';
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

                var displayNotes = isAllTab ? _mtnFormatNotesForDisplay(mData.target_notes, m) : _mtnCleanNotesText(mData.target_notes);

                var isDirector = _mtnIsDirector();
                var noteEditBtnHtml = (isDirector && !isAllTab) ? `
                    <button type="button" id="mtnNoteEditBtn_${m}" data-editing="false" onclick="window._mtnToggleMonthStrategyNote(${m})" style="padding:3px 10px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer; font-family:inherit; transition:all 0.2s;">✏️ Sửa chiến lược</button>
                ` : '';

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
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="margin:0; font-size:12.5px; font-weight:800; color:#1e293b;">📝 Chiến lược tháng ${m}</label>
                            ${noteEditBtnHtml}
                        </div>
                        <textarea class="mtn-textarea" id="mtnNotes_${m}" rows="${isAllTab ? 5 : 2}" placeholder="${isAllTab ? '' : 'Nội dung kế hoạch/chỉ tiêu chi tiết...'}" disabled>${displayNotes}</textarea>
                    </div>
                    <!-- Actual vs Target Comparison Box -->
                    <div class="mtn-actual-box" id="mtnActualBox_${m}"></div>

                    <div class="mtn-month-footer" id="mtnFooter_${m}">
                        ${isAllTab ? `
                            <span style="font-size:11px;color:#64748b;font-weight:700;display:flex;align-items:center;gap:4px">🔒 Tự động tổng hợp từ 2 Lĩnh Vực</span>
                        ` : `
                            <span style="font-size:11px;color:#64748b;font-weight:600">🔒 Đã khóa chỉnh sửa</span>
                        `}
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

                    footerEl.innerHTML = `
                        <span style="font-size:11px;color:#64748b;font-weight:600">🔒 Đã khóa chỉnh sửa</span>
                    `;

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
            if (qHdrRev) qHdrRev.textContent = isMkt ? ('CPO (Giá/Đơn): ' + formatVND(targetCpoAvg)) : formatVND(qTargetRev);
            if (qHdrOrd) qHdrOrd.textContent = isMkt ? ('% CP/DS: ' + (targetCostRatioAvg > 0 ? targetCostRatioAvg.toFixed(1) + '%' : '0%')) : (formatNum(qTargetOrders) + ' đơn');

            // Update Executive Summary Row 1 (Targets) & Row 2 (Actuals)
            var sumRev = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Rev');
            var sumOrd = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Orders');
            var sumActRev = document.getElementById('mtnSum' + q.id.toUpperCase() + 'ActRev');
            var sumActOrd = document.getElementById('mtnSum' + q.id.toUpperCase() + 'ActOrders');
            var sumCmp = document.getElementById('mtnSum' + q.id.toUpperCase() + 'Cmp');

            if (sumRev) sumRev.textContent = isMkt ? ('🎯 CPO (Giá/Đơn): ' + formatVND(targetCpoAvg)) : formatVND(qTargetRev);
            if (sumOrd) {
                if (isMkt) {
                    var valStr = targetCostRatioAvg > 0 ? targetCostRatioAvg.toFixed(1) + '%' : '0%';
                    sumOrd.innerHTML = '<span style="color:#0284c7; font-weight:900; font-size:12.5px; background:#e0f2fe; padding:3px 8px; border-radius:6px; border:1px solid #7dd3fc; display:inline-block; margin-top:4px;">📉 % Chi Phí / Doanh Thu: <b>' + valStr + '</b></span>';
                } else {
                    sumOrd.innerHTML = '<span style="color:#b45309; font-weight:900; font-size:12.5px; background:#fef3c7; padding:3px 8px; border-radius:6px; border:1px solid #fde68a; display:inline-block; margin-top:4px;">📦 <b>' + formatNum(qTargetOrders) + '</b> đơn</span>';
                }
            }
            if (sumActRev) sumActRev.textContent = isMkt ? ('🎯 CPO (Giá/Đơn): ' + (qActualCpo > 0 ? formatVND(qActualCpo) : '0 đ')) : formatVND(qActualRev);
            if (sumActOrd) {
                if (isMkt) {
                    var actValStr = qActualCostRatio.toFixed(2) + '%';
                    sumActOrd.innerHTML = '<span style="color:#1d4ed8; font-weight:900; font-size:12.5px; background:#eff6ff; padding:3px 8px; border-radius:6px; border:1px solid #93c5fd; display:inline-block; margin-top:4px;">📉 % Chi Phí / Doanh Thu: <b>' + actValStr + '</b></span>';
                } else {
                    sumActOrd.innerHTML = '<span style="color:#9a3412; font-weight:900; font-size:12.5px; background:#ffedd5; padding:3px 8px; border-radius:6px; border:1px solid #fed7aa; display:inline-block; margin-top:4px;">📦 <b>' + formatNum(qActualOrders) + '</b> đơn</span>';
                }
            }

            if (sumCmp) {
                var fillWidth = Math.min(Math.max(pctQRev, 0), 100);
                var fillClass = isMkt ? (qActualCostRatio <= targetCostRatioAvg ? 'surplus' : 'deficit') : (diffQRev >= 0 ? 'surplus' : 'deficit');

                var revBadgeText = '';
                if (targetCostRatioAvg > 0) {
                    if (isMkt) {
                        revBadgeText = qActualCostRatio <= targetCostRatioAvg ? `<span class="mtn-cmp-row-surplus">🔥 % CP/DS: ${qActualCostRatio.toFixed(1)}%</span>` : `<span class="mtn-cmp-row-deficit">🚨 % CP/DS: ${qActualCostRatio.toFixed(1)}%</span>`;
                    } else if (diffQRev >= 0) {
                        revBadgeText = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Vượt: +${formatVND(diffQRev)} (${pctQRev.toFixed(1)}%)</span>`;
                    } else {
                        revBadgeText = `<span class="mtn-cmp-row-deficit">🚨 Thiếu: -${formatVND(Math.abs(diffQRev))} (${pctQRev.toFixed(1)}%)</span>`;
                    }
                } else {
                    revBadgeText = qActualCostRatio > 0 ? `<span class="mtn-cmp-badge neutral">Thực tế: ${isMkt ? '% CP/DS: ' + qActualCostRatio.toFixed(2) + '%' : formatVND(qActualRev)}</span>` : `<span class="mtn-cmp-badge neutral">Chưa phát sinh</span>`;
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

        if (yrRev) yrRev.textContent = isMktYr ? ('🎯 CPO (Giá/Đơn): ' + formatVND(yearTargetCpoAvg)) : formatVND(totalYearTargetRev);
        if (yrOrd) {
            if (isMktYr) {
                var yValStr = yearTargetCostRatioAvg > 0 ? yearTargetCostRatioAvg.toFixed(1) + '%' : '0%';
                yrOrd.innerHTML = '<span style="color:#0284c7; font-weight:900; font-size:12.5px; background:#e0f2fe; padding:3px 8px; border-radius:6px; border:1px solid #7dd3fc; display:inline-block; margin-top:4px;">📉 % Chi Phí / Doanh Thu: <b>' + yValStr + '</b></span>';
            } else {
                yrOrd.innerHTML = '<span style="color:#b45309; font-weight:900; font-size:12.5px; background:#fef3c7; padding:3px 8px; border-radius:6px; border:1px solid #fde68a; display:inline-block; margin-top:4px;">📦 <b>' + formatNum(totalYearTargetOrders) + '</b> đơn</span>';
            }
        }
        if (yrActRev) yrActRev.textContent = isMktYr ? ('🎯 CPO (Giá/Đơn): ' + (yearActualCpo > 0 ? formatVND(yearActualCpo) : '0 đ')) : formatVND(totalYearActualRev);
        if (yrActOrd) {
            if (isMktYr) {
                var yActValStr = yearActualCostRatio.toFixed(2) + '%';
                yrActOrd.innerHTML = '<span style="color:#1d4ed8; font-weight:900; font-size:12.5px; background:#eff6ff; padding:3px 8px; border-radius:6px; border:1px solid #93c5fd; display:inline-block; margin-top:4px;">📉 % Chi Phí / Doanh Thu: <b>' + yActValStr + '</b></span>';
            } else {
                yrActOrd.innerHTML = '<span style="color:#9a3412; font-weight:900; font-size:12.5px; background:#ffedd5; padding:3px 8px; border-radius:6px; border:1px solid #fed7aa; display:inline-block; margin-top:4px;">📦 <b>' + formatNum(totalYearActualOrders) + '</b> đơn</span>';
            }
        }

        if (yrCmp) {
            var fillWidthYr = Math.min(Math.max(pctYrRev, 0), 100);
            var fillClassYr = isMktYr ? (yearActualCostRatio <= yearTargetCostRatioAvg ? 'surplus' : 'deficit') : (diffYrRev >= 0 ? 'surplus' : 'deficit');

            var revBadgeTextYr = '';
            if (yearTargetCostRatioAvg > 0) {
                if (isMktYr) {
                    revBadgeTextYr = yearActualCostRatio <= yearTargetCostRatioAvg ? `<span class="mtn-cmp-row-surplus">🔥 % CP/DS: ${yearActualCostRatio.toFixed(1)}%</span>` : `<span class="mtn-cmp-row-deficit">🚨 % CP/DS: ${yearActualCostRatio.toFixed(1)}%</span>`;
                } else if (diffYrRev >= 0) {
                    revBadgeTextYr = `<span class="mtn-cmp-row-surplus"><span class="mtn-pulse-icon">🔥</span>Vượt: +${formatVND(diffYrRev)} (${pctYrRev.toFixed(1)}%)</span>`;
                } else {
                    revBadgeTextYr = `<span class="mtn-cmp-row-deficit">🚨 Thiếu: -${formatVND(Math.abs(diffYrRev))} (${pctYrRev.toFixed(1)}%)</span>`;
                }
            } else {
                revBadgeTextYr = yearActualCostRatio > 0 ? `<span class="mtn-cmp-row-deficit">🚨 % CP/DS: ${yearActualCostRatio.toFixed(1)}%</span>` : `<span class="mtn-cmp-badge neutral">Chưa phát sinh</span>`;
            }

            var ordBadgeTextYr = '';
            if (yearTargetCpoAvg > 0) {
                if (isMktYr) {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-surplus">🎯 CPO Năm: ${formatVND(yearActualCpo)}</span>`;
                } else if (diffYrOrd >= 0) {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-surplus"><span class="mtn-pulse-icon">📦</span>Vượt: +${formatNum(diffYrOrd)} đơn (${pctYrOrd.toFixed(1)}%)</span>`;
                } else {
                    ordBadgeTextYr = `<span class="mtn-cmp-ord-deficit">📦 Thiếu: -${formatNum(Math.abs(diffYrOrd))} đơn (${pctYrOrd.toFixed(1)}%)</span>`;
                }
            } else {
                ordBadgeTextYr = yearActualCpo > 0 ? `<span class="mtn-cmp-ord-surplus">🎯 CPO Năm: ${formatVND(yearActualCpo)}</span>` : '';
            }

            yrCmp.innerHTML = `
                <div class="mtn-cmp-hdr">
                    <span>⚖️ TỶ LỆ HOÀN THÀNH</span>
                    <span style="font-size:10px;font-weight:900;color:${(isMktYr ? yearActualCostRatio <= yearTargetCostRatioAvg : diffYrRev >= 0) ? '#15803d' : '#dc2626'}">${pctYrRev > 0 ? pctYrRev.toFixed(1) + '%' : '0.0%'}</span>
                </div>
                <div>${isMktYr ? ordBadgeTextYr : revBadgeTextYr}</div>
                <div style="margin-top:2px">${isMktYr ? revBadgeTextYr : ordBadgeTextYr}</div>
                ${yearTargetCostRatioAvg > 0 ? `<div class="mtn-progress-bar-bg" title="Đạt chỉ tiêu cả năm"><div class="mtn-progress-bar-fill ${fillClassYr}" style="width:${fillWidthYr}%"></div></div>` : ''}
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
                            <span style="font-size:11px;color:#64748b;font-weight:600">🔒 Đã khóa chỉnh sửa</span>
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

    // ========== WIZARD CẤU HÌNH MỤC TIÊU TOP-DOWN ==========
    var _mtnWizBenchmark = null;
    var _mtnWizStep = 1;
    var _mtnWizIsSaved = false;
    var _mtnWizIsEditing = true;

    // Check if current user is Director / Manager
    function _mtnIsDirector() {
        try {
            var raw = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('userData');
            if (!raw) return true;
            var u = JSON.parse(raw);
            var role = String(u.role || u.user_role || u.chuc_vu || '').toLowerCase();
            var username = String(u.username || u.user_name || '').toLowerCase();
            return role === 'giam_doc' || role === 'admin' || role === 'quan_ly_cap_cao' || username === 'admin' || username.includes('giamdoc');
        } catch(e) {
            return true;
        }
    }

    // Format helpers for wizard
    function _mtnWizFmtVND(num) {
        if (!num || isNaN(num)) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }
    function _mtnWizFmtNum(num) {
        if (!num || isNaN(num)) return '0';
        return Number(num).toLocaleString('vi-VN');
    }

    // Open wizard
    window._mtnOpenConfigWizard = async function() {
        if (window._mtnSegment === 'all') {
            alert('⚠️ Vui lòng chọn Lĩnh Vực Đồng Phục hoặc TEM/PET trước khi thiết lập cấu hình.');
            return;
        }

        var overlay = document.getElementById('mtnWizardOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';

        // Update title
        var catLabels = { sale_kd: 'Sale/KD', marketing: 'Marketing', san_xuat: 'Sản Xuất' };
        var segLabels = { dong_phuc: '👔 Đồng Phục', tem_pet: '🏷️ TEM/PET' };
        var titleEl = document.getElementById('mtnWizardTitle');
        if (titleEl) titleEl.textContent = '⚙️ Cấu Hình Mục Tiêu ' + (catLabels[window._mtnCategory] || '') + ' — ' + (segLabels[window._mtnSegment] || '') + ' — Cả Năm ' + window._mtnYear;

        // Update labels & placeholders based on category
        var isMkt = window._mtnCategory === 'marketing';
        var revLbl = document.getElementById('mtnWizYearRevLabel');
        var ordLbl = document.getElementById('mtnWizYearOrdLabel');
        var yearRevInp = document.getElementById('mtnWizYearRev');
        var yearOrdInp = document.getElementById('mtnWizYearOrd');
        if (isMkt) {
            if (revLbl) revLbl.textContent = '📉 Mục Tiêu % CP / Doanh Thu Ads (%):';
            if (ordLbl) ordLbl.textContent = '🎯 Mục Tiêu Giá / Đơn CPO (VND):';
            if (yearRevInp) yearRevInp.placeholder = 'Ví dụ: 15%';
            if (yearOrdInp) yearOrdInp.placeholder = 'Ví dụ: 150000';
        } else {
            if (revLbl) revLbl.textContent = 'Mục Tiêu Doanh Số (VND):';
            if (ordLbl) ordLbl.textContent = 'Mục Tiêu Số Đơn Hàng:';
            if (yearRevInp) yearRevInp.placeholder = 'Ví dụ: 4500000000';
            if (yearOrdInp) yearOrdInp.placeholder = 'Ví dụ: 8000';
        }
        // Update table headers
        var qRevTh = document.getElementById('mtnWizQRevTh');
        var qOrdTh = document.getElementById('mtnWizQOrdTh');
        var mRevTh = document.getElementById('mtnWizMRevTh');
        var mOrdTh = document.getElementById('mtnWizMOrdTh');
        if (isMkt) {
            if (qRevTh) qRevTh.textContent = '% CP/DS Ads';
            if (qOrdTh) qOrdTh.textContent = 'CPO (VND)';
            if (mRevTh) mRevTh.textContent = '% CP/DS Ads';
            if (mOrdTh) mOrdTh.textContent = 'CPO (VND)';
        } else {
            if (qRevTh) qRevTh.textContent = 'Doanh Số (VND)';
            if (qOrdTh) qOrdTh.textContent = 'Số Đơn';
            if (mRevTh) mRevTh.textContent = 'Doanh Số (VND)';
            if (mOrdTh) mOrdTh.textContent = 'Số Đơn';
        }

        // Fetch fresh targets specifically for current category & segment
        var currentCatData = {};
        try {
            var catRes = await fetch('/api/yearly-targets?year=' + window._mtnYear + '&category=' + window._mtnCategory + '&segment=' + (window._mtnSegment || 'dong_phuc'), {
                credentials: 'include',
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            var catData = await catRes.json();
            if (catData && Array.isArray(catData.targets)) {
                catData.targets.forEach(function(t) {
                    currentCatData[t.month] = t;
                });
            }
        } catch(e) {
            console.error('Fetch wizard category targets err:', e);
        }

        // Build 12 months table rows first
        _mtnWizBuild12MonthsTable();

        // Populate 12 month table inputs & calculate Quarter sums
        var qSums = {
            1: { rev: 0, ord: 0 },
            2: { rev: 0, ord: 0 },
            3: { rev: 0, ord: 0 },
            4: { rev: 0, ord: 0 }
        };

        for (var mIdx = 1; mIdx <= 12; mIdx++) {
            var mData = currentCatData[mIdx];
            var mRev = mData ? (Number(mData.target_revenue) || 0) : 0;
            var mOrd = mData ? (Number(mData.target_orders) || 0) : 0;

            var mRevInp = document.querySelector('.mtn-wiz-m-rev[data-month="' + mIdx + '"]');
            var mOrdInp = document.querySelector('.mtn-wiz-m-ord[data-month="' + mIdx + '"]');
            if (mRevInp) mRevInp.value = mRev > 0 ? mRev : '';
            if (mOrdInp) mOrdInp.value = mOrd > 0 ? mOrd : '';

            var qNum = Math.ceil(mIdx / 3);
            qSums[qNum].rev += mRev;
            qSums[qNum].ord += mOrd;
        }

        // Populate 4 Quarter inputs with existing quarter sums
        for (var qIdx = 1; qIdx <= 4; qIdx++) {
            var qRInp = document.getElementById('mtnWizQ' + qIdx + 'Rev');
            var qOInp = document.getElementById('mtnWizQ' + qIdx + 'Ord');
            if (qRInp) qRInp.value = qSums[qIdx].rev > 0 ? qSums[qIdx].rev : '';
            if (qOInp) qOInp.value = qSums[qIdx].ord > 0 ? qSums[qIdx].ord : '';
        }

        // Calculate total year target from current category data
        var hasSavedData = false;
        var savedQMethod = 'equal';
        var savedMMethod = 'equal';
        var savedNotes = '';
        var totalRev = 0, totalOrd = 0;

        for (var m = 1; m <= 12; m++) {
            var md = currentCatData[m];
            if (md) {
                var rVal = Number(md.target_revenue) || 0;
                var oVal = Number(md.target_orders) || 0;
                if (rVal > 0 || oVal > 0) hasSavedData = true;
                totalRev += rVal;
                totalOrd += oVal;
            }
        }

        var yearRevEl = document.getElementById('mtnWizYearRev');
        var yearOrdEl = document.getElementById('mtnWizYearOrd');
        if (yearRevEl) yearRevEl.value = totalRev > 0 ? totalRev : '';
        if (yearOrdEl) yearOrdEl.value = totalOrd > 0 ? totalOrd : '';

        // Read saved metadata notes from month 1 of current category
        if (currentCatData[1] && currentCatData[1].target_notes) {
            try {
                var parsedNote = JSON.parse(currentCatData[1].target_notes);
                if (parsedNote && typeof parsedNote === 'object') {
                    if (parsedNote.qMethod) savedQMethod = parsedNote.qMethod;
                    if (parsedNote.mMethod) savedMMethod = parsedNote.mMethod;
                    if (parsedNote.notes !== undefined) savedNotes = parsedNote.notes;
                } else {
                    savedNotes = currentCatData[1].target_notes;
                }
            } catch(e) {
                savedNotes = currentCatData[1].target_notes || '';
            }
        }

        // Restore saved radio buttons state
        var qRad = document.querySelector('input[name="mtnWizQMethod"][value="' + savedQMethod + '"]');
        if (qRad) qRad.checked = true;
        var mRad = document.querySelector('input[name="mtnWizMMethod"][value="' + savedMMethod + '"]');
        if (mRad) mRad.checked = true;
        var notesEl = document.getElementById('mtnWizYearNotes');
        if (notesEl) notesEl.value = savedNotes;

        _mtnWizIsSaved = hasSavedData;
        _mtnWizIsEditing = !hasSavedData; // Default locked if data already saved

        // Update totals across steps
        if (typeof window._mtnWizUpdateQTotals === 'function') window._mtnWizUpdateQTotals();
        if (typeof window._mtnWizUpdateMTotals === 'function') window._mtnWizUpdateMTotals();

        // Reset to step 1
        _mtnWizStep = 1;
        window._mtnSetWizardStep(1);

        // Fetch benchmark
        try {
            var res = await fetch('/api/yearly-targets/benchmark?year=' + window._mtnYear + '&category=' + window._mtnCategory + '&segment=' + window._mtnSegment, {
                credentials: 'include',
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
            });
            var data = await res.json();
            if (data && data.success) {
                _mtnWizBenchmark = data;
                _mtnWizRenderBenchmarks();
            } else {
                _mtnWizRenderBenchmarkFallback(data?.error || 'Chưa có số liệu năm trước');
            }
        } catch(e) {
            console.error('Benchmark fetch err:', e);
            _mtnWizRenderBenchmarkFallback('Không thể tải số liệu năm trước');
        }
    };

    // Close wizard
    window._mtnCloseConfigWizard = function() {
        var overlay = document.getElementById('mtnWizardOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    // Apply Lock / Unlock State across Wizard
    window._mtnWizApplyLockState = function() {
        var isDirector = _mtnIsDirector();
        var lockBadge = document.getElementById('mtnWizLockBadge');
        var editBtn = document.getElementById('mtnWizEditBtn');
        var saveBtn = document.getElementById('mtnWizSaveBtn');

        var yearRev = document.getElementById('mtnWizYearRev');
        var yearOrd = document.getElementById('mtnWizYearOrd');
        var yearNotes = document.getElementById('mtnWizYearNotes');

        var qRadios = document.querySelectorAll('input[name="mtnWizQMethod"]');
        var mRadios = document.querySelectorAll('input[name="mtnWizMMethod"]');

        // Ensure at least one radio is checked by default
        if (!document.querySelector('input[name="mtnWizQMethod"]:checked')) {
            var defaultQ = document.querySelector('input[name="mtnWizQMethod"][value="equal"]');
            if (defaultQ) defaultQ.checked = true;
        }
        if (!document.querySelector('input[name="mtnWizMMethod"]:checked')) {
            var defaultM = document.querySelector('input[name="mtnWizMMethod"][value="equal"]');
            if (defaultM) defaultM.checked = true;
        }

        if (!_mtnWizIsEditing) {
            // Locked Mode!
            if (lockBadge) lockBadge.style.display = 'inline-block';
            if (editBtn) editBtn.style.display = isDirector ? 'inline-flex' : 'none';
            if (saveBtn) saveBtn.style.display = 'none';

            if (yearRev) { yearRev.disabled = true; yearRev.style.background = '#f1f5f9'; }
            if (yearOrd) { yearOrd.disabled = true; yearOrd.style.background = '#f1f5f9'; }
            if (yearNotes) { yearNotes.disabled = true; yearNotes.style.background = '#f1f5f9'; }

            qRadios.forEach(function(r) { r.disabled = true; });
            mRadios.forEach(function(r) { r.disabled = true; });

            // Disable all quarter & month table inputs
            for (var q = 1; q <= 4; q++) {
                var qR = document.getElementById('mtnWizQ' + q + 'Rev');
                var qO = document.getElementById('mtnWizQ' + q + 'Ord');
                if (qR) { qR.disabled = true; qR.style.background = '#f1f5f9'; qR.style.cursor = 'not-allowed'; }
                if (qO) { qO.disabled = true; qO.style.background = '#f1f5f9'; qO.style.cursor = 'not-allowed'; }
            }
            document.querySelectorAll('.mtn-wiz-m-rev, .mtn-wiz-m-ord').forEach(function(inp) {
                inp.disabled = true;
                inp.style.background = '#f1f5f9';
                inp.style.cursor = 'not-allowed';
            });
        } else {
            // Edit Mode!
            if (lockBadge) lockBadge.style.display = 'none';
            if (editBtn) editBtn.style.display = 'none';
            if (_mtnWizStep === 3 && saveBtn) saveBtn.style.display = 'inline-flex';

            if (yearRev) { yearRev.disabled = false; yearRev.style.background = '#ffffff'; }
            if (yearOrd) { yearOrd.disabled = false; yearOrd.style.background = '#ffffff'; }
            if (yearNotes) { yearNotes.disabled = false; yearNotes.style.background = '#ffffff'; }

            qRadios.forEach(function(r) { r.disabled = false; });
            mRadios.forEach(function(r) { r.disabled = false; });

            // Re-apply radio allocation methods to control custom vs auto locking
            window._mtnWizApplyQMethod();
            window._mtnWizApplyMMethod();
        }
    };

    // Enable Edit Mode (Director Only)
    window._mtnWizEnableEdit = function() {
        if (!_mtnIsDirector()) {
            alert('⚠️ Quyền hạn không đủ! Chỉ Giám Đốc mới có quyền mở chỉnh sửa Cấu Hình Mục Tiêu.');
            return;
        }
        _mtnWizIsEditing = true;
        window._mtnWizApplyLockState();
        if (typeof showToast === 'function') {
            showToast('🔓 Đã mở quyền chỉnh sửa Cấu Hình Mục Tiêu!', 'info');
        } else {
            alert('🔓 Đã mở quyền chỉnh sửa Cấu Hình Mục Tiêu!');
        }
    };

    // Set wizard step with strict sequential validation
    window._mtnSetWizardStep = function(step) {
        var yearRev = Number(document.getElementById('mtnWizYearRev')?.value) || 0;
        var yearOrd = Number(document.getElementById('mtnWizYearOrd')?.value) || 0;

        // Trying to go to Step 2 or 3 without completing Step 1
        if (step >= 2) {
            if (yearRev <= 0 && yearOrd <= 0) {
                alert('⚠️ Vui lòng hoàn thành Cấu Hình Cả Năm (Bước 1) trước!\n(Cần nhập Doanh Số hoặc Số Đơn mục tiêu cả năm)');
                return;
            }
        }

        // Trying to go to Step 3 without completing Step 2 validly
        if (step === 3) {
            var qTotalRev = 0, qTotalOrd = 0;
            var isMkt = window._mtnCategory === 'marketing';
            for (var q = 1; q <= 4; q++) {
                qTotalRev += Number(document.getElementById('mtnWizQ' + q + 'Rev')?.value) || 0;
                qTotalOrd += Number(document.getElementById('mtnWizQ' + q + 'Ord')?.value) || 0;
            }
            if (isMkt) {
                var qAvgRev = Math.round((qTotalRev / 4) * 100) / 100;
                var qAvgOrd = Math.round(qTotalOrd / 4);
                if (yearRev > 0 && Math.abs(qAvgRev - yearRev) > 0.01) {
                    alert('⚠️ Trung bình % CP/DS 4 Quý (' + qAvgRev + '%) ≠ Mục Tiêu Năm (' + yearRev + '%)!\n\nVui lòng chỉnh sửa Bước 2 sao cho Trung bình 4 Quý = Năm trước khi chuyển sang Phân Bổ 12 Tháng.');
                    return;
                }
                if (yearOrd > 0 && Math.abs(qAvgOrd - yearOrd) > 1) {
                    alert('⚠️ Trung bình CPO 4 Quý (' + _mtnWizFmtVND(qAvgOrd) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtVND(yearOrd) + ')!\n\nVui lòng chỉnh sửa Bước 2 sao cho Trung bình 4 Quý = Năm trước khi chuyển sang Phân Bổ 12 Tháng.');
                    return;
                }
            } else {
                if (yearRev > 0 && qTotalRev !== yearRev) {
                    alert('⚠️ Tổng Doanh Số 4 Quý (' + _mtnWizFmtVND(qTotalRev) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtVND(yearRev) + ')!\n\nVui lòng chỉnh sửa Bước 2 sao cho Chênh Lệch = 0 đ (Tổng 4 Quý = Năm) trước khi chuyển sang Phân Bổ 12 Tháng.');
                    return;
                }
                if (yearOrd > 0 && qTotalOrd !== yearOrd) {
                    alert('⚠️ Tổng Số Đơn 4 Quý (' + _mtnWizFmtNum(qTotalOrd) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtNum(yearOrd) + ')!\n\nVui lòng chỉnh sửa Bước 2 sao cho Tổng 4 Quý = Năm trước khi chuyển sang Phân Bổ 12 Tháng.');
                    return;
                }
            }
        }

        _mtnWizStep = step;
        var s1 = document.getElementById('mtnWizStep1');
        var s2 = document.getElementById('mtnWizStep2');
        var s3 = document.getElementById('mtnWizStep3');
        var t1 = document.getElementById('mtnWizTab1');
        var t2 = document.getElementById('mtnWizTab2');
        var t3 = document.getElementById('mtnWizTab3');
        var prevBtn = document.getElementById('mtnWizPrevBtn');
        var nextBtn = document.getElementById('mtnWizNextBtn');
        var saveBtn = document.getElementById('mtnWizSaveBtn');

        [s1, s2, s3].forEach(function(el) { if (el) el.style.display = 'none'; });
        [t1, t2, t3].forEach(function(el) { if (el) { el.style.background = '#334155'; el.style.color = '#94a3b8'; } });

        if (step === 1) {
            if (s1) s1.style.display = 'flex';
            if (t1) { t1.style.background = '#38bdf8'; t1.style.color = '#0f172a'; }
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) { nextBtn.style.display = 'inline-flex'; nextBtn.textContent = 'Tiếp Theo: Phân Bổ Quý ➔'; }
            if (saveBtn) saveBtn.style.display = 'none';
        } else if (step === 2) {
            if (s2) s2.style.display = 'flex';
            if (t2) { t2.style.background = '#38bdf8'; t2.style.color = '#0f172a'; }
            if (prevBtn) prevBtn.style.display = 'inline-flex';
            if (nextBtn) { nextBtn.style.display = 'inline-flex'; nextBtn.textContent = 'Tiếp Theo: Phân Bổ 12 Tháng ➔'; }
            if (saveBtn) saveBtn.style.display = 'none';
            window._mtnWizApplyQMethod();
            window._mtnWizUpdateQTotals();
        } else if (step === 3) {
            if (s3) s3.style.display = 'flex';
            if (t3) { t3.style.background = '#38bdf8'; t3.style.color = '#0f172a'; }
            if (prevBtn) prevBtn.style.display = 'inline-flex';
            if (nextBtn) nextBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = _mtnWizIsEditing ? 'inline-flex' : 'none';
            window._mtnWizApplyMMethod();
            window._mtnWizUpdateMTotals();
        }

        window._mtnWizApplyLockState();
    };

    window._mtnWizNextStep = function() {
        if (_mtnWizStep === 1) {
            window._mtnSetWizardStep(2);
        } else if (_mtnWizStep === 2) {
            window._mtnSetWizardStep(3);
        }
    };

    window._mtnWizPrevStep = function() {
        if (_mtnWizStep === 2) window._mtnSetWizardStep(1);
        else if (_mtnWizStep === 3) window._mtnSetWizardStep(2);
    };

    // Recalc year display
    window._mtnWizRecalcYear = function() {
        // nothing extra needed for step 1
    };

    // Render fallback text if benchmark fetch returns no data or fails
    function _mtnWizRenderBenchmarkFallback(msg) {
        var prevYear = (window._mtnYear || new Date().getFullYear()) - 1;
        var text = '📊 Năm ' + prevYear + ': ' + (msg || 'Chưa phát sinh dữ liệu thực tế');
        var yearEl = document.getElementById('mtnWizBenchmarkYearContent');
        var qEl = document.getElementById('mtnWizBenchmarkQContent');
        var mEl = document.getElementById('mtnWizBenchmarkMContent');
        if (yearEl) yearEl.innerHTML = text;
        if (qEl) qEl.innerHTML = text;
        if (mEl) mEl.innerHTML = text;
    }

    // Render benchmarks from fetched data
    function _mtnWizRenderBenchmarks() {
        if (!_mtnWizBenchmark) {
            _mtnWizRenderBenchmarkFallback('Chưa phát sinh dữ liệu thực tế');
            return;
        }
        var bm = _mtnWizBenchmark;
        var isMkt = window._mtnCategory === 'marketing';
        var prevYear = bm.prev_year;

        // Step 1 — Year benchmark
        var yearEl = document.getElementById('mtnWizBenchmarkYearContent');
        if (yearEl) {
            var actTotal = bm.prev_actual?.total || { revenue: 0, orders: 0 };
            var tgtTotal = bm.prev_target?.total || { revenue: 0, orders: 0 };
            yearEl.innerHTML = '📅 Năm ' + prevYear + ': ' +
                (isMkt ? '% CP/DS: ' + actTotal.revenue + '% | CPO: ' + _mtnWizFmtVND(actTotal.orders) :
                    'Doanh Số Thực Tế: <strong>' + _mtnWizFmtVND(actTotal.revenue) + '</strong> | Số Đơn Thực Tế: <strong>' + _mtnWizFmtNum(actTotal.orders) + ' đơn</strong>') +
                (tgtTotal.revenue > 0 || tgtTotal.orders > 0 ?
                    '<br>📋 Target đã đặt: ' + (isMkt ? '% CP/DS: ' + tgtTotal.revenue + '% | CPO: ' + _mtnWizFmtVND(tgtTotal.orders) : 'Doanh Số: ' + _mtnWizFmtVND(tgtTotal.revenue) + ' | Số Đơn: ' + _mtnWizFmtNum(tgtTotal.orders) + ' đơn')
                    : '');
        }

        // Step 2 — Quarter benchmark
        var qEl = document.getElementById('mtnWizBenchmarkQContent');
        if (qEl) {
            var qParts = [];
            var totalRev = bm.prev_actual?.total?.revenue || 0;
            for (var q = 1; q <= 4; q++) {
                var qa = bm.prev_actual?.quarters?.[q] || { revenue: 0, orders: 0 };
                var pct = totalRev > 0 ? ((qa.revenue / totalRev) * 100).toFixed(1) : '25.0';
                qParts.push('Q' + q + ': ' + (isMkt ? qa.revenue + '%' : _mtnWizFmtVND(qa.revenue)) + ' (' + pct + '%)');
            }
            qEl.innerHTML = '📅 Năm ' + prevYear + ': ' + qParts.join(' | ');
        }

        // Step 3 — Month benchmark (Formatted as 4 Quarter Cards for easy reading)
        var mEl = document.getElementById('mtnWizBenchmarkMContent');
        if (mEl) {
            var qGridHtml = '<div style="font-size:12.5px; font-weight:900; color:#166534; margin-bottom:6px;">📅 Dữ Liệu Thực Tế 12 Tháng Năm ' + prevYear + ':</div>';
            qGridHtml += '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">';
            var qColors = { 1: '#dbeafe', 2: '#dcfce7', 3: '#f3e8ff', 4: '#fce7f3' };
            var qBorders = { 1: '#93c5fd', 2: '#86efac', 3: '#d8b4fe', 4: '#fbcfe8' };

            for (var q3 = 1; q3 <= 4; q3++) {
                var qMonths3 = [(q3 - 1) * 3 + 1, (q3 - 1) * 3 + 2, (q3 - 1) * 3 + 3];
                qGridHtml += '<div style="background:#ffffff; border:1.5px solid ' + qBorders[q3] + '; padding:8px 10px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">' +
                    '<div style="font-size:11px; font-weight:900; color:#1e293b; border-bottom:1px dashed #cbd5e1; padding-bottom:4px; margin-bottom:4px;">🚀 QUÝ ' + q3 + '</div>';
                qMonths3.forEach(function(m3) {
                    var ma = bm.prev_actual?.months?.[m3] || { revenue: 0, orders: 0 };
                    var valStr = isMkt ? (ma.revenue + '%') : _mtnWizFmtVND(ma.revenue);
                    qGridHtml += '<div style="font-size:11.5px; font-weight:700; color:#334155; display:flex; justify-content:space-between; margin-bottom:2px;">' +
                        '<span>T' + m3 + ':</span> <strong style="color:#0f172a;">' + valStr + '</strong></div>';
                });
                qGridHtml += '</div>';
            }
            qGridHtml += '</div>';
            mEl.innerHTML = qGridHtml;
        }
    }

    // Build 12 months table rows
    function _mtnWizBuild12MonthsTable() {
        var tbody = document.getElementById('mtnWizMonthsTableBody');
        if (!tbody) return;
        var html = '';
        var qColors = { 1: '#dbeafe', 2: '#dcfce7', 3: '#f3e8ff', 4: '#fce7f3' };
        var qNames = { 1: 'QUÝ 1', 2: 'QUÝ 2', 3: 'QUÝ 3', 4: 'QUÝ 4' };

        for (var q = 1; q <= 4; q++) {
            var qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
            html += '<tr style="background:' + qColors[q] + ';"><td colspan="3" style="padding:6px 10px; font-weight:900; font-size:12px; color:#1e293b;">🚀 ' + qNames[q] + ' (Target Quý: <span id="mtnWizMQRef_' + q + '">0</span> | Đã nhập: <span id="mtnWizMQSum_' + q + '">0</span> <span id="mtnWizMQStatus_' + q + '"></span>)</td></tr>';
            qMonths.forEach(function(m) {
                html += '<tr data-month="' + m + '"><td style="padding:6px 10px; font-weight:700;">Tháng ' + m + '</td>' +
                    '<td style="text-align:center;"><input type="number" class="mtn-wiz-m-rev" data-month="' + m + '" min="0" step="any" style="width:140px; padding:5px 8px; border:1.5px solid #bae6fd; border-radius:8px; font-size:13px; font-weight:900; color:#0284c7; text-align:center;" oninput="window._mtnWizUpdateMTotals()" onfocus="window._mtnShowSmartHintM(this, \'revenue\')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td>' +
                    '<td style="text-align:center;"><input type="number" class="mtn-wiz-m-ord" data-month="' + m + '" min="0" step="any" style="width:100px; padding:5px 8px; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:900; color:#b45309; text-align:center;" oninput="window._mtnWizUpdateMTotals()" onfocus="window._mtnShowSmartHintM(this, \'orders\')" onblur="setTimeout(window._mtnHideSmartHint, 200)"></td></tr>';
            });
        }
        tbody.innerHTML = html;
    }

    // Apply quarter allocation method
    window._mtnWizApplyQMethod = function() {
        var method = document.querySelector('input[name="mtnWizQMethod"]:checked')?.value || 'equal';
        var yearRev = Number(document.getElementById('mtnWizYearRev')?.value) || 0;
        var yearOrd = Number(document.getElementById('mtnWizYearOrd')?.value) || 0;
        var isMkt = window._mtnCategory === 'marketing';

        if (method === 'equal') {
            if (isMkt) {
                for (var q = 1; q <= 4; q++) {
                    document.getElementById('mtnWizQ' + q + 'Rev').value = yearRev;
                    document.getElementById('mtnWizQ' + q + 'Ord').value = yearOrd;
                }
            } else {
                var baseRev = Math.floor(yearRev / 4);
                var baseOrd = Math.floor(yearOrd / 4);
                for (var q = 1; q <= 3; q++) {
                    document.getElementById('mtnWizQ' + q + 'Rev').value = baseRev;
                    document.getElementById('mtnWizQ' + q + 'Ord').value = baseOrd;
                }
                document.getElementById('mtnWizQ4Rev').value = yearRev - baseRev * 3;
                document.getElementById('mtnWizQ4Ord').value = yearOrd - baseOrd * 3;
            }
        } else if (method === 'growth' && _mtnWizBenchmark) {
            if (isMkt) {
                for (var q2 = 1; q2 <= 4; q2++) {
                    document.getElementById('mtnWizQ' + q2 + 'Rev').value = yearRev;
                    document.getElementById('mtnWizQ' + q2 + 'Ord').value = yearOrd;
                }
            } else {
                var totalPrevRev = _mtnWizBenchmark.prev_actual?.total?.revenue || 0;
                var totalPrevOrd = _mtnWizBenchmark.prev_actual?.total?.orders || 0;
                var assignedRev = 0, assignedOrd = 0;
                for (var q2 = 1; q2 <= 4; q2++) {
                    var qPrev = _mtnWizBenchmark.prev_actual?.quarters?.[q2] || { revenue: 0, orders: 0 };
                    var pctRev = totalPrevRev > 0 ? (qPrev.revenue / totalPrevRev) : 0.25;
                    var pctOrd = totalPrevOrd > 0 ? (qPrev.orders / totalPrevOrd) : 0.25;
                    if (q2 < 4) {
                        var qRev = Math.round(yearRev * pctRev);
                        var qOrd = Math.round(yearOrd * pctOrd);
                        document.getElementById('mtnWizQ' + q2 + 'Rev').value = qRev;
                        document.getElementById('mtnWizQ' + q2 + 'Ord').value = qOrd;
                        assignedRev += qRev;
                        assignedOrd += qOrd;
                    } else {
                        document.getElementById('mtnWizQ4Rev').value = yearRev - assignedRev;
                        document.getElementById('mtnWizQ4Ord').value = yearOrd - assignedOrd;
                    }
                }
            }
        }

        // Lock / Unlock inputs based on method selected
        var isAutoQ = (method === 'equal' || method === 'growth');
        for (var qIdx = 1; qIdx <= 4; qIdx++) {
            var qRevInput = document.getElementById('mtnWizQ' + qIdx + 'Rev');
            var qOrdInput = document.getElementById('mtnWizQ' + qIdx + 'Ord');
            if (qRevInput) {
                qRevInput.disabled = isAutoQ;
                qRevInput.style.background = isAutoQ ? '#f1f5f9' : '#ffffff';
                qRevInput.style.cursor = isAutoQ ? 'not-allowed' : 'text';
            }
            if (qOrdInput) {
                qOrdInput.disabled = isAutoQ;
                qOrdInput.style.background = isAutoQ ? '#f1f5f9' : '#ffffff';
                qOrdInput.style.cursor = isAutoQ ? 'not-allowed' : 'text';
            }
        }

        window._mtnWizUpdateQTotals();
    };

    // Update quarter totals row
    window._mtnWizUpdateQTotals = function() {
        var yearRev = Number(document.getElementById('mtnWizYearRev')?.value) || 0;
        var yearOrd = Number(document.getElementById('mtnWizYearOrd')?.value) || 0;
        var isMkt = window._mtnCategory === 'marketing';

        var totalRev = 0, totalOrd = 0;
        for (var q = 1; q <= 4; q++) {
            totalRev += Number(document.getElementById('mtnWizQ' + q + 'Rev')?.value) || 0;
            totalOrd += Number(document.getElementById('mtnWizQ' + q + 'Ord')?.value) || 0;
        }

        var displayTotalRev = isMkt ? Math.round((totalRev / 4) * 100) / 100 : totalRev;
        var displayTotalOrd = isMkt ? Math.round(totalOrd / 4) : totalOrd;

        var tRevEl = document.getElementById('mtnWizQTotalRev');
        var tOrdEl = document.getElementById('mtnWizQTotalOrd');
        if (tRevEl) tRevEl.textContent = isMkt ? (displayTotalRev + '%') : _mtnWizFmtVND(displayTotalRev);
        if (tOrdEl) tOrdEl.textContent = isMkt ? _mtnWizFmtVND(displayTotalOrd) : _mtnWizFmtNum(displayTotalOrd);

        // Year reference
        var yRefRev = document.getElementById('mtnWizQYearRefRev');
        var yRefOrd = document.getElementById('mtnWizQYearRefOrd');
        if (yRefRev) yRefRev.textContent = isMkt ? (yearRev + '%') : _mtnWizFmtVND(yearRev);
        if (yRefOrd) yRefOrd.textContent = isMkt ? _mtnWizFmtVND(yearOrd) : _mtnWizFmtNum(yearOrd);

        // Diff
        var diffRev = Math.round((displayTotalRev - yearRev) * 100) / 100;
        var diffOrd = displayTotalOrd - yearOrd;
        var dRevEl = document.getElementById('mtnWizQDiffRev');
        var dOrdEl = document.getElementById('mtnWizQDiffOrd');
        if (dRevEl) {
            if (diffRev === 0) { dRevEl.textContent = '✅ Chính xác'; dRevEl.style.color = '#16a34a'; }
            else { dRevEl.textContent = (diffRev > 0 ? '+' : '') + (isMkt ? (diffRev + '%') : _mtnWizFmtVND(diffRev)); dRevEl.style.color = '#dc2626'; }
        }
        if (dOrdEl) {
            if (diffOrd === 0) { dOrdEl.textContent = '✅ Đạt'; dOrdEl.style.color = '#16a34a'; }
            else { dOrdEl.textContent = (diffOrd > 0 ? '+' : '') + (isMkt ? _mtnWizFmtVND(diffOrd) : _mtnWizFmtNum(diffOrd)); dOrdEl.style.color = '#dc2626'; }
        }
    };

    // Apply month allocation method
    window._mtnWizApplyMMethod = function() {
        var method = document.querySelector('input[name="mtnWizMMethod"]:checked')?.value || 'equal';
        var isMkt = window._mtnCategory === 'marketing';

        if (method === 'equal') {
            for (var q = 1; q <= 4; q++) {
                var qRev = Number(document.getElementById('mtnWizQ' + q + 'Rev')?.value) || 0;
                var qOrd = Number(document.getElementById('mtnWizQ' + q + 'Ord')?.value) || 0;
                var qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];

                if (isMkt) {
                    for (var i = 0; i < 3; i++) {
                        var m = qMonths[i];
                        var revInput = document.querySelector('.mtn-wiz-m-rev[data-month="' + m + '"]');
                        var ordInput = document.querySelector('.mtn-wiz-m-ord[data-month="' + m + '"]');
                        if (revInput) revInput.value = qRev;
                        if (ordInput) ordInput.value = qOrd;
                    }
                } else {
                    var baseRev = Math.floor(qRev / 3);
                    var baseOrd = Math.floor(qOrd / 3);
                    for (var i = 0; i < 3; i++) {
                        var m = qMonths[i];
                        var revInput = document.querySelector('.mtn-wiz-m-rev[data-month="' + m + '"]');
                        var ordInput = document.querySelector('.mtn-wiz-m-ord[data-month="' + m + '"]');
                        if (i < 2) {
                            if (revInput) revInput.value = baseRev;
                            if (ordInput) ordInput.value = baseOrd;
                        } else {
                            if (revInput) revInput.value = qRev - baseRev * 2;
                            if (ordInput) ordInput.value = qOrd - baseOrd * 2;
                        }
                    }
                }
            }
        } else if (method === 'growth' && _mtnWizBenchmark) {
            for (var q2 = 1; q2 <= 4; q2++) {
                var qRev2 = Number(document.getElementById('mtnWizQ' + q2 + 'Rev')?.value) || 0;
                var qOrd2 = Number(document.getElementById('mtnWizQ' + q2 + 'Ord')?.value) || 0;
                var qMonths2 = [(q2 - 1) * 3 + 1, (q2 - 1) * 3 + 2, (q2 - 1) * 3 + 3];
                if (isMkt) {
                    for (var j = 0; j < 3; j++) {
                        var m2 = qMonths2[j];
                        var revInput2 = document.querySelector('.mtn-wiz-m-rev[data-month="' + m2 + '"]');
                        var ordInput2 = document.querySelector('.mtn-wiz-m-ord[data-month="' + m2 + '"]');
                        if (revInput2) revInput2.value = qRev2;
                        if (ordInput2) ordInput2.value = qOrd2;
                    }
                } else {
                    var prevQTotal = 0, prevQOrdTotal = 0;
                    qMonths2.forEach(function(mm) {
                        var pm = _mtnWizBenchmark.prev_actual?.months?.[mm] || { revenue: 0, orders: 0 };
                        prevQTotal += pm.revenue;
                        prevQOrdTotal += pm.orders;
                    });
                    var assignedR = 0, assignedO = 0;
                    for (var j = 0; j < 3; j++) {
                        var m2 = qMonths2[j];
                        var pm2 = _mtnWizBenchmark.prev_actual?.months?.[m2] || { revenue: 0, orders: 0 };
                        var revInput2 = document.querySelector('.mtn-wiz-m-rev[data-month="' + m2 + '"]');
                        var ordInput2 = document.querySelector('.mtn-wiz-m-ord[data-month="' + m2 + '"]');
                        if (j < 2) {
                            var ratioR = prevQTotal > 0 ? (pm2.revenue / prevQTotal) : (1 / 3);
                            var ratioO = prevQOrdTotal > 0 ? (pm2.orders / prevQOrdTotal) : (1 / 3);
                            var mRev = Math.round(qRev2 * ratioR);
                            var mOrd = Math.round(qOrd2 * ratioO);
                            if (revInput2) revInput2.value = mRev;
                            if (ordInput2) ordInput2.value = mOrd;
                            assignedR += mRev;
                            assignedO += mOrd;
                        } else {
                            if (revInput2) revInput2.value = qRev2 - assignedR;
                            if (ordInput2) ordInput2.value = qOrd2 - assignedO;
                        }
                    }
                }
            }
        }

        // Lock / Unlock inputs based on method selected
        var isAutoM = (method === 'equal' || method === 'growth');
        document.querySelectorAll('.mtn-wiz-m-rev').forEach(function(inp) {
            inp.disabled = isAutoM;
            inp.style.background = isAutoM ? '#f1f5f9' : '#ffffff';
            inp.style.cursor = isAutoM ? 'not-allowed' : 'text';
        });
        document.querySelectorAll('.mtn-wiz-m-ord').forEach(function(inp) {
            inp.disabled = isAutoM;
            inp.style.background = isAutoM ? '#f1f5f9' : '#ffffff';
            inp.style.cursor = isAutoM ? 'not-allowed' : 'text';
        });

        window._mtnWizUpdateMTotals();
    };

    // Update month totals
    window._mtnWizUpdateMTotals = function() {
        var yearRev = Number(document.getElementById('mtnWizYearRev')?.value) || 0;
        var yearOrd = Number(document.getElementById('mtnWizYearOrd')?.value) || 0;
        var isMkt = window._mtnCategory === 'marketing';

        var totalRev = 0, totalOrd = 0;

        for (var q = 1; q <= 4; q++) {
            var qRev = Number(document.getElementById('mtnWizQ' + q + 'Rev')?.value) || 0;
            var qOrd = Number(document.getElementById('mtnWizQ' + q + 'Ord')?.value) || 0;
            var qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
            var qSumRev = 0, qSumOrd = 0;
            qMonths.forEach(function(m) {
                qSumRev += Number(document.querySelector('.mtn-wiz-m-rev[data-month="' + m + '"]')?.value) || 0;
                qSumOrd += Number(document.querySelector('.mtn-wiz-m-ord[data-month="' + m + '"]')?.value) || 0;
            });

            var qDispRev = isMkt ? Math.round((qSumRev / 3) * 100) / 100 : qSumRev;
            var qDispOrd = isMkt ? Math.round(qSumOrd / 3) : qSumOrd;

            totalRev += qSumRev;
            totalOrd += qSumOrd;

            // Update quarter sub-header
            var qRefEl = document.getElementById('mtnWizMQRef_' + q);
            var qSumEl = document.getElementById('mtnWizMQSum_' + q);
            var qStatusEl = document.getElementById('mtnWizMQStatus_' + q);
            if (qRefEl) qRefEl.textContent = isMkt ? (qRev + '%') : _mtnWizFmtVND(qRev);
            if (qSumEl) qSumEl.textContent = isMkt ? (qDispRev + '%') : _mtnWizFmtVND(qDispRev);
            if (qStatusEl) {
                if (Math.abs(qDispRev - qRev) <= 0.01 && Math.abs(qDispOrd - qOrd) <= 1) {
                    qStatusEl.innerHTML = '<span style="color:#16a34a;font-weight:900;">✅ Cân đủ</span>';
                } else {
                    var diff = Math.round((qDispRev - qRev) * 100) / 100;
                    qStatusEl.innerHTML = '<span style="color:#dc2626;font-weight:900;">❌ Chênh ' + (diff > 0 ? '+' : '') + (isMkt ? (diff + '%') : _mtnWizFmtVND(diff)) + '</span>';
                }
            }
        }

        var displayTotalRev = isMkt ? Math.round((totalRev / 12) * 100) / 100 : totalRev;
        var displayTotalOrd = isMkt ? Math.round(totalOrd / 12) : totalOrd;

        var tRevEl = document.getElementById('mtnWizMTotalRev');
        var tOrdEl = document.getElementById('mtnWizMTotalOrd');
        if (tRevEl) tRevEl.textContent = isMkt ? (displayTotalRev + '%') : _mtnWizFmtVND(displayTotalRev);
        if (tOrdEl) tOrdEl.textContent = isMkt ? _mtnWizFmtVND(displayTotalOrd) : _mtnWizFmtNum(displayTotalOrd);

        var yRefRev = document.getElementById('mtnWizMYearRefRev');
        var yRefOrd = document.getElementById('mtnWizMYearRefOrd');
        if (yRefRev) yRefRev.textContent = isMkt ? (yearRev + '%') : _mtnWizFmtVND(yearRev);
        if (yRefOrd) yRefOrd.textContent = isMkt ? _mtnWizFmtVND(yearOrd) : _mtnWizFmtNum(yearOrd);

        var diffRev = Math.round((displayTotalRev - yearRev) * 100) / 100;
        var diffOrd = displayTotalOrd - yearOrd;
        var dRevEl = document.getElementById('mtnWizMDiffRev');
        var dOrdEl = document.getElementById('mtnWizMDiffOrd');
        if (dRevEl) {
            if (diffRev === 0) { dRevEl.textContent = '✅ Chính xác'; dRevEl.style.color = '#16a34a'; }
            else { dRevEl.textContent = (diffRev > 0 ? '+' : '') + (isMkt ? (diffRev + '%') : _mtnWizFmtVND(diffRev)); dRevEl.style.color = '#dc2626'; }
        }
        if (dOrdEl) {
            if (diffOrd === 0) { dOrdEl.textContent = '✅ Đạt'; dOrdEl.style.color = '#16a34a'; }
            else { dOrdEl.textContent = (diffOrd > 0 ? '+' : '') + (isMkt ? _mtnWizFmtVND(diffOrd) : _mtnWizFmtNum(diffOrd)); dOrdEl.style.color = '#dc2626'; }
        }
    };

    // Save wizard config → POST all 12 months
    window._mtnWizSaveConfig = async function() {
        var yearRev = Number(document.getElementById('mtnWizYearRev')?.value) || 0;
        var yearOrd = Number(document.getElementById('mtnWizYearOrd')?.value) || 0;
        var isMkt = window._mtnCategory === 'marketing';

        if (yearRev <= 0 && yearOrd <= 0) {
            alert('⚠️ Vui lòng nhập Mục Tiêu TỔNG Cả Năm trước khi lưu!');
            return;
        }

        // Validate totals & check if all months have values
        var totalRev = 0, totalOrd = 0;
        var items = [];
        var yearNotesRaw = document.getElementById('mtnWizYearNotes')?.value || '';
        var qMethod = document.querySelector('input[name="mtnWizQMethod"]:checked')?.value || 'equal';
        var mMethod = document.querySelector('input[name="mtnWizMMethod"]:checked')?.value || 'equal';

        var noteMeta = JSON.stringify({
            notes: yearNotesRaw,
            qMethod: qMethod,
            mMethod: mMethod
        });

        var missingMonths = [];

        for (var m = 1; m <= 12; m++) {
            var revInput = document.querySelector('.mtn-wiz-m-rev[data-month="' + m + '"]');
            var ordInput = document.querySelector('.mtn-wiz-m-ord[data-month="' + m + '"]');
            var rev = Number(revInput?.value) || 0;
            var ord = Number(ordInput?.value) || 0;

            if (rev <= 0 && ord <= 0) {
                missingMonths.push(m);
            }

            totalRev += rev;
            totalOrd += ord;
            items.push({
                month: m,
                target_revenue: rev,
                target_orders: ord,
                target_notes: noteMeta,
                is_locked: 1
            });
        }

        if (missingMonths.length > 0) {
            alert('⚠️ Vui lòng nhập/phân bổ chỉ tiêu cho tất cả 12 tháng trước khi lưu!\n(Tháng còn trống/bằng 0: ' + missingMonths.map(function(tm) { return 'Tháng ' + tm; }).join(', ') + ')');
            return;
        }

        if (isMkt) {
            var displayTotalRev = Math.round((totalRev / 12) * 100) / 100;
            var displayTotalOrd = Math.round(totalOrd / 12);
            if (yearRev > 0 && Math.abs(displayTotalRev - yearRev) > 0.01) {
                alert('⚠️ Trung bình % CP/DS 12 Tháng (' + displayTotalRev + '%) ≠ Mục Tiêu Năm (' + yearRev + '%)!\n\nVui lòng chỉnh sửa lại Bước 3.');
                return;
            }
            if (yearOrd > 0 && Math.abs(displayTotalOrd - yearOrd) > 1) {
                alert('⚠️ Trung bình CPO 12 Tháng (' + _mtnWizFmtVND(displayTotalOrd) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtVND(yearOrd) + ')!\n\nVui lòng chỉnh sửa lại Bước 3.');
                return;
            }
        } else {
            if (yearRev > 0 && totalRev !== yearRev) {
                alert('⚠️ Tổng Doanh Số 12 Tháng (' + _mtnWizFmtVND(totalRev) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtVND(yearRev) + ')!\n\nVui lòng chỉnh sửa Bước 3.');
                return;
            }
            if (yearOrd > 0 && totalOrd !== yearOrd) {
                alert('⚠️ Tổng Số Đơn 12 Tháng (' + _mtnWizFmtNum(totalOrd) + ') ≠ Mục Tiêu Năm (' + _mtnWizFmtNum(yearOrd) + ')!\n\nVui lòng chỉnh sửa Bước 3.');
                return;
            }
        }

        // Also validate each quarter
        for (var q = 1; q <= 4; q++) {
            var qRev = Number(document.getElementById('mtnWizQ' + q + 'Rev')?.value) || 0;
            var qOrd = Number(document.getElementById('mtnWizQ' + q + 'Ord')?.value) || 0;
            var qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
            var qSumRev = 0, qSumOrd = 0;
            qMonths.forEach(function(mm) {
                qSumRev += Number(document.querySelector('.mtn-wiz-m-rev[data-month="' + mm + '"]')?.value) || 0;
                qSumOrd += Number(document.querySelector('.mtn-wiz-m-ord[data-month="' + mm + '"]')?.value) || 0;
            });
            if (isMkt) {
                var qAvgRev = Math.round((qSumRev / 3) * 100) / 100;
                if (qRev > 0 && Math.abs(qAvgRev - qRev) > 0.01) {
                    alert('⚠️ Quý ' + q + ': Trung bình 3 tháng % CP (' + qAvgRev + '%) ≠ Target Quý (' + qRev + '%)!\n\nVui lòng chỉnh sửa lại.');
                    return;
                }
            } else {
                if (qRev > 0 && qSumRev !== qRev) {
                    alert('⚠️ Quý ' + q + ': Tổng 3 tháng Doanh Số (' + _mtnWizFmtVND(qSumRev) + ') ≠ Target Quý (' + _mtnWizFmtVND(qRev) + ')!\n\nVui lòng chỉnh sửa lại.');
                    return;
                }
            }
        }

        // POST to API
        try {
            var res = await fetch('/api/yearly-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    year: window._mtnYear,
                    category: window._mtnCategory,
                    segment: window._mtnSegment || 'dong_phuc',
                    items: items
                })
            });
            var data = await res.json();
            if (res.ok && data.success) {
                _mtnWizIsSaved = true;
                _mtnWizIsEditing = false;
                window._mtnWizApplyLockState();
                window._mtnCloseConfigWizard();

                if (typeof showToast === 'function') {
                    showToast('✅ Đã lưu thành công Cấu Hình Mục Tiêu Năm ' + window._mtnYear + '!', 'success');
                } else {
                    alert('✅ Đã lưu thành công Cấu Hình Mục Tiêu Năm ' + window._mtnYear + '!');
                }
                // Reload page data
                var page = document.querySelector('.mtn-page');
                if (page && page.parentElement) {
                    renderMucTieuNamPage(page.parentElement);
                }
            } else {
                alert('❌ Lỗi lưu: ' + (data.error || 'Không xác định'));
            }
        } catch(e) {
            alert('❌ Lỗi kết nối: ' + e.message);
        }
    };

    // ========== SMART HINT POPOVER TOOLTIP LOGIC ==========
    function _mtnGetSmartHintEl() {
        let el = document.getElementById('mtnSmartHintTooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'mtnSmartHintTooltip';
            el.style.cssText = 'position:absolute; z-index:99999; background:linear-gradient(135deg,#1e40af,#1d4ed8); color:#fff; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:800; box-shadow:0 4px 16px rgba(0,0,0,0.25); display:none; white-space:nowrap; pointer-events:auto; cursor:pointer; transition:opacity 0.15s; font-family:"Plus Jakarta Sans","Inter",sans-serif;';
            document.body.appendChild(el);
        }
        return el;
    }

    window._mtnHideSmartHint = function() {
        const hint = document.getElementById('mtnSmartHintTooltip');
        if (hint) hint.style.display = 'none';
    };

    // Show smart hint for Quarter Input (Step 2)
    window._mtnShowSmartHintQ = function(inputEl, type) {
        var method = document.querySelector('input[name="mtnWizQMethod"]:checked')?.value;
        if (method !== 'custom') { window._mtnHideSmartHint(); return; }

        const hint = _mtnGetSmartHintEl();
        var isRev = type === 'revenue';
        var isMkt = window._mtnCategory === 'marketing';
        var yearTarget = Number(document.getElementById(isRev ? 'mtnWizYearRev' : 'mtnWizYearOrd')?.value) || 0;

        if (yearTarget <= 0) { hint.style.display = 'none'; return; }

        var otherSum = 0;
        for (var q = 1; q <= 4; q++) {
            var el = document.getElementById('mtnWizQ' + q + (isRev ? 'Rev' : 'Ord'));
            if (el && el !== inputEl) {
                otherSum += Number(el.value) || 0;
            }
        }

        var suggested = isMkt ? ((4 * yearTarget) - otherSum) : (yearTarget - otherSum);
        if (isMkt && isRev) suggested = Math.round(suggested * 100) / 100;
        var rect = inputEl.getBoundingClientRect();

        if (suggested < 0) {
            var exceededText = isMkt ? (isRev ? (Math.abs(suggested) + '%') : _mtnWizFmtVND(Math.abs(suggested)))
                                     : (isRev ? _mtnWizFmtVND(Math.abs(suggested)) : (_mtnWizFmtNum(Math.abs(suggested)) + ' đơn'));
            hint.innerHTML = '⚠️ Các quý khác đã vượt ' + exceededText + ' — cần giảm quý khác';
            hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = null;
        } else {
            var valText = isMkt ? (isRev ? (suggested + '%') : _mtnWizFmtVND(suggested))
                                : (isRev ? _mtnWizFmtVND(suggested) : (_mtnWizFmtNum(suggested) + ' đơn'));
            hint.innerHTML = '💡 Nhập <b>' + valText + '</b> để ' + (isMkt ? 'trung bình ' : '') + 'khớp Năm — <span style="text-decoration:underline; font-weight:900;">Bấm để điền</span>';
            hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = function() {
                inputEl.value = suggested;
                inputEl.dispatchEvent(new Event('input'));
                hint.style.display = 'none';
            };
        }
    };

    // Show smart hint for Month Input (Step 3) - Scoped to its Quarter Target
    window._mtnShowSmartHintM = function(inputEl, type) {
        var method = document.querySelector('input[name="mtnWizMMethod"]:checked')?.value;
        if (method !== 'custom') { window._mtnHideSmartHint(); return; }

        const hint = _mtnGetSmartHintEl();
        var mNum = Number(inputEl.getAttribute('data-month')) || 0;
        if (!mNum) return;

        var qNum = Math.ceil(mNum / 3);
        var qStart = (qNum - 1) * 3 + 1;
        var qEnd = qNum * 3;
        var isRev = type === 'revenue';
        var isMkt = window._mtnCategory === 'marketing';

        var qTargetEl = document.getElementById('mtnWizQ' + qNum + (isRev ? 'Rev' : 'Ord'));
        var qTarget = Number(qTargetEl?.value) || 0;

        if (qTarget <= 0) { hint.style.display = 'none'; return; }

        var otherSum = 0;
        for (var m = qStart; m <= qEnd; m++) {
            if (m === mNum) continue;
            var inp = document.querySelector((isRev ? '.mtn-wiz-m-rev' : '.mtn-wiz-m-ord') + '[data-month="' + m + '"]');
            if (inp) {
                otherSum += Number(inp.value) || 0;
            }
        }

        var suggested = isMkt ? ((3 * qTarget) - otherSum) : (qTarget - otherSum);
        if (isMkt && isRev) suggested = Math.round(suggested * 100) / 100;
        var rect = inputEl.getBoundingClientRect();

        if (suggested < 0) {
            var exceededText = isMkt ? (isRev ? (Math.abs(suggested) + '%') : _mtnWizFmtVND(Math.abs(suggested)))
                                     : (isRev ? _mtnWizFmtVND(Math.abs(suggested)) : (_mtnWizFmtNum(Math.abs(suggested)) + ' đơn'));
            hint.innerHTML = '⚠️ Các tháng khác trong Quý ' + qNum + ' đã vượt ' + exceededText + ' — cần giảm tháng khác';
            hint.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = null;
        } else {
            var valText = isMkt ? (isRev ? (suggested + '%') : _mtnWizFmtVND(suggested))
                                : (isRev ? _mtnWizFmtVND(suggested) : (_mtnWizFmtNum(suggested) + ' đơn'));
            hint.innerHTML = '💡 Nhập <b>' + valText + '</b> để ' + (isMkt ? 'trung bình ' : '') + 'khớp Quý ' + qNum + ' — <span style="text-decoration:underline; font-weight:900;">Bấm để điền</span>';
            hint.style.background = 'linear-gradient(135deg,#1e40af,#1d4ed8)';
            hint.style.display = 'block';
            hint.style.left = (rect.left + window.scrollX) + 'px';
            hint.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            hint.onclick = function() {
                inputEl.value = suggested;
                inputEl.dispatchEvent(new Event('input'));
                hint.style.display = 'none';
            };
        }
    };

    // Toggle & Save Month Strategy Note (Director Only)
    window._mtnToggleMonthStrategyNote = async function(m) {
        var noteInp = document.getElementById('mtnNotes_' + m);
        if (!noteInp) return;
        var btn = document.getElementById('mtnNoteEditBtn_' + m);
        var isEditing = btn && btn.getAttribute('data-editing') === 'true';

        if (!isEditing) {
            // Switch to Edit Mode
            noteInp.disabled = false;
            noteInp.focus();
            noteInp.style.background = '#ffffff';
            noteInp.style.borderColor = '#2563eb';
            noteInp.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)';
            if (btn) {
                btn.setAttribute('data-editing', 'true');
                btn.innerHTML = '💾 Lưu chiến lược';
                btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#15803d';
            }
        } else {
            // Save strategy note
            var newText = noteInp.value.trim();
            var mData = (window._mtnData && window._mtnData[m]) ? window._mtnData[m] : {};
            var existingRaw = mData.target_notes || '';

            var qMethod = 'equal', mMethod = 'equal';
            if (existingRaw.startsWith('{') && existingRaw.endsWith('}')) {
                try {
                    var p = JSON.parse(existingRaw);
                    if (p.qMethod) qMethod = p.qMethod;
                    if (p.mMethod) mMethod = p.mMethod;
                } catch(e) {}
            }

            var noteMeta = JSON.stringify({
                notes: newText,
                qMethod: qMethod,
                mMethod: mMethod
            });

            try {
                var res = await fetch('/api/yearly-targets/month-note', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        year: window._mtnYear,
                        category: window._mtnCategory,
                        segment: window._mtnSegment || 'dong_phuc',
                        month: m,
                        target_notes: noteMeta
                    })
                });
                var data = await res.json();
                if (res.ok && data.success) {
                    if (window._mtnData[m]) window._mtnData[m].target_notes = noteMeta;
                    noteInp.disabled = true;
                    noteInp.style.background = '#f8fafc';
                    noteInp.style.borderColor = '#cbd5e1';
                    noteInp.style.boxShadow = 'none';
                    if (btn) {
                        btn.setAttribute('data-editing', 'false');
                        btn.innerHTML = '✏️ Sửa chiến lược';
                        btn.style.background = '#eff6ff';
                        btn.style.color = '#2563eb';
                        btn.style.borderColor = '#bfdbfe';
                    }
                    if (typeof showToast === 'function') {
                        showToast('✅ Đã lưu chiến lược Tháng ' + m + '/' + window._mtnYear + '!', 'success');
                    } else {
                        alert('✅ Đã lưu chiến lược Tháng ' + m + '/' + window._mtnYear + '!');
                    }
                } else {
                    alert('❌ Lỗi lưu: ' + (data.error || 'Không xác định'));
                }
            } catch(e) {
                alert('❌ Lỗi kết nối: ' + e.message);
            }
        }
    };
})();
