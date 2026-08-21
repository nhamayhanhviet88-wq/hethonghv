// ========== QUY TRÌNH CUỘC HỌP ==========
// 3 Tabs: 📋 Quy Trình | 📅 Lịch Sử | 🏢 Phòng Ban

(function() {
    'use strict';

    // ========== STATE ==========
    var _mpProcesses = [];
    var _mpActiveProcessId = null;
    var _mpFilterProcess = 'all';
    var _mpSteps = [];
    var _mpSessions = [];
    var _mpNotes = [];
    var _mpProtocols = [];
    var _mpDepartments = [];
    var _mpAllUsers = [];
    var _mpCurrentTab = 'process';
    var _mpSessionPage = 1;
    var _mpSessionTotal = 0;
    var _mpSessionTotalPages = 1;
    var _mpFilterYear = new Date().getFullYear();
    var _mpFilterMonth = '';
    var _mpFilterQuarter = '';
    var _mpFilterSearch = '';
    var _mpCanEdit = false;
    var _mpCanCreate = false;
    var _mpCanDelete = false;
    var _mpPrevStepNotesCache = {};
    var _mpEditingCompletedSessionId = null;
    window._mpEvidenceSaveTimer = null;

    function _mpIsDirector() {
        var u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
        if (!u) return false;
        return u.role === 'giam_doc' || u.role === 'admin' || (u.role && String(u.role).toLowerCase().includes('giam_doc'));
    }

    function _mpCanReopenSession(session) {
        if (!session) return false;
        if (_mpIsDirector()) return true;
        var u = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
        if (!u) return false;
        if (session.chairperson_id && String(session.chairperson_id) === String(u.id)) return true;
        if (session.created_by && String(session.created_by) === String(u.id)) return true;
        if (session.chairperson_name && u.full_name && session.chairperson_name.trim().toLowerCase() === u.full_name.trim().toLowerCase()) return true;
        return false;
    }

    function _mpIsSessionEditable(session) {
        if (!session) return false;
        if (session.status !== 'da_ket_thuc') return true; // Ongoing meeting is editable
        return _mpEditingCompletedSessionId === session.id; // Completed meeting is editable ONLY if unlocked by Director
    }

    window._mpToggleCompletedSessionEditMode = function(sessionId) {
        if (!_mpIsDirector()) {
            return alert('⚠️ Chỉ có tài khoản Giám Đốc mới có quyền mở chỉnh sửa cuộc họp đã kết thúc!');
        }
        if (_mpEditingCompletedSessionId === sessionId) {
            _mpEditingCompletedSessionId = null;
        } else {
            _mpEditingCompletedSessionId = sessionId;
        }
        _mpRenderSessionDetail();
    };

    // ========== COLORS ==========
    var C = {
        navy: '#0f172a',
        indigo: '#4338ca',
        violet: '#7c3aed',
        slate50: '#f8fafc',
        slate100: '#f1f5f9',
        slate200: '#e2e8f0',
        slate300: '#cbd5e1',
        slate400: '#94a3b8',
        slate500: '#64748b',
        slate600: '#475569',
        slate700: '#334155',
        slate800: '#1e293b',
        white: '#ffffff',
        green: '#10b981',
        greenDark: '#059669',
        amber: '#f59e0b',
        red: '#ef4444',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        cyan: '#06b6d4',
        rose: '#f43f5e'
    };

    // ========== ROLE LABEL ==========
    var ROLE_LABELS = {
        'giam_doc': 'Giám Đốc',
        'quan_ly_cap_cao': 'Quản Lý Cấp Cao',
        'quan_ly': 'Quản Lý',
        'truong_phong': 'Trưởng Phòng',
        'nhan_vien': 'Nhân Viên',
        'thu_viec': 'Thử Việc',
        'part_time': 'Part-time'
    };

    function _getValidPreviousStepItems(content) {
        if (!content || typeof content !== 'string') return [];
        var rawLines = content.split('\n').map(function(l) { return l.trim(); });
        var validItems = [];
        for (var i = 0; i < rawLines.length; i++) {
            var text = rawLines[i].replace(/^\d+[\.\)]\s*/, '').trim();
            if (text.length > 0) {
                validItems.push({ index: i, text: text });
            }
        }
        return validItems;
    }

    function _mpCheckStepCompletionStatus(stepId) {
        var stepObj = _mpSteps.find(function(s) { return String(s.id) === String(stepId); });
        if (stepObj) {
            var titleLower = (stepObj.title || '').toLowerCase();
            if (titleLower.indexOf('tổng kết') >= 0 || titleLower.indexOf('kết thúc') >= 0) {
                return 'SUMMARY';
            }
        }

        // 1. Check previous step tasks
        var isPrevTasksHandled = true;
        var prevData = _mpPrevStepNotesCache[stepId];

        if (!prevData && _mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
            var activeStepObj = _mpSteps[_mpActiveStepIndex];
            if (String(activeStepObj.id) === String(stepId) && _mpPrevStepData) {
                prevData = _mpPrevStepData;
            }
        }

        if (prevData && prevData.success && prevData.note && prevData.note.content) {
            var note = prevData.note;
            var validItems = _getValidPreviousStepItems(note.content);
            if (validItems.length > 0) {
                var savedStatuses = [];
                try { savedStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}
                for (var i = 0; i < validItems.length; i++) {
                    var idx = validItems[i].index;
                    var statusObj = savedStatuses.find(function(s) { return String(s.index) === String(idx); }) || {};
                    var isItemDone = (statusObj.completed === true || statusObj.completed === 'true' || statusObj.completed === 1 || statusObj.done === true || statusObj.done === 'true' || statusObj.done === 1);
                    var isItemTransferred = !!statusObj.transferred_to;
                    var hasEvidenceNote = !!(statusObj.evidence_link && statusObj.evidence_link.trim());
                    if (!isItemTransferred && (!isItemDone || !hasEvidenceNote)) {
                        isPrevTasksHandled = false;
                        break;
                    }
                }
            }
        }

        // 2. Check current note
        var curNote = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });
        var isSkipped = curNote && (curNote.is_skipped === true || curNote.is_skipped === 'true' || curNote.is_skipped === 1);
        
        var hasContent = false;
        if (curNote && curNote.content) {
            var lines = curNote.content.split('\n').map(function(l) {
                return l.replace(/^\d+[\.\)]\s*/, '').trim();
            }).filter(function(l) { return l.length > 0; });
            hasContent = lines.length > 0;
        }

        if (!isPrevTasksHandled) {
            return 'PENDING';
        }
        if (isSkipped) {
            return 'SKIPPED';
        }
        if (hasContent) {
            return 'COMPLETED';
        }
        return 'PENDING';
    }

    function _mpPrefetchAllPreviousStepNotes(sessionId, headers) {
        _mpPrevStepNotesCache = {};
        if (!sessionId || !_mpSteps || _mpSteps.length === 0) return;
        _mpSteps.forEach(function(st) {
            var url = '/api/meeting-process/sessions/' + sessionId + '/steps/' + st.id + '/previous-note';
            fetch(url, { credentials: 'include', headers: headers })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(res) {
                    if (res && res.success) {
                        _mpPrevStepNotesCache[st.id] = res;
                        _mpUpdateStepperItemUI(st.id);
                    }
                })
                .catch(function() {});
        });
    }

    function _mpUpdateStepperItemUI(stepId) {
        if (!stepId) return;

        var stepIndex = _mpSteps.findIndex(function(s) { return String(s.id) === String(stepId); });
        var el = document.getElementById('mp-step-icon-' + stepId);
        if (el) {
            var stepStatus = _mpCheckStepCompletionStatus(stepId);

            var circleBg = C.slate200;
            var circleColor = C.slate600;
            var circleText = (stepIndex >= 0) ? String(stepIndex + 1) : '';

            if (stepStatus === 'SKIPPED') {
                circleBg = '#ef4444';
                circleColor = 'white';
                circleText = '❌';
            } else if (stepStatus === 'COMPLETED') {
                circleBg = C.green;
                circleColor = 'white';
                circleText = '✓';
            } else if (stepStatus === 'SUMMARY') {
                circleBg = C.purple;
                circleColor = 'white';
                circleText = '🔚';
            }

            el.style.background = circleBg;
            el.style.color = circleColor;
            el.innerHTML = circleText;
        }

        _mpRefreshSummarySaveButtonUnlock();
    }

    function _mpRefreshSummarySaveButtonUnlock() {
        var container = document.getElementById('mp-summary-save-container');
        if (!container) return;

        var allStepsCompleted = _mpSteps.length > 0 && _mpSteps.every(function(st) {
            var status = _mpCheckStepCompletionStatus(st.id);
            return status === 'COMPLETED' || status === 'SKIPPED' || status === 'SUMMARY';
        });

        if (!allStepsCompleted) {
            var uncompletedSteps = _mpSteps.filter(function(st) {
                var status = _mpCheckStepCompletionStatus(st.id);
                return status !== 'COMPLETED' && status !== 'SKIPPED' && status !== 'SUMMARY';
            }).map(function(st) { return st.title; });

            container.innerHTML = '<div style="font-size:12px;color:#d97706;background:#fffbeb;padding:8px 14px;border-radius:8px;border:1px solid #fef3c7;font-weight:600;">⚠️ Còn ' + uncompletedSteps.length + ' bước chưa xử lý xong công việc cũ hoặc chưa nhập thảo luận / chưa chọn Bỏ qua (' + uncompletedSteps.slice(0, 3).join(', ') + (uncompletedSteps.length > 3 ? '...' : '') + '). Hoàn thành tất cả các bước (đạt tích xanh ✓ hoặc ❌) để mở khóa nút Lưu!</div>' +
            '<button disabled onclick="alert(\'⚠️ Vui lòng xử lý xong 100% việc cũ và nhập thảo luận (✓) hoặc chọn Bỏ qua (❌) cho tất cả các bước họp trước khi Lưu Kết Luận & Biên Bản!\')" style="padding:10px 22px;background:#cbd5e1;color:#64748b;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:not-allowed;opacity:0.65;box-shadow:none;">🔒 Lưu Kết Luận & Biên Bản (Chưa đủ điều kiện)</button>';
        } else {
            container.innerHTML = '<button onclick="window._mpSaveSummaryConclusion(' + _mpActiveSessionId + ')" style="padding:10px 22px;background:linear-gradient(135deg,' + C.green + ',' + C.greenDark + ');color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(16,185,129,0.3);">💾 Lưu Kết Luận & Biên Bản</button>';
        }
    }

    function _formatDate(dateStr) {
        if (!dateStr) return '';
        if (typeof dateStr !== 'string') dateStr = String(dateStr);
        var parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        return dateStr;
    }

    function _escHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ========== STATE PERSISTENCE HELPERS ==========
    function _mpSaveState() {
        var state = {
            currentTab: _mpCurrentTab,
            activeProcessId: _mpActiveProcessId,
            activeSessionId: _mpActiveSessionId,
            activeStepIndex: _mpActiveStepIndex,
            sessionPage: _mpSessionPage,
            filterYear: _mpFilterYear,
            filterMonth: _mpFilterMonth,
            filterQuarter: _mpFilterQuarter,
            filterSearch: _mpFilterSearch,
            filterProcess: _mpFilterProcess
        };
        try {
            sessionStorage.setItem('_mp_state', JSON.stringify(state));
        } catch(e) {}
    }

    function _mpRestoreState() {
        try {
            var raw = sessionStorage.getItem('_mp_state');
            if (!raw) return false;
            var saved = JSON.parse(raw);
            if (saved.currentTab) _mpCurrentTab = saved.currentTab;
            if (saved.activeProcessId) _mpActiveProcessId = saved.activeProcessId;
            if (saved.activeSessionId !== undefined && saved.activeSessionId !== null) _mpActiveSessionId = saved.activeSessionId;
            if (saved.activeStepIndex !== undefined && saved.activeStepIndex !== null) _mpActiveStepIndex = saved.activeStepIndex;
            if (saved.sessionPage) _mpSessionPage = saved.sessionPage;
            if (saved.filterYear) _mpFilterYear = saved.filterYear;
            if (saved.filterMonth !== undefined) _mpFilterMonth = saved.filterMonth;
            if (saved.filterQuarter !== undefined) _mpFilterQuarter = saved.filterQuarter;
            if (saved.filterSearch !== undefined) _mpFilterSearch = saved.filterSearch;
            if (saved.filterProcess) _mpFilterProcess = saved.filterProcess;
            return true;
        } catch(e) {
            return false;
        }
    }

    // ========== INIT ==========
    window.initQuyTrinhCuocHop = function(container) {
        container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;min-height:400px;"><div style="text-align:center;"><div class="spinner" style="width:40px;height:40px;border:4px solid ' + C.slate200 + ';border-top-color:' + C.indigo + ';border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div><div style="color:' + C.slate500 + ';font-size:15px;">Đang tải Quy Trình Cuộc Họp...</div></div></div>';

        // Detect F5 vs menu navigation
        var lastPage = sessionStorage.getItem('_mp_lastPage');
        var isReload = (lastPage === 'quytrinhcuochop' || lastPage === 'quy-trinh-cuoc-hop');
        sessionStorage.setItem('_mp_lastPage', 'quytrinhcuochop');

        if (isReload) {
            _mpRestoreState();
        } else {
            // Came from another menu -> reset to default "Quy Trình" tab (Image 2)
            _mpCurrentTab = 'process';
            _mpActiveProcessId = null;
            _mpActiveSessionId = null;
            _mpActiveStepIndex = 0;
            _mpSessionPage = 1;
            _mpFilterYear = new Date().getFullYear();
            _mpFilterMonth = '';
            _mpFilterQuarter = '';
            _mpFilterSearch = '';
            _mpFilterProcess = 'all';
            try { sessionStorage.removeItem('_mp_state'); } catch(e) {}
        }

        // Check permissions
        _mpCheckPermissions(function() {
            // Load all data
            _mpLoadAllData(function() {
                _mpRender(container);
            });
        });
    };

    // ========== CHECK PERMISSIONS ==========
    function _mpCheckPermissions(cb) {
        var user = window._currentUser || window.currentUser || {};
        if (user.role === 'giam_doc') {
            _mpCanEdit = true;
            _mpCanCreate = true;
            _mpCanDelete = true;
            return cb();
        }

        // Check user_permissions
        fetch('/api/users/me/permissions', { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .catch(function() { return {}; })
            .then(function(data) {
                if (data && data.permissions) {
                    var p = data.permissions['quy_trinh_cuoc_hop'] || {};
                    _mpCanEdit = !!p.edit;
                    _mpCanCreate = !!p.create;
                    _mpCanDelete = !!p['delete'];
                }
                cb();
            });
    }

    // ========== LOAD ALL DATA ==========
    function _mpLoadAllData(cb) {
        _mpLoadProcessesAndSteps(function() {
            var loaded = 0;
            var total = 2;
            function done() {
                loaded++;
                if (loaded >= total) {
                    if (_mpCurrentTab === 'session_detail' && _mpActiveSessionId) {
                        var token = localStorage.getItem('token');
                        var headers = {};
                        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

                        var session = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
                        var targetProcessId = (session && session.process_id) ? session.process_id : (_mpActiveProcessId || 1);

                        fetch('/api/meeting-process/steps?process_id=' + targetProcessId, { credentials: 'include', headers: headers })
                            .then(function(r) { return r.json(); })
                            .then(function(sd) {
                                _mpSteps = sd.steps || [];
                                _mpPrefetchAllPreviousStepNotes(_mpActiveSessionId, headers);
                                return fetch('/api/meeting-process/sessions/' + _mpActiveSessionId + '/notes', { credentials: 'include', headers: headers });
                            })
                            .then(function(r) { return r.json(); })
                            .then(function(d) {
                                _mpNotes = d.notes || [];
                                cb();
                            })
                            .catch(function() {
                                _mpNotes = [];
                                cb();
                            });
                    } else if (_mpCurrentTab === 'departments' && _mpProtocols.length === 0) {
                        _mpLoadProtocols(function() {
                            cb();
                        });
                    } else {
                        cb();
                    }
                }
            }

            // Load sessions
            _mpLoadSessions(done);

            // Load users
            fetch('/api/meeting-process/users', { credentials: 'include' })
                .then(function(r) { return r.json(); })
                .then(function(d) { _mpAllUsers = d.users || []; done(); })
                .catch(function() { done(); });
        });
    }

    function _mpLoadProcessesAndSteps(cb) {
        fetch('/api/meeting-process/processes', { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                _mpProcesses = d.processes || [];
                if (!_mpActiveProcessId || !_mpProcesses.find(function(p) { return p.id == _mpActiveProcessId; })) {
                    _mpActiveProcessId = _mpProcesses.length > 0 ? _mpProcesses[0].id : 1;
                }
                _mpLoadStepsForActiveProcess(cb);
            })
            .catch(function() {
                _mpProcesses = [{ id: 1, name: 'Quy Trình Họp Công Ty', icon: '🏢', description: 'Quy trình họp chuẩn dành cho toàn thể công ty' }];
                _mpActiveProcessId = 1;
                _mpLoadStepsForActiveProcess(cb);
            });
    }

    function _mpLoadStepsForActiveProcess(cb) {
        var pid = _mpActiveProcessId || 1;
        fetch('/api/meeting-process/steps?process_id=' + pid, { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                _mpSteps = d.steps || [];
                if (cb) cb();
            })
            .catch(function() { if (cb) cb(); });
    }

    function _mpLoadSessions(cb) {
        var params = '?page=' + _mpSessionPage + '&limit=20';
        if (_mpFilterProcess && _mpFilterProcess !== 'all') params += '&process_id=' + _mpFilterProcess;
        if (_mpFilterYear) params += '&year=' + _mpFilterYear;
        if (_mpFilterMonth) params += '&month=' + _mpFilterMonth;
        if (_mpFilterQuarter) params += '&quarter=' + _mpFilterQuarter;
        if (_mpFilterSearch) params += '&search=' + encodeURIComponent(_mpFilterSearch);

        fetch('/api/meeting-process/sessions' + params, { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                _mpSessions = d.sessions || [];
                _mpSessionTotal = d.total || 0;
                _mpSessionTotalPages = d.totalPages || 1;
                if (cb) cb();
            })
            .catch(function() { if (cb) cb(); });
    }

    function _mpLoadProtocols(cb) {
        fetch('/api/meeting-process/dept-protocols', { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                _mpProtocols = d.protocols || [];
                _mpDepartments = d.departments || [];
                if (cb) cb();
            })
            .catch(function() { if (cb) cb(); });
    }

    // ========== MAIN RENDER ==========
    function _mpRender(container) {
        var html = '';

        // ===== HEADER =====
        html += '<div style="background:linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.indigo + ' 50%, ' + C.violet + ' 100%);border-radius:20px;padding:32px 36px 24px;margin-bottom:24px;position:relative;overflow:hidden;">';
        html += '<div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:rgba(255,255,255,0.04);border-radius:50%;"></div>';
        html += '<div style="position:absolute;bottom:-60px;left:-30px;width:160px;height:160px;background:rgba(255,255,255,0.03);border-radius:50%;"></div>';
        html += '<div style="position:relative;z-index:1;">';
        html += '<h1 style="color:white;font-size:26px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">🏛️ QUY TRÌNH CUỘC HỌP</h1>';
        html += '<p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">Quản lý quy trình, biên bản và lịch sử các cuộc họp công ty</p>';
        html += '</div>';
        html += '</div>';

        // ===== TABS =====
        var tabs = [
            { key: 'process', icon: '📋', label: 'Quy Trình' },
            { key: 'history', icon: '📅', label: 'Tạo Cuộc Họp' },
            { key: 'task_history', icon: '📊', label: 'Lịch Sử Công Việc' }
        ];
        html += '<div style="display:flex;gap:8px;margin-bottom:24px;background:' + C.slate100 + ';padding:7px;border-radius:16px;box-shadow:inset 0 2px 6px rgba(0,0,0,0.06);">';
        for (var i = 0; i < tabs.length; i++) {
            var t = tabs[i];
            var isActive = _mpCurrentTab === t.key;
            html += '<button id="mp-tab-btn-' + t.key + '" onclick="window._mpSwitchTab(\'' + t.key + '\')" style="flex:1;padding:14px 24px;border:none;border-radius:12px;font-size:15px;font-weight:' + (isActive ? '700' : '500') + ';cursor:pointer;transition:all 0.3s ease;';
            if (isActive) {
                html += 'background:' + C.white + ';color:' + C.indigo + ';box-shadow:0 4px 16px rgba(67,56,202,0.18), 0 2px 6px rgba(0,0,0,0.08);transform:translateY(-1px);';
            } else {
                html += 'background:transparent;color:' + C.slate500 + ';';
            }
            html += '">' + t.icon + ' ' + t.label + '</button>';
        }
        html += '</div>';

        // ===== TAB CONTENT =====
        html += '<div id="mp-tab-content"></div>';

        container.innerHTML = html;

        // Render tab content
        _mpRenderTabContent();
    }

    // ========== SWITCH TAB ==========
    window._mpSwitchTab = function(tab) {
        _mpCurrentTab = tab;
        if (tab !== 'session_detail') {
            _mpActiveSessionId = null;
        }
        _mpSaveState();
        _mpUpdateTabStyles();
        if (tab === 'departments' && _mpProtocols.length === 0) {
            _mpLoadProtocols(function() {
                _mpRenderTabContent();
            });
            return;
        }
        _mpRenderTabContent();
    };

    function _mpUpdateTabStyles() {
        var tabKeys = ['process', 'history', 'task_history'];
        for (var i = 0; i < tabKeys.length; i++) {
            var btn = document.getElementById('mp-tab-btn-' + tabKeys[i]);
            if (!btn) continue;
            var isActive = _mpCurrentTab === tabKeys[i];
            if (isActive) {
                btn.style.background = C.white;
                btn.style.color = C.indigo;
                btn.style.fontWeight = '700';
                btn.style.boxShadow = '0 4px 16px rgba(67,56,202,0.18), 0 2px 6px rgba(0,0,0,0.08)';
                btn.style.transform = 'translateY(-1px)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = C.slate500;
                btn.style.fontWeight = '500';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'none';
            }
        }
    }

    // ========== RENDER TAB CONTENT ==========
    function _mpRenderTabContent() {
        var el = document.getElementById('mp-tab-content');
        if (!el) return;

        if (_mpCurrentTab === 'process') {
            _mpRenderProcessTab(el);
        } else if (_mpCurrentTab === 'history') {
            _mpRenderHistoryTab(el);
        } else if (_mpCurrentTab === 'task_history') {
            _mpRenderTaskHistoryTab(el);
        } else if (_mpCurrentTab === 'session_detail') {
            _mpRenderSessionDetailTab(el);
        } else {
            _mpCurrentTab = 'process';
            _mpRenderProcessTab(el);
        }
    }

    // ===================================================================
    // ========== TAB 1: QUY TRÌNH (Timeline Stepper & Process Selector) ==========
    // ===================================================================
    function _mpRenderProcessTab(el) {
        var html = '';

        // 1. Process Selection Sub-Tabs Bar
        html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;background:' + C.white + ';padding:12px 18px;border-radius:16px;border:1px solid ' + C.slate200 + ';box-shadow:0 2px 8px rgba(0,0,0,0.03);">';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';

        for (var p = 0; p < _mpProcesses.length; p++) {
            var proc = _mpProcesses[p];
            var isAct = proc.id == _mpActiveProcessId;
            var pTheme = _getProcessTheme(proc.id, proc.name);

            html += '<button onclick="window._mpSwitchProcess(' + proc.id + ')" style="padding:10px 18px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s ease;display:inline-flex;align-items:center;gap:8px;';
            if (isAct) {
                html += 'background:' + pTheme.gradient + ';color:white;border:none;box-shadow:0 4px 14px ' + pTheme.shadow + ';transform:translateY(-1px);';
            } else {
                html += 'background:' + pTheme.bg + ';color:' + pTheme.text + ';border:1px solid ' + pTheme.border + ';box-shadow:0 1px 3px rgba(0,0,0,0.04);';
            }
            html += '">';
            html += '<span style="font-size:16px;">' + (proc.icon || '📋') + '</span> ';
            html += _escHtml(proc.name);
            html += '</button>';
        }

        html += '</div>';

        // Add Process Button (if allowed)
        if (_mpCanCreate || _mpCanEdit) {
            html += '<button onclick="window._mpShowAddProcessModal()" style="padding:10px 18px;background:#e0e7ff;color:' + C.indigo + ';border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseenter="this.style.background=\'#c7d2fe\'" onmouseleave="this.style.background=\'#e0e7ff\'">';
            html += '➕ Tạo Quy Trình Mới';
            html += '</button>';
        }

        html += '</div>'; // End Process Selector Bar

        // Active Process Details & Action Header
        var activeProc = _mpProcesses.find(function(item) { return item.id == _mpActiveProcessId; }) || _mpProcesses[0] || { id: 1, name: 'Quy Trình Họp Công Ty', icon: '🏢' };

        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:14px;background:' + C.white + ';padding:20px 24px;border-radius:16px;border:1px solid ' + C.slate200 + ';">';
        html += '<div style="flex:1;min-width:280px;">';
        html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
        html += '<span style="font-size:26px;">' + (activeProc.icon || '📋') + '</span>';
        html += '<h2 style="font-size:22px;font-weight:800;color:' + C.slate800 + ';margin:0;">' + _escHtml(activeProc.name) + '</h2>';
        
        if (_mpCanEdit) {
            html += '<button onclick="window._mpShowEditProcessModal(' + activeProc.id + ')" style="padding:5px 12px;background:' + C.slate100 + ';color:' + C.slate700 + ';border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.background=\'' + C.blue + '\';this.style.color=\'white\'" onmouseleave="this.style.background=\'' + C.slate100 + '\';this.style.color=\'' + C.slate700 + '\'" title="Đổi tên / Sửa quy trình">✏️ Sửa Quy Trình</button>';
        }
        if (_mpCanDelete && _mpProcesses.length > 1) {
            html += '<button onclick="window._mpDeleteProcess(' + activeProc.id + ')" style="padding:5px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;" title="Xóa quy trình này">🗑️ Xóa</button>';
        }
        html += '</div>';

        html += '<p style="font-size:13px;color:' + C.slate500 + ';margin:6px 0 0 36px;">' + _escHtml(activeProc.description || ('Quy trình chuẩn ' + _mpSteps.length + ' bước từ mở đầu đến kết thúc')) + '</p>';
        html += '</div>';

        if (_mpCanEdit) {
            html += '<button onclick="window._mpShowAddStep()" style="padding:11px 22px;background:linear-gradient(135deg,' + C.indigo + ',' + C.violet + ');color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 12px rgba(67,56,202,0.25);">➕ Thêm Bước Họp</button>';
        }
        html += '</div>';

        // Timeline of steps for active process
        if (_mpSteps.length === 0) {
            html += '<div style="text-align:center;padding:60px 20px;background:white;border-radius:16px;border:1px dashed ' + C.slate300 + ';color:' + C.slate400 + ';font-size:15px;">Chưa có bước nào trong quy trình này. Hãy bấm "➕ Thêm Bước Họp" để tạo mới!</div>';
        } else {
            html += '<div style="position:relative;padding-left:60px;">';

            // Vertical line
            html += '<div style="position:absolute;left:27px;top:20px;bottom:20px;width:3px;background:linear-gradient(to bottom,' + C.indigo + ',' + C.violet + ',' + C.cyan + ');border-radius:2px;opacity:0.3;"></div>';

            for (var i = 0; i < _mpSteps.length; i++) {
                var step = _mpSteps[i];
                var stepColors = _getStepColor(i);

                html += '<div style="position:relative;margin-bottom:20px;animation:fadeInUp 0.4s ease ' + (i * 0.08) + 's both;">';

                // Dot (restored to original vibrant gradient circle matching image 1)
                html += '<div style="position:absolute;left:-42px;top:18px;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,' + stepColors.from + ',' + stepColors.to + ');display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;box-shadow:0 2px 8px ' + stepColors.shadow + ';z-index:2;">' + (i + 1) + '</div>';

                // Card
                html += '<div style="background:' + C.white + ';border-radius:16px;padding:20px 24px;border:1px solid ' + C.slate200 + ';box-shadow:0 1px 4px rgba(0,0,0,0.04);transition:all 0.3s;position:relative;overflow:hidden;" onmouseenter="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.08)\';this.style.borderColor=\'' + stepColors.from + '\'" onmouseleave="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,0.04)\';this.style.borderColor=\'' + C.slate200 + '\'">';

                // Accent bar
                html += '<div style="position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(to bottom,' + stepColors.from + ',' + stepColors.to + ');border-radius:4px 0 0 4px;"></div>';

                html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
                html += '<div style="flex:1;">';

                // Title
                html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">';
                html += '<span style="font-size:22px;">' + (step.icon || '📋') + '</span>';
                html += '<h3 style="font-size:16px;font-weight:700;color:' + C.slate800 + ';margin:0;">' + _escHtml(step.title) + '</h3>';
                html += '</div>';

                // Description
                if (step.description) {
                    html += '<p style="font-size:13px;color:' + C.slate500 + ';margin:0 0 10px;line-height:1.6;white-space:pre-line;">' + _escHtml(step.description) + '</p>';
                }

                // Suggested Questions preview
                if (step.suggested_questions && step.suggested_questions.trim()) {
                    var sqs = step.suggested_questions.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
                    if (sqs.length > 0) {
                        html += '<div style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#0369a1;border:1px solid #bae6fd;">';
                        html += '<strong style="display:block;margin-bottom:4px;">💡 Câu hỏi gợi ý thảo luận (' + sqs.length + ' câu):</strong>';
                        html += '<ul style="margin:0;padding-left:18px;line-height:1.5;">';
                        sqs.forEach(function(sq) {
                            html += '<li>' + _escHtml(sq) + '</li>';
                        });
                        html += '</ul>';
                        html += '</div>';
                    }
                }

                // Link buttons (supports multiple links + document link)
                var stepLinks = _mpParseMenuLinks(step);
                if (stepLinks.length > 0 || step.document_url) {
                    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">';
                    if (step.document_url) {
                        html += '<a href="' + _escHtml(step.document_url) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#05966914;color:#059669;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;transition:all 0.2s;" onmouseenter="this.style.background=\'#05966922\'" onmouseleave="this.style.background=\'#05966914\'">';
                        html += '📄 Văn Bản Họp';
                        html += '</a>';
                    }
                    for (var sl = 0; sl < stepLinks.length; sl++) {
                        var slk = stepLinks[sl];
                        html += '<a href="' + _escHtml(slk.url) + '" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:' + stepColors.from + '14;color:' + stepColors.from + ';border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;transition:all 0.2s;" onmouseenter="this.style.background=\'' + stepColors.from + '22\'" onmouseleave="this.style.background=\'' + stepColors.from + '14\'">';
                        html += '🔗 ' + _escHtml(slk.label || slk.url);
                        html += '</a>';
                    }
                    html += '</div>';
                }

                html += '</div>';

                // Edit/Delete buttons
                if (_mpCanEdit) {
                    html += '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px;">';
                    html += '<button onclick="window._mpEditStep(' + step.id + ')" style="padding:6px 10px;background:' + C.slate100 + ';border:none;border-radius:8px;font-size:12px;cursor:pointer;color:' + C.slate600 + ';transition:all 0.2s;" onmouseenter="this.style.background=\'' + C.blue + '\';this.style.color=\'white\'" onmouseleave="this.style.background=\'' + C.slate100 + '\';this.style.color=\'' + C.slate600 + '\'">✏️</button>';
                    if (_mpCanDelete) {
                        html += '<button onclick="window._mpDeleteStep(' + step.id + ')" style="padding:6px 10px;background:' + C.slate100 + ';border:none;border-radius:8px;font-size:12px;cursor:pointer;color:' + C.slate600 + ';transition:all 0.2s;" onmouseenter="this.style.background=\'' + C.red + '\';this.style.color=\'white\'" onmouseleave="this.style.background=\'' + C.slate100 + '\';this.style.color=\'' + C.slate600 + '\'">🗑️</button>';
                    }
                    html += '</div>';
                }

                html += '</div>'; // flex
                html += '</div>'; // card
                html += '</div>'; // step wrapper
            }
            html += '</div>'; // timeline container
        }

        // CSS animations
        html += '<style>';
        html += '@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }';
        html += '</style>';

        el.innerHTML = html;
    }

    function _getStepColor(index) {
        var colors = [
            { from: '#4338ca', to: '#6366f1', shadow: 'rgba(67,56,202,0.3)' },
            { from: '#0891b2', to: '#06b6d4', shadow: 'rgba(8,145,178,0.3)' },
            { from: '#059669', to: '#10b981', shadow: 'rgba(5,150,105,0.3)' },
            { from: '#d97706', to: '#f59e0b', shadow: 'rgba(217,119,6,0.3)' },
            { from: '#dc2626', to: '#f43f5e', shadow: 'rgba(220,38,38,0.3)' },
            { from: '#7c3aed', to: '#8b5cf6', shadow: 'rgba(124,58,237,0.3)' },
            { from: '#2563eb', to: '#3b82f6', shadow: 'rgba(37,99,235,0.3)' },
            { from: '#0d9488', to: '#14b8a6', shadow: 'rgba(13,148,136,0.3)' }
        ];
        return colors[index % colors.length];
    }

    function _getProcessTheme(procId, procName) {
        var id = parseInt(procId || 1);
        var name = (procName || '').toLowerCase();

        if (id === 1 || name.indexOf('công ty') !== -1) {
            return {
                bg: '#e0e7ff',
                text: '#3730a3',
                border: '#c7d2fe',
                gradient: 'linear-gradient(135deg, #4338ca, #6366f1)',
                shadow: 'rgba(67,56,202,0.3)'
            };
        } else if (id === 2 || name.indexOf('quản lý') !== -1) {
            return {
                bg: '#fef3c7',
                text: '#92400e',
                border: '#fde68a',
                gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
                shadow: 'rgba(217,119,6,0.3)'
            };
        } else if (id === 3 || name.indexOf('cổ phần') !== -1) {
            return {
                bg: '#d1fae5',
                text: '#065f46',
                border: '#a7f3d0',
                gradient: 'linear-gradient(135deg, #059669, #10b981)',
                shadow: 'rgba(5,150,105,0.3)'
            };
        } else {
            var themes = [
                { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)', shadow: 'rgba(13,148,136,0.3)' },
                { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', shadow: 'rgba(124,58,237,0.3)' },
                { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', shadow: 'rgba(225,29,72,0.3)' }
            ];
            return themes[(id - 4) % themes.length];
        }
    }

    // ===================================================================
    // ========== PROCESS SWITCH & MODALS ==========
    // ===================================================================

    window._mpSwitchProcess = function(processId) {
        _mpActiveProcessId = parseInt(processId);
        _mpSaveState();
        _mpLoadStepsForActiveProcess(function() {
            _mpRenderTabContent();
        });
    };

    window._mpShowAddProcessModal = function() {
        _mpShowProcessModal(null);
    };

    window._mpShowEditProcessModal = function(processId) {
        var proc = _mpProcesses.find(function(p) { return p.id == processId; });
        if (proc) _mpShowProcessModal(proc);
    };

    function _mpShowProcessModal(proc) {
        var isEdit = !!proc;
        var html = '';
        html += '<div style="display:grid;gap:14px;">';
        
        html += '<div><label style="' + _labelStyle() + '">🏛️ Tên Quy Trình Họp *</label><input type="text" id="mp-proc-name" value="' + _escHtml(isEdit ? proc.name : '') + '" placeholder="Ví dụ: Quy Trình Họp Quản Lý, Quy Trình Họp Cổ Phần..." style="' + _inputStyle() + '" /></div>';

        html += '<div><label style="' + _labelStyle() + '">🎨 Biểu tượng Icon (Emoji)</label><input type="text" id="mp-proc-icon" value="' + _escHtml(isEdit ? (proc.icon || '📋') : '👔') + '" placeholder="VD: 🏢, 👔, 💼, 🎯" style="' + _inputStyle() + '" /></div>';

        html += '<div><label style="' + _labelStyle() + '">📝 Mô tả quy trình</label><textarea id="mp-proc-desc" rows="3" placeholder="Mô tả mục đích và phạm vi ứng dụng của quy trình họp này..." style="' + _inputStyle() + 'resize:vertical;">' + _escHtml(isEdit ? (proc.description || '') : '') + '</textarea></div>';

        html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">';
        html += '<button onclick="_mpCloseModal()" style="' + _btnSecondary() + '">Hủy</button>';
        html += '<button onclick="window._mpSaveProcess(' + (isEdit ? proc.id : 'null') + ')" style="' + _btnPrimary() + '">' + (isEdit ? '💾 Cập Nhật Quy Trình' : '➕ Tạo Quy Trình Mới') + '</button>';
        html += '</div>';

        html += '</div>';

        _mpShowModal((isEdit ? '✏️ Chỉnh Sửa Quy Trình Họp' : '➕ Tạo Quy Trình Họp Mới'), html, '500px');
    }

    window._mpSaveProcess = function(id) {
        var name = document.getElementById('mp-proc-name').value.trim();
        var icon = document.getElementById('mp-proc-icon').value.trim() || '📋';
        var description = document.getElementById('mp-proc-desc').value.trim();

        if (!name) return alert('Vui lòng nhập tên quy trình!');

        var data = { name: name, icon: icon, description: description };
        if (id) data.id = id;

        fetch('/api/meeting-process/processes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpCloseModal();
                if (!id && d.id) {
                    _mpActiveProcessId = d.id;
                }
                _mpLoadProcessesAndSteps(function() {
                    _mpRenderTabContent();
                });
            } else {
                alert(d.error || 'Có lỗi xảy ra');
            }
        })
        .catch(function() { alert('Lỗi kết nối máy chủ!'); });
    };

    window._mpDeleteProcess = function(id) {
        if (_mpProcesses.length <= 1) {
            return alert('Hệ thống phải duy trì ít nhất 1 quy trình cuộc họp!');
        }
        var proc = _mpProcesses.find(function(p) { return p.id == id; });
        var procName = proc ? proc.name : 'quy trình này';
        if (!confirm('Bạn có chắc chắn muốn xóa "' + procName + '"? Tất cả các bước thuộc quy trình này sẽ bị xóa!')) return;

        fetch('/api/meeting-process/processes/' + id, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpActiveProcessId = null;
                _mpLoadProcessesAndSteps(function() {
                    _mpRenderTabContent();
                });
            } else {
                alert(d.error || 'Có lỗi xảy ra khi xóa!');
            }
        })
        .catch(function() { alert('Lỗi kết nối máy chủ!'); });
    };

    // ===================================================================
    // ========== TAB 2: LỊCH SỬ CUỘC HỌP ==========
    // ===================================================================
    function _mpRenderHistoryTab(el) {
        var html = '';

        // Header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
        html += '<div>';
        html += '<h2 style="font-size:20px;font-weight:700;color:' + C.slate800 + ';margin:0 0 4px;">📅 Lịch Sử Cuộc Họp</h2>';
        html += '<p style="font-size:13px;color:' + C.slate500 + ';margin:0;">Tổng cộng <strong>' + _mpSessionTotal + '</strong> cuộc họp trong hệ thống</p>';
        html += '</div>';
        if (_mpCanCreate) {
            html += '<button onclick="window._mpShowCreateSession()" style="padding:10px 20px;background:linear-gradient(135deg,' + C.green + ',' + C.greenDark + ');color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.3s;box-shadow:0 2px 8px rgba(16,185,129,0.3);">📝 Tạo Biên Bản Mới</button>';
        }
        html += '</div>';

        // Filters
        html += '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">';

        // Process Filter Pills Bar (giống ảnh 3)
        html += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">';
        
        // All processes pill
        var isAllActive = _mpFilterProcess === 'all';
        html += '<button onclick="window._mpSelectHistoryProcess(\'all\')" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s ease;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;';
        if (isAllActive) {
            html += 'background:linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);color:white;border:none;box-shadow:0 4px 12px rgba(79,70,229,0.3);';
        } else {
            html += 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;';
        }
        html += '">🌐 Tất Cả Quy Trình</button>';

        // Process pills
        (_mpProcesses || []).forEach(function(proc, idx) {
            var isProcActive = String(_mpFilterProcess) === String(proc.id);
            var icon = proc.icon || '📋';
            var title = _escHtml(proc.name || proc.title || 'Quy Trình');
            
            var procGradients = [
                'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
            ];
            var activeGrad = procGradients[idx % procGradients.length];

            var inactiveBgs = ['#f5f3ff', '#fffbeb', '#ecfdf5', '#f0f9ff', '#faf5ff'];
            var inactiveBorders = ['#c7d2fe', '#fde68a', '#a7f3d0', '#bae6fd', '#ddd6fe'];
            var inactiveColors = ['#4338ca', '#b45309', '#047857', '#0369a1', '#6d28d9'];
            var inBg = inactiveBgs[idx % inactiveBgs.length];
            var inBorder = inactiveBorders[idx % inactiveBorders.length];
            var inColor = inactiveColors[idx % inactiveColors.length];

            html += '<button onclick="window._mpSelectHistoryProcess(' + proc.id + ')" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s ease;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;';
            if (isProcActive) {
                html += 'background:' + activeGrad + ';color:white;border:none;box-shadow:0 4px 14px rgba(0,0,0,0.15);';
            } else {
                html += 'background:' + inBg + ';color:' + inColor + ';border:1px solid ' + inBorder + ';';
            }
            html += '">' + icon + ' ' + title + '</button>';
        });
        html += '</div>';

        // Year
        html += '<select id="mp-filter-year" onchange="window._mpFilterChanged()" style="height:38px;padding:0 14px;border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:13px;color:' + C.slate700 + ';background:' + C.white + ';min-width:100px;box-sizing:border-box;">';
        var curYear = new Date().getFullYear();
        for (var y = curYear + 1; y >= curYear - 5; y--) {
            html += '<option value="' + y + '"' + (y == _mpFilterYear ? ' selected' : '') + '>' + y + '</option>';
        }
        html += '</select>';

        // Month
        html += '<select id="mp-filter-month" onchange="window._mpFilterChanged()" style="height:38px;padding:0 14px;border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:13px;color:' + C.slate700 + ';background:' + C.white + ';min-width:120px;box-sizing:border-box;">';
        html += '<option value="">Tất cả tháng</option>';
        var monthNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
        for (var m = 1; m <= 12; m++) {
            html += '<option value="' + m + '"' + (m == _mpFilterMonth ? ' selected' : '') + '>' + monthNames[m] + '</option>';
        }
        html += '</select>';

        // Quarter
        html += '<select id="mp-filter-quarter" onchange="window._mpFilterChanged()" style="height:38px;padding:0 14px;border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:13px;color:' + C.slate700 + ';background:' + C.white + ';min-width:100px;box-sizing:border-box;">';
        html += '<option value="">Tất cả quý</option>';
        for (var q = 1; q <= 4; q++) {
            html += '<option value="' + q + '"' + (q == _mpFilterQuarter ? ' selected' : '') + '>Quý ' + q + '</option>';
        }
        html += '</select>';

        // Search
        html += '<div style="flex:1;min-width:180px;position:relative;">';
        html += '<input type="text" id="mp-filter-search" placeholder="🔍 Tìm kiếm cuộc họp..." value="' + _escHtml(_mpFilterSearch) + '" onkeydown="if(event.key===\'Enter\')window._mpFilterChanged()" style="height:38px;width:100%;padding:0 14px;border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:13px;color:' + C.slate700 + ';box-sizing:border-box;" />';
        html += '</div>';

        html += '<button onclick="window._mpFilterChanged()" style="height:38px;padding:0 18px;background:' + C.indigo + ';color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;">Lọc</button>';
        html += '</div>';

        // Sessions list
        if (_mpSessions.length === 0) {
            html += '<div style="text-align:center;padding:60px 20px;">';
            html += '<div style="font-size:48px;margin-bottom:16px;">📅</div>';
            html += '<div style="color:' + C.slate400 + ';font-size:15px;">Chưa có cuộc họp nào trong khoảng thời gian này</div>';
            html += '</div>';
        } else {
            html += '<div style="display:grid;gap:16px;">';
            for (var i = 0; i < _mpSessions.length; i++) {
                var s = _mpSessions[i];
                var statusInfo = _getSessionStatus(s.status);
                var attendees = [];
                try { attendees = JSON.parse(s.attendees || '[]'); } catch(e) {}

                html += '<div style="background:' + C.white + ';border-radius:16px;padding:20px 24px;border:1px solid ' + C.slate200 + ';box-shadow:0 1px 4px rgba(0,0,0,0.04);transition:all 0.3s;cursor:pointer;" onclick="window._mpViewSession(' + s.id + ')" onmouseenter="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.08)\';this.style.borderColor=\'' + C.indigo + '40\'" onmouseleave="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,0.04)\';this.style.borderColor=\'' + C.slate200 + '\'">';

                html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">';

                // Left info
                html += '<div style="flex:1;min-width:250px;">';
                html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">';
                html += '<span style="padding:4px 10px;background:' + statusInfo.bg + ';color:' + statusInfo.color + ';border-radius:6px;font-size:11px;font-weight:700;">' + statusInfo.label + '</span>';
                if (s.process_name) {
                    var procTheme = _getProcessTheme(s.process_id, s.process_name);
                    html += '<span style="padding:4px 12px;background:' + procTheme.bg + ';color:' + procTheme.text + ';border:1px solid ' + procTheme.border + ';border-radius:8px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">' + (s.process_icon || '📋') + ' ' + _escHtml(s.process_name) + '</span>';
                }
                html += '<h3 style="font-size:15px;font-weight:700;color:' + C.slate800 + ';margin:0;">' + _escHtml(s.title) + '</h3>';
                html += '</div>';

                html += '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:' + C.slate500 + ';">';
                html += '<span>📅 ' + _formatDate(s.meeting_date) + '</span>';
                if (s.start_time) html += '<span>🕐 ' + _escHtml(s.start_time) + (s.end_time ? ' — ' + _escHtml(s.end_time) : '') + '</span>';
                if (s.chairperson_name) html += '<span>👔 ' + _escHtml(s.chairperson_name) + '</span>';
                if (s.secretary_name) html += '<span>📝 ' + _escHtml(s.secretary_name) + '</span>';
                html += '<span>👥 ' + attendees.length + ' thành viên</span>';
                html += '</div>';

                if (s.conclusion) {
                    html += '<div style="margin-top:8px;padding:8px 12px;background:' + C.slate50 + ';border-radius:8px;font-size:12px;color:' + C.slate600 + ';line-height:1.5;border-left:3px solid ' + C.indigo + '40;">📋 ' + _escHtml(s.conclusion).substring(0, 150) + (s.conclusion.length > 150 ? '...' : '') + '</div>';
                }
                html += '</div>';

                // Right actions
                if (_mpCanEdit || _mpCanDelete) {
                    html += '<div style="display:flex;gap:6px;" onclick="event.stopPropagation()">';
                    if (_mpCanEdit) {
                        html += '<button type="button" data-no-debounce="true" onclick="event.stopPropagation();window._mpEditSession(' + s.id + ')" style="padding:6px 12px;background:' + C.blue + '14;color:' + C.blue + ';border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">✏️ Sửa</button>';
                    }
                    if (_mpCanDelete) {
                        html += '<button type="button" data-no-debounce="true" onclick="event.stopPropagation();window._mpDeleteSession(' + s.id + ')" style="padding:6px 12px;background:' + C.red + '14;color:' + C.red + ';border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Xóa</button>';
                    }
                    html += '</div>';
                }

                html += '</div>'; // flex
                html += '</div>'; // card
            }
            html += '</div>';

            // Pagination
            if (_mpSessionTotalPages > 1) {
                html += '<div style="display:flex;justify-content:center;gap:8px;margin-top:20px;">';
                for (var p = 1; p <= _mpSessionTotalPages; p++) {
                    html += '<button onclick="window._mpGoPage(' + p + ')" style="padding:8px 14px;border:1px solid ' + (p === _mpSessionPage ? C.indigo : C.slate200) + ';border-radius:8px;background:' + (p === _mpSessionPage ? C.indigo : C.white) + ';color:' + (p === _mpSessionPage ? 'white' : C.slate600) + ';font-size:13px;font-weight:600;cursor:pointer;">' + p + '</button>';
                }
                html += '</div>';
            }
        }

        el.innerHTML = html;
    }

    function _getSessionStatus(status) {
        if (status === 'da_ket_thuc') return { label: '✅ Đã kết thúc', bg: '#dcfce7', color: '#166534' };
        return { label: '🔴 Đang diễn ra', bg: '#fef2f2', color: '#991b1b' };
    }

    // ===================================================================
    // ========== TAB 3: PHÒNG BAN ==========
    // ===================================================================
    function _mpRenderDeptTab(el) {
        var html = '';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
        html += '<div>';
        html += '<h2 style="font-size:20px;font-weight:700;color:' + C.slate800 + ';margin:0 0 4px;">🏢 Quy Trình Theo Phòng Ban</h2>';
        html += '<p style="font-size:13px;color:' + C.slate500 + ';margin:0;">Nội dung chuẩn bị và chỉ số cần báo cáo của từng phòng ban trong cuộc họp</p>';
        html += '</div>';
        if (_mpCanEdit) {
            html += '<button onclick="window._mpShowAddDeptProtocol()" style="padding:10px 20px;background:linear-gradient(135deg,' + C.violet + ',' + C.indigo + ');color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(124,58,237,0.3);">➕ Thêm Phòng Ban</button>';
        }
        html += '</div>';

        if (_mpProtocols.length === 0) {
            html += '<div style="text-align:center;padding:60px 20px;color:' + C.slate400 + ';font-size:15px;">Chưa có cấu hình quy trình phòng ban nào</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:16px;">';
            for (var i = 0; i < _mpProtocols.length; i++) {
                var p = _mpProtocols[i];
                var metrics = [];
                try { metrics = JSON.parse(p.report_metrics || '[]'); } catch(e) {}
                var pLinks = _mpParseMenuLinks(p);

                html += '<div style="background:' + C.white + ';border-radius:16px;padding:20px 24px;border:1px solid ' + C.slate200 + ';box-shadow:0 1px 4px rgba(0,0,0,0.04);">';

                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
                html += '<h3 style="font-size:16px;font-weight:700;color:' + C.slate800 + ';margin:0;">🏢 ' + _escHtml(p.department_name || 'Phòng ban #' + p.department_id) + '</h3>';
                if (_mpCanEdit) {
                    html += '<button onclick="window._mpEditDeptProtocol(' + p.department_id + ')" style="padding:4px 8px;background:' + C.slate100 + ';border:none;border-radius:6px;font-size:12px;cursor:pointer;">✏️ Sửa</button>';
                }
                html += '</div>';

                if (p.preparation) {
                    html += '<div style="margin-bottom:10px;"><strong style="font-size:12px;color:' + C.slate700 + ';">📋 Nội dung chuẩn bị:</strong><p style="font-size:13px;color:' + C.slate600 + ';margin:4px 0 0;line-height:1.5;white-space:pre-line;">' + _escHtml(p.preparation) + '</p></div>';
                }

                if (metrics.length > 0) {
                    html += '<div style="margin-bottom:10px;"><strong style="font-size:12px;color:' + C.slate700 + ';">📊 Chỉ số báo cáo:</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">';
                    for (var m = 0; m < metrics.length; m++) {
                        html += '<span style="padding:3px 8px;background:' + C.indigo + '14;color:' + C.indigo + ';border-radius:6px;font-size:11px;font-weight:600;">' + _escHtml(metrics[m]) + '</span>';
                    }
                    html += '</div></div>';
                }

                if (pLinks.length > 0) {
                    html += '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">';
                    for (var pl = 0; pl < pLinks.length; pl++) {
                        var plk = pLinks[pl];
                        html += '<a href="' + _escHtml(plk.url) + '" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:' + C.slate100 + ';color:' + C.indigo + ';border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🔗 ' + _escHtml(plk.label || plk.url) + '</a>';
                    }
                    html += '</div>';
                }

                html += '</div>';
            }
            html += '</div>';
        }

        el.innerHTML = html;
    }

    // ========== PRESET ICON PICKER LIST ==========
    var _mpPresetIcons = [
        { cat: 'Họp & Sự kiện', icons: ['📢','📊','🎯','💼','📈','📋','📝','🔚','🏛️','👔','🤝','👥','💡','⭐','🏆','⚡'] },
        { cat: 'Phòng ban & Công việc', icons: ['🏢','💻','🛠️','🎨','📦','📞','💵','📜','🔍','⚙️','🛡️','🚀','📁','📌','🚩','✅'] }
    ];

    window._mpToggleIconPicker = function(popoverId) {
        var el = document.getElementById(popoverId);
        if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
    };

    window._mpSelectIcon = function(iconStr, targetInputId, previewId, popoverId) {
        var input = document.getElementById(targetInputId);
        var prev = document.getElementById(previewId);
        var pop = document.getElementById(popoverId);
        if (input) input.value = iconStr;
        if (prev) prev.innerText = iconStr;
        if (pop) pop.style.display = 'none';
    };

    // ========== MULTI MENU LINKS HELPER ==========
    function _mpParseMenuLinks(item) {
        if (!item) return [];
        var rawUrl = item.linked_menu || '';
        var rawLabel = item.linked_menu_label || '';
        if (!rawUrl) return [];
        try {
            if (rawUrl.startsWith('[')) {
                var parsed = JSON.parse(rawUrl);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch(e) {}
        var urls = rawUrl.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        var labels = rawLabel.split(',').map(function(s) { return s.trim(); });
        var res = [];
        for (var i = 0; i < urls.length; i++) {
            res.push({ url: urls[i], label: labels[i] || urls[i] });
        }
        return res;
    }

    window._mpAddMenuLinkRow = function(containerId, url, label) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var rowId = 'mp-menu-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        var div = document.createElement('div');
        div.className = 'mp-menu-link-row';
        div.id = rowId;
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 38px;gap:8px;align-items:center;';

        div.innerHTML = '<input type="text" class="mp-link-url" value="' + _escHtml(url || '') + '" placeholder="VD: /kpikdoanh" style="' + _inputStyle() + 'padding:8px 10px;" />' +
            '<input type="text" class="mp-link-label" value="' + _escHtml(label || '') + '" placeholder="VD: KPI P.Kinh Doanh" style="' + _inputStyle() + 'padding:8px 10px;" />' +
            '<button type="button" onclick="document.getElementById(\'' + rowId + '\').remove()" style="padding:8px;background:#fee2e2;color:#ef4444;border:none;border-radius:8px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Xóa menu này">🗑️</button>';

        container.appendChild(div);
    };

    // ========== ADD/EDIT STEP MODAL ==========
    window._mpShowAddStep = function() {
        _mpShowStepModal(null);
    };

    window._mpEditStep = function(id) {
        var step = _mpSteps.find(function(s) { return s.id === id; });
        if (step) _mpShowStepModal(step);
    };

    function _mpShowStepModal(step) {
        var isEdit = !!step;
        var html = '';

        html += '<div style="display:grid;gap:14px;">';

        html += '<div><label style="' + _labelStyle() + '">📋 Tiêu đề bước *</label><input type="text" id="mp-step-title" value="' + _escHtml((step && step.title) || '') + '" placeholder="VD: Mở đầu & Điểm danh" style="' + _inputStyle() + '" /></div>';

        html += '<div><label style="' + _labelStyle() + '">📝 Mô tả chi tiết</label><textarea id="mp-step-desc" rows="5" placeholder="Mô tả nội dung thực hiện trong bước này..." style="' + _inputStyle() + 'min-height:120px;resize:vertical;">' + _escHtml((step && step.description) || '') + '</textarea></div>';

        html += '<div><label style="' + _labelStyle() + '">💡 Các câu hỏi / gợi ý cho bước họp (mỗi câu 1 dòng)</label><textarea id="mp-step-questions" rows="4" placeholder="VD:\n1. Doanh thu tuần này đạt bao nhiêu % KPI?\n2. Tỉ lệ chốt đơn tăng hay giảm?\n3. Có vấn đề gì cần giải quyết gấp không?" style="' + _inputStyle() + 'resize:vertical;">' + _escHtml((step && step.suggested_questions) || '') + '</textarea></div>';

        html += '<div><label style="' + _labelStyle() + '">📄 Link Văn Bản Họp (nếu có văn bản riêng)</label><input type="text" id="mp-step-doc-url" value="' + _escHtml((step && step.document_url) || '') + '" placeholder="Ví dụ: https://docs.google.com/document/d/... hoặc /files/vanban.pdf" style="' + _inputStyle() + '" /></div>';

        var currentIcon = (step && step.icon) || '📋';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';

        // Icon Picker column
        html += '<div style="position:relative;">';
        html += '<label style="' + _labelStyle() + '">🎨 Icon hiển thị</label>';
        html += '<div style="display:flex;gap:8px;align-items:center;">';
        html += '<button type="button" onclick="window._mpToggleIconPicker(\'mp-icon-popover-step\')" style="width:42px;height:40px;background:' + C.slate100 + ';border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;" title="Bấm chọn Icon gợi ý">';
        html += '<span id="mp-icon-preview-step">' + currentIcon + '</span>';
        html += '</button>';
        html += '<input type="text" id="mp-step-icon" value="' + _escHtml(currentIcon) + '" placeholder="📋" style="' + _inputStyle() + 'flex:1;" oninput="document.getElementById(\'mp-icon-preview-step\').innerText = this.value || \'📋\'" />';
        html += '<button type="button" onclick="window._mpToggleIconPicker(\'mp-icon-popover-step\')" style="padding:8px 12px;background:#e0e7ff;color:' + C.indigo + ';border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;">🎨 Chọn Icon</button>';
        html += '</div>';

        // Popover Icon Dropdown
        html += '<div id="mp-icon-popover-step" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:999;margin-top:6px;background:white;border:1px solid ' + C.slate200 + ';border-radius:14px;box-shadow:0 12px 28px rgba(0,0,0,0.18);padding:14px;max-height:240px;overflow-y:auto;">';
        for (var c = 0; c < _mpPresetIcons.length; c++) {
            var cat = _mpPresetIcons[c];
            html += '<div style="font-size:11px;font-weight:700;color:' + C.slate500 + ';margin:6px 0 4px;">' + cat.cat + '</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
            for (var ic = 0; ic < cat.icons.length; ic++) {
                var ico = cat.icons[ic];
                html += '<button type="button" onclick="window._mpSelectIcon(\'' + ico + '\', \'mp-step-icon\', \'mp-icon-preview-step\', \'mp-icon-popover-step\')" style="width:32px;height:32px;background:' + C.slate100 + ';border:none;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.1s;" onmouseenter="this.style.transform=\'scale(1.2)\'" onmouseleave="this.style.transform=\'none\'">' + ico + '</button>';
            }
            html += '</div>';
        }
        html += '</div>'; // popover
        html += '</div>'; // icon col

        var currentStepPos = step ? (_mpSteps.findIndex(function(s) { return s.id === step.id; }) + 1) : (_mpSteps.length + 1);
        if (currentStepPos <= 0 && step) currentStepPos = (step.step_order || 1);

        html += '<div><label style="' + _labelStyle() + '">📊 Thứ tự</label><input type="number" id="mp-step-order" value="' + currentStepPos + '" min="1" style="' + _inputStyle() + '" /></div>';
        html += '</div>';

        // Multi Menu Links Section
        html += '<div style="background:' + C.slate50 + ';border:1px solid ' + C.slate200 + ';border-radius:12px;padding:14px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<label style="font-size:13px;font-weight:700;color:' + C.slate700 + ';margin:0;">🔗 Các Đường Dẫn Menu Liên Kết</label>';
        html += '<button type="button" onclick="window._mpAddMenuLinkRow(\'mp-step-menu-container\', \'\', \'\')" style="padding:6px 14px;background:' + C.indigo + ';color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(67,56,202,0.25);">➕ Thêm Menu</button>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 38px;gap:8px;margin-bottom:6px;padding:0 6px;font-size:11px;font-weight:600;color:' + C.slate500 + ';"><span>Đường dẫn menu (URL)</span><span>🏷️ Tên menu hiển thị</span><span>Xóa</span></div>';
        html += '<div id="mp-step-menu-container" style="display:grid;gap:8px;"></div>';
        html += '</div>';

        html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">';
        html += '<button onclick="_mpCloseModal()" style="' + _btnSecondary() + '">Hủy</button>';
        html += '<button onclick="window._mpSaveStep(' + (step ? step.id : 'null') + ')" style="' + _btnPrimary() + '">' + (isEdit ? '💾 Cập Nhật' : '➕ Thêm Bước') + '</button>';
        html += '</div>';

        html += '</div>';

        _mpShowModal((isEdit ? '✏️ Chỉnh Sửa Bước' : '➕ Thêm Bước Mới'), html);

        // Populate existing menu link rows
        setTimeout(function() {
            var existingLinks = _mpParseMenuLinks(step);
            if (existingLinks.length === 0) {
                window._mpAddMenuLinkRow('mp-step-menu-container', '', '');
            } else {
                for (var l = 0; l < existingLinks.length; l++) {
                    window._mpAddMenuLinkRow('mp-step-menu-container', existingLinks[l].url, existingLinks[l].label);
                }
            }
        }, 50);
    }

    window._mpSaveStep = function(id) {
        var container = document.getElementById('mp-step-menu-container');
        var rows = container ? container.querySelectorAll('.mp-menu-link-row') : [];
        var links = [];
        for (var r = 0; r < rows.length; r++) {
            var urlInput = rows[r].querySelector('.mp-link-url');
            var labelInput = rows[r].querySelector('.mp-link-label');
            var url = urlInput ? urlInput.value.trim() : '';
            var label = labelInput ? labelInput.value.trim() : '';
            if (url) {
                links.push({ url: url, label: label || url });
            }
        }

        var linkedMenuStr = links.length > 0 ? JSON.stringify(links) : '';
        var linkedMenuLabelStr = links.map(function(l) { return l.label; }).join(', ');

        var data = {
            process_id: _mpActiveProcessId || 1,
            title: document.getElementById('mp-step-title').value.trim(),
            description: document.getElementById('mp-step-desc').value.trim(),
            suggested_questions: document.getElementById('mp-step-questions').value.trim(),
            document_url: document.getElementById('mp-step-doc-url').value.trim(),
            icon: document.getElementById('mp-step-icon').value.trim() || '📋',
            step_order: parseInt(document.getElementById('mp-step-order').value) || 1,
            linked_menu: linkedMenuStr,
            linked_menu_label: linkedMenuLabelStr
        };
        if (!data.title) return alert('Vui lòng nhập tiêu đề bước!');
        if (id) data.id = id;

        fetch('/api/meeting-process/steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpCloseModal();
                _mpLoadStepsForActiveProcess(function() {
                    _mpRenderTabContent();
                });
            } else {
                alert(d.error || 'Có lỗi xảy ra');
            }
        })
        .catch(function() { alert('Lỗi kết nối server'); });
    };

    window._mpDeleteStep = function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa bước này?')) return;
        fetch('/api/meeting-process/steps/' + id, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadStepsForActiveProcess(function() {
                    _mpRenderTabContent();
                });
            }
        });
    };

    // ========== UNIFIED SEARCHABLE SELECT FOR USERS ==========
    function _mpRenderSearchableUserSelect(fieldId, labelText, selectedUserId, placeholderText) {
        var selectedUser = _mpAllUsers.find(function(u) { return u.id == selectedUserId; });
        var initialText = selectedUser ? (selectedUser.full_name + ' (' + (ROLE_LABELS[selectedUser.role] || selectedUser.role) + ')') : '';
        var initialVal = selectedUser ? selectedUser.id : '';

        var html = '';
        html += '<div style="position:relative;">';
        html += '<label style="' + _labelStyle() + '">' + labelText + '</label>';
        html += '<input type="hidden" id="' + fieldId + '" value="' + initialVal + '" />';
        html += '<div style="position:relative;">';
        html += '<input type="text" id="' + fieldId + '-search" value="' + _escHtml(initialText) + '" placeholder="' + placeholderText + '" autocomplete="off" onfocus="window._mpOpenUserDropdown(\'' + fieldId + '\')" oninput="window._mpFilterUserDropdown(\'' + fieldId + '\')" style="' + _inputStyle() + 'padding-right:30px;cursor:text;" />';
        html += '<span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:' + C.slate400 + ';font-size:11px;">▼</span>';
        html += '</div>';

        html += '<div id="' + fieldId + '-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:999;margin-top:4px;background:white;border:1px solid ' + C.slate200 + ';border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.15);max-height:200px;overflow-y:auto;">';
        html += '<div onclick="window._mpSelectUserItem(\'' + fieldId + '\', \'\', \'\')" style="padding:9px 12px;font-size:13px;color:' + C.slate400 + ';cursor:pointer;border-bottom:1px solid ' + C.slate100 + ';" onmouseenter="this.style.background=\'' + C.slate50 + '\'" onmouseleave="this.style.background=\'white\'">— Bỏ chọn —</div>';
        
        for (var u = 0; u < _mpAllUsers.length; u++) {
            var user = _mpAllUsers[u];
            var displayName = user.full_name + ' (' + (ROLE_LABELS[user.role] || user.role) + ')';
            html += '<div class="mp-user-opt" data-text="' + _escHtml(displayName.toLowerCase()) + '" onclick="window._mpSelectUserItem(\'' + fieldId + '\', ' + user.id + ', \'' + _escHtml(displayName) + '\')" style="padding:9px 12px;font-size:13px;color:' + C.slate700 + ';cursor:pointer;border-bottom:1px solid ' + C.slate50 + ';display:flex;justify-content:space-between;align-items:center;" onmouseenter="this.style.background=\'' + C.slate50 + '\'" onmouseleave="this.style.background=\'white\'">';
            html += '<span>' + _escHtml(user.full_name) + '</span>';
            html += '<span style="color:' + C.slate400 + ';font-size:11px;">(' + _escHtml(ROLE_LABELS[user.role] || user.role) + ')</span>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        return html;
    }

    window._mpOpenUserDropdown = function(fieldId) {
        var drop = document.getElementById(fieldId + '-dropdown');
        if (drop) drop.style.display = 'block';
    };

    window._mpFilterUserDropdown = function(fieldId) {
        var input = document.getElementById(fieldId + '-search');
        var drop = document.getElementById(fieldId + '-dropdown');
        if (!input || !drop) return;
        drop.style.display = 'block';
        var val = input.value.toLowerCase().trim();
        var items = drop.querySelectorAll('.mp-user-opt');
        items.forEach(function(item) {
            var text = item.getAttribute('data-text') || '';
            if (text.indexOf(val) >= 0) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    };

    window._mpSelectUserItem = function(fieldId, userId, displayName) {
        var hiddenInput = document.getElementById(fieldId);
        var searchInput = document.getElementById(fieldId + '-search');
        var drop = document.getElementById(fieldId + '-dropdown');
        if (hiddenInput) hiddenInput.value = userId;
        if (searchInput) searchInput.value = displayName;
        if (drop) drop.style.display = 'none';
    };

    // Close user dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#mp-session-chair-search') && !e.target.closest('#mp-session-chair-dropdown')) {
            var d1 = document.getElementById('mp-session-chair-dropdown');
            if (d1) d1.style.display = 'none';
        }
        if (!e.target.closest('#mp-session-secretary-search') && !e.target.closest('#mp-session-secretary-dropdown')) {
            var d2 = document.getElementById('mp-session-secretary-dropdown');
            if (d2) d2.style.display = 'none';
        }
    });

    // ========== CREATE/EDIT SESSION MODAL ==========
    window._mpShowCreateSession = function() {
        _mpShowSessionModal(null);
    };

    window._mpEditSession = function(id) {
        var session = _mpSessions.find(function(s) { return s.id === id; });
        if (session) _mpShowSessionModal(session);
    };

    function _mpShowSessionModal(session) {
        var isEdit = !!session;
        var html = '';

        html += '<div style="display:grid;gap:14px;">';

        // Find which process IDs currently have an active meeting (status === 'dang_dien_ra')
        var activeProcessMap = {};
        _mpSessions.forEach(function(s) {
            if (s.status === 'dang_dien_ra' && (!session || s.id !== session.id)) {
                activeProcessMap[s.process_id || 1] = s;
            }
        });

        // Select Process
        html += '<div><label style="' + _labelStyle() + '">🏛️ Loại Quy Trình Họp *</label><select id="mp-session-process" style="' + _inputStyle() + '">';
        var hasActiveBlocked = false;
        for (var p = 0; p < _mpProcesses.length; p++) {
            var procItem = _mpProcesses[p];
            var activeS = activeProcessMap[procItem.id];
            var isBlocked = !isEdit && !!activeS;
            if (isBlocked) hasActiveBlocked = true;

            var sel = (session ? session.process_id == procItem.id : _mpActiveProcessId == procItem.id) ? ' selected' : '';
            if (isBlocked && sel) sel = '';

            if (isBlocked) {
                html += '<option value="' + procItem.id + '" disabled style="color:#ef4444;font-weight:600;background:#fee2e2;">🔴 ' + (procItem.icon || '📋') + ' ' + _escHtml(procItem.name) + ' (Đang có cuộc họp diễn ra — Chưa kết thúc)</option>';
            } else {
                html += '<option value="' + procItem.id + '"' + sel + '>' + (procItem.icon || '📋') + ' ' + _escHtml(procItem.name) + '</option>';
            }
        }
        html += '</select>';
        if (hasActiveBlocked) {
            html += '<div style="margin-top:6px;padding:8px 12px;background:#fffbebf0;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:6px;">⚠️ <strong>Lưu ý:</strong> Quy trình được đánh dấu 🔴 (đang diễn ra) sẽ không thể tạo thêm cuộc họp mới cho đến khi cuộc họp cũ kết thúc.</div>';
        }
        html += '</div>';

        html += '<div><label style="' + _labelStyle() + '">📋 Tiêu đề cuộc họp *</label><input type="text" id="mp-session-title" value="' + _escHtml((session && session.title) || '') + '" placeholder="VD: Họp tuần 33 — Tổng kết KPI tháng 8/2026" style="' + _inputStyle() + '" /></div>';

        html += '<div><label style="' + _labelStyle() + '">📅 Ngày họp *</label><input type="date" id="mp-session-date" value="' + ((session && session.meeting_date) ? session.meeting_date.substring(0, 10) : new Date().toISOString().substring(0, 10)) + '" style="' + _inputStyle() + '" /></div>';

        // Chairperson & Secretary Unified Searchable Select
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
        html += _mpRenderSearchableUserSelect('mp-session-chair', '👔 Chủ tọa', session ? session.chairperson_id : null, '🔍 Gõ tìm hoặc chọn Chủ tọa...');
        html += _mpRenderSearchableUserSelect('mp-session-secretary', '📝 Thư ký', session ? session.secretary_id : null, '🔍 Gõ tìm hoặc chọn Thư ký...');
        html += '</div>';

        // Status (only for edit)
        if (isEdit) {
            html += '<div><label style="' + _labelStyle() + '">📌 Trạng thái</label><select id="mp-session-status" style="' + _inputStyle() + '">';
            html += '<option value="dang_dien_ra"' + (session.status === 'dang_dien_ra' ? ' selected' : '') + '>🔴 Đang diễn ra</option>';
            html += '<option value="da_ket_thuc"' + (session.status === 'da_ket_thuc' ? ' selected' : '') + '>✅ Đã kết thúc</option>';
            html += '</select></div>';
        }

        // Attendees with Search Filter
        html += '<div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<label style="' + _labelStyle() + 'margin:0;">👥 Thành viên tham dự (click để chọn/bỏ chọn)</label>';
        html += '<button type="button" onclick="window._mpToggleAllAttendees()" style="background:none;border:none;color:' + C.indigo + ';font-size:12px;font-weight:600;cursor:pointer;">Chọn tất cả / Bỏ chọn</button>';
        html += '</div>';
        html += '<input type="text" id="mp-attendee-search" placeholder="🔍 Tìm tên hoặc vai trò để chọn nhanh..." oninput="window._mpFilterAttendees(this.value)" style="' + _inputStyle() + 'margin-bottom:8px;font-size:12px;padding:8px 12px;" />';
        
        var currentAttendees = [];
        try { if (session) currentAttendees = JSON.parse(session.attendees || '[]'); } catch(e) {}

        html += '<div id="mp-attendees-list" style="max-height:180px;overflow-y:auto;border:1px solid ' + C.slate200 + ';border-radius:10px;padding:8px;">';
        for (var u3 = 0; u3 < _mpAllUsers.length; u3++) {
            var user3 = _mpAllUsers[u3];
            var isChecked = currentAttendees.indexOf(user3.id) >= 0 || currentAttendees.indexOf(String(user3.id)) >= 0;
            html += '<label class="mp-attendee-item" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background 0.2s;" onmouseenter="this.style.background=\'' + C.slate50 + '\'" onmouseleave="this.style.background=\'transparent\'">';
            html += '<input type="checkbox" class="mp-attendee-cb" value="' + user3.id + '"' + (isChecked ? ' checked' : '') + ' style="cursor:pointer;" />';
            html += '<span style="font-size:13px;color:' + C.slate700 + ';">' + _escHtml(user3.full_name) + ' <span style="color:' + C.slate400 + ';font-size:11px;">(' + (ROLE_LABELS[user3.role] || user3.role) + ')</span></span>';
            html += '</label>';
        }
        html += '</div></div>';

        html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">';
        html += '<button onclick="_mpCloseModal()" style="' + _btnSecondary() + '">Hủy</button>';
        html += '<button onclick="window._mpSaveSession(' + (session ? session.id : 'null') + ')" style="' + _btnPrimary() + '">' + (isEdit ? '💾 Cập Nhật' : '📝 Tạo Phiên Họp') + '</button>';
        html += '</div>';

        html += '</div>';

        _mpShowModal((isEdit ? '✏️ Chỉnh Sửa Phiên Họp' : '📝 Tạo Biên Bản Cuộc Họp Mới'), html, '640px');
    }

    window._mpSaveSession = function(id) {
        var attendeeCheckboxes = document.querySelectorAll('.mp-attendee-cb:checked');
        var attendees = [];
        attendeeCheckboxes.forEach(function(cb) { attendees.push(parseInt(cb.value)); });

        var data = {
            process_id: parseInt(document.getElementById('mp-session-process').value) || _mpActiveProcessId || 1,
            title: document.getElementById('mp-session-title').value.trim(),
            meeting_date: document.getElementById('mp-session-date').value,
            start_time: '',
            end_time: '',
            chairperson_id: parseInt(document.getElementById('mp-session-chair').value) || null,
            secretary_id: parseInt(document.getElementById('mp-session-secretary').value) || null,
            attendees: attendees,
            conclusion: document.getElementById('mp-session-conclusion') ? document.getElementById('mp-session-conclusion').value.trim() : '',
            next_actions: document.getElementById('mp-session-next') ? document.getElementById('mp-session-next').value.trim() : ''
        };

        var statusEl = document.getElementById('mp-session-status');
        if (statusEl) data.status = statusEl.value;

        if (!data.title || !data.meeting_date) return alert('Vui lòng nhập tiêu đề và ngày họp!');

        if (!id) {
            // Check client-side if chosen process has active meeting
            var chosenProcId = data.process_id;
            var activeS = _mpSessions.find(function(s) { return s.status === 'dang_dien_ra' && (s.process_id || 1) === chosenProcId; });
            if (activeS) {
                var procObj = _mpProcesses.find(function(p) { return p.id === chosenProcId; });
                var procName = procObj ? procObj.name : 'Quy trình này';
                return alert('⚠️ ' + procName + ' hiện đang có cuộc họp "' + activeS.title + '" đang diễn ra!\nVui lòng hoàn thành & lưu kết thúc cuộc họp cũ trước khi tạo cuộc họp mới!');
            }
        }

        var url = id ? '/api/meeting-process/sessions/' + id : '/api/meeting-process/sessions';
        var method = id ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpCloseModal();
                _mpLoadSessions(function() { _mpRenderTabContent(); });
            } else {
                alert(d.error || 'Có lỗi xảy ra');
            }
        })
        .catch(function() { alert('Lỗi kết nối server'); });
    };

    window._mpDeleteSession = function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa phiên họp này? Toàn bộ ghi chép sẽ bị xóa!')) return;
        var token = localStorage.getItem('token');
        var headers = {};
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        fetch('/api/meeting-process/sessions/' + id, {
            method: 'DELETE',
            headers: headers,
            credentials: 'include'
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadSessions(function() { _mpRenderTabContent(); });
            } else {
                alert(d.error || '❌ Có lỗi xảy ra khi xóa!');
            }
        })
        .catch(function(err) { alert('❌ Lỗi kết nối máy chủ: ' + err.message); });
    };

    // ========== DEDICATED FULL-PAGE MEETING WORKSPACE (FOCUS STEPPER WITH AUTO-SAVE) ==========
    var _mpActiveSessionId = null;
    var _mpActiveStepIndex = 0; // 0 to _mpSteps.length - 1, or -1 for summary
    var _mpAutoSaveTimeout = null;

    window._mpViewSession = function(id) {
        _mpActiveSessionId = id;
        _mpActiveStepIndex = 0;
        _mpPrevStepNotesCache = {};
        _mpPrevStepData = null;

        var session = _mpSessions.find(function(s) { return s.id === id; });
        var targetProcessId = (session && session.process_id) ? session.process_id : 1;

        var token = localStorage.getItem('token');
        var headers = {};
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        fetch('/api/meeting-process/steps?process_id=' + targetProcessId, { credentials: 'include', headers: headers })
            .then(function(r) { return r.json(); })
            .then(function(sd) {
                _mpSteps = sd.steps || [];
                _mpPrefetchAllPreviousStepNotes(id, headers);
                return fetch('/api/meeting-process/sessions/' + id + '/notes', { credentials: 'include', headers: headers });
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                _mpNotes = d.notes || [];
                _mpCurrentTab = 'session_detail';
                _mpSaveState();
                _mpRenderTabContent();
            })
            .catch(function() {
                _mpNotes = [];
                _mpCurrentTab = 'session_detail';
                _mpSaveState();
                _mpRenderTabContent();
            });
    };

    function _mpRenderSessionDetailTab(el) {
        var session = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        if (!session) {
            el.innerHTML = '<div style="text-align:center;padding:40px;"><button onclick="window._mpSwitchTab(\'history\')" style="' + _btnSecondary() + '">⬅️ Quay lại lịch sử</button></div>';
            return;
        }

        var statusInfo = _getSessionStatus(session.status);
        var attendees = [];
        try { attendees = JSON.parse(session.attendees || '[]'); } catch(e) {}

        var html = '';

        // Back button & Session Header
        html += '<div style="margin-bottom:16px;">';
        html += '<button onclick="window._mpSwitchTab(\'history\')" style="padding:10px 22px;background:linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);color:white;border:none;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(99,102,241,0.3);transition:all 0.25s ease;" onmouseenter="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 18px rgba(99,102,241,0.45)\'" onmouseleave="this.style.transform=\'none\';this.style.boxShadow=\'0 4px 14px rgba(99,102,241,0.3)\'"><span style="font-size:16px;line-height:1;">←</span> Quay lại Danh Sách Lịch Sử Cuộc Họp</button>';

        html += '<div style="background:' + C.white + ';border-radius:16px;padding:20px 24px;border:1px solid ' + C.slate200 + ';box-shadow:0 2px 8px rgba(0,0,0,0.04);">';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">';
        html += '<div>';
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">';
        html += '<span style="padding:4px 10px;background:' + statusInfo.bg + ';color:' + statusInfo.color + ';border-radius:6px;font-size:11px;font-weight:700;">' + statusInfo.label + '</span>';
        if (session.process_name) {
            var procTheme = _getProcessTheme(session.process_id, session.process_name);
            html += '<span style="padding:4px 12px;background:' + procTheme.bg + ';color:' + procTheme.text + ';border:1px solid ' + procTheme.border + ';border-radius:8px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">' + (session.process_icon || '📋') + ' ' + _escHtml(session.process_name) + '</span>';
        }
        html += '<h2 style="font-size:20px;font-weight:800;color:' + C.slate800 + ';margin:0;">' + _escHtml(session.title) + '</h2>';
        html += '</div>';

        html += '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:' + C.slate500 + ';">';
        html += '<span>📅 ' + _formatDate(session.meeting_date) + '</span>';
        if (session.chairperson_name) html += '<span>👔 Chủ tọa: <strong>' + _escHtml(session.chairperson_name) + '</strong></span>';
        if (session.secretary_name) html += '<span>📝 Thư ký: <strong>' + _escHtml(session.secretary_name) + '</strong></span>';
        html += '<span>👥 Thành viên: <strong>' + attendees.length + ' người</strong></span>';
        html += '</div>';
        html += '</div>';

        // Action status toggle
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
        html += '<button onclick="window._mpShowPreviousSessionModal(' + session.id + ')" style="padding:8px 14px;background:#e0e7ff;color:#3730a3;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;" onmouseenter="this.style.background=\'#c7d2fe\'" onmouseleave="this.style.background=\'#e0e7ff\'">📜 Xem Biên Bản Buổi Trước</button>';
        
        if (session.status === 'da_ket_thuc') {
            if (_mpCanReopenSession(session)) {
                html += '<button onclick="window._mpReopenSession(' + session.id + ')" style="padding:8px 16px;background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(245,158,11,0.3);display:inline-flex;align-items:center;gap:6px;">🔄 Mở Lại Họp</button>';
            }
        } else if (_mpCanEdit) {
            html += '<button onclick="window._mpEditSession(' + session.id + ')" style="padding:8px 14px;background:' + C.slate100 + ';color:' + C.slate700 + ';border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">✏️ Sửa Thông Tin</button>';
        }
        html += '</div>';

        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Stepper workspace layout
        html += '<div style="display:grid;grid-template-columns:310px 1fr;gap:20px;align-items:start;">';

        // Left sidebar stepper list (Sticky on scroll)
        html += '<div style="background:' + C.white + ';border-radius:16px;padding:16px;border:1px solid ' + C.slate200 + ';position:-webkit-sticky;position:sticky;top:85px;align-self:start;max-height:calc(100vh - 105px);overflow-y:auto;z-index:40;box-shadow:0 4px 12px rgba(0,0,0,0.03);">';
        html += '<h4 style="font-size:13px;font-weight:700;color:' + C.slate500 + ';margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Các bước cuộc họp</h4>';

        for (var i = 0; i < _mpSteps.length; i++) {
            var st = _mpSteps[i];
            var isSel = _mpActiveStepIndex === i;

            var stepStatus = _mpCheckStepCompletionStatus(st.id);

            html += '<div onclick="window._mpSelectSessionStep(' + i + ')" style="padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;';
            if (isSel) {
                html += 'background:' + C.indigo + '12;color:' + C.indigo + ';font-weight:700;border-left:3px solid ' + C.indigo + ';';
            } else {
                html += 'background:transparent;color:' + C.slate700 + ';';
            }
            html += '">';

            var circleBg = C.slate200;
            var circleColor = C.slate600;
            var circleText = String(i + 1);

            if (stepStatus === 'SKIPPED') {
                circleBg = '#ef4444';
                circleColor = 'white';
                circleText = '❌';
            } else if (stepStatus === 'COMPLETED') {
                circleBg = C.green;
                circleColor = 'white';
                circleText = '✓';
            } else if (stepStatus === 'SUMMARY') {
                circleBg = C.purple;
                circleColor = 'white';
                circleText = '🔚';
            }

            html += '<span id="mp-step-icon-' + st.id + '" style="width:22px;height:22px;border-radius:50%;background:' + circleBg + ';color:' + circleColor + ';font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + circleText + '</span>';
            var iconStr = st.icon ? (st.icon + ' ') : '';
            html += '<span style="font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + iconStr + _escHtml(st.title) + '</span>';
            html += '</div>';
        }

        // Summary step item
        var isSummary = _mpActiveStepIndex === -1;
        html += '<div onclick="window._mpSelectSessionStep(-1)" style="padding:10px 12px;border-radius:10px;margin-top:12px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;border-top:1px solid ' + C.slate100 + ';';
        if (isSummary) {
            html += 'background:' + C.purple + '12;color:' + C.purple + ';font-weight:700;border-left:3px solid ' + C.purple + ';';
        } else {
            html += 'background:transparent;color:' + C.slate700 + ';';
        }
        html += '">';
        html += '<span style="font-size:14px;">📋</span>';
        html += '<span style="font-size:13px;flex:1;">Tổng kết & Biên bản</span>';
        html += '</div>';

        html += '</div>'; // Left sidebar

        // Right workspace area
        html += '<div id="mp-session-step-workspace">';
        html += '</div>'; // Right area

        html += '</div>'; // Grid layout

        el.innerHTML = html;

        _mpRenderSessionStepWorkspace();
    }

    window._mpSelectSessionStep = function(idx) {
        _mpActiveStepIndex = idx;
        _mpSaveState();
        _mpRenderSessionDetailTab(document.getElementById('mp-tab-content'));
    };

    var _mpPrevStepData = null;

    function _mpRenderSessionStepWorkspace() {
        var el = document.getElementById('mp-session-step-workspace');
        if (!el) return;

        var session = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        if (!session) return;

        var html = '';

        if (_mpActiveStepIndex >= 0 && _mpActiveStepIndex < _mpSteps.length) {
            // STEP DETAIL WORKSPACE
            var step = _mpSteps[_mpActiveStepIndex];
            var note = _mpNotes.find(function(n) { return String(n.step_id) === String(step.id); }) || {};
            var stepColors = _getStepColor(_mpActiveStepIndex);

            html += '<div style="background:' + C.white + ';border-radius:16px;padding:24px;border:1px solid ' + C.slate200 + ';box-shadow:0 2px 8px rgba(0,0,0,0.04);">';

            // Step Header
            html += '<div style="margin-bottom:16px;">';
            html += '<div style="font-size:12px;font-weight:700;color:' + stepColors.from + ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Bước ' + (_mpActiveStepIndex + 1) + ' / ' + _mpSteps.length + '</div>';
            html += '<h3 style="font-size:18px;font-weight:800;color:' + C.slate800 + ';margin:0 0 8px;">' + (step.icon || '📋') + ' ' + _escHtml(step.title) + '</h3>';
            if (step.description) {
                html += '<p style="font-size:14px;color:' + C.slate600 + ';margin:0 0 12px;line-height:1.6;white-space:pre-line;">' + _escHtml(step.description) + '</p>';
            }

            // Menu links (positioned directly under description for optimal balance)
            var stepLinks = _mpParseMenuLinks(step);
            if (stepLinks.length > 0 || step.document_url) {
                html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:12px;border-top:1px dashed ' + C.slate200 + ';">';
                if (step.document_url) {
                    html += '<a href="' + _escHtml(step.document_url) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:#05966914;color:#059669;border:1px solid #05966930;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s;" onmouseenter="this.style.background=\'#05966922\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.background=\'#05966914\';this.style.transform=\'none\'">📄 Văn Bản Họp</a>';
                }
                for (var sl = 0; sl < stepLinks.length; sl++) {
                    var slk = stepLinks[sl];
                    html += '<a href="' + _escHtml(slk.url) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:' + stepColors.from + '14;color:' + stepColors.from + ';border:1px solid ' + stepColors.from + '30;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s;" onmouseenter="this.style.background=\'' + stepColors.from + '22\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.background=\'' + stepColors.from + '14\';this.style.transform=\'none\'">🔗 ' + _escHtml(slk.label || slk.url) + '</a>';
                }
                html += '</div>';
            }

            html += '</div>';

            html += '<hr style="border:none;border-top:1px solid ' + (C.slate150 || '#f1f5f9') + ';margin:16px 0;" />';

            // Container for Previous Step Notes & Task Completion Tracking
            html += '<div id="mp-prev-step-note-container" style="margin-bottom:20px;"><div style="padding:10px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px;display:flex;align-items:center;gap:8px;"><span>⏳</span><span>Đang tải nội dung cuộc họp trước...</span></div></div>';
            html += '<div id="mp-current-step-note-container" style="margin-bottom:20px;"></div>';

            // Suggested Questions / Prompts box if present
            if (step.suggested_questions && step.suggested_questions.trim()) {
                var qLines = step.suggested_questions.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
                if (qLines.length > 0) {
                    html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:16px;margin-bottom:20px;box-shadow:0 2px 6px rgba(2,132,199,0.04);">';
                    html += '<div style="font-size:13px;font-weight:700;color:#0369a1;margin-bottom:10px;display:flex;align-items:center;gap:6px;">💡 Câu Hỏi Gợi Ý Thảo Luận (Click để chèn nhanh vào ghi chú):</div>';
                    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
                    qLines.forEach(function(qTxt) {
                        var cleanQ = qTxt.replace(/^\d+[\.\)]\s*/, '').trim();
                        if (cleanQ) {
                            html += '<button type="button" onclick="window._mpInsertSuggestedQuestion(' + _mpActiveStepIndex + ', \'' + _escHtml(cleanQ).replace(/'/g, "\\'") + '\')" style="padding:7px 14px;background:white;color:#0284c7;border:1px solid #7dd3fc;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s ease;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.03);" onmouseenter="this.style.background=\'#e0f2fe\';this.style.borderColor=\'#0284c7\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.background=\'white\';this.style.borderColor=\'#7dd3fc\';this.style.transform=\'none\'">💡 ' + _escHtml(cleanQ) + ' <span style="font-size:10px;opacity:0.8;background:#0284c718;padding:2px 6px;border-radius:10px;">+ Chèn</span></button>';
                        }
                    });
                    html += '</div>';
                    html += '</div>';
                }
            }

            var isSkipped = note && (note.is_skipped === true || note.is_skipped === 'true' || note.is_skipped === 1);

            if (isSkipped) {
                // Banner for skipped step
                html += '<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:16px;padding:28px 24px;margin-bottom:20px;text-align:center;box-shadow:0 4px 16px rgba(239,68,68,0.06);">';
                html += '<div style="font-size:40px;margin-bottom:8px;">❌</div>';
                html += '<h3 style="font-size:18px;font-weight:800;color:#dc2626;margin:0 0 6px;">BƯỚC NÀY ĐÃ ĐƯỢC ĐÁNH DẤU BỎ QUA</h3>';
                html += '<p style="font-size:13px;color:#991b1b;margin:0 0 18px;">Bước này không diễn ra báo cáo / thảo luận trong buổi họp này.</p>';
                if (_mpCanEdit && session.status !== 'da_ket_thuc') {
                    html += '<button type="button" data-no-debounce="true" onclick="event.stopPropagation();window._mpToggleSkipStep(' + step.id + ', false)" style="padding:10px 22px;background:white;color:#dc2626;border:1.5px solid #ef4444;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(239,68,68,0.15);transition:all 0.2s;" onmouseenter="this.style.background=\'#fee2e2\'" onmouseleave="this.style.background=\'white\'">🔄 Mở Lại Bước Này (Hủy Bỏ Qua)</button>';
                }
                html += '</div>';
            } else {
                // Unified Note & Plan Orientation editor
                var combinedNoteText = note.content || '';
                if (note.next_actions && note.next_actions.trim()) {
                    if (combinedNoteText) {
                        if (combinedNoteText.indexOf(note.next_actions.trim()) === -1) {
                            combinedNoteText += '\n\n' + note.next_actions.trim();
                        }
                    } else {
                        combinedNoteText = note.next_actions.trim();
                    }
                }
                if (!combinedNoteText || !combinedNoteText.trim()) {
                    combinedNoteText = '1. ';
                }

                html += '<div style="background:linear-gradient(135deg, #f6fbf8 0%, #ecfdf5 100%);border:1.5px solid #a7f3d0;border-left:5px solid #10b981;border-radius:16px;padding:20px;box-shadow:0 4px 14px rgba(16,185,129,0.06);margin-bottom:20px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #a7f3d050;">';
                html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
                html += '<span style="font-size:15px;font-weight:800;color:#064e3b;">📝 Thảo luận & Định Hướng Kế Hoạch Tiếp:</span>';
                html += '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-weight:800;font-size:11px;border:1px solid #a7f3d0;">🚀 KẾ HOẠCH TIẾP THEO</span>';
                html += '<span style="font-size:11px;color:#047857;background:#ecfdf5;padding:3px 10px;border-radius:6px;font-weight:600;">↵ Enter để xuống dòng tự động đánh số</span>';
                html += '</div>';
                
                html += '<div style="display:flex;align-items:center;gap:10px;">';
                if (session.status !== 'da_ket_thuc') {
                    html += '<button id="mp-btn-skip-step" type="button" data-no-debounce="true" onclick="event.stopPropagation();window._mpToggleSkipStep(' + step.id + ', true)" style="padding:6px 14px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:none;align-items:center;gap:6px;transition:all 0.2s;" onmouseenter="this.style.background=\'#ef4444\';this.style.color=\'white\'" onmouseleave="this.style.background=\'#fee2e2\';this.style.color=\'#dc2626\'" title="Bỏ qua bước này nếu không họp trong buổi này">⏭️ Bỏ Qua Bước Này</button>';
                }
                html += '<span id="mp-autosave-status" style="font-size:12px;color:' + C.slate400 + ';font-weight:600;"></span>';
                html += '</div>';
                html += '</div>';

                var isSessionEditable = _mpIsSessionEditable(session);
                html += '<textarea id="mp-note-content" rows="8" ' + (isSessionEditable ? '' : 'readonly') + ' placeholder="1. Nhập nội dung thảo luận...\n2. Định hướng kế hoạch tiếp theo..." onkeydown="window._mpHandleNoteKeydown(event, this)" onfocus="window._mpEnsureNoteNumbering(this);this.style.borderColor=\'' + C.indigo + '\';this.style.boxShadow=\'0 0 0 3px rgba(99,102,241,0.12)\'" onblur="this.style.borderColor=\'' + C.slate200 + '\';this.style.boxShadow=\'none\'" oninput="window._mpTriggerAutoSaveNote(' + step.id + ')" style="width:100%;padding:14px 16px;border:1.5px solid ' + C.slate200 + ';border-radius:12px;font-size:14px;color:' + (isSessionEditable ? C.slate800 : '#64748b') + ';background:' + (isSessionEditable ? '#fafafa' : '#f8fafc') + ';box-sizing:border-box;outline:none;transition:all 0.2s;resize:vertical;line-height:1.6;min-height:160px;' + (isSessionEditable ? '' : 'cursor:not-allowed;') + '">' + _escHtml(combinedNoteText) + '</textarea>';
                html += '</div>';
            }

            // Navigation stepper buttons
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid ' + C.slate100 + ';">';
            if (_mpActiveStepIndex > 0) {
                html += '<button onclick="window._mpSelectSessionStep(' + (_mpActiveStepIndex - 1) + ')" style="padding:10px 22px;background:linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);color:white;border:none;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(99,102,241,0.3);transition:all 0.25s ease;" onmouseenter="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 18px rgba(99,102,241,0.45)\'" onmouseleave="this.style.transform=\'none\';this.style.boxShadow=\'0 4px 14px rgba(99,102,241,0.3)\'"><span style="font-size:16px;line-height:1;">←</span> Bước trước</button>';
            } else {
                html += '<div></div>';
            }

            if (_mpActiveStepIndex < _mpSteps.length - 1) {
                html += '<button onclick="window._mpSelectSessionStep(' + (_mpActiveStepIndex + 1) + ')" style="padding:10px 22px;background:linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);color:white;border:none;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(99,102,241,0.3);transition:all 0.25s ease;" onmouseenter="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 18px rgba(99,102,241,0.45)\'" onmouseleave="this.style.transform=\'none\';this.style.boxShadow=\'0 4px 14px rgba(99,102,241,0.3)\'">Bước tiếp theo <span style="font-size:16px;line-height:1;">→</span></button>';
            } else {
                html += '<button onclick="window._mpSelectSessionStep(-1)" style="padding:10px 22px;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;border:none;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.3);transition:all 0.25s ease;">Xem Tổng Kết 📋</button>';
            }
            html += '</div>';

            html += '</div>'; // Workspace card
        } else {
            // SUMMARY WORKSPACE
            html += '<div style="background:' + C.white + ';border-radius:16px;padding:24px;border:1px solid ' + C.slate200 + ';box-shadow:0 2px 8px rgba(0,0,0,0.04);">';

            if (session.status === 'da_ket_thuc') {
                html += '<div id="mp-summary-success-banner" style="background:linear-gradient(135deg, #059669 0%, #10b981 100%);color:white;border-radius:14px;padding:16px 20px;margin-bottom:20px;box-shadow:0 4px 14px rgba(16,185,129,0.25);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">';
                html += '<div>';
                html += '<div style="font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;">🎉 ĐÃ KẾT THÚC CUỘC HỌP & LƯU BIÊN BẢN THÀNH CÔNG!</div>';
                html += '<div style="font-size:12px;opacity:0.95;margin-top:2px;">Biên bản đã được lưu an toàn vào hệ thống. Bạn có thể xem lại trong Lịch Sử bất kỳ lúc nào.</div>';
                html += '</div>';
                html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
                html += '<button onclick="window._mpSwitchTab(\'history\')" style="padding:8px 16px;background:white;color:#047857;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);">📋 Xem Lịch Sử</button>';
                if (_mpIsDirector()) {
                    html += '<button onclick="window._mpReopenSession(' + session.id + ')" style="padding:8px 14px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;">🔄 Mở Lại Họp</button>';
                }
                html += '</div>';
                html += '</div>';
            }

            html += '<h3 style="font-size:18px;font-weight:800;color:' + C.slate800 + ';margin:0 0 16px;">📋 Tổng Kết & Kết Luận Cuộc Họp</h3>';

            // Summary notes view
            html += '<div style="margin-bottom:20px;">';
            html += '<h4 style="font-size:14px;font-weight:700;color:' + C.slate700 + ';margin:0 0 10px;">📝 Thảo luận & Định Hướng Kế Hoạch Tiếp:</h4>';

            var hasAnyNotes = false;
            for (var sIdx = 0; sIdx < _mpSteps.length; sIdx++) {
                var st = _mpSteps[sIdx];
                var nt = _mpNotes.find(function(n) { return n.step_id === st.id; });
                if (nt && (nt.content || nt.next_actions)) {
                    hasAnyNotes = true;
                    break;
                }
            }

            if (!hasAnyNotes) {
                html += '<div style="padding:16px;background:' + C.slate50 + ';border-radius:10px;color:' + C.slate400 + ';font-size:13px;text-align:center;">Chưa có ghi chép thảo luận nào trong các bước</div>';
            } else {
                html += '<div style="display:grid;gap:12px;">';
                for (var sIdx = 0; sIdx < _mpSteps.length; sIdx++) {
                    var st = _mpSteps[sIdx];
                    var nt = _mpNotes.find(function(n) { return n.step_id === st.id; });
                    if (!nt) continue;
                    var isSkipped = (nt.is_skipped === true || nt.is_skipped === 'true' || nt.is_skipped === 1);
                    if (!isSkipped && !nt.content && !nt.next_actions) continue;

                    var stepColors = _getStepColor(sIdx);
                    var titleStr = _escHtml(st.title);

                    html += '<div style="padding:14px 18px;background:' + (isSkipped ? '#fef2f2' : C.slate50) + ';border-radius:12px;border-left:4px solid ' + (isSkipped ? '#ef4444' : stepColors.from) + ';box-shadow:0 1px 3px rgba(0,0,0,0.03);">';
                    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
                    html += '<div style="display:flex;align-items:center;gap:8px;">';
                    html += '<span style="width:20px;height:20px;border-radius:50%;background:' + (isSkipped ? '#ef4444' : stepColors.from) + ';color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + (isSkipped ? '❌' : (sIdx + 1)) + '</span>';
                    html += '<strong style="font-size:14px;color:' + C.slate800 + ';font-weight:700;">' + titleStr + '</strong>';
                    html += '</div>';

                    if (isSkipped) {
                        html += '<span style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;padding:3px 10px;border-radius:12px;">❌ Đã bỏ qua (Không họp)</span>';
                    }
                    html += '</div>';

                    if (isSkipped) {
                        html += '<p style="font-size:13px;color:#991b1b;margin:4px 0 0 28px;font-style:italic;">Bước này không diễn ra báo cáo / thảo luận trong buổi họp.</p>';
                    } else {
                        if (nt.content) html += '<p style="font-size:13px;color:' + C.slate700 + ';margin:4px 0 0 28px;line-height:1.6;white-space:pre-line;">' + _escHtml(nt.content) + '</p>';
                        if (nt.next_actions) html += '<div style="margin-top:6px;margin-left:28px;font-size:12px;color:' + C.greenDark + ';font-weight:600;">🎯 Action Items: ' + _escHtml(nt.next_actions) + '</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';

            // Overall conclusion editor
            var isSummaryEditable = _mpIsSessionEditable(session);
            html += '<div style="margin-bottom:20px;">';
            html += '<label style="font-size:13px;font-weight:800;color:' + C.slate700 + ';margin-bottom:6px;display:flex;align-items:center;gap:6px;">📌 Kết Luận Chung Cuộc Họp: <span style="font-weight:800;color:#ef4444;background:#fee2e2;padding:2px 8px;border-radius:6px;border:1px solid #fca5a5;font-size:12px;">(*Bắt buộc nhập)</span></label>';
            html += '<textarea id="mp-summary-conclusion" rows="5" ' + (isSummaryEditable ? '' : 'readonly') + ' placeholder="Nhập kết luận tổng quan của chủ tọa / giám đốc..." style="' + _inputStyle() + 'resize:vertical;background:' + (isSummaryEditable ? 'white' : '#f8fafc') + ';color:' + (isSummaryEditable ? C.slate800 : '#64748b') + ';' + (isSummaryEditable ? '' : 'cursor:not-allowed;') + '">' + _escHtml(session.conclusion || '') + '</textarea>';
            html += '</div>';

            if (_mpCanEdit && isSummaryEditable) {
                var allStepsCompleted = _mpSteps.length > 0 && _mpSteps.every(function(st) {
                    var status = _mpCheckStepCompletionStatus(st.id);
                    return status === 'COMPLETED' || status === 'SKIPPED' || status === 'SUMMARY';
                });

                html += '<div id="mp-summary-save-container" style="margin-top:20px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">';
                if (!allStepsCompleted) {
                    var uncompletedSteps = _mpSteps.filter(function(st) {
                        var status = _mpCheckStepCompletionStatus(st.id);
                        return status !== 'COMPLETED' && status !== 'SKIPPED' && status !== 'SUMMARY';
                    }).map(function(st) { return st.title; });

                    html += '<div style="font-size:12px;color:#d97706;background:#fffbeb;padding:8px 14px;border-radius:8px;border:1px solid #fef3c7;font-weight:600;">⚠️ Còn ' + uncompletedSteps.length + ' bước chưa xử lý xong công việc cũ hoặc chưa nhập thảo luận / chưa chọn Bỏ qua (' + uncompletedSteps.slice(0, 3).join(', ') + (uncompletedSteps.length > 3 ? '...' : '') + '). Hoàn thành tất cả các bước (đạt tích xanh ✓ hoặc ❌) để mở khóa nút Lưu!</div>';
                    html += '<button disabled onclick="alert(\'⚠️ Vui lòng xử lý xong 100% việc cũ và nhập thảo luận (✓) hoặc chọn Bỏ qua (❌) cho tất cả các bước họp trước khi Lưu Kết Luận & Biên Bản!\')" style="padding:10px 22px;background:#cbd5e1;color:#64748b;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:not-allowed;opacity:0.65;box-shadow:none;">🔒 Lưu Kết Luận & Biên Bản (Chưa đủ điều kiện)</button>';
                } else {
                    html += '<button onclick="window._mpSaveSummaryConclusion(' + session.id + ')" style="padding:10px 22px;background:linear-gradient(135deg,' + C.green + ',' + C.greenDark + ');color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(16,185,129,0.3);">💾 Lưu Kết Luận & Biên Bản</button>';
                }
                html += '</div>';
            }

            html += '</div>'; // Summary card
        }

        el.innerHTML = html;

        if (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
            var activeStepObj = _mpSteps[_mpActiveStepIndex];
            _mpLoadAndRenderPreviousStepNote(activeStepObj.id);
            _mpRenderCurrentStepTaskBox(activeStepObj.id);
            _mpUpdateSkipButtonVisibility(activeStepObj.id);
        }
    }

    function _parseNoteLinesToItems(rawContent) {
        if (!rawContent || !rawContent.trim()) return [];
        var lines = rawContent.split('\n');
        var items = [];
        lines.forEach(function(line) {
            var clean = line.replace(/^\s*\d+[\.\)]\s*/, '').trim();
            if (clean && 
                !clean.startsWith('function') && 
                !clean.startsWith('return') && 
                !clean.startsWith('//') && 
                !clean.startsWith('var ') && 
                !clean.startsWith('const ') && 
                !clean.startsWith('let ') && 
                !clean.startsWith('if (') && 
                !clean.startsWith('html +=') && 
                !clean.startsWith('alert(') && 
                !clean.startsWith('window.') && 
                !clean.endsWith(');') && 
                !clean.endsWith('{')) {
                items.push(clean);
            }
        });
        if (items.length > 50) items = items.slice(0, 50);
        return items;
    }

    function _mpRenderPreviousStepBoxFromData(prevData) {
        var container = document.getElementById('mp-prev-step-note-container');
        if (!container) return;

        if (!prevData || !prevData.success || !prevData.note || !prevData.note.content || !prevData.note.content.trim()) {
            container.innerHTML = '';
            if (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
                _mpUpdateSkipButtonVisibility(_mpSteps[_mpActiveStepIndex].id);
            }
            return;
        }

        var note = prevData.note;
        var prevSession = prevData.prevSession || prevData.session || {};
        var sessionTitleStr = prevSession.title ? _escHtml(prevSession.title) : 'Cuộc Họp Tuần Trước';
        var sessionDateStr = prevSession.meeting_date ? ' - ' + _formatDate(prevSession.meeting_date) : '';

        var rawItems = _parseNoteLinesToItems(note.content);
        if (rawItems.length === 0) {
            container.innerHTML = '';
            if (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
                _mpUpdateSkipButtonVisibility(_mpSteps[_mpActiveStepIndex].id);
            }
            return;
        }

        var activeSession = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        var isEditable = _mpIsSessionEditable(activeSession);

        var existingStatuses = [];
        try { existingStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}

        var itemStatuses = note._parsedItems || rawItems.map(function(itemText, idx) {
            var found = existingStatuses.find(function(s) { return s.index === idx || s.text === itemText; });
            return {
                index: idx,
                text: itemText,
                completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                evidence_image: found ? (found.evidence_image || '') : '',
                completed_at: found ? (found.completed_at || '') : '',
                transferred_to: found ? (found.transferred_to || '') : ''
            };
        });

        note._parsedItems = itemStatuses;

        var completedCount = itemStatuses.filter(function(i) { return i.completed || !!i.transferred_to; }).length;
        var totalCount = itemStatuses.length;
        var percent = Math.round((completedCount / totalCount) * 100);

        var html = '';
        html += '<div style="background:linear-gradient(135deg, #fffdf5 0%, #fffbe6 100%);border:1.5px solid #fde68a;border-left:5px solid #f59e0b;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 4px 14px rgba(245,158,11,0.06);width:100%;box-sizing:border-box;">';
        
        // Header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">';
        html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
        html += '<span style="font-size:15px;font-weight:800;color:#92400e;">📌 Nội Dung & Kế Hoạch Tuần Trước (' + sessionTitleStr + sessionDateStr + ')</span>';
        html += '<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:20px;font-weight:800;font-size:11px;border:1px solid #fde68a;">⏳ KẾ HOẠCH TUẦN TRƯỚC</span>';
        html += '</div>';
        html += '</div>';

        // Progress Bar
        html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;background:white;padding:10px 16px;border-radius:12px;border:1px solid #e2e8f0;">';
        html += '<div style="font-size:13px;font-weight:700;color:#334155;white-space:nowrap;">Tiến độ hoàn thành:</div>';
        html += '<div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + percent + '%;background:linear-gradient(90deg, #10b981, #059669);transition:width 0.3s ease;"></div>';
        html += '</div>';
        html += '<div style="font-size:12px;font-weight:800;color:' + (percent === 100 ? '#059669' : '#d97706') + ';white-space:nowrap;">' + completedCount + ' / ' + totalCount + ' (' + percent + '%)</div>';
        html += '</div>';

        // Item List Container: FORCED FLEX COLUMN 100% FULL WIDTH
        html += '<div style="display:flex;flex-direction:column;gap:14px;width:100%;box-sizing:border-box;">';
        itemStatuses.forEach(function(it, idx) {
            // DIV 1: Outer Card
            html += '<div style="width:100%;background:white;border:1.5px solid ' + (it.completed ? '#a7f3d0' : (it.transferred_to ? '#bfdbfe' : '#e2e8f0')) + ';border-radius:14px;padding:16px;box-shadow:0 2px 6px rgba(0,0,0,0.02);box-sizing:border-box;">';
            
            // DIV 2: Inner Row Flex
            html += '<div style="display:flex;align-items:flex-start;gap:12px;width:100%;">';
            if (!it.transferred_to || it.completed) {
                html += '<input type="checkbox" ' + (it.completed ? 'checked' : '') + (isEditable ? ' onchange="window._mpToggleItemCompletion(' + note.id + ', ' + idx + ')"' : ' disabled') + ' style="width:20px;height:20px;margin-top:2px;cursor:' + (isEditable ? 'pointer' : 'not-allowed') + ';accent-color:#10b981;flex-shrink:0;" />';
            } else {
                html += '<span style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;color:#2563eb;flex-shrink:0;margin-top:2px;" title="Công việc đã được chuyển sang tuần này">↪️</span>';
            }
            
            // DIV 3: Content Column
            html += '<div style="flex:1;min-width:0;">';
            
            // DIV 4: Title + Badge Row
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">';
            html += '<span style="font-size:14px;font-weight:700;color:' + (it.completed ? '#065f46' : (it.transferred_to ? '#2563eb' : '#1e293b')) + ';' + (it.completed ? 'text-decoration:line-through;' : '') + '">' + (idx + 1) + '. ' + _escHtml(it.text) + '</span>';
            if (it.completed) {
                html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#d1fae5;color:#047857;white-space:nowrap;display:inline-flex;align-items:center;">✅ Đã hoàn thành</span>';
            } else if (it.transferred_to) {
                if (isEditable) {
                    html += '<button type="button" onclick="event.stopPropagation();window._mpCancelSingleTransferredItem(' + note.id + ', ' + idx + ')" style="font-size:11px;padding:5px 12px;border-radius:12px;font-weight:700;background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 1px 4px rgba(239,68,68,0.15);white-space:nowrap;" title="Bấm vào đây để Hủy Chuyển công việc này về trạng thái chưa hoàn thành">';
                    html += '↪️ Đã chuyển - ' + _escHtml(it.transferred_to);
                    html += ' <span style="background:#ef4444;color:white;border-radius:50%;width:16px;height:16px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;line-height:1;margin-left:4px;">✕</span>';
                    html += ' <span style="font-size:11px;font-weight:800;text-decoration:underline;margin-left:2px;color:#b91c1c;">(Hủy chuyển)</span>';
                    html += '</button>';
                } else {
                    html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#dbeafe;color:#1d4ed8;white-space:nowrap;display:inline-flex;align-items:center;">↪️ Đã chuyển - ' + _escHtml(it.transferred_to) + '</span>';
                }
            } else {
                html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#fef3c7;color:#b45309;white-space:nowrap;display:inline-flex;align-items:center;">⌛ Chưa hoàn thành</span>';
                if (isEditable) {
                    html += '<button type="button" onclick="event.stopPropagation();window._mpTransferSingleItemToCurrent(' + note.id + ', ' + idx + ')" style="font-size:11px;padding:5px 14px;border-radius:12px;font-weight:700;background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);color:white;border:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 6px rgba(99,102,241,0.25);white-space:nowrap;margin-left:6px;transition:all 0.2s;" onmouseenter="this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.transform=\'none\'" title="Bấm để chuyển công việc này sang cuộc họp hiện tại">';
                    html += '➡️ Chuyển sang cuộc họp này';
                    html += '</button>';
                }
            }
            if (it.completed_at) html += '<span style="font-size:11px;color:#94a3b8;white-space:nowrap;">(' + it.completed_at + ')</span>';
            html += '</div>'; // Close DIV 4

            if (it.completed) {
                // DIV 5: Completed Details Box
                html += '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;display:flex;flex-direction:column;gap:12px;width:100%;box-sizing:border-box;">';
                
                // DIV 6: Row 2 (Task content textarea)
                var isNoteEmpty = !it.evidence_link || !it.evidence_link.trim();
                html += '<div style="display:flex;flex-direction:column;gap:6px;width:100%;">';
                if (isNoteEmpty) {
                    html += '<div id="mp-link-label-' + note.id + '-' + idx + '" style="font-size:12px;font-weight:700;color:#059669;white-space:nowrap;display:flex;align-items:center;gap:6px;">📝 Nội dung công việc: <span style="font-weight:700;color:#ef4444;background:#fee2e2;padding:2px 8px;border-radius:10px;border:1px solid #fca5a5;font-size:11px;">(*Bắt buộc nhập)</span></div>';
                } else {
                    html += '<div id="mp-link-label-' + note.id + '-' + idx + '" style="font-size:12px;font-weight:700;color:#059669;white-space:nowrap;display:flex;align-items:center;gap:6px;">📝 Nội dung công việc: <span style="font-weight:700;color:#047857;background:#d1fae5;padding:2px 8px;border-radius:10px;font-size:11px;">✓ Đã nhập xong</span></div>';
                }
                html += '<div style="display:flex;align-items:center;gap:8px;width:100%;">';
                if (isEditable) {
                    html += '<textarea id="mp-link-inp-' + note.id + '-' + idx + '" placeholder="Nhập ghi chú / nội dung công việc (ấn Enter xuống dòng)..." oninput="window._mpUpdateItemEvidenceLink(' + note.id + ', ' + idx + ', this.value)" onblur="window._mpUpdateItemEvidenceLink(' + note.id + ', ' + idx + ', this.value, true)" style="width:100%;min-height:50px;padding:8px 12px;font-size:13px;border:' + (isNoteEmpty ? '2px solid #ef4444' : '1.5px solid #cbd5e1') + ';background:' + (isNoteEmpty ? '#fff5f5' : 'white') + ';border-radius:10px;outline:none;resize:vertical;font-family:inherit;line-height:1.4;box-sizing:border-box;">' + _escHtml(it.evidence_link || '') + '</textarea>';
                    html += '<span id="mp-link-status-' + note.id + '-' + idx + '" style="font-size:11px;color:#10b981;font-weight:700;opacity:0;transition:all 0.3s ease;white-space:nowrap;">✓ Đã lưu</span>';
                } else {
                    html += '<textarea id="mp-link-inp-' + note.id + '-' + idx + '" readonly placeholder="Chưa có ghi chú nội dung công việc..." style="width:100%;min-height:50px;padding:8px 12px;font-size:13px;border:1.5px solid #cbd5e1;border-radius:10px;outline:none;resize:vertical;font-family:inherit;line-height:1.4;box-sizing:border-box;background:#f8fafc;color:#64748b;cursor:not-allowed;">' + _escHtml(it.evidence_link || '') + '</textarea>';
                }
                html += '</div>';
                html += '<div id="mp-link-warn-' + note.id + '-' + idx + '" style="font-size:11px;font-weight:700;color:#dc2626;margin-top:2px;display:' + (isEditable && isNoteEmpty ? 'block' : 'none') + ';">⚠️ Vui lòng nhập nội dung công việc để ghi nhận hoàn thành!</div>';
                html += '</div>'; // Close DIV 6

                // DIV 7: Row 3 (Image paste)
                html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;width:100%;">';
                html += '<div style="font-size:12px;font-weight:700;color:#4f46e5;white-space:nowrap;">📷 Ảnh dẫn chứng:</div>';
                if (isEditable) {
                    html += '<input type="text" placeholder="Bấm vào đây và ấn Ctrl+V dán ảnh..." onkeydown="if(!(event.ctrlKey && event.key.toLowerCase()===\'v\') && !(event.metaKey && event.key.toLowerCase()===\'v\') && event.key!==\'Tab\') { event.preventDefault(); }" onpaste="window._mpHandleEvidenceImagePaste(event, ' + note.id + ', ' + idx + ')" style="flex:1;min-width:240px;max-width:340px;padding:7px 12px;font-size:12px;border:1.5px dashed #6366f1;border-radius:10px;background:#f5f3ff;outline:none;color:#4f46e5;cursor:pointer;" title="Chỉ nhận dán ảnh bằng Ctrl+V (Không hỗ trợ nhập chữ)" />';
                }
                
                if (it.evidence_image) {
                    html += '<img src="' + it.evidence_image + '" onclick="window._mpViewImageModal(this.src)" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1.5px solid #cbd5e1;cursor:pointer;" title="Bấm để phóng to xem ảnh" />';
                    if (isEditable) {
                        html += '<button onclick="window._mpRemoveItemEvidenceImage(' + note.id + ', ' + idx + ')" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">🗑️ Xóa ảnh</button>';
                    }
                } else if (!isEditable) {
                    html += '<span style="font-size:12px;color:#94a3b8;font-style:italic;">(Chưa có ảnh dẫn chứng)</span>';
                }
                html += '</div>'; // Close DIV 7

                html += '</div>'; // Close DIV 5
            }

            html += '</div>'; // Close DIV 3
            html += '</div>'; // Close DIV 2
            html += '</div>'; // Close DIV 1
        });
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
        if (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
            _mpUpdateSkipButtonVisibility(_mpSteps[_mpActiveStepIndex].id);
        }
    }

    function _mpRenderCurrentStepTaskBox(stepId) {
        var container = document.getElementById('mp-current-step-note-container');
        if (!container) return;

        var note = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });
        if (!note || !note.content || !note.content.trim()) {
            container.innerHTML = '';
            return;
        }

        var rawItems = _parseNoteLinesToItems(note.content);
        if (rawItems.length === 0) {
            container.innerHTML = '';
            return;
        }

        var session = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        var sessionTitle = session ? session.title : 'Cuộc Họp Này';
        var sessionDateStr = session ? _formatDate(session.meeting_date) : '';

        var existingStatuses = [];
        try { existingStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}

        var itemStatuses = note._parsedItems || rawItems.map(function(itemText, idx) {
            var found = existingStatuses.find(function(s) { return s.index === idx || s.text === itemText; });
            return {
                index: idx,
                text: itemText,
                completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                evidence_link: found ? (found.evidence_link || '') : '',
                evidence_image: found ? (found.evidence_image || '') : '',
                completed_at: found ? (found.completed_at || '') : '',
                transferred_to: found ? (found.transferred_to || '') : ''
            };
        });

        note._parsedItems = itemStatuses;

        var completedCount = itemStatuses.filter(function(i) { return i.completed || !!i.transferred_to; }).length;
        var totalCount = itemStatuses.length;
        var percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

        var html = '';
        html += '<div style="background:linear-gradient(135deg, #fafbff 0%, #eff6ff 100%);border:1.5px solid #c7d2fe;border-left:5px solid #4f46e5;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 4px 14px rgba(79,70,229,0.06);width:100%;box-sizing:border-box;">';
        
        // Header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">';
        html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
        html += '<span style="font-size:15px;font-weight:800;color:#1e1b4b;">📋 Tiến Độ & Dẫn Chứng Công Việc (' + _escHtml(sessionTitle) + (sessionDateStr ? ' - ' + sessionDateStr : '') + ')</span>';
        html += '<span style="background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:20px;font-weight:800;font-size:11px;border:1px solid #c7d2fe;">🎯 BUỔI TUẦN NÀY (HIỆN TẠI)</span>';
        html += '</div>';
        html += '</div>';

        // Progress Bar
        html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;background:white;padding:10px 16px;border-radius:12px;border:1px solid #e2e8f0;">';
        html += '<div style="font-size:13px;font-weight:700;color:#334155;white-space:nowrap;">Tiến độ hoàn thành:</div>';
        html += '<div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + percent + '%;background:linear-gradient(90deg, #10b981, #059669);transition:width 0.3s ease;"></div>';
        html += '</div>';
        html += '<div style="font-size:12px;font-weight:800;color:' + (percent === 100 ? '#059669' : '#d97706') + ';white-space:nowrap;">' + completedCount + ' / ' + totalCount + ' (' + percent + '%)</div>';
        html += '</div>';

        // Item List Container: FORCED FLEX COLUMN 100% FULL WIDTH
        html += '<div style="display:flex;flex-direction:column;gap:14px;width:100%;box-sizing:border-box;">';
        itemStatuses.forEach(function(it, idx) {
            // DIV 1: Outer Card
            html += '<div style="width:100%;background:white;border:1.5px solid ' + (it.completed ? '#a7f3d0' : (it.transferred_to ? '#bfdbfe' : '#e2e8f0')) + ';border-radius:14px;padding:16px;box-shadow:0 2px 6px rgba(0,0,0,0.02);box-sizing:border-box;">';
            
            // DIV 2: Inner Row Flex
            html += '<div style="display:flex;align-items:flex-start;gap:12px;width:100%;">';
            html += '<span style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;color:#6366f1;flex-shrink:0;margin-top:2px;" title="Kế hoạch triển khai tuần này (Sẽ được báo cáo và kiểm tra ở cuộc họp tuần sau)">📌</span>';
            
            // DIV 3: Content Column
            html += '<div style="flex:1;min-width:0;">';
            
            // DIV 4: Title + Badge Row
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">';
            html += '<span style="font-size:14px;font-weight:700;color:' + (it.completed ? '#065f46' : (it.transferred_to ? '#1d4ed8' : '#1e293b')) + ';' + (it.completed ? 'text-decoration:line-through;' : '') + '">' + (idx + 1) + '. ' + _escHtml(it.text) + '</span>';
            if (it.completed) {
                html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#d1fae5;color:#047857;white-space:nowrap;display:inline-flex;align-items:center;">✅ Đã hoàn thành</span>';
            } else if (it.transferred_to) {
                html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#dbeafe;color:#1d4ed8;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">';
                html += '↪️ Đã chuyển - ' + _escHtml(it.transferred_to);
                html += ' <span onclick="window._mpCancelTransferItem(' + note.id + ', ' + idx + ')" style="background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:11px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;margin-left:4px;box-shadow:0 1px 3px rgba(239,68,68,0.4);" title="Hủy chuyển công việc này để chọn lại">✕</span>';
                html += '</span>';
            } else {
                html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;background:#fef3c7;color:#b45309;white-space:nowrap;display:inline-flex;align-items:center;">⌛ Chưa hoàn thành</span>';
            }
            if (it.completed_at) html += '<span style="font-size:11px;color:#94a3b8;white-space:nowrap;">(' + it.completed_at + ')</span>';
            html += '</div>'; // Close DIV 4

            if (it.completed) {
                // DIV 5: Completed Details Box
                html += '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;display:flex;flex-direction:column;gap:12px;width:100%;box-sizing:border-box;">';
                
                // DIV 6: Row 2 (Task content textarea)
                var isNoteEmpty = !it.evidence_link || !it.evidence_link.trim();
                html += '<div style="display:flex;flex-direction:column;gap:6px;width:100%;">';
                if (isNoteEmpty) {
                    html += '<div id="mp-link-label-' + note.id + '-' + idx + '" style="font-size:12px;font-weight:700;color:#059669;white-space:nowrap;display:flex;align-items:center;gap:6px;">📝 Nội dung công việc: <span style="font-weight:700;color:#ef4444;background:#fee2e2;padding:2px 8px;border-radius:10px;border:1px solid #fca5a5;font-size:11px;">(*Bắt buộc nhập)</span></div>';
                } else {
                    html += '<div id="mp-link-label-' + note.id + '-' + idx + '" style="font-size:12px;font-weight:700;color:#059669;white-space:nowrap;display:flex;align-items:center;gap:6px;">📝 Nội dung công việc: <span style="font-weight:700;color:#047857;background:#d1fae5;padding:2px 8px;border-radius:10px;font-size:11px;">✓ Đã nhập xong</span></div>';
                }
                html += '<div style="display:flex;align-items:center;gap:8px;width:100%;">';
                html += '<textarea id="mp-link-inp-' + note.id + '-' + idx + '" placeholder="Nhập ghi chú / nội dung công việc (ấn Enter xuống dòng)..." oninput="window._mpUpdateItemEvidenceLink(' + note.id + ', ' + idx + ', this.value)" onblur="window._mpUpdateItemEvidenceLink(' + note.id + ', ' + idx + ', this.value, true)" style="width:100%;min-height:50px;padding:8px 12px;font-size:13px;border:' + (isNoteEmpty ? '2px solid #ef4444' : '1.5px solid #cbd5e1') + ';background:' + (isNoteEmpty ? '#fff5f5' : 'white') + ';border-radius:10px;outline:none;resize:vertical;font-family:inherit;line-height:1.4;box-sizing:border-box;">' + _escHtml(it.evidence_link || '') + '</textarea>';
                html += '<span id="mp-link-status-' + note.id + '-' + idx + '" style="font-size:11px;color:#10b981;font-weight:700;opacity:0;transition:all 0.3s ease;white-space:nowrap;">✓ Đã lưu</span>';
                html += '</div>';
                html += '<div id="mp-link-warn-' + note.id + '-' + idx + '" style="font-size:11px;font-weight:700;color:#dc2626;margin-top:2px;display:' + (isNoteEmpty ? 'block' : 'none') + ';">⚠️ Vui lòng nhập nội dung công việc để ghi nhận hoàn thành!</div>';
                html += '</div>'; // Close DIV 6

                // DIV 7: Row 3 (Image paste)
                html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;width:100%;">';
                html += '<div style="font-size:12px;font-weight:700;color:#4f46e5;white-space:nowrap;">📷 Ảnh dẫn chứng:</div>';
                html += '<input type="text" placeholder="Bấm vào đây và ấn Ctrl+V dán ảnh..." onpaste="window._mpHandleEvidenceImagePaste(event, ' + note.id + ', ' + idx + ')" style="flex:1;min-width:240px;max-width:340px;padding:7px 12px;font-size:12px;border:1.5px dashed #6366f1;border-radius:10px;background:#f5f3ff;outline:none;color:#4f46e5;cursor:text;" />';
                
                if (it.evidence_image) {
                    html += '<img src="' + it.evidence_image + '" onclick="window._mpViewImageModal(this.src)" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1.5px solid #cbd5e1;cursor:pointer;" title="Bấm để phóng to xem ảnh" />';
                    html += '<button onclick="window._mpRemoveItemEvidenceImage(' + note.id + ', ' + idx + ')" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">🗑️ Xóa ảnh</button>';
                }
                html += '</div>'; // Close DIV 7

                html += '</div>'; // Close DIV 5
            }

            html += '</div>'; // Close DIV 3
            html += '</div>'; // Close DIV 2
            html += '</div>'; // Close DIV 1
        });
        html += '</div>';

        html += '</div>';
        container.innerHTML = html;
    }

    function _mpLoadAndRenderPreviousStepNote(stepId) {
        var container = document.getElementById('mp-prev-step-note-container');
        if (!container) return;

        if (!_mpActiveSessionId) {
            container.innerHTML = '';
            return;
        }

        if (_mpPrevStepNotesCache && _mpPrevStepNotesCache[stepId]) {
            _mpRenderPreviousStepBoxFromData(_mpPrevStepNotesCache[stepId]);
            return;
        }

        container.innerHTML = '<div style="padding:12px 16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b;font-size:13px;display:flex;align-items:center;gap:10px;"><span>⏳</span><span>Đang tải nội dung cuộc họp trước...</span></div>';

        var url = '/api/meeting-process/sessions/' + _mpActiveSessionId + '/steps/' + stepId + '/previous-note';
        var token = localStorage.getItem('token');
        var headers = {};
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        fetch(url, { credentials: 'include', headers: headers })
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(res) {
                if (res && res.success) {
                    _mpPrevStepNotesCache[stepId] = res;
                    _mpPrevStepData = res;
                }
                _mpRenderPreviousStepBoxFromData(res);
                _mpUpdateSkipButtonVisibility(stepId);
            })
            .catch(function(err) {
                console.error("📌 PREV STEP NOTE FETCH ERROR:", err);
                if (container) {
                    container.innerHTML = '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:12px 16px;color:#64748b;font-size:13px;display:flex;align-items:center;gap:10px;"><span style="font-size:16px;">📌</span><span>Không thể tải nội dung cuộc họp trước. Vui lòng thử lại.</span></div>';
                }
            });
    }
    window._mpLoadAndRenderPreviousStepNote = _mpLoadAndRenderPreviousStepNote;
    function _mpFindNoteItemsById(noteId) {
        if (_mpPrevStepNotesCache) {
            for (var key in _mpPrevStepNotesCache) {
                var c = _mpPrevStepNotesCache[key];
                if (c && c.note && String(c.note.id) === String(noteId)) {
                    if (!c.note._parsedItems) {
                        var rawItems = _parseNoteLinesToItems(c.note.content || '');
                        var existingStatuses = [];
                        try { existingStatuses = JSON.parse(c.note.item_statuses || '[]'); } catch(e) {}
                        c.note._parsedItems = rawItems.map(function(itemText, idx) {
                            var found = existingStatuses.find(function(s) { return s.index === idx || s.text === itemText; });
                            return {
                                index: idx,
                                text: itemText,
                                completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                                evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                                evidence_image: found ? (found.evidence_image || '') : '',
                                completed_at: found ? (found.completed_at || '') : '',
                                transferred_to: found ? (found.transferred_to || '') : ''
                            };
                        });
                    }
                    return c.note._parsedItems;
                }
            }
        }

        if (_mpPrevStepData && _mpPrevStepData.note && String(_mpPrevStepData.note.id) === String(noteId)) {
            if (!_mpPrevStepData.note._parsedItems) {
                var rawItems = _parseNoteLinesToItems(_mpPrevStepData.note.content || '');
                var existingStatuses = [];
                try { existingStatuses = JSON.parse(_mpPrevStepData.note.item_statuses || '[]'); } catch(e) {}
                _mpPrevStepData.note._parsedItems = rawItems.map(function(itemText, idx) {
                    var found = existingStatuses.find(function(s) { return s.index === idx || s.text === itemText; });
                    return {
                        index: idx,
                        text: itemText,
                        completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                        evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                        evidence_image: found ? (found.evidence_image || '') : '',
                        completed_at: found ? (found.completed_at || '') : '',
                        transferred_to: found ? (found.transferred_to || '') : ''
                    };
                });
            }
            return _mpPrevStepData.note._parsedItems;
        }

        var note = _mpNotes.find(function(n) { return String(n.id) === String(noteId); });
        if (note) {
            if (note._parsedItems) return note._parsedItems;
            var rawItems = _parseNoteLinesToItems(note.content || '');
            var existingStatuses = [];
            try { existingStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}
            var parsed = rawItems.map(function(itemText, idx) {
                var found = existingStatuses.find(function(s) { return s.index === idx || s.text === itemText; });
                return {
                    index: idx,
                    text: itemText,
                    completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                    evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                    evidence_image: found ? (found.evidence_image || '') : '',
                    completed_at: found ? (found.completed_at || '') : '',
                    transferred_to: found ? (found.transferred_to || '') : ''
                };
            });
            note._parsedItems = parsed;
            return parsed;
        }
        return [];
    }

    function _mpSaveItemStatusesToBackend(noteId, items, immediate) {
        var jsonStr = JSON.stringify(items);
        var curNote = _mpNotes.find(function(n) { return String(n.id) === String(noteId); });
        if (curNote) {
            curNote.item_statuses = jsonStr;
            curNote._parsedItems = items;
        }
        if (_mpPrevStepData && _mpPrevStepData.note && String(_mpPrevStepData.note.id) === String(noteId)) {
            _mpPrevStepData.note.item_statuses = jsonStr;
            _mpPrevStepData.note._parsedItems = items;
        }
        if (_mpPrevStepNotesCache) {
            for (var key in _mpPrevStepNotesCache) {
                var c = _mpPrevStepNotesCache[key];
                if (c && c.note && String(c.note.id) === String(noteId)) {
                    c.note.item_statuses = jsonStr;
                    c.note._parsedItems = items;
                }
            }
        }

        var url = '/api/meeting-process/notes/' + noteId + '/item-status';
        var token = localStorage.getItem('token');
        var headers = { 'Content-Type': 'application/json' };
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        var bodyData = JSON.stringify({ item_statuses: jsonStr });

        if (immediate) {
            fetch(url, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: bodyData
            }).catch(function(err) { console.error("❌ Save item status error:", err); });
        } else {
            if (window._mpItemSaveTimer) clearTimeout(window._mpItemSaveTimer);
            window._mpItemSaveTimer = setTimeout(function() {
                fetch(url, {
                    method: 'POST',
                    headers: headers,
                    credentials: 'include',
                    body: bodyData
                }).catch(function(err) { console.error("❌ Save item status error:", err); });
            }, 300);
        }
    }

    window._mpToggleItemCompletion = function(noteId, idx) {
        console.log("📌 [_mpToggleItemCompletion]:", noteId, idx);
        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        items[idx].completed = !items[idx].completed;
        if (items[idx].completed) {
            var now = new Date();
            var d = String(now.getDate()).padStart(2, '0');
            var m = String(now.getMonth() + 1).padStart(2, '0');
            var y = now.getFullYear();
            var hh = String(now.getHours()).padStart(2, '0');
            var mm = String(now.getMinutes()).padStart(2, '0');
            items[idx].completed_at = d + '/' + m + '/' + y + ' ' + hh + ':' + mm;
        } else {
            items[idx].completed_at = '';
        }

        var curNote = _mpNotes.find(function(n) { return String(n.id) === String(noteId); });
        if (curNote) {
            curNote.item_statuses = JSON.stringify(items);
            curNote._parsedItems = items;
        }
        if (_mpPrevStepData && _mpPrevStepData.note && String(_mpPrevStepData.note.id) === String(noteId)) {
            _mpPrevStepData.note.item_statuses = JSON.stringify(items);
            _mpPrevStepData.note._parsedItems = items;
        }
        if (_mpPrevStepNotesCache) {
            for (var key in _mpPrevStepNotesCache) {
                var c = _mpPrevStepNotesCache[key];
                if (c && c.note && String(c.note.id) === String(noteId)) {
                    c.note.item_statuses = JSON.stringify(items);
                    c.note._parsedItems = items;
                }
            }
        }

        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        if (activeStepObj) {
            var prevData = _mpPrevStepNotesCache[activeStepObj.id] || _mpPrevStepData;
            if (prevData && prevData.note && String(prevData.note.id) === String(noteId)) {
                _mpRenderPreviousStepBoxFromData(prevData);
            } else {
                _mpRenderCurrentStepTaskBox(activeStepObj.id);
            }
            _mpUpdateStepperItemUI(activeStepObj.id);
            _mpUpdateSkipButtonVisibility(activeStepObj.id);
        }

        _mpSaveItemStatusesToBackend(noteId, items, true);
    };

    window._mpTogglePrevItemStatus = window._mpToggleItemCompletion;

    window._mpCancelTransferItem = function(noteId, index) {
        if (!_mpPrevStepData || !_mpPrevStepData.note) return;
        var note = _mpPrevStepData.note;
        var savedStatuses = [];
        try { savedStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}

        var item = savedStatuses.find(function(s) { return String(s.index) === String(index); });
        if (item) {
            item.transferred_to = '';
            item.done = false;
            item.completed = false;
        }

        note.item_statuses = JSON.stringify(savedStatuses);

        var activeStepId = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex].id : null;
        if (activeStepId) {
            if (_mpPrevStepNotesCache[activeStepId]) {
                _mpPrevStepNotesCache[activeStepId].note = note;
            }
            _mpUpdateStepperItemUI(activeStepId);
            _mpUpdateSkipButtonVisibility(activeStepId);
        }

        fetch('/api/meeting-process/notes/' + noteId + '/item-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ item_statuses: savedStatuses })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                if (activeStepId) {
                    _mpLoadAndRenderPreviousStepNote(activeStepId);
                    _mpRenderCurrentStepTaskBox(activeStepId);
                }
            }
        });
    };

    window._mpUpdateItemEvidenceLink = function(noteId, idx, val, immediate) {
        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        items[idx].evidence_link = val;
        _mpSaveItemStatusesToBackend(noteId, items, !!immediate);

        var isNoteEmpty = !val || !val.trim();

        // 1. Real-time Label Pill Update
        var labelEl = document.getElementById('mp-link-label-' + noteId + '-' + idx);
        if (labelEl) {
            if (isNoteEmpty) {
                labelEl.innerHTML = '📝 Nội dung công việc: <span style="font-weight:700;color:#ef4444;background:#fee2e2;padding:2px 8px;border-radius:10px;border:1px solid #fca5a5;font-size:11px;">(*Bắt buộc nhập)</span>';
            } else {
                labelEl.innerHTML = '📝 Nội dung công việc: <span style="font-weight:700;color:#047857;background:#d1fae5;padding:2px 8px;border-radius:10px;font-size:11px;">✓ Đã nhập xong</span>';
            }
        }

        // 2. Real-time Textarea Style Update
        var inpEl = document.getElementById('mp-link-inp-' + noteId + '-' + idx);
        if (inpEl) {
            inpEl.style.border = isNoteEmpty ? '2px solid #ef4444' : '1.5px solid #cbd5e1';
            inpEl.style.background = isNoteEmpty ? '#fff5f5' : 'white';
        }

        // 3. Real-time Warning Message Update
        var warnEl = document.getElementById('mp-link-warn-' + noteId + '-' + idx);
        if (warnEl) {
            warnEl.style.display = isNoteEmpty ? 'block' : 'none';
        }

        // 4. Status Indicator (✓ Đã lưu)
        var statusEl = document.getElementById('mp-link-status-' + noteId + '-' + idx);
        if (statusEl) {
            statusEl.style.opacity = '1';
            if (window['_mpStatusTimer_' + noteId + '_' + idx]) clearTimeout(window['_mpStatusTimer_' + noteId + '_' + idx]);
            window['_mpStatusTimer_' + noteId + '_' + idx] = setTimeout(function() {
                if (statusEl) statusEl.style.opacity = '0';
            }, 1500);
        }

        // 5. Real-time Skip Button Visibility Update
        var activeStepId = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex].id : null;
        if (activeStepId) {
            _mpUpdateSkipButtonVisibility(activeStepId);
        }
    };

    window._mpHandleEvidenceImagePaste = function(e, noteId, idx) {
        var clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData || !clipboardData.items) return;

        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        for (var i = 0; i < clipboardData.items.length; i++) {
            var item = clipboardData.items[i];
            if (item.type && item.type.indexOf('image') !== -1) {
                e.preventDefault();
                var file = item.getAsFile();
                if (!file) continue;

                var reader = new FileReader();
                reader.onload = function(evt) {
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        var maxDim = 1000;
                        var w = img.width;
                        var h = img.height;
                        if (w > maxDim || h > maxDim) {
                            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                            else { w = Math.round((w * maxDim) / h); h = maxDim; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        var resizedDataUrl = canvas.toDataURL('image/jpeg', 0.70);

                        items[idx].evidence_image = resizedDataUrl;
                        _mpSaveItemStatusesToBackend(noteId, items, true);

                        // Re-render active step box to reflect newly pasted image
                        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
                        if (activeStepObj) {
                            _mpLoadAndRenderPreviousStepNote(activeStepObj.id);
                        }
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    };

    window._mpRemoveItemEvidenceImage = function(noteId, idx) {
        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        items[idx].evidence_image = '';
        _mpSaveItemStatusesToBackend(noteId, items, true);

        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        if (activeStepObj) {
            _mpLoadAndRenderPreviousStepNote(activeStepObj.id);
        }
    };

    window._mpViewImageModal = function(src) {
        if (!src) return;
        var existingModal = document.getElementById('mp-image-preview-overlay');
        if (existingModal) existingModal.remove();

        var overlay = document.createElement('div');
        overlay.id = 'mp-image-preview-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;backdrop-filter:blur(4px);cursor:zoom-out;';
        overlay.onclick = function() { overlay.remove(); };

        var img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:2px solid rgba(255,255,255,0.2);cursor:default;';
        img.onclick = function(e) { e.stopPropagation(); };

        var closeBtn = document.createElement('span');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:20px;right:25px;font-size:28px;color:white;font-weight:800;cursor:pointer;background:rgba(255,255,255,0.15);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;';
        closeBtn.onclick = function() { overlay.remove(); };

        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);
    };

    window._mpHandleProofPaste = function(e, noteId, index) {
        var clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData || !clipboardData.items) return;

        for (var i = 0; i < clipboardData.items.length; i++) {
            var item = clipboardData.items[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                var file = item.getAsFile();
                if (!file) continue;

                var reader = new FileReader();
                reader.onload = function(evt) {
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        var maxW = 800;
                        var maxH = 800;
                        var w = img.width;
                        var h = img.height;
                        if (w > maxW || h > maxH) {
                            if (w > h) { h = Math.round((h * maxW) / w); w = maxW; }
                            else { w = Math.round((w * maxH) / h); h = maxH; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        var resizedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

                        window._mpSaveProofUrl(noteId, index, resizedDataUrl);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    };

    window._mpShowReopenStepConfirmModal = function(stepId, noteId, idx, isAll) {
        var existingModal = document.getElementById('mp-reopen-confirm-modal');
        if (existingModal) existingModal.remove();

        var activeStepObj = _mpSteps.find(function(s) { return String(s.id) === String(stepId); });
        var stepTitleStr = activeStepObj ? activeStepObj.title : 'bước họp hiện tại';

        var overlay = document.createElement('div');
        overlay.id = 'mp-reopen-confirm-modal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;backdrop-filter:blur(4px);';
        overlay.onclick = function() { overlay.remove(); };

        var modal = document.createElement('div');
        modal.style.cssText = 'background:white;border-radius:20px;padding:32px 28px;max-width:480px;width:92%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);text-align:center;position:relative;animation:mpPopIn 0.25s ease-out;';
        modal.onclick = function(e) { e.stopPropagation(); };

        var html = '';
        html += '<div style="width:64px;height:64px;border-radius:50%;background:#fee2e2;color:#dc2626;font-size:32px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 4px 12px rgba(239,68,68,0.15);">⚠️</div>';
        html += '<h3 style="font-size:19px;font-weight:800;color:#dc2626;margin:0 0 10px;line-height:1.3;">BƯỚC HỌP NÀY ĐANG BỊ BỎ QUA</h3>';
        html += '<p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">';
        html += 'Bước họp <strong>"' + _escHtml(stepTitleStr) + '"</strong> hiện tại đang ở trạng thái <strong>Bỏ Qua (Không họp)</strong>.<br/><br/>';
        html += 'Bạn cần bấm <strong>🔄 Mở Lại Bước Này (Hủy Bỏ Qua)</strong> trước thì mới có thể chuyển công việc sang cuộc họp này được.';
        html += '</p>';
        html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">';
        html += '<button onclick="document.getElementById(\'mp-reopen-confirm-modal\').remove()" style="padding:11px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.background=\'#e2e8f0\'" onmouseleave="this.style.background=\'#f1f5f9\'">Hủy Bỏ</button>';
        html += '<button onclick="window._mpOnlyReopenStepFromModal(' + stepId + ')" style="padding:11px 22px;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);color:white;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(239,68,68,0.35);transition:all 0.2s;" onmouseenter="this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.transform=\'none\'">🔄 Mở Lại Bước Này (Hủy Bỏ Qua)</button>';
        html += '</div>';

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    };

    window._mpOnlyReopenStepFromModal = function(stepId) {
        var modal = document.getElementById('mp-reopen-confirm-modal');
        if (modal) modal.remove();

        // ONLY unskip step, do NOT auto-transfer! User will manually click transfer when ready
        window._mpToggleSkipStep(stepId, false);
    };

    window._mpTransferSingleItemToCurrent = function(noteId, idx, skipCheck) {
        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        // Check if step is skipped -> Require Popup confirmation modal
        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        if (activeStepObj && !skipCheck) {
            var curNote = _mpNotes.find(function(n) { return String(n.step_id) === String(activeStepObj.id); });
            if (curNote && (curNote.is_skipped === true || curNote.is_skipped === 'true' || curNote.is_skipped === 1)) {
                window._mpShowReopenStepConfirmModal(activeStepObj.id, noteId, idx, false);
                return; // STOP! Wait for user click on modal
            }
        }

        var sessionObj = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        var transferredLabel = sessionObj ? sessionObj.title : 'Cuộc họp này';

        var cleanText = (items[idx].text || '').replace(/^\d+[\.\)]\s*/, '').trim();
        if (!cleanText) return;

        items[idx].transferred_to = transferredLabel;
        items[idx].completed = false;

        _mpSaveItemStatusesToBackend(noteId, items, true);

        // Copy task text to current note textarea (#mp-note-content)
        var noteArea = document.getElementById('mp-note-content');
        if (noteArea) {
            var existingText = noteArea.value || '';
            var rawLines = existingText.split('\n');
            
            var validLines = rawLines.map(function(l) { return l.trim(); }).filter(function(l) {
                var cleaned = l.replace(/^\d+[\.\)]\s*/, '').trim();
                return cleaned.length > 0;
            });

            var alreadyExists = validLines.some(function(l) {
                return l.replace(/^\d+[\.\)]\s*/, '').trim() === cleanText;
            });

            if (!alreadyExists) {
                var nextNum = validLines.length + 1;
                var newLine = nextNum + '. ' + cleanText;

                if (validLines.length === 0) {
                    noteArea.value = newLine;
                } else {
                    var formattedLines = validLines.map(function(l, i) {
                        var txt = l.replace(/^\d+[\.\)]\s*/, '').trim();
                        return (i + 1) + '. ' + txt;
                    });
                    formattedLines.push(newLine);
                    noteArea.value = formattedLines.join('\n');
                }

                if (activeStepObj) {
                    window._mpTriggerAutoSaveNote(activeStepObj.id);
                }
            }
        }

        // Re-render UI
        if (activeStepObj) {
            var prevData = _mpPrevStepNotesCache[activeStepObj.id] || _mpPrevStepData;
            if (prevData && prevData.note && String(prevData.note.id) === String(noteId)) {
                _mpRenderPreviousStepBoxFromData(prevData);
            }
            _mpRenderCurrentStepTaskBox(activeStepObj.id);
            _mpUpdateStepperItemUI(activeStepObj.id);
            _mpUpdateSkipButtonVisibility(activeStepObj.id);
        }
    };

    window._mpCancelSingleTransferredItem = function(noteId, idx) {
        var items = _mpFindNoteItemsById(noteId);
        if (!items || !items[idx]) return;

        var cleanText = (items[idx].text || '').replace(/^\d+[\.\)]\s*/, '').trim();

        items[idx].transferred_to = '';
        items[idx].completed = false;

        _mpSaveItemStatusesToBackend(noteId, items, true);

        // Remove task text from current note textarea (#mp-note-content) if present
        var noteArea = document.getElementById('mp-note-content');
        if (noteArea && cleanText) {
            var existingText = noteArea.value.trim();
            if (existingText) {
                var lines = existingText.split('\n');
                var remainingLines = [];
                lines.forEach(function(l) {
                    var lineClean = l.replace(/^\d+[\.\)]\s*/, '').trim();
                    if (lineClean !== cleanText && lineClean.length > 0) {
                        remainingLines.push(lineClean);
                    }
                });

                var renumbered = remainingLines.map(function(txt, i) {
                    return (i + 1) + '. ' + txt;
                });

                noteArea.value = renumbered.length > 0 ? renumbered.join('\n') : '1.';

                var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
                if (activeStepObj) {
                    window._mpTriggerAutoSaveNote(activeStepObj.id);
                }
            }
        }

        // Re-render UI
        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        if (activeStepObj) {
            var prevData = _mpPrevStepNotesCache[activeStepObj.id] || _mpPrevStepData;
            if (prevData && prevData.note && String(prevData.note.id) === String(noteId)) {
                _mpRenderPreviousStepBoxFromData(prevData);
            }
            _mpRenderCurrentStepTaskBox(activeStepObj.id);
            _mpUpdateStepperItemUI(activeStepObj.id);
            _mpUpdateSkipButtonVisibility(activeStepObj.id);
        }
    };

    window._mpCancelAllTransferredInBox = function(noteId) {
        var items = _mpFindNoteItemsById(noteId);
        if (!items || items.length === 0) return;

        var count = 0;
        items.forEach(function(it) {
            if (it.transferred_to) {
                it.transferred_to = '';
                it.completed = false;
                count++;
            }
        });

        if (count === 0) {
            alert('ℹ️ Không có công việc nào đang ở trạng thái Đã chuyển!');
            return;
        }

        _mpSaveItemStatusesToBackend(noteId, items, true);

        var activeStepObj = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        if (activeStepObj) {
            var prevData = _mpPrevStepNotesCache[activeStepObj.id] || _mpPrevStepData;
            if (prevData && prevData.note && String(prevData.note.id) === String(noteId)) {
                _mpRenderPreviousStepBoxFromData(prevData);
            }
            _mpRenderCurrentStepTaskBox(activeStepObj.id);
            _mpUpdateStepperItemUI(activeStepObj.id);
            _mpUpdateSkipButtonVisibility(activeStepObj.id);
        }
    };

    window._mpCopyUnfinishedTasks = function(stepId, skipCheck) {
        if (!_mpPrevStepData || !_mpPrevStepData.note || !_mpPrevStepData.note.content) return;

        // Check if step is skipped -> Require Popup confirmation modal
        if (stepId && !skipCheck) {
            var curNote = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });
            if (curNote && (curNote.is_skipped === true || curNote.is_skipped === 'true' || curNote.is_skipped === 1)) {
                var noteId = _mpPrevStepData.note ? _mpPrevStepData.note.id : null;
                window._mpShowReopenStepConfirmModal(stepId, noteId, null, true);
                return; // STOP! Wait for user click on modal
            }
        }

        var note = _mpPrevStepData.note;
        var rawLines = note.content.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        var savedStatuses = [];
        try { savedStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}

        var sessionObj = _mpSessions.find(function(s) { return s.id === _mpActiveSessionId; });
        var transferredLabel = sessionObj ? sessionObj.title : 'Cuộc họp này';

        var unfinished = [];
        for (var i = 0; i < rawLines.length; i++) {
            var st = savedStatuses.find(function(s) { return String(s.index) === String(i); });
            var isDone = st && (st.done === true || st.done === 'true' || st.done === 1 || st.completed === true || st.completed === 'true' || st.completed === 1);
            if (!isDone) {
                var cleaned = rawLines[i].replace(/^\d+[\.\)]\s*/, '');
                if (cleaned.length > 0) {
                    unfinished.push(cleaned);
                }
                if (!st) {
                    st = { index: i, done: false, completed: false, transferred_to: transferredLabel };
                    savedStatuses.push(st);
                } else {
                    st.transferred_to = transferredLabel;
                }
            }
        }

        note.item_statuses = JSON.stringify(savedStatuses);

        if (_mpPrevStepNotesCache[stepId]) {
            _mpPrevStepNotesCache[stepId].note = note;
        }

        // Save item_statuses to DB for previous note
        fetch('/api/meeting-process/notes/' + note.id + '/item-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ item_statuses: savedStatuses })
        });

        // Copy to current note textarea
        var noteArea = document.getElementById('mp-note-content');
        if (noteArea && unfinished.length > 0) {
            var existingText = noteArea.value || '';
            var rawLines = existingText.split('\n');
            var validLines = rawLines.map(function(l) { return l.trim(); }).filter(function(l) {
                var cleaned = l.replace(/^\d+[\.\)]\s*/, '').trim();
                return cleaned.length > 0;
            });

            var formattedLines = validLines.map(function(l, i) {
                var txt = l.replace(/^\d+[\.\)]\s*/, '').trim();
                return (i + 1) + '. ' + txt;
            });

            var startNum = formattedLines.length + 1;
            for (var u = 0; u < unfinished.length; u++) {
                formattedLines.push((startNum + u) + '. ' + unfinished[u]);
            }

            noteArea.value = formattedLines.join('\n');
            window._mpTriggerAutoSaveNote(stepId);
        }

        _mpLoadAndRenderPreviousStepNote(stepId);
        _mpUpdateStepperItemUI(stepId);
        _mpUpdateSkipButtonVisibility(stepId);

        alert('⚡ Đã copy ' + unfinished.length + ' công việc chưa hoàn thành sang cuộc họp này!');
    };

    window._mpCancelAllTransferredTasks = function(stepId) {
        if (!_mpPrevStepData || !_mpPrevStepData.note) return;
        var note = _mpPrevStepData.note;
        var savedStatuses = [];
        try { savedStatuses = JSON.parse(note.item_statuses || '[]'); } catch(e) {}

        var count = 0;
        savedStatuses.forEach(function(s) {
            if (s.transferred_to) {
                s.transferred_to = '';
                s.done = false;
                s.completed = false;
                count++;
            }
        });

        if (count === 0) {
            alert('ℹ️ Không có công việc nào đang ở trạng thái Đã chuyển!');
            return;
        }

        note.item_statuses = JSON.stringify(savedStatuses);

        if (_mpPrevStepNotesCache[stepId]) {
            _mpPrevStepNotesCache[stepId].note = note;
        }
        _mpUpdateStepperItemUI(stepId);
        _mpUpdateSkipButtonVisibility(stepId);

        fetch('/api/meeting-process/notes/' + note.id + '/item-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ item_statuses: savedStatuses })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadAndRenderPreviousStepNote(stepId);
                _mpRenderCurrentStepTaskBox(stepId);
                alert('✅ Đã hủy chuyển ' + count + ' công việc về trạng thái chưa hoàn thành!');
            }
        });
    };

    window._mpCopyUnfinishedToCurrent = window._mpCopyUnfinishedTasks;

    window._mpInsertSuggestedQuestion = function(stepIndex, questionText) {
        var textarea = document.getElementById('mp-note-content');
        if (!textarea) return;

        var stepObj = _mpSteps[stepIndex];
        if (!stepObj) return;

        var val = textarea.value.trim();
        var cleanText = questionText.replace(/^\d+[\.\)]\s*/, '').trim();
        if (!cleanText) return;

        var existingItems = _parseNoteLinesToItems(val);
        if (existingItems.indexOf(cleanText) !== -1) {
            return alert('💡 Câu hỏi gợi ý này đã được chèn vào nội dung thảo luận rồi!');
        }

        var nextNum = existingItems.length + 1;
        var newLine = nextNum + '. ' + cleanText;

        if (!val || val === '1.') {
            textarea.value = newLine;
        } else {
            textarea.value = val + '\n' + newLine;
        }

        window._mpTriggerAutoSaveNote(stepObj.id);
    };

    window._mpToggleSkipStep = function(stepId, skipStatus) {
        var activeId = parseInt(_mpActiveSessionId, 10);
        if (!activeId && _mpNotes && _mpNotes.length > 0 && _mpNotes[0].session_id) {
            activeId = parseInt(_mpNotes[0].session_id, 10);
        }
        if (!activeId && _mpSessions && _mpSessions.length > 0) {
            activeId = parseInt(_mpSessions[0].id, 10);
        }
        if (!activeId) {
            alert('⚠️ Không tìm thấy phiên họp hiện tại! Vui lòng thử bấm Quay Lại Lịch Sử và chọn lại phiên họp.');
            return;
        }
        _mpActiveSessionId = activeId;

        var stepObj = _mpSteps.find(function(s) { return String(s.id) === String(stepId); });
        var note = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });
        var noteId = note ? note.id : null;

        // Instant optimistic local state update for zero lag
        if (note) {
            note.is_skipped = !!skipStatus;
        } else {
            note = { id: 0, step_id: stepId, step_title: stepObj ? stepObj.title : '', content: '', is_skipped: !!skipStatus };
            _mpNotes.push(note);
        }

        _mpUpdateStepperItemUI(stepId);

        // Re-render UI immediately
        var container = document.getElementById('mp-tab-content');
        if (container) _mpRenderSessionDetailTab(container);

        var payload = {
            note_id: noteId,
            step_id: stepId,
            step_title: stepObj ? stepObj.title : '',
            content: note ? (note.content || '') : '',
            next_actions: note ? (note.next_actions || '') : '',
            item_statuses: note ? (note.item_statuses || '[]') : '[]',
            is_skipped: !!skipStatus
        };

        var token = localStorage.getItem('token');
        var headers = { 'Content-Type': 'application/json' };
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        fetch('/api/meeting-process/sessions/' + activeId + '/notes', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                // Reload notes & re-render workspace
                fetch('/api/meeting-process/sessions/' + activeId + '/notes', { credentials: 'include', headers: headers })
                .then(function(r2) { return r2.json(); })
                .then(function(d2) {
                    if (d2 && d2.notes) {
                        _mpNotes = d2.notes;
                        if (container) _mpRenderSessionDetailTab(container);
                    }
                });
            } else {
                alert(d.error || '❌ Có lỗi khi cập nhật trạng thái bỏ qua!');
            }
        })
        .catch(function(err) { console.error('Skip step save error:', err); });
    };

    function _mpUpdateSkipButtonVisibility(stepId) {
        var skipBtn = document.getElementById('mp-btn-skip-step');
        if (!skipBtn) return;

        var activeStep = (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) ? _mpSteps[_mpActiveStepIndex] : null;
        var currentStepId = stepId || (activeStep ? activeStep.id : null);
        if (!currentStepId) return;

        var prevData = (currentStepId && _mpPrevStepNotesCache[currentStepId]) ? _mpPrevStepNotesCache[currentStepId] : _mpPrevStepData;

        var isPrevTasksHandled = true;
        if (prevData && prevData.success && prevData.note && prevData.note.content) {
            var items = _mpFindNoteItemsById(prevData.note.id);
            if (!items || items.length === 0) {
                var rawLines = prevData.note.content.split('\n');
                var validItems = rawLines.map(function(l) { return l.trim(); }).filter(function(l) {
                    return l.length > 0 && /^\d+[\.\)]/.test(l);
                });
                if (validItems.length > 0) {
                    var savedStatuses = [];
                    try { savedStatuses = JSON.parse(prevData.note.item_statuses || '[]'); } catch(e) {}
                    items = validItems.map(function(itemText, idx) {
                        var found = savedStatuses.find(function(s) { return s.index === idx || s.text === itemText || String(s.index) === String(idx); });
                        return {
                            index: idx,
                            text: itemText,
                            completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                            evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                            transferred_to: found ? (found.transferred_to || '') : ''
                        };
                    });
                }
            }

            if (items && items.length > 0) {
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    var isDone = !!(it.completed || it.done);
                    var isNoteEntered = !!(it.evidence_link && it.evidence_link.trim());
                    var isTransferred = !!it.transferred_to;

                    // Handled means either (completed AND note entered) OR transferred
                    if ((!isDone || !isNoteEntered) && !isTransferred) {
                        isPrevTasksHandled = false;
                        break;
                    }
                }
            }
        }

        var hasDiscussionContent = false;
        var noteArea = document.getElementById('mp-note-content');
        if (noteArea) {
            var rawVal = noteArea.value || '';
            var lines = rawVal.split('\n').map(function(l) {
                return l.replace(/^\d+[\.\)]\s*/, '').trim();
            }).filter(function(l) {
                return l.length > 0;
            });
            var cleanText = lines.join(' ').trim();
            hasDiscussionContent = cleanText.length > 0;
        }

        var shouldShow = isPrevTasksHandled && !hasDiscussionContent;
        console.log('📌 [_mpUpdateSkipButtonVisibility]', { currentStepId: currentStepId, isPrevTasksHandled: isPrevTasksHandled, hasDiscussionContent: hasDiscussionContent, shouldShow: shouldShow });
        skipBtn.style.setProperty('display', shouldShow ? 'inline-flex' : 'none', 'important');
    }
    window._mpUpdateSkipButtonVisibility = _mpUpdateSkipButtonVisibility;

    window._mpEnsureNoteNumbering = function(textarea) {
        if (!textarea.value || !textarea.value.trim()) {
            textarea.value = '1. ';
            textarea.selectionStart = textarea.selectionEnd = 3;
        }
    };

    window._mpHandleNoteKeydown = function(e, textarea) {
        if (e.key === 'Enter') {
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var val = textarea.value;

            var lineStart = val.lastIndexOf('\n', start - 1) + 1;
            var currentLine = val.substring(lineStart, start);

            var match = currentLine.match(/^(\s*)(\d+)\.\s*(.*)/);
            if (match) {
                e.preventDefault();
                var indent = match[1];
                var num = parseInt(match[2], 10);
                var rest = match[3];

                if (rest.trim() === '') {
                    var newVal = val.substring(0, lineStart) + val.substring(start);
                    textarea.value = newVal;
                    textarea.selectionStart = textarea.selectionEnd = lineStart;
                } else {
                    var nextNum = num + 1;
                    var insertStr = '\n' + indent + nextNum + '. ';
                    var newVal = val.substring(0, start) + insertStr + val.substring(end);
                    textarea.value = newVal;
                    textarea.selectionStart = textarea.selectionEnd = start + insertStr.length;
                }
                if (textarea.oninput) textarea.oninput();
            }
        }
    };

    window._mpTriggerAutoSaveNote = function(stepId) {
        var textarea = document.getElementById('mp-note-content');
        var noteContent = textarea ? textarea.value : '';

        // Real-time instant update for task checklist card above
        var curNote = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });
        if (curNote) {
            curNote.content = noteContent;
        } else {
            curNote = { id: 0, step_id: stepId, content: noteContent };
            _mpNotes.push(curNote);
        }
        _mpRenderCurrentStepTaskBox(stepId);
        _mpUpdateStepperItemUI(stepId);
        _mpUpdateSkipButtonVisibility(stepId);

        var statusEl = document.getElementById('mp-autosave-status');
        if (statusEl) statusEl.innerText = '💾 Đang lưu...';

        if (_mpAutoSaveTimeout) clearTimeout(_mpAutoSaveTimeout);

        _mpAutoSaveTimeout = setTimeout(function() {
            var step = _mpSteps.find(function(s) { return String(s.id) === String(stepId); });
            var existingNote = _mpNotes.find(function(n) { return String(n.step_id) === String(stepId); });

            var data = {
                step_id: stepId,
                step_title: step ? step.title : '',
                content: noteContent,
                next_actions: ''
            };
            if (existingNote && existingNote.id) data.note_id = existingNote.id;

            fetch('/api/meeting-process/sessions/' + _mpActiveSessionId + '/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.success) {
                    if (statusEl) statusEl.innerText = '✅ Đã tự động lưu';
                    fetch('/api/meeting-process/sessions/' + _mpActiveSessionId + '/notes', { credentials: 'include' })
                        .then(function(r2) { return r2.json(); })
                        .then(function(d2) {
                            _mpNotes = d2.notes || [];
                            if (_mpActiveStepIndex >= 0 && _mpSteps[_mpActiveStepIndex]) {
                                var activeId = _mpSteps[_mpActiveStepIndex].id;
                                _mpRenderCurrentStepTaskBox(activeId);
                                _mpUpdateStepperItemUI(activeId);
                            }
                        });
                } else {
                    if (statusEl) statusEl.innerText = '❌ Lỗi lưu';
                }
            })
            .catch(function() { if (statusEl) statusEl.innerText = '❌ Lỗi lưu'; });
        }, 500);
    };

    window._mpSaveSummaryConclusion = function(sessionId) {
        var allStepsCompleted = _mpSteps.length > 0 && _mpSteps.every(function(st) {
            var status = _mpCheckStepCompletionStatus(st.id);
            return status === 'COMPLETED' || status === 'SKIPPED' || status === 'SUMMARY';
        });
        if (!allStepsCompleted) {
            alert('⚠️ Vui lòng xử lý xong 100% việc cũ và hoàn thành tất cả các bước họp (đạt tích xanh ✓ hoặc dấu X đỏ ❌) trước khi Lưu Kết Luận & Biên Bản!');
            return;
        }

        var conclusionEl = document.getElementById('mp-summary-conclusion');
        var conclusion = conclusionEl ? conclusionEl.value.trim() : '';

        if (!conclusion) {
            if (conclusionEl) {
                conclusionEl.style.border = '2px solid #ef4444';
                conclusionEl.style.background = '#fff5f5';
                conclusionEl.focus();
            }
            alert('⚠️ Vui lòng nhập "📌 Kết Luận Chung Cuộc Họp" của Chủ tọa / Giám đốc trước khi Lưu Kết Luận & Biên Bản!');
            return;
        }

        var session = _mpSessions.find(function(s) { return s.id === sessionId; });
        if (!session) return;

        var data = {
            process_id: session.process_id || 1,
            title: session.title,
            meeting_date: session.meeting_date,
            start_time: session.start_time,
            end_time: session.end_time,
            chairperson_id: session.chairperson_id,
            secretary_id: session.secretary_id,
            attendees: JSON.parse(session.attendees || '[]'),
            status: 'da_ket_thuc',
            conclusion: conclusion,
            next_actions: session.next_actions || ''
        };

        var token = localStorage.getItem('token');
        var headers = { 'Content-Type': 'application/json' };
        if (token && token.length > 20) { headers['Authorization'] = 'Bearer ' + token; }

        fetch('/api/meeting-process/sessions/' + sessionId, {
            method: 'PUT',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                alert('✅ Đã lưu kết luận & kết thúc cuộc họp thành công!');
                _mpLoadSessions(function() {
                    window._mpSwitchTab('history');
                });
            } else {
                alert(d.error || 'Có lỗi xảy ra khi lưu');
            }
        })
        .catch(function(err) { alert('❌ Lỗi kết nối máy chủ: ' + err.message); });
    };

    window._mpReopenSession = function(sessionId) {
        var session = _mpSessions.find(function(s) { return s.id === sessionId; });
        if (!session) return;
        if (!confirm('Bạn có muốn mở lại cuộc họp này để tiếp tục chỉnh sửa?')) return;

        var data = {
            process_id: session.process_id || 1,
            title: session.title,
            meeting_date: session.meeting_date,
            start_time: session.start_time,
            end_time: session.end_time,
            chairperson_id: session.chairperson_id,
            secretary_id: session.secretary_id,
            attendees: JSON.parse(session.attendees || '[]'),
            status: 'dang_dien_ra',
            conclusion: session.conclusion || '',
            next_actions: session.next_actions || ''
        };

        fetch('/api/meeting-process/sessions/' + sessionId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadSessions(function() { _mpRenderTabContent(); });
            }
        });
    };

    window._mpShowPreviousSessionModal = function(sessionId) {
        var currentSession = _mpSessions.find(function(s) { return s.id === sessionId; });
        if (!currentSession) return;

        fetch('/api/meeting-process/sessions/' + sessionId + '/steps/0/previous-note', { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res || !res.prevSession) return alert('Chưa có cuộc họp trước nào trong hệ thống!');

                var prevId = res.prevSession.id;
                return fetch('/api/meeting-process/sessions/' + prevId + '/notes', { credentials: 'include' })
                    .then(function(r) { return r.json(); })
                    .then(function(nd) {
                        var notes = nd.notes || [];
                        var html = '<div style="max-height:70vh;overflow-y:auto;padding-right:6px;">';
                        html += '<div style="background:#f1f5f9;border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#475569;display:flex;align-items:center;gap:8px;">';
                        html += '<span>📅 <strong>Biên bản cuộc họp trước:</strong> ' + _escHtml(res.prevSession.title) + ' (' + _formatDate(res.prevSession.meeting_date) + ')</span>';
                        html += '</div>';

                        if (notes.length === 0) {
                            html += '<div style="text-align:center;padding:30px;color:#94a3b8;">Cuộc họp trước chưa có ghi chép thảo luận nào.</div>';
                        } else {
                            html += '<div style="display:grid;gap:12px;">';
                            for (var sIdx = 0; sIdx < _mpSteps.length; sIdx++) {
                                var st = _mpSteps[sIdx];
                                var nt = notes.find(function(n) { return n.step_id === st.id; });
                                if (!nt || (!nt.content && !nt.next_actions)) continue;

                                var stepColors = _getStepColor(sIdx);
                                html += '<div style="padding:14px 18px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;border-left:4px solid ' + stepColors.from + ';box-shadow:0 1px 3px rgba(0,0,0,0.03);">';
                                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
                                html += '<span style="width:20px;height:20px;border-radius:50%;background:' + stepColors.from + ';color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + (sIdx + 1) + '</span>';
                                html += '<strong style="font-size:14px;color:#1e293b;">' + _escHtml(st.title) + '</strong>';
                                html += '</div>';
                                if (nt.content) html += '<p style="font-size:13px;color:#334155;margin:4px 0 0 28px;line-height:1.6;white-space:pre-line;">' + _escHtml(nt.content) + '</p>';
                                html += '</div>';
                            }
                            html += '</div>';
                        }
                        html += '</div>';
                        _mpShowModal('📜 Ghi Chép Toàn Bộ Cuộc Họp Trước', html, '720px');
                    });
            })
            .catch(function() { alert('Lỗi tải dữ liệu cuộc họp trước'); });
    };

    window._mpFinishSession = function(sessionId) {
        if (!confirm('Bạn có chắc chắn muốn kết thúc cuộc họp này?')) return;
        var session = _mpSessions.find(function(s) { return s.id === sessionId; });
        if (!session) return;

        var data = {
            title: session.title,
            meeting_date: session.meeting_date,
            start_time: session.start_time,
            end_time: session.end_time,
            chairperson_id: session.chairperson_id,
            secretary_id: session.secretary_id,
            attendees: JSON.parse(session.attendees || '[]'),
            status: 'da_ket_thuc',
            conclusion: session.conclusion,
            next_actions: session.next_actions
        };

        fetch('/api/meeting-process/sessions/' + sessionId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadSessions(function() { _mpRenderTabContent(); });
            }
        });
    };

    window._mpReopenSession = function(sessionId) {
        var session = _mpSessions.find(function(s) { return s.id === sessionId; });
        if (!session) return;

        var data = {
            title: session.title,
            meeting_date: session.meeting_date,
            start_time: session.start_time,
            end_time: session.end_time,
            chairperson_id: session.chairperson_id,
            secretary_id: session.secretary_id,
            attendees: JSON.parse(session.attendees || '[]'),
            status: 'dang_dien_ra',
            conclusion: session.conclusion,
            next_actions: session.next_actions
        };

        fetch('/api/meeting-process/sessions/' + sessionId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpLoadSessions(function() { _mpRenderTabContent(); });
            }
        });
    };

    window._mpFilterAttendees = function(query) {
        var q = query.toLowerCase().trim();
        var items = document.querySelectorAll('.mp-attendee-item');
        items.forEach(function(item) {
            var text = item.innerText.toLowerCase();
            if (!q || text.indexOf(q) >= 0) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    };

    window._mpToggleAllAttendees = function() {
        var checkboxes = document.querySelectorAll('.mp-attendee-cb');
        var allChecked = true;
        checkboxes.forEach(function(cb) { if (!cb.checked) allChecked = false; });
        checkboxes.forEach(function(cb) { cb.checked = !allChecked; });
    };

    // ========== ADD/EDIT DEPT PROTOCOL MODAL ==========
    window._mpShowAddDeptProtocol = function() {
        _mpShowDeptProtocolModal(null);
    };

    window._mpEditDeptProtocol = function(deptId) {
        var protocol = _mpProtocols.find(function(p) { return p.department_id === deptId; });
        _mpShowDeptProtocolModal(deptId, protocol);
    };

    function _mpShowDeptProtocolModal(deptId, protocol) {
        var isEdit = !!protocol;
        var html = '';

        html += '<div style="display:grid;gap:14px;">';

        // Select Department
        html += '<div><label style="' + _labelStyle() + '">🏢 Phòng ban *</label>';
        if (isEdit) {
            var dept = _mpDepartments.find(function(d) { return d.id === deptId; });
            html += '<input type="text" value="' + _escHtml((dept && dept.name) || 'Phòng ban #' + deptId) + '" disabled style="' + _inputStyle() + 'background:' + C.slate100 + ';" />';
            html += '<input type="hidden" id="mp-dept-id" value="' + deptId + '" />';
        } else {
            html += '<select id="mp-dept-id" style="' + _inputStyle() + '">';
            for (var d = 0; d < _mpDepartments.length; d++) {
                var dep = _mpDepartments[d];
                var configured = _mpProtocols.some(function(p) { return p.department_id === dep.id; });
                html += '<option value="' + dep.id + '"' + (configured ? ' disabled' : '') + '>' + _escHtml(dep.name) + (configured ? ' (Đã cấu hình)' : '') + '</option>';
            }
            html += '</select>';
        }
        html += '</div>';

        // Preparation
        html += '<div><label style="' + _labelStyle() + '">📋 Nội dung cần chuẩn bị trước cuộc họp</label><textarea id="mp-dept-prep" rows="4" placeholder="Nhập những thông tin, file tài liệu phòng ban cần chuẩn bị..." style="' + _inputStyle() + 'resize:vertical;">' + _escHtml((protocol && protocol.preparation) || '') + '</textarea></div>';

        // Report metrics (comma separated)
        var metricsStr = '';
        try { if (protocol) metricsStr = JSON.parse(protocol.report_metrics || '[]').join(', '); } catch(e) {}
        html += '<div><label style="' + _labelStyle() + '">📊 Các chỉ số báo cáo (phân cách bằng dấu phẩy)</label><input type="text" id="mp-dept-metrics" value="' + _escHtml(metricsStr) + '" placeholder="VD: Doanh số, CPO, Số đơn hàng, Tỉ lệ chốt" style="' + _inputStyle() + '" /></div>';

        // Multi Menu Links Section
        html += '<div style="background:' + C.slate50 + ';border:1px solid ' + C.slate200 + ';border-radius:12px;padding:14px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<label style="font-size:13px;font-weight:700;color:' + C.slate700 + ';margin:0;">🔗 Các Đường Dẫn Menu Liên Kết Phòng Ban</label>';
        html += '<button type="button" onclick="window._mpAddMenuLinkRow(\'mp-dept-menu-container\', \'\', \'\')" style="padding:6px 14px;background:' + C.indigo + ';color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(67,56,202,0.25);">➕ Thêm Menu</button>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 38px;gap:8px;margin-bottom:6px;padding:0 6px;font-size:11px;font-weight:600;color:' + C.slate500 + ';"><span>Đường dẫn menu (URL)</span><span>🏷️ Tên menu hiển thị</span><span>Xóa</span></div>';
        html += '<div id="mp-dept-menu-container" style="display:grid;gap:8px;"></div>';
        html += '</div>';

        // Notes
        html += '<div><label style="' + _labelStyle() + '">📝 Ghi chú thêm</label><textarea id="mp-dept-notes" rows="2" placeholder="Ghi chú khác..." style="' + _inputStyle() + 'resize:vertical;">' + _escHtml((protocol && protocol.notes) || '') + '</textarea></div>';

        html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">';
        html += '<button onclick="_mpCloseModal()" style="' + _btnSecondary() + '">Hủy</button>';
        html += '<button onclick="window._mpSaveDeptProtocol()" style="' + _btnPrimary() + '">' + (isEdit ? '💾 Cập Nhật' : '➕ Thêm') + '</button>';
        html += '</div>';

        html += '</div>';

        _mpShowModal((isEdit ? '✏️ Sửa Quy Trình Phòng Ban' : '➕ Cấu Hình Quy Trình Phòng Ban'), html);

        // Populate existing dept menu link rows
        setTimeout(function() {
            var existingDeptLinks = _mpParseMenuLinks(protocol);
            if (existingDeptLinks.length === 0) {
                window._mpAddMenuLinkRow('mp-dept-menu-container', '', '');
            } else {
                for (var dl = 0; dl < existingDeptLinks.length; dl++) {
                    window._mpAddMenuLinkRow('mp-dept-menu-container', existingDeptLinks[dl].url, existingDeptLinks[dl].label);
                }
            }
        }, 50);
    }

    window._mpSaveDeptProtocol = function() {
        var deptId = parseInt(document.getElementById('mp-dept-id').value);
        if (!deptId) return alert('Vui lòng chọn phòng ban!');

        var metricsRaw = document.getElementById('mp-dept-metrics').value.trim();
        var metricsArr = metricsRaw ? metricsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

        var container = document.getElementById('mp-dept-menu-container');
        var rows = container ? container.querySelectorAll('.mp-menu-link-row') : [];
        var deptLinks = [];
        for (var r = 0; r < rows.length; r++) {
            var dUrlInput = rows[r].querySelector('.mp-link-url');
            var dLabelInput = rows[r].querySelector('.mp-link-label');
            var dUrl = dUrlInput ? dUrlInput.value.trim() : '';
            var dLabel = dLabelInput ? dLabelInput.value.trim() : '';
            if (dUrl) {
                deptLinks.push({ url: dUrl, label: dLabel || dUrl });
            }
        }

        var deptLinkedMenuStr = deptLinks.length > 0 ? JSON.stringify(deptLinks) : '';
        var deptLinkedMenuLabelStr = deptLinks.map(function(l) { return l.label; }).join(', ');

        var data = {
            department_id: deptId,
            preparation: document.getElementById('mp-dept-prep').value.trim(),
            report_metrics: metricsArr,
            linked_menu: deptLinkedMenuStr,
            linked_menu_label: deptLinkedMenuLabelStr,
            notes: document.getElementById('mp-dept-notes').value.trim()
        };

        fetch('/api/meeting-process/dept-protocols', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                _mpCloseModal();
                _mpLoadProtocols(function() { _mpRenderTabContent(); });
            } else {
                alert(d.error || 'Có lỗi xảy ra');
            }
        })
        .catch(function() { alert('Lỗi kết nối server'); });
    };

    // ========== FILTER & PAGINATION ==========
    window._mpSelectHistoryProcess = function(procId) {
        _mpFilterProcess = procId;
        _mpSessionPage = 1;
        _mpSaveState();
        _mpLoadSessions(function() { _mpRenderTabContent(); });
    };

    window._mpFilterChanged = function() {
        var procEl = document.getElementById('mp-filter-process');
        if (procEl) _mpFilterProcess = procEl.value;
        _mpFilterYear = document.getElementById('mp-filter-year').value;
        _mpFilterMonth = document.getElementById('mp-filter-month').value;
        _mpFilterQuarter = document.getElementById('mp-filter-quarter').value;
        _mpFilterSearch = document.getElementById('mp-filter-search').value.trim();
        _mpSessionPage = 1;
        _mpSaveState();
        _mpLoadSessions(function() { _mpRenderTabContent(); });
    };

    window._mpGoPage = function(page) {
        _mpSessionPage = page;
        _mpSaveState();
        _mpLoadSessions(function() { _mpRenderTabContent(); });
    };

    // ========== MODAL ENGINE ==========
    function _mpShowModal(title, bodyHtml, width) {
        _mpCloseModal();
        var w = width || '560px';
        var html = '';

        html += '<div id="mp-modal-container" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.2s ease;">';
        html += '<div style="background:white;border-radius:20px;width:100%;max-width:' + w + ';max-height:90vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.2);animation:scaleUp 0.25s ease;">';

        // Modal Header
        html += '<div style="padding:20px 24px;background:linear-gradient(135deg,' + C.indigo + ',' + C.violet + ');color:white;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;">';
        html += '<h3 style="margin:0;font-size:18px;font-weight:700;">' + title + '</h3>';
        html += '<button onclick="window._mpCloseModal()" style="background:transparent;border:none;color:white;font-size:20px;cursor:pointer;opacity:0.8;">✕</button>';
        html += '</div>';

        // Modal Body
        html += '<div style="padding:24px;">' + bodyHtml + '</div>';

        html += '</div>';
        html += '</div>';

        var div = document.createElement('div');
        div.id = 'mp-modal-wrapper';
        div.innerHTML = html;
        document.body.appendChild(div);
    }

    window._mpCloseModal = function() {
        var modal = document.getElementById('mp-modal-wrapper');
        if (modal) modal.remove();
    };
    function _mpCloseModal() {
        window._mpCloseModal();
    }


    // ========== STYLES ==========
    function _labelStyle() {
        return 'display:block;font-size:13px;font-weight:600;color:' + C.slate700 + ';margin-bottom:6px;';
    }

    function _inputStyle() {
        return 'width:100%;padding:10px 14px;border:1px solid ' + C.slate200 + ';border-radius:10px;font-size:14px;color:' + C.slate800 + ';background:' + C.white + ';box-sizing:border-box;outline:none;transition:border 0.2s;';
    }

    function _btnPrimary() {
        return 'padding:10px 20px;background:linear-gradient(135deg,' + C.indigo + ',' + C.violet + ');color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(67,56,202,0.3);';
    }

    function _btnSecondary() {
        return 'padding:10px 18px;background:' + C.slate100 + ';color:' + C.slate600 + ';border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;';
    }

    // ========== TAB 3: LỊCH SỬ CÔNG VIỆC ==========
    var _mpTaskHistoryData = [];
    var _mpTaskHistoryFilterProcessId = 'all';
    var _mpTaskHistorySearchKeyword = '';
    var _mpTaskHistoryStatusFilter = 'all';
    var _mpTaskHistoryFilterYear = 'all';
    var _mpTaskHistoryFilterMonth = 'all';
    var _mpTaskHistoryFilterQuarter = 'all';

    function _mpRenderTaskHistoryTab(container) {
        if (!container) return;
        if (!_mpProcesses || _mpProcesses.length === 0) {
            _mpLoadProcesses(function() {
                _mpRenderTaskHistoryTab(container);
            });
            return;
        }
        var html = '';

        // HEADER & TITLE
        html += '<div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">';
        html += '<div>';
        html += '<h2 style="font-size:22px;font-weight:800;color:' + C.slate800 + ';margin:0 0 6px;letter-spacing:-0.02em;">📊 Lịch Sử Công Việc Cuộc Họp</h2>';
        html += '<p style="font-size:13px;color:' + C.slate500 + ';margin:0;">Tổng hợp toàn bộ công việc từ các cuộc họp. Công việc <b>chưa hoàn thành ở trên</b>, <b>đã hoàn thành ở dưới</b>.</p>';
        html += '</div>';
        html += '</div>';

        // 1. PROCESS PILLS BAR (Chia theo các Quy Trình - giống Ảnh 3)
        html += '<div style="margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">';
        
        // All processes pill
        var isAllActive = _mpTaskHistoryFilterProcessId === 'all';
        html += '<button onclick="window._mpSelectTaskHistoryProcess(\'all\')" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s ease;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;';
        if (isAllActive) {
            html += 'background:linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);color:white;border:none;box-shadow:0 4px 12px rgba(79,70,229,0.3);';
        } else {
            html += 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;';
        }
        html += '">🌐 Tất Cả Quy Trình</button>';

        // Process pills
        (_mpProcesses || []).forEach(function(proc, idx) {
            var isProcActive = String(_mpTaskHistoryFilterProcessId) === String(proc.id);
            var icon = proc.icon || '📋';
            var title = _escHtml(proc.name || proc.title || 'Quy Trình');
            
            var procGradients = [
                'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
            ];
            var activeGrad = procGradients[idx % procGradients.length];

            var inactiveBgs = ['#f5f3ff', '#fffbeb', '#ecfdf5', '#f0f9ff', '#faf5ff'];
            var inactiveBorders = ['#c7d2fe', '#fde68a', '#a7f3d0', '#bae6fd', '#ddd6fe'];
            var inactiveColors = ['#4338ca', '#b45309', '#047857', '#0369a1', '#6d28d9'];
            var inBg = inactiveBgs[idx % inactiveBgs.length];
            var inBorder = inactiveBorders[idx % inactiveBorders.length];
            var inColor = inactiveColors[idx % inactiveColors.length];

            html += '<button onclick="window._mpSelectTaskHistoryProcess(' + proc.id + ')" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s ease;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;';
            if (isProcActive) {
                html += 'background:' + activeGrad + ';color:white;border:none;box-shadow:0 4px 14px rgba(0,0,0,0.15);';
            } else {
                html += 'background:' + inBg + ';color:' + inColor + ';border:1px solid ' + inBorder + ';';
            }
            html += '">' + icon + ' ' + title + '</button>';
        });
        html += '</div>';

        // 2. SEARCH & FILTER CONTROLS BAR
        html += '<div style="margin-bottom:24px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:white;padding:16px 20px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.03);">';
        
        // Year Select Filter
        html += '<select id="mp-task-history-year-select" onchange="window._mpSelectTaskHistoryYear(this.value)" style="height:38px;padding:0 14px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:13.5px;font-weight:600;outline:none;background:#f8fafc;color:#334155;cursor:pointer;box-sizing:border-box;min-width:100px;">';
        html += '<option value="all"' + (_mpTaskHistoryFilterYear === 'all' ? ' selected' : '') + '>Tất cả năm</option>';
        var curY = new Date().getFullYear();
        for (var yVal = curY + 1; yVal >= curY - 5; yVal--) {
            html += '<option value="' + yVal + '"' + (String(_mpTaskHistoryFilterYear) === String(yVal) ? ' selected' : '') + '>' + yVal + '</option>';
        }
        html += '</select>';

        // Month Select Filter
        html += '<select id="mp-task-history-month-select" onchange="window._mpSelectTaskHistoryMonth(this.value)" style="height:38px;padding:0 14px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:13.5px;font-weight:600;outline:none;background:#f8fafc;color:#334155;cursor:pointer;box-sizing:border-box;min-width:120px;">';
        html += '<option value="all"' + (_mpTaskHistoryFilterMonth === 'all' ? ' selected' : '') + '>Tất cả tháng</option>';
        var mNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
        for (var mVal = 1; mVal <= 12; mVal++) {
            html += '<option value="' + mVal + '"' + (String(_mpTaskHistoryFilterMonth) === String(mVal) ? ' selected' : '') + '>' + mNames[mVal] + '</option>';
        }
        html += '</select>';

        // Quarter Select Filter
        html += '<select id="mp-task-history-quarter-select" onchange="window._mpSelectTaskHistoryQuarter(this.value)" style="height:38px;padding:0 14px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:13.5px;font-weight:600;outline:none;background:#f8fafc;color:#334155;cursor:pointer;box-sizing:border-box;min-width:100px;">';
        html += '<option value="all"' + (_mpTaskHistoryFilterQuarter === 'all' ? ' selected' : '') + '>Tất cả quý</option>';
        for (var qVal = 1; qVal <= 4; qVal++) {
            html += '<option value="' + qVal + '"' + (String(_mpTaskHistoryFilterQuarter) === String(qVal) ? ' selected' : '') + '>Quý ' + qVal + '</option>';
        }
        html += '</select>';

        // Search Input
        html += '<div style="flex:1;min-width:240px;position:relative;">';
        html += '<input id="mp-task-history-search" type="text" placeholder="🔍 Tìm kiếm nội dung công việc, câu hỏi, bước họp..." value="' + _escHtml(_mpTaskHistorySearchKeyword) + '" oninput="window._mpOnTaskHistorySearch(this.value)" style="height:38px;width:100%;padding:0 16px 0 38px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;" />';
        html += '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;color:#94a3b8;pointer-events:none;">🔍</span>';
        html += '</div>';

        // Status Select Filter
        html += '<select id="mp-task-history-status-select" onchange="window._mpSelectTaskHistoryStatus(this.value)" style="height:38px;padding:0 14px;border:1.5px solid #cbd5e1;border-radius:12px;font-size:13.5px;font-weight:600;outline:none;background:#f8fafc;color:#334155;cursor:pointer;box-sizing:border-box;">';
        html += '<option value="all"' + (_mpTaskHistoryStatusFilter === 'all' ? ' selected' : '') + '>Tất cả trạng thái</option>';
        html += '<option value="unfinished"' + (_mpTaskHistoryStatusFilter === 'unfinished' ? ' selected' : '') + '>⏳ Chưa hoàn thành (Hiển thị ở trên)</option>';
        html += '<option value="completed"' + (_mpTaskHistoryStatusFilter === 'completed' ? ' selected' : '') + '>✅ Đã hoàn thành (Hiển thị ở dưới)</option>';
        html += '</select>';

        html += '</div>';

        // 3. RESULTS CONTAINER
        html += '<div id="mp-task-history-results"></div>';

        container.innerHTML = html;

        // Fetch data
        _mpFetchAndRenderTaskHistory();
    }

    window._mpSelectTaskHistoryProcess = function(procId) {
        _mpTaskHistoryFilterProcessId = procId;
        var el = document.getElementById('mp-tab-content');
        if (el) _mpRenderTaskHistoryTab(el);
    };

    window._mpSelectTaskHistoryYear = function(val) {
        _mpTaskHistoryFilterYear = val;
        _mpRenderTaskHistoryResults();
    };

    window._mpSelectTaskHistoryMonth = function(val) {
        _mpTaskHistoryFilterMonth = val;
        _mpRenderTaskHistoryResults();
    };

    window._mpSelectTaskHistoryQuarter = function(val) {
        _mpTaskHistoryFilterQuarter = val;
        _mpRenderTaskHistoryResults();
    };

    window._mpSelectTaskHistoryStatus = function(statusVal) {
        _mpTaskHistoryStatusFilter = statusVal;
        _mpRenderTaskHistoryResults();
    };

    window._mpOnTaskHistorySearch = function(val) {
        _mpTaskHistorySearchKeyword = val || '';
        _mpRenderTaskHistoryResults();
    };

    function _mpFetchAndRenderTaskHistory() {
        var container = document.getElementById('mp-task-history-results');
        if (!container) return;
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;font-size:14px;"><span style="font-size:24px;display:block;margin-bottom:8px;">⏳</span>Đang tổng hợp lịch sử công việc...</div>';

        var url = '/api/meeting-process/task-history';
        if (_mpTaskHistoryFilterProcessId && _mpTaskHistoryFilterProcessId !== 'all') {
            url += '?process_id=' + _mpTaskHistoryFilterProcessId;
        }

        var token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        var headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        fetch(url, { credentials: 'include', headers: headers })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res && res.success && Array.isArray(res.tasks)) {
                    _mpTaskHistoryData = res.tasks;
                } else {
                    _mpTaskHistoryData = [];
                }
                _mpRenderTaskHistoryResults();
            })
            .catch(function(err) {
                console.error('[TaskHistory Error]', err);
                if (container) container.innerHTML = '<div style="padding:20px;color:#dc2626;text-align:center;">Không thể nạp lịch sử công việc. Vui lòng thử lại.</div>';
            });
    }

    function _mpRenderTaskHistoryResults() {
        var container = document.getElementById('mp-task-history-results');
        if (!container) return;

        var keyword = (_mpTaskHistorySearchKeyword || '').trim().toLowerCase();
        var statusFilter = _mpTaskHistoryStatusFilter || 'all';

        // Filter list
        var filtered = (_mpTaskHistoryData || []).filter(function(t) {
            if (_mpTaskHistoryFilterProcessId && _mpTaskHistoryFilterProcessId !== 'all') {
                if (String(t.process_id) !== String(_mpTaskHistoryFilterProcessId)) return false;
            }
            if (statusFilter === 'unfinished' && t.is_handled) return false;
            if (statusFilter === 'completed' && !t.is_handled) return false;

            // Date filtering (Năm, Tháng, Quý)
            var dateStr = t.session_date || t.note_created_at || '';
            var taskDate = dateStr ? new Date(dateStr) : null;
            var hasValidDate = taskDate && !isNaN(taskDate.getTime());

            if (_mpTaskHistoryFilterYear && _mpTaskHistoryFilterYear !== 'all') {
                if (!hasValidDate || String(taskDate.getFullYear()) !== String(_mpTaskHistoryFilterYear)) return false;
            }

            if (_mpTaskHistoryFilterMonth && _mpTaskHistoryFilterMonth !== 'all') {
                if (!hasValidDate || String(taskDate.getMonth() + 1) !== String(_mpTaskHistoryFilterMonth)) return false;
            }

            if (_mpTaskHistoryFilterQuarter && _mpTaskHistoryFilterQuarter !== 'all') {
                if (!hasValidDate) return false;
                var taskQ = Math.floor(taskDate.getMonth() / 3) + 1;
                if (String(taskQ) !== String(_mpTaskHistoryFilterQuarter)) return false;
            }

            if (keyword) {
                var searchStr = (t.item_text + ' ' + t.evidence_link + ' ' + t.step_title + ' ' + t.session_title + ' ' + t.process_title).toLowerCase();
                if (searchStr.indexOf(keyword) === -1) return false;
            }

            return true;
        });

        // Split into UNFINISHED (Top) and COMPLETED (Bottom)
        var unfinishedTasks = filtered.filter(function(t) { return !t.is_handled; });
        var completedTasks = filtered.filter(function(t) { return t.is_handled; });

        var html = '';

        if (filtered.length === 0) {
            html += '<div style="background:white;border:1px dashed #cbd5e1;border-radius:16px;padding:48px;text-align:center;color:#64748b;">';
            html += '<span style="font-size:36px;display:block;margin-bottom:12px;">🎉</span>';
            html += '<div style="font-size:16px;font-weight:700;color:#334155;margin-bottom:4px;">Không tìm thấy công việc phù hợp</div>';
            html += '<div style="font-size:13px;">Thử chọn lại quy trình khác hoặc tìm kiếm từ khóa khác xem sao bạn nhé.</div>';
            html += '</div>';
            container.innerHTML = html;
            return;
        }

        // ==========================================
        // KHU VỰC 1 (TRÊN): CÔNG VIỆC CHƯA HOÀN THÀNH
        // ==========================================
        if (statusFilter !== 'completed') {
            html += '<div style="margin-bottom:32px;">';
            
            // Section Header
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);border:1.5px solid #fde68a;border-radius:14px;margin-bottom:16px;box-shadow:0 2px 8px rgba(217,119,6,0.06);">';
            html += '<div style="display:flex;align-items:center;gap:10px;">';
            html += '<span style="font-size:20px;line-height:1;">⏳</span>';
            html += '<span style="font-size:15px;font-weight:800;color:#b45309;letter-spacing:-0.01em;">CÔNG VIỆC CHƯA HOÀN THÀNH</span>';
            html += '<span style="background:#f59e0b;color:white;font-size:12px;font-weight:800;padding:2px 10px;border-radius:12px;">' + unfinishedTasks.length + ' mục</span>';
            html += '</div>';
            html += '<span style="font-size:12px;color:#d97706;font-weight:600;">(Được ưu tiên hiển thị ở trên để đôn đốc)</span>';
            html += '</div>';

            if (unfinishedTasks.length === 0) {
                html += '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;color:#059669;font-size:13px;font-weight:600;">';
                html += '✅ Tuyệt vời! Không có công việc nào bị bỏ dở trong danh mục này.';
                html += '</div>';
            } else {
                var unfinishedGroups = _groupTasksByStep(unfinishedTasks);
                html += '<div style="display:flex;flex-direction:column;gap:14px;">';
                unfinishedGroups.forEach(function(g) {
                    html += _renderTaskHistoryGroupCard(g, false);
                });
                html += '</div>';
            }

            html += '</div>';
        }

        // ==========================================
        // KHU VỰC 2 (DƯỚI): CÔNG VIỆC ĐÃ HOÀN THÀNH
        // ==========================================
        if (statusFilter !== 'unfinished') {
            html += '<div style="margin-bottom:32px;">';
            
            // Section Header
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);border:1.5px solid #a7f3d0;border-radius:14px;margin-bottom:16px;box-shadow:0 2px 8px rgba(16,185,129,0.06);">';
            html += '<div style="display:flex;align-items:center;gap:10px;">';
            html += '<span style="font-size:20px;line-height:1;">✅</span>';
            html += '<span style="font-size:15px;font-weight:800;color:#047857;letter-spacing:-0.01em;">CÔNG VIỆC ĐÃ HOÀN THÀNH</span>';
            html += '<span style="background:#10b981;color:white;font-size:12px;font-weight:800;padding:2px 10px;border-radius:12px;">' + completedTasks.length + ' mục</span>';
            html += '</div>';
            html += '<span style="font-size:12px;color:#059669;font-weight:600;">(Đã hoàn tất & ghi nhận dẫn chứng đầy đủ)</span>';
            html += '</div>';

            if (completedTasks.length === 0) {
                html += '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;color:#64748b;font-size:13px;">';
                html += 'Chưa có công việc nào hoàn thành.';
                html += '</div>';
            } else {
                var completedGroups = _groupTasksByStep(completedTasks);
                html += '<div style="display:flex;flex-direction:column;gap:14px;">';
                completedGroups.forEach(function(g) {
                    html += _renderTaskHistoryGroupCard(g, true);
                });
                html += '</div>';
            }

            html += '</div>';
        }

        container.innerHTML = html;
    }

    function _groupTasksByStep(tasks) {
        var groups = [];
        var map = {};
        (tasks || []).forEach(function(t) {
            var key = t.session_id + '_' + (t.step_id || t.step_title);
            if (!map[key]) {
                map[key] = {
                    session_id: t.session_id,
                    session_title: t.session_title,
                    session_date: t.session_date,
                    step_id: t.step_id,
                    step_title: t.step_title,
                    step_order: t.step_order,
                    total_steps: t.total_steps,
                    process_id: t.process_id,
                    process_title: t.process_title,
                    process_icon: t.process_icon,
                    items: []
                };
                groups.push(map[key]);
            }
            map[key].items.push(t);
        });
        return groups;
    }

    function _renderTaskHistoryGroupCard(g, isDone) {
        var cardBg = isDone ? '#ffffff' : '#fffdf5';
        var cardBorder = isDone ? '1px solid #cbd5e1' : '1.5px solid #fde68a';
        var cardShadow = isDone ? '0 2px 6px rgba(0,0,0,0.03)' : '0 4px 12px rgba(217,119,6,0.08)';

        var html = '';
        html += '<div style="background:' + cardBg + ';border:' + cardBorder + ';border-radius:16px;padding:18px 22px;box-shadow:' + cardShadow + ';transition:all 0.2s ease;">';
        
        // ROW 1: HEADER BADGES (Step badge + Process badge + Count + Session info)
        html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ' + (isDone ? '#f1f5f9' : '#fef3c7') + ';">';
        
        // Left badges: STEP BADGE + Process Badge + Count Badge
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
        html += '<span style="background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);color:white;font-size:12.5px;font-weight:800;padding:4px 12px;border-radius:10px;box-shadow:0 2px 6px rgba(99,102,241,0.25);display:inline-flex;align-items:center;gap:4px;">';
        html += '📍 Bước ' + g.step_order + '/' + g.total_steps + ': ' + _escHtml(g.step_title);
        html += '</span>';

        // Process Badge
        html += '<span style="background:#f1f5f9;color:#475569;font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:8px;border:1px solid #cbd5e1;">';
        html += (g.process_icon || '📋') + ' ' + _escHtml(g.process_title);
        html += '</span>';

        // Count Badge
        var countBg = isDone ? '#10b981' : '#d97706';
        html += '<span style="background:' + countBg + ';color:white;font-size:11px;font-weight:800;padding:2px 8px;border-radius:8px;">';
        html += g.items.length + ' mục';
        html += '</span>';
        html += '</div>';

        // Right badges: Session Title & Date
        html += '<div style="font-size:12.5px;color:#64748b;font-weight:600;display:inline-flex;align-items:center;gap:6px;">';
        html += '🗓️ ' + _escHtml(g.session_title);
        if (g.session_date) html += ' <span style="color:#94a3b8;">(' + _formatDate(g.session_date) + ')</span>';
        html += '</div>';

        html += '</div>'; // End Row 1 Header

        // ROW 2: LIST OF ITEMS IN THIS STEP
        html += '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">';
        g.items.forEach(function(t) {
            html += '<div style="background:' + (isDone ? '#f8fafc' : '#ffffff') + ';border:1px solid ' + (isDone ? '#e2e8f0' : '#fef3c7') + ';border-radius:12px;padding:12px 16px;">';
            html += '<div style="font-size:14.5px;font-weight:700;color:' + (isDone ? '#1e293b' : '#0f172a') + ';line-height:1.5;">';
            html += (isDone ? '✅ ' : '⏳ ') + _escHtml(t.item_text);
            html += '</div>';

            if (isDone) {
                if (t.transferred_to) {
                    html += '<div style="margin-top:6px;font-size:12.5px;color:#d97706;font-weight:600;">';
                    html += '➡️ Đã chuyển giao nhiệm vụ: ' + _escHtml(t.transferred_to);
                    html += '</div>';
                } else if (t.evidence_link) {
                    html += '<div style="margin-top:6px;font-size:12.5px;color:#047857;font-weight:600;">';
                    html += '📝 Nội dung công việc: ' + _escHtml(t.evidence_link);
                    html += '</div>';
                }
                if (t.evidence_image) {
                    html += '<div style="margin-top:6px;"><img src="' + t.evidence_image + '" onclick="window._mpViewImageModal(this.src)" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer;" title="Bấm để xem phóng to" /></div>';
                }
            }
            html += '</div>';
        });
        html += '</div>'; // End List of Items

        // ROW 3: FOOTER WARNING + ACTION BUTTON
        html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px dashed ' + (isDone ? '#e2e8f0' : '#fde68a') + ';">';
        
        if (!isDone) {
            html += '<div style="font-size:12px;color:#dc2626;font-weight:600;display:inline-flex;align-items:center;gap:6px;">';
            html += '⚠️ Vui lòng hoàn thành & nhập nội dung công việc trong phiên họp này.';
            html += '</div>';
        } else {
            html += '<div></div>';
        }

        html += '<button onclick="window._mpOpenSessionAtStep(' + g.session_id + ', ' + g.step_id + ')" style="padding:8px 16px;background:linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);color:white;border:none;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(79,70,229,0.25);transition:all 0.2s ease;">';
        html += '🔗 Mở Phiên Họp Tại Bước Này →';
        html += '</button>';

        html += '</div>'; // End Row 3 Footer

        html += '</div>'; // End Group Card
        return html;
    }

    window._mpOpenSessionAtStep = function(sessionId, stepId) {
        _mpActiveSessionId = sessionId;
        _mpCurrentTab = 'session_detail';
        _mpSaveState();
        _mpUpdateTabStyles();
        
        // Find step index
        if (stepId && _mpSteps) {
            var sIdx = _mpSteps.findIndex(function(st) { return String(st.id) === String(stepId); });
            if (sIdx >= 0) _mpActiveStepIndex = sIdx;
        }

        var el = document.getElementById('mp-tab-content');
        if (el) _mpRenderSessionDetailTab(el);
    };

    // ========== UTILITIES ==========
})();
