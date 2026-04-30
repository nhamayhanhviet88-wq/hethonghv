/**
 * Holiday-Aware Custom Calendar Component
 * Shared utility for all CRM consultation modals.
 * Replaces native <input type="date"> with an inline calendar
 * that blocks holidays and shows holiday names.
 * 
 * Usage:
 *   initHolidayCalendar({
 *     containerId: 'consultCalendarContainer',
 *     hiddenInputId: 'consultAppointment',
 *     minDate: '2026-05-01',   // optional
 *     maxDate: '2026-05-15',   // optional
 *     onSelect: (dateStr) => { ... }  // optional callback
 *   });
 */

// Global holiday cache: { '2026': [ {holiday_date:'2026-01-01', holiday_name:'...'}, ... ] }
window._holidayCache = window._holidayCache || {};

// Fetch holidays for a year (cached)
async function _fetchHolidays(year) {
    if (window._holidayCache[year]) return window._holidayCache[year];
    try {
        const data = await apiCall(`/api/holidays?year=${year}`);
        const holidays = (data.holidays || []).map(h => {
            // Normalize date to YYYY-MM-DD
            const d = h.holiday_date.includes('T') ? h.holiday_date.split('T')[0] : h.holiday_date;
            return { date: d, name: h.holiday_name };
        });
        window._holidayCache[year] = holidays;
        return holidays;
    } catch (e) {
        console.warn('[HolidayCalendar] Failed to fetch holidays:', e);
        return [];
    }
}

// Build holiday lookup map for quick access: { 'YYYY-MM-DD': 'Holiday Name' }
async function _getHolidayMap(year) {
    const holidays = await _fetchHolidays(year);
    const map = {};
    holidays.forEach(h => { map[h.date] = h.name; });
    return map;
}

// Preload current year holidays on page load
(async () => {
    const yr = new Date().getFullYear();
    await _fetchHolidays(yr);
    // Also preload next year if we're in Nov/Dec
    if (new Date().getMonth() >= 10) await _fetchHolidays(yr + 1);
})();

/**
 * Initialize the custom holiday calendar
 */
async function initHolidayCalendar(opts) {
    const container = document.getElementById(opts.containerId);
    if (!container) return;

    // State
    const state = {
        currentMonth: new Date().getMonth(),     // 0-indexed
        currentYear: new Date().getFullYear(),
        selectedDate: null,
        minDate: opts.minDate || null,
        maxDate: opts.maxDate || null,
        onSelect: opts.onSelect || null,
        hiddenInputId: opts.hiddenInputId || 'consultAppointment',
        holidayMaps: {}  // year -> map
    };

    // Store state on container for external access
    container._calState = state;

    // Load holidays for current year
    state.holidayMaps[state.currentYear] = await _getHolidayMap(state.currentYear);

    // Set initial month based on minDate (if minDate is in the future)
    if (state.minDate) {
        const minD = new Date(state.minDate);
        if (minD.getMonth() !== state.currentMonth || minD.getFullYear() !== state.currentYear) {
            state.currentMonth = minD.getMonth();
            state.currentYear = minD.getFullYear();
        }
    }

    renderCalendar(container, state);
}

/**
 * Update min/max after init (used by onConsultTypeChange for maxDays)
 */
function updateHolidayCalendarMinMax(containerId, minDate, maxDate) {
    const container = document.getElementById(containerId);
    if (!container || !container._calState) return;
    const state = container._calState;
    if (minDate !== undefined) state.minDate = minDate;
    if (maxDate !== undefined) state.maxDate = maxDate;
    // Clear selection if it's now out of range
    if (state.selectedDate) {
        if ((state.minDate && state.selectedDate < state.minDate) || 
            (state.maxDate && state.selectedDate > state.maxDate)) {
            state.selectedDate = null;
            const hidden = document.getElementById(state.hiddenInputId);
            if (hidden) hidden.value = '';
        }
    }
    renderCalendar(container, state);
}

/**
 * Get currently selected date
 */
function getHolidayCalendarValue(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !container._calState) return '';
    return container._calState.selectedDate || '';
}

/**
 * Clear the calendar selection
 */
function clearHolidayCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !container._calState) return;
    container._calState.selectedDate = null;
    const hidden = document.getElementById(container._calState.hiddenInputId);
    if (hidden) hidden.value = '';
    renderCalendar(container, container._calState);
}

/**
 * Render the calendar grid
 */
async function renderCalendar(container, state) {
    const year = state.currentYear;
    const month = state.currentMonth;

    // Ensure holidays are loaded for this year
    if (!state.holidayMaps[year]) {
        state.holidayMaps[year] = await _getHolidayMap(year);
    }
    const holidayMap = state.holidayMaps[year] || {};

    // Also load adjacent year holidays if viewing Dec/Jan
    if (month === 11 && !state.holidayMaps[year + 1]) {
        state.holidayMaps[year + 1] = await _getHolidayMap(year + 1);
    }
    if (month === 0 && !state.holidayMaps[year - 1]) {
        state.holidayMaps[year - 1] = await _getHolidayMap(year - 1);
    }

    // Merge all loaded holiday maps for lookup
    const allHolidays = {};
    Object.values(state.holidayMaps).forEach(m => Object.assign(allHolidays, m));

    const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                         'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    const DAY_HEADERS = ['H','B','T','N','S','B','C']; // Mon-Sun

    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay() || 7; // 1=Mon..7=Sun
    const daysInMonth = lastDay.getDate();

    // Calculate grid start (Monday of the week containing the 1st)
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - (startDow - 1));

    // Today string
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    // Build header
    let html = `
        <div style="font-family:'Segoe UI',system-ui,sans-serif;user-select:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px;margin-bottom:6px;">
                <button type="button" onclick="calNavMonth('${container.id}',-1)" style="background:none;border:1px solid var(--gray-200,#e5e7eb);border-radius:6px;cursor:pointer;padding:4px 10px;font-size:14px;color:#374151;transition:all 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">◀</button>
                <span style="font-weight:700;font-size:14px;color:#122546;">${MONTH_NAMES[month]} ${year}</span>
                <button type="button" onclick="calNavMonth('${container.id}',1)" style="background:none;border:1px solid var(--gray-200,#e5e7eb);border-radius:6px;cursor:pointer;padding:4px 10px;font-size:14px;color:#374151;transition:all 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">▶</button>
            </div>
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <thead><tr>
                    ${DAY_HEADERS.map((d, i) => `<th style="text-align:center;font-size:11px;font-weight:700;padding:4px 0;color:${i === 6 ? '#ef4444' : '#6b7280'};">${d}</th>`).join('')}
                </tr></thead>
                <tbody>
    `;

    // Build weeks
    let cursor = new Date(gridStart);
    for (let week = 0; week < 6; week++) {
        // Check if we've passed the month entirely
        if (cursor.getMonth() > month && cursor.getFullYear() >= year && week > 0) break;
        if (cursor.getFullYear() > year && week > 0) break;

        html += '<tr>';
        for (let dow = 0; dow < 7; dow++) {
            const cellYear = cursor.getFullYear();
            const cellMonth = cursor.getMonth();
            const cellDate = cursor.getDate();
            const dateStr = cellYear + '-' + String(cellMonth + 1).padStart(2, '0') + '-' + String(cellDate).padStart(2, '0');
            const isCurrentMonth = cellMonth === month && cellYear === year;
            const isSunday = dow === 6;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === state.selectedDate;
            const holidayName = allHolidays[dateStr] || null;
            const isHoliday = !!holidayName;

            // Determine if date is in valid range
            const isPast = state.minDate ? dateStr < state.minDate : false;
            const isFuture = state.maxDate ? dateStr > state.maxDate : false;
            const isDisabled = isPast || isFuture || isHoliday || !isCurrentMonth;

            // Styles
            let bg = 'transparent';
            let color = isCurrentMonth ? '#1e293b' : '#d1d5db';
            let fontWeight = '500';
            let border = 'none';
            let cursor_style = 'pointer';
            let opacity = '1';
            let title = '';
            let extraHTML = '';

            if (isSelected) {
                bg = 'linear-gradient(135deg, #fad24c, #f59e0b)';
                color = '#0f172a';
                fontWeight = '800';
                border = '2px solid #f59e0b';
            } else if (isHoliday && isCurrentMonth) {
                bg = '#fef2f2';
                color = '#dc2626';
                fontWeight = '700';
                border = '1px solid #fecaca';
                cursor_style = 'not-allowed';
                title = `🎌 ${holidayName}`;
                // Show holiday name below date
                extraHTML = `<div style="font-size:7px;color:#dc2626;line-height:1;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${holidayName.length > 6 ? holidayName.substring(0,6)+'..' : holidayName}</div>`;
            } else if (isToday && isCurrentMonth) {
                bg = '#eff6ff';
                border = '2px solid #3b82f6';
                color = '#1d4ed8';
                fontWeight = '700';
            } else if (isSunday && isCurrentMonth) {
                color = '#ef4444';
            }

            if (isDisabled && !isSelected) {
                cursor_style = isHoliday && isCurrentMonth ? 'not-allowed' : 'default';
                if (!isHoliday || !isCurrentMonth) opacity = '0.4';
            }

            const onClick = isDisabled 
                ? (isHoliday && isCurrentMonth ? `showToast('🎌 ${holidayName.replace(/'/g,"\\'")} — Ngày lễ không thể chọn!','error')` : '')
                : `calSelectDate('${container.id}','${dateStr}')`;

            html += `<td style="text-align:center;padding:2px;vertical-align:top;">
                <div ${onClick ? `onclick="${onClick}"` : ''} title="${title}" 
                    style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    min-height:34px;border-radius:8px;background:${bg};color:${color};
                    font-weight:${fontWeight};font-size:13px;border:${border};
                    cursor:${cursor_style};opacity:${opacity};transition:all 0.15s;position:relative;"
                    ${!isDisabled ? `onmouseover="if(!this.dataset.sel)this.style.background='#f0f9ff'" onmouseout="if(!this.dataset.sel)this.style.background='transparent'"` : ''}
                    ${isSelected ? 'data-sel="1"' : ''}>
                    ${cellDate}
                    ${extraHTML}
                </div>
            </td>`;

            cursor.setDate(cursor.getDate() + 1);
        }
        html += '</tr>';
    }

    html += '</tbody></table>';

    // Legend
    html += `
        <div style="display:flex;gap:12px;margin-top:6px;font-size:10px;color:#6b7280;align-items:center;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;border-radius:50%;background:#fef2f2;border:1px solid #fecaca;display:inline-block;"></span> Ngày lễ</span>
            <span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#f59e0b);display:inline-block;"></span> Đã chọn</span>
            <span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;border-radius:50%;border:2px solid #3b82f6;display:inline-block;"></span> Hôm nay</span>
        </div>
    `;

    // Selected date display
    if (state.selectedDate) {
        const sd = new Date(state.selectedDate);
        const dayNames = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
        html += `<div style="margin-top:6px;padding:6px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#92400e;font-weight:600;">
            📅 ${dayNames[sd.getDay()]} — ${sd.getDate()}/${sd.getMonth()+1}/${sd.getFullYear()}
            <span onclick="clearHolidayCalendar('${container.id}')" style="cursor:pointer;float:right;color:#dc2626;font-size:11px;" title="Xóa chọn">✕ Xóa</span>
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Navigate months
async function calNavMonth(containerId, delta) {
    const container = document.getElementById(containerId);
    if (!container || !container._calState) return;
    const state = container._calState;
    state.currentMonth += delta;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    renderCalendar(container, state);
}

// Select a date
function calSelectDate(containerId, dateStr) {
    const container = document.getElementById(containerId);
    if (!container || !container._calState) return;
    const state = container._calState;
    state.selectedDate = dateStr;
    // Update hidden input
    const hidden = document.getElementById(state.hiddenInputId);
    if (hidden) hidden.value = dateStr;
    renderCalendar(container, state);
    // Callback
    if (state.onSelect) state.onSelect(dateStr);
}
