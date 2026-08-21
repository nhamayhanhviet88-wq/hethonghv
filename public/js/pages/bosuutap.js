// ========== BỘ SƯU TẬP / BST PAGE ==========

function _bsutGetAuthHeaders() {
    const headers = {};
    const token = localStorage.getItem('token') || (document.cookie.match(/token=([^;]+)/) || [])[1];
    if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

async function _bsutApi(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: _bsutGetAuthHeaders(),
        credentials: 'include'
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return await res.json();
}

let _bsutData = {
    collections: [],
    eligibleTasks: [],
    activeMode: 'task_linked', // 'task_linked' or 'free'
    formState: {
        cover_image_url: '',
        hasCoBotay: true,
        market_mau: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        market_co_botay: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        phieu_ban_don: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        thong_so_mau_ao: { image_urls: [], original_image_urls: [] },
        chup_anh_mau_bst: []
    }
};

async function renderBosuutapPage(container) {
    container.innerHTML = `
        <div style="padding: 24px; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); border-radius: 20px; padding: 32px 40px; color: white; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(67, 56, 202, 0.3); position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
                <div style="position: absolute; right: 260px; bottom: -30px; font-size: 160px; opacity: 0.12; user-select: none;">🖼️</div>
                <div style="z-index: 1;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        <span>✨ Quản Lý Mẫu Bộ Sưu Tập</span>
                    </div>
                    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🖼️ Bộ Sưu Tập / BST</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9; max-width: 650px; line-height: 1.5;">
                        Trang lưu trữ, trưng bày và quản lý chi tiết các Mẫu Bộ Sưu Tập (Maket Mẫu, Market Cổ, Thông Số Áo, Bán Giao & Họp Sale).
                    </p>
                </div>
                <div style="z-index: 1; display: flex; gap: 12px; align-items: center;">
                    ${(window._currentUser && window._currentUser.role === 'giam_doc') ? `
                        <button id="btnOpenManageLinhVuc" onclick="openModalManageLinhVuc()" style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); color: white; border: 1px solid rgba(255, 255, 255, 0.4); padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                            <span style="font-size: 18px;">⚙️</span> Cấu Hình Lĩnh Vực
                        </button>
                    ` : ''}
                    <button id="btnOpenCreateCollection" onclick="btnOpenCreateCollectionModal()" style="background: #10b981; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s ease;">
                        <span style="font-size: 18px;">➕</span> Tạo Bộ Sưu Tập Mới
                    </button>
                </div>
            </div>

            <!-- Filter & Search Toolbar Card -->
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #0f172a;">
                        <span>🔍</span>
                        <span>TÌM KIẾM & LỌC BỘ SƯU TẬP</span>
                    </div>
                    <div id="bsutFilterResultCount" style="font-size: 12px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 5px 14px; border-radius: 20px; border: 1px solid #c7d2fe;">
                        Hiển thị 0 Bộ Sưu Tập
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 1fr auto; gap: 10px; align-items: center;">
                    <!-- 1. Search Box -->
                    <div style="position: relative;">
                        <input type="text" id="iptSearchBsutName" onkeyup="applyBosuutapFilters()" placeholder="🔍 Tìm tên BST, mã CV..." style="width: 100%; padding: 10px 14px 10px 36px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; font-weight: 600; background: #fafafa; transition: all 0.2s;" onfocus="this.style.borderColor='#4338ca';this.style.background='white';this.style.boxShadow='0 0 0 3px rgba(67,56,202,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; opacity: 0.5;">🔍</span>
                    </div>

                    <!-- 2. Lĩnh Vực select -->
                    <div>
                        <select id="selFilterBsutLinhVuc" onchange="applyBosuutapFilters()" style="width: 100%; padding: 10px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer;">
                            <option value="">🏢 Tất cả lĩnh vực</option>
                        </select>
                    </div>

                    <!-- 3. Year select -->
                    <div>
                        <select id="selFilterBsutYear" onchange="applyBosuutapFilters()" style="width: 100%; padding: 10px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer;">
                            <option value="">📅 Tất cả năm</option>
                            <option value="2026">Năm 2026</option>
                            <option value="2025">Năm 2025</option>
                            <option value="2024">Năm 2024</option>
                        </select>
                    </div>

                    <!-- 4. Quarter select -->
                    <div>
                        <select id="selFilterBsutQuarter" onchange="applyBosuutapFilters()" style="width: 100%; padding: 10px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer;">
                            <option value="">📊 Tất cả quý</option>
                            <option value="1">Quý 1 (T1 - T3)</option>
                            <option value="2">Quý 2 (T4 - T6)</option>
                            <option value="3">Quý 3 (T7 - T9)</option>
                            <option value="4">Quý 4 (T10 - T12)</option>
                        </select>
                    </div>

                    <!-- 5. Month select -->
                    <div>
                        <select id="selFilterBsutMonth" onchange="applyBosuutapFilters()" style="width: 100%; padding: 10px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer;">
                            <option value="">🗓️ Tất cả tháng</option>
                            <option value="1">Tháng 1</option>
                            <option value="2">Tháng 2</option>
                            <option value="3">Tháng 3</option>
                            <option value="4">Tháng 4</option>
                            <option value="5">Tháng 5</option>
                            <option value="6">Tháng 6</option>
                            <option value="7">Tháng 7</option>
                            <option value="8">Tháng 8</option>
                            <option value="9">Tháng 9</option>
                            <option value="10">Tháng 10</option>
                            <option value="11">Tháng 11</option>
                            <option value="12">Tháng 12</option>
                        </select>
                    </div>

                    <!-- 6. Creator select -->
                    <div>
                        <select id="selFilterBsutCreator" onchange="applyBosuutapFilters()" style="width: 100%; padding: 10px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #1e293b; background: #fafafa; cursor: pointer;">
                            <option value="">👤 Tất cả người tạo</option>
                        </select>
                    </div>

                    <!-- 7. Reset button -->
                    <div>
                        <button onclick="resetBosuutapFilters()" style="padding: 10px 14px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;" onmouseover="this.style.background='#e2e8f0';this.style.color='#0f172a'" onmouseout="this.style.background='#f1f5f9';this.style.color='#475569'">🔄 Đặt Lại</button>
                    </div>
                </div>
            </div>

            <!-- List Grid -->
            <div id="bsutContainer">
                <div style="text-align: center; padding: 60px; color: #64748b; font-size: 15px;">⏳ Đang tải danh sách Bộ Sưu Tập...</div>
            </div>
        </div>

        <!-- MODAL CẤU HÌNH LĨNH VỰC (DÀNH CHO GIÁM ĐỐC) -->
        <div id="modalManageLinhVuc" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: center; padding: 24px; overflow-y: auto;">
            <div style="background: white; border-radius: 20px; width: 100%; max-width: 520px; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">⚙️</span>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800;">Cấu Hình Lĩnh Vực</h3>
                            <div style="font-size: 12px; opacity: 0.8;">Chỉ Giám Đốc có quyền thêm hoặc xóa Lĩnh Vực</div>
                        </div>
                    </div>
                    <button onclick="closeModalManageLinhVuc()" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold;">✕</button>
                </div>

                <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                    <!-- Form thêm Lĩnh Vực mới -->
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Thêm Lĩnh Vực Mới:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="iptNewLinhVucName" placeholder="Ví dụ: Đồng Phục Xưởng, Áo Nhóm..." style="flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; font-weight: 600;">
                            <button onclick="addNewLinhVuc()" style="background: #4338ca; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13.5px; cursor: pointer; white-space: nowrap;">➕ Thêm</button>
                        </div>
                    </div>

                    <!-- Danh sách Lĩnh Vực hiện tại -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Danh Sách Lĩnh Vực Hiện Tại:</label>
                        <div id="listLinhVucManage" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL TẠO BỘ SƯU TẬP MỚI (REDESIGN) -->
        <div id="modalCreateCollection" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: flex-start; padding: 24px; overflow-y: auto;">
            <div style="background: #f8fafc; border-radius: 24px; width: 100%; max-width: 1000px; margin: auto; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden;">
                
                <!-- Modal Header Gradient -->
                <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6366f1 100%); padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
                    <div>
                        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); backdrop-filter: blur(6px); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 8px;">
                            <span>✨ Tạo Mới</span>
                        </div>
                        <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.3px;">Tạo Bộ Sưu Tập Mới</h3>
                        <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.75);">Điền đầy đủ thông tin và đính kèm file theo đúng quy định hệ thống</p>
                    </div>
                    <button onclick="closeModalCreateCollection()" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.2); font-size: 16px; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; color: white; font-weight: bold; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
                </div>

                <!-- Modal Body -->
                <div style="padding: 28px 32px; display: flex; flex-direction: column; gap: 28px; max-height: calc(90vh - 140px); overflow-y: auto;">
                    
                    <!-- ═══════════ BƯỚC 1: THÔNG TIN CƠ BẢN ═══════════ -->
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #4338ca, #6366f1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 800;">1</div>
                            <div>
                                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">THÔNG TIN CƠ BẢN</div>
                                <div style="font-size: 12px; color: #64748b;">Ảnh đại diện, tên BST, ngày ra mắt</div>
                            </div>
                        </div>

                        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: start;">
                                
                                <!-- Ảnh Đại Diện BST -->
                                <div>
                                    <label style="display: block; font-weight: 700; font-size: 12px; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                        📷 Ảnh Đại Diện <span style="color: #ef4444;">*</span>
                                    </label>
                                    <div id="boxCoverImage" onclick="document.getElementById('inputCoverImage').click()" style="width: 160px; height: 200px; border: 2px dashed #a5b4fc; border-radius: 16px; background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; overflow: hidden; position: relative;" onmouseover="this.style.borderColor='#4338ca';this.style.transform='scale(1.02)'" onmouseout="this.style.borderColor='#a5b4fc';this.style.transform='scale(1)'">
                                        <div id="coverImagePlaceholder" style="text-align: center;">
                                            <div style="font-size: 36px; margin-bottom: 8px; opacity: 0.6;">🖼️</div>
                                            <div style="font-size: 12px; font-weight: 700; color: #4338ca;">Click để chọn</div>
                                            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Ảnh đại diện BST</div>
                                        </div>
                                        <img id="coverImagePreview" src="" style="display: none; width: 100%; height: 100%; object-fit: cover; border-radius: 14px;">
                                    </div>
                                    <input type="file" id="inputCoverImage" accept="image/*" onchange="uploadCoverImage(this)" style="display: none;">
                                </div>

                                <!-- Thông tin form -->
                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <!-- Tên BST -->
                                    <div>
                                        <label style="display: block; font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 6px;">
                                            1. Tên Bộ Sưu Tập <span style="color: #ef4444;">*</span>
                                        </label>
                                        <input type="text" id="iptCollectionName" placeholder="Ví dụ: BST Áo Nhóm Mùa Hè 2026..." style="width: 100%; padding: 11px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 600; transition: border-color 0.2s;" onfocus="this.style.borderColor='#4338ca';this.style.boxShadow='0 0 0 3px rgba(67,56,202,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">
                                    </div>

                                    <!-- Lĩnh Vực -->
                                    <div>
                                        <label style="display: block; font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 6px;">
                                            🏢 Lĩnh Vực <span style="color: #ef4444;">*</span>
                                        </label>
                                        <select id="selCollectionLinhVuc" style="width: 100%; padding: 11px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 600; color: #0f172a; background: #ffffff; cursor: pointer;">
                                            <option value="">-- Bắt buộc chọn Lĩnh Vực --</option>
                                        </select>
                                    </div>

                                    <!-- Ngày ra mắt -->
                                    <div>
                                        <label style="display: block; font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 6px;">
                                            2. Ngày Ra BST <span style="color: #ef4444;">*</span>
                                        </label>
                                        <input type="date" id="iptCollectionReleaseDate" style="width: 100%; padding: 11px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 600;">
                                    </div>

                                    <!-- Phương thức tạo -->
                                    <div style="background: #f1f5f9; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0;">
                                        <label style="display: block; font-weight: 700; font-size: 12px; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">📌 Phương Thức Tạo:</label>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                            <div id="optCardTaskLinked" onclick="selectCollectionMode('task_linked')" style="border: 2px solid #4338ca; background: #eef2ff; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all 0.2s ease;">
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <input type="radio" id="radModeTaskLinked" name="radCollectionMode" value="task_linked" checked style="accent-color: #4338ca; width: 16px; height: 16px;">
                                                    <span style="font-weight: 700; font-size: 12px; color: #1e1b4b;">Theo Công Việc (Tư Liệu 2)</span>
                                                </div>
                                            </div>
                                            <div id="optCardFree" onclick="selectCollectionMode('free')" style="border: 2px solid #cbd5e1; background: white; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all 0.2s ease;">
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <input type="radio" id="radModeFree" name="radCollectionMode" value="free" style="accent-color: #4338ca; width: 16px; height: 16px;">
                                                    <span style="font-weight: 700; font-size: 12px; color: #334155;">Tạo Tự Do</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="boxSelectTaskLinked" style="margin-top: 10px; background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #c7d2fe;">
                                            <label style="display: block; font-size: 12px; font-weight: 700; color: #3730a3; margin-bottom: 4px;">🎯 Chọn Mã Công Việc: <span style="color: #ef4444;">*</span></label>
                                            <select id="selCollectionTask" onchange="updateNameFromSelectedTask()" style="width: 100%; padding: 8px 10px; border: 1px solid #a5b4fc; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e1b4b; background: #fafafa;">
                                                <option value="">-- Chọn mã công việc --</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ═══════════ BƯỚC 2: TÀI LIỆU THIẾT KẾ ═══════════ -->
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 800;">2</div>
                            <div>
                                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">TÀI LIỆU THIẾT KẾ</div>
                                <div style="font-size: 12px; color: #64748b;">Quy tắc N: Mục 3 làm mốc → Mục 5 & 6 phải khớp</div>
                            </div>
                        </div>

                        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 16px;">
                            
                            <!-- Row 1: Market Mẫu + Market Cổ -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <!-- 3. Market Mẫu -->
                                <div style="background: #fefce8; padding: 14px; border-radius: 12px; border: 1px solid #fde68a;">
                                    <div style="font-weight: 700; font-size: 13px; color: #92400e; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                                        <span style="background: #f59e0b; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">3</span>
                                        Market Mẫu <span style="color: #ef4444; font-size: 11px;">(Mốc chuẩn N)</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(245,158,11,0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 10px rgba(245,158,11,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(245,158,11,0.3)'">
                                                🖼️ Chọn Hình Ảnh
                                                <input type="file" accept="image/*" multiple onchange="uploadCollectionFiles(this, 'market_mau', 'image_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_market_mau_img" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #78716c, #57534e); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(120,113,108,0.3);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                                📄 Chọn File PDF
                                                <input type="file" accept="application/pdf" multiple onchange="uploadCollectionFiles(this, 'market_mau', 'pdf_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_market_mau_pdf" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                    </div>
                                    <div id="badge_market_mau_pair"></div>
                                </div>

                                <!-- 4. Market Cổ / Bo Tay -->
                                <div style="background: #f0fdf4; padding: 14px; border-radius: 12px; border: 1px solid #bbf7d0;">
                                    <div style="font-weight: 700; font-size: 13px; color: #166534; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                                        <span style="background: #22c55e; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">4</span>
                                        Market Cổ / Bo Tay
                                        <div style="display: inline-flex; gap: 4px; margin-left: 8px;">
                                            <div id="toggleCoBotay_yes" onclick="toggleCoBotay(true)" style="padding: 3px 8px; border-radius: 6px; border: 1.5px solid #22c55e; background: #dcfce7; cursor: pointer; font-size: 10px; font-weight: 700; color: #166534; transition: all 0.2s ease; line-height: 1.4;">✅ Có</div>
                                            <div id="toggleCoBotay_no" onclick="toggleCoBotay(false)" style="padding: 3px 8px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-size: 10px; font-weight: 700; color: #94a3b8; transition: all 0.2s ease; line-height: 1.4;">❌ Không</div>
                                        </div>
                                    </div>
                                    <div id="boxCoBotayFiles" style="display: flex; flex-direction: column; gap: 10px;">
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(34,197,94,0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 10px rgba(34,197,94,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(34,197,94,0.3)'">
                                                🖼️ Chọn Hình Ảnh
                                                <input type="file" accept="image/*" multiple onchange="uploadCollectionFiles(this, 'market_co_botay', 'image_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_market_co_botay_img" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #78716c, #57534e); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(120,113,108,0.3);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                                📄 Chọn File PDF
                                                <input type="file" accept="application/pdf" multiple onchange="uploadCollectionFiles(this, 'market_co_botay', 'pdf_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_market_co_botay_pdf" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                    </div>
                                    <div id="badge_market_co_botay_pair"></div>
                                </div>
                            </div>

                            <!-- Row 2: Phiếu Bắn Đơn + Thông Số Mẫu Áo -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <!-- 5. Phiếu Bắn Đơn -->
                                <div style="background: #eef2ff; padding: 14px; border-radius: 12px; border: 1px solid #c7d2fe;">
                                    <div style="font-weight: 700; font-size: 13px; color: #3730a3; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                                        <span style="background: #4338ca; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">5</span>
                                        Phiếu Bắn Đơn <span style="color: #ef4444; font-size: 11px;">(= N Ảnh & N PDF)</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(67,56,202,0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 10px rgba(67,56,202,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(67,56,202,0.3)'">
                                                🖼️ Chọn Hình Ảnh
                                                <input type="file" accept="image/*" multiple onchange="uploadCollectionFiles(this, 'phieu_ban_don', 'image_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_phieu_ban_don_img" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                        <div>
                                            <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #78716c, #57534e); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(120,113,108,0.3);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                                📄 Chọn File PDF
                                                <input type="file" accept="application/pdf" multiple onchange="uploadCollectionFiles(this, 'phieu_ban_don', 'pdf_urls')" style="display: none;">
                                            </label>
                                            <div id="prev_phieu_ban_don_pdf" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                        </div>
                                    </div>
                                    <div id="badge_phieu_ban_don_pair"></div>
                                </div>

                                <!-- 6. Thông Số Mẫu Áo -->
                                <div style="background: #fdf4ff; padding: 14px; border-radius: 12px; border: 1px solid #e9d5ff;">
                                    <div style="font-weight: 700; font-size: 13px; color: #6b21a8; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                                        <span style="background: #9333ea; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">6</span>
                                        Thông Số Mẫu Áo <span style="color: #ef4444; font-size: 11px;">(= N Ảnh)</span>
                                    </div>
                                    <div>
                                        <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #9333ea, #7c3aed); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(147,51,234,0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 10px rgba(147,51,234,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(147,51,234,0.3)'">
                                            🖼️ Chọn Hình Ảnh
                                            <input type="file" accept="image/*" multiple onchange="uploadCollectionFiles(this, 'thong_so_mau_ao', 'image_urls')" style="display: none;">
                                        </label>
                                        <div id="prev_thong_so_mau_ao_img" style="font-size: 12px; color: #10b981; margin-top: 6px;"></div>
                                    </div>
                                    <div id="badge_thong_so_mau_ao_pair"></div>
                                </div>
                            </div>
                            <!-- 7. Giá Sản Phẩm -->
                            <div style="background: #fef3c7; padding: 14px; border-radius: 12px; border: 1px solid #fde68a;">
                                <div style="font-weight: 700; font-size: 13px; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="background: #d97706; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">7</span>
                                    Giá Sản Phẩm <span style="color: #ef4444; font-size: 11px;">*</span>
                                </div>
                                <div style="font-size: 11px; color: #78716c; margin-bottom: 6px;">💡 Gợi ý về giá dao động, chất liệu, mức giá tham khảo cho mẫu này...</div>
                                <textarea id="txtGiaSanPham" placeholder="Ví dụ: Áo form Oversize, chất Cotton 100% - giá dao động từ 250k ~ 350k tùy size.&#10;Chất Pique cao cấp - từ 380k ~ 450k..." rows="4" style="width: 100%; padding: 10px 14px; border: 1px solid #fde68a; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical; background: white; line-height: 1.6; transition: border-color 0.2s;" onfocus="this.style.borderColor='#d97706';this.style.boxShadow='0 0 0 3px rgba(217,119,6,0.1)'" onblur="this.style.borderColor='#fde68a';this.style.boxShadow='none'"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- ═══════════ BƯỚC 3: ẢNH THAM KHẢO & LIÊN KẾT ═══════════ -->
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #d97706, #f59e0b); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 800;">3</div>
                            <div>
                                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">ẢNH THAM KHẢO & LIÊN KẾT</div>
                                <div style="font-size: 12px; color: #64748b;">Ảnh mẫu BST và liên kết bổ sung</div>
                            </div>
                        </div>

                        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 16px;">
                            
                            <!-- 8. Chụp Ảnh Mẫu BST -->
                            <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="background: #64748b; color: white; width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">8</span>
                                    Chụp Ảnh Mẫu BST <span style="color: #64748b; font-size: 11px; font-weight: normal;">(Không bắt buộc, nhiều ảnh)</span>
                                </div>
                                <label onclick="this.querySelector('input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #64748b, #475569); color: white; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(100,116,139,0.3);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🖼️ Chọn Ảnh Mẫu
                                    <input type="file" accept="image/*" multiple onchange="uploadMultipleImages(this)" style="display: none;">
                                </label>
                                <div id="prev_chup_anh_mau_bst" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;"></div>
                            </div>

                            <!-- 9 & 10: Placeholder Liên Kết -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div style="background: #faf5ff; padding: 14px; border-radius: 12px; border: 1px dashed #d8b4fe; text-align: center;">
                                    <div style="font-size: 20px; margin-bottom: 4px;">🔗</div>
                                    <div style="font-size: 13px; font-weight: 700; color: #7c3aed;">9. Bàn Giao Maket cho BP. Thiết Kế</div>
                                    <div style="font-size: 11px; color: #a78bfa; margin-top: 4px;">Liên kết sẽ được cấu hình sau</div>
                                </div>
                                <div style="background: #fdf2f8; padding: 14px; border-radius: 12px; border: 1px dashed #f9a8d4; text-align: center;">
                                    <div style="font-size: 20px; margin-bottom: 4px;">🤝</div>
                                    <div style="font-size: 13px; font-weight: 700; color: #db2777;">10. Thông Tin Họp Với Sale</div>
                                    <div style="font-size: 11px; color: #f472b6; margin-top: 4px;">Liên kết sẽ được cấu hình sau</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div style="padding: 16px 32px; border-top: 1px solid #e2e8f0; background: white; display: flex; justify-content: space-between; align-items: center; position: sticky; bottom: 0; z-index: 10;">
                    <div style="font-size: 11px; color: #94a3b8;">
                        <span style="color: #ef4444;">*</span> Các trường bắt buộc phải điền đầy đủ
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="closeModalCreateCollection()" style="background: white; border: 1px solid #cbd5e1; color: #475569; padding: 10px 22px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s ease;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">Hủy Bỏ</button>
                        <button id="btnSubmitCollection" onclick="submitCreateCollection()" style="background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border: none; padding: 10px 28px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 13px; box-shadow: 0 4px 14px rgba(67, 56, 202, 0.35); transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(67,56,202,0.45)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 14px rgba(67,56,202,0.35)'">
                            <span>💾</span> Lưu Bộ Sưu Tập
                        </button>
                    </div>
                </div>

            </div>
        </div>

        <!-- MODAL XEM CHI TIẾT BỘ SƯU TẬP -->
        <div id="modalViewCollectionDetail" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 9999; justify-content: center; align-items: flex-start; padding: 24px; overflow-y: auto;">
            <div style="background: #f8fafc; border-radius: 24px; width: 100%; max-width: 1050px; margin: auto; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.35); border: 1px solid rgba(255,255,255,0.8);">
                <div id="viewCollectionContent" style="padding: 28px;"></div>
            </div>
        </div>
    `;

    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('iptCollectionReleaseDate');
    if (dateInput) dateInput.value = today;

    await loadBosuutapData();
}

async function loadBosuutapData() {
    const container = document.getElementById('bsutContainer');
    if (!container) return;

    try {
        const [resCols, resTasks, resLinhVuc] = await Promise.all([
            _bsutApi('/api/collections'),
            _bsutApi('/api/collections/eligible-tasks'),
            _bsutApi('/api/collections/linh-vuc')
        ]);

        _bsutData.collections = (resCols && resCols.collections) || [];
        _bsutData.eligibleTasks = (resTasks && resTasks.tasks) || [];
        _bsutData.linhVucList = (resLinhVuc && resLinhVuc.linh_vuc_list) || [];

        populateEligibleTaskSelect(_bsutData.eligibleTasks);
        populateLinhVucSelect();
        populateLinhVucFilterSelect();
        populateBsutCreatorFilter(_bsutData.collections);
        applyBosuutapFilters();
    } catch(e) {
        console.error('[loadBosuutapData error]', e);
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">❌ Đã xảy ra lỗi khi tải dữ liệu: ${e.message}</div>`;
    }
}

function populateLinhVucSelect() {
    const sel = document.getElementById('selCollectionLinhVuc');
    if (!sel) return;
    const list = _bsutData.linhVucList || [];
    const curVal = sel.value;
    let html = '<option value="">-- Bắt buộc chọn Lĩnh Vực --</option>';
    list.forEach(item => {
        html += `<option value="${escapeHtml(item.name)}">🏢 ${escapeHtml(item.name)}</option>`;
    });
    sel.innerHTML = html;
    if (curVal) sel.value = curVal;
}

function populateLinhVucFilterSelect() {
    const sel = document.getElementById('selFilterBsutLinhVuc');
    if (!sel) return;
    const list = _bsutData.linhVucList || [];
    const curVal = sel.value;
    let html = '<option value="">🏢 Tất cả lĩnh vực</option>';
    list.forEach(item => {
        html += `<option value="${escapeHtml(item.name)}">🏢 ${escapeHtml(item.name)}</option>`;
    });
    sel.innerHTML = html;
    if (curVal) sel.value = curVal;
}

function openModalManageLinhVuc() {
    if (!window._currentUser || window._currentUser.role !== 'giam_doc') {
        return alert('Chỉ Giám Đốc mới có quyền quản lý Cấu hình Lĩnh Vực!');
    }
    renderLinhVucManageList();
    const modal = document.getElementById('modalManageLinhVuc');
    if (modal) modal.style.display = 'flex';
}

function closeModalManageLinhVuc() {
    const modal = document.getElementById('modalManageLinhVuc');
    if (modal) modal.style.display = 'none';
}

function renderLinhVucManageList() {
    const container = document.getElementById('listLinhVucManage');
    if (!container) return;
    const list = _bsutData.linhVucList || [];
    if (list.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px;">(Chưa có Lĩnh Vực nào)</div>';
        return;
    }

    container.innerHTML = list.map(item => `
        <div style="background: white; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; font-weight: 700; color: #0f172a;">🏢 ${escapeHtml(item.name)}</span>
            <button onclick="deleteLinhVucItem(${item.id}, '${escapeHtml(item.name)}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🗑️ Xóa</button>
        </div>
    `).join('');
}

async function addNewLinhVuc() {
    const input = document.getElementById('iptNewLinhVucName');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return alert('Vui lòng nhập tên Lĩnh Vực!');

    try {
        const res = await _bsutApi('/api/collections/linh-vuc', 'POST', { name });
        if (!res.ok) throw new Error(res.error || 'Thêm thất bại');
        alert(`🎉 Đã thêm Lĩnh Vực "${name}" thành công!`);
        input.value = '';
        await loadBosuutapData();
        renderLinhVucManageList();
    } catch(e) {
        alert('❌ Lỗi khi thêm Lĩnh Vực: ' + e.message);
    }
}

async function deleteLinhVucItem(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa Lĩnh Vực "${name}"?`)) return;
    try {
        const res = await _bsutApi('/api/collections/linh-vuc/' + id, 'DELETE');
        if (!res.ok) throw new Error(res.error || 'Xóa thất bại');
        alert('Xóa Lĩnh Vực thành công!');
        await loadBosuutapData();
        renderLinhVucManageList();
    } catch(e) {
        alert('❌ Lỗi khi xóa Lĩnh Vực: ' + e.message);
    }
}

function populateBsutCreatorFilter(collections) {
    const sel = document.getElementById('selFilterBsutCreator');
    if (!sel) return;

    const creators = new Set();
    (collections || []).forEach(c => {
        const name = (c.created_by_name || '').trim();
        if (name) creators.add(name);
    });

    const currentVal = sel.value;
    let html = '<option value="">👤 Tất cả người tạo</option>';
    Array.from(creators).sort().forEach(cr => {
        html += `<option value="${escapeHtml(cr)}">${escapeHtml(cr)}</option>`;
    });
    sel.innerHTML = html;
    if (currentVal && Array.from(creators).includes(currentVal)) {
        sel.value = currentVal;
    }
}

function applyBosuutapFilters() {
    const searchKey = (document.getElementById('iptSearchBsutName')?.value || '').trim().toLowerCase();
    const selLinhVuc = document.getElementById('selFilterBsutLinhVuc')?.value;
    const selYear = document.getElementById('selFilterBsutYear')?.value;
    const selQuarter = document.getElementById('selFilterBsutQuarter')?.value;
    const selMonth = document.getElementById('selFilterBsutMonth')?.value;
    const selCreator = document.getElementById('selFilterBsutCreator')?.value;

    const allCols = _bsutData.collections || [];

    const filtered = allCols.filter(col => {
        // 1. Search key check (Tên BST, mã CV, tiêu đề CV, tên người tạo, Lĩnh Vực)
        if (searchKey) {
            const cName = (col.name || '').toLowerCase();
            const cCode = (col.task_code || '').toLowerCase();
            const cTitle = (col.task_title || '').toLowerCase();
            const cCreator = (col.created_by_name || '').toLowerCase();
            const cLinhVuc = (col.linh_vuc || '').toLowerCase();
            if (!cName.includes(searchKey) && !cCode.includes(searchKey) && !cTitle.includes(searchKey) && !cCreator.includes(searchKey) && !cLinhVuc.includes(searchKey)) {
                return false;
            }
        }

        // 2. Lĩnh Vực filter
        if (selLinhVuc) {
            if ((col.linh_vuc || '').trim() !== selLinhVuc.trim()) {
                return false;
            }
        }

        // Date extraction
        const dateStr = col.release_date || col.created_at;
        const d = dateStr ? new Date(dateStr) : null;
        const isValidDate = d && !isNaN(d.getTime());

        // 3. Year filter
        if (selYear) {
            if (!isValidDate || String(d.getFullYear()) !== String(selYear)) {
                return false;
            }
        }

        // 4. Month filter
        if (selMonth) {
            if (!isValidDate || String(d.getMonth() + 1) !== String(selMonth)) {
                return false;
            }
        }

        // 5. Quarter filter
        if (selQuarter) {
            if (!isValidDate) return false;
            const q = Math.ceil((d.getMonth() + 1) / 3);
            if (String(q) !== String(selQuarter)) {
                return false;
            }
        }

        // 6. Creator filter
        if (selCreator) {
            const creatorName = (col.created_by_name || 'Hệ thống').trim();
            if (creatorName !== selCreator.trim()) {
                return false;
            }
        }

        return true;
    });

    const badgeCount = document.getElementById('bsutFilterResultCount');
    if (badgeCount) {
        badgeCount.innerText = `Hiển thị ${filtered.length} / ${allCols.length} Bộ Sưu Tập`;
    }

    renderCollectionGrid(filtered);
}

function resetBosuutapFilters() {
    const iptName = document.getElementById('iptSearchBsutName');
    const selLinhVuc = document.getElementById('selFilterBsutLinhVuc');
    const selYear = document.getElementById('selFilterBsutYear');
    const selQuarter = document.getElementById('selFilterBsutQuarter');
    const selMonth = document.getElementById('selFilterBsutMonth');
    const selCreator = document.getElementById('selFilterBsutCreator');

    if (iptName) iptName.value = '';
    if (selLinhVuc) selLinhVuc.value = '';
    if (selYear) selYear.value = '';
    if (selQuarter) selQuarter.value = '';
    if (selMonth) selMonth.value = '';
    if (selCreator) selCreator.value = '';

    applyBosuutapFilters();
}

function renderCollectionGrid(collections) {
    const container = document.getElementById('bsutContainer');
    if (!container) return;

    if (!collections || collections.length === 0) {
        container.innerHTML = `
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 60px 20px; text-align: center;">
                <div style="font-size: 56px; margin-bottom: 12px;">🎨</div>
                <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px;">Không tìm thấy Bộ Sưu Tập nào</h3>
                <p style="color: #64748b; font-size: 13.5px; max-width: 420px; margin: 0 auto 20px;">
                    Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem các Bộ Sưu Tập khác.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
            ${collections.map(col => {
                const mm = typeof col.market_mau === 'string' ? JSON.parse(col.market_mau) : (col.market_mau || {});
                const previewImg = col.cover_image || mm.image_url || (mm.image_urls && mm.image_urls[0]) || '/public/img/placeholder.png';
                return `
                    <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px -2px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; display: flex; flex-direction: column;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 25px -5px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px -2px rgba(0,0,0,0.06)'">
                        <div style="height: 380px; background: #f8fafc; overflow: hidden; position: relative;">
                            <img src="${previewImg}" style="width: 100%; height: 100%; object-fit: cover; object-position: top center; transition: transform 0.4s ease;" onerror="this.src='https://via.placeholder.com/400x500?text=No+Image';" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                        </div>
                        
                        <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <!-- Chips: Lĩnh Vực, Mã CV & Người Tạo -->
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                                    <span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #fde68a;">
                                        🏢 ${escapeHtml(col.linh_vuc || 'Khác')}
                                    </span>
                                    ${col.created_mode === 'task_linked' && (col.task_code || col.task_id) ? `
                                        <span style="background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                            📌 ${escapeHtml((col.task_code && col.task_code.trim()) ? col.task_code.trim() : `CV-${String(col.task_id).padStart(3, '0')}`)}
                                        </span>
                                    ` : `
                                        <span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                            ✨ Tạo Tự Do
                                        </span>
                                    `}
                                    ${col.is_approved ? `
                                        <span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #86efac;">
                                            🟢 Đã duyệt
                                        </span>
                                    ` : `
                                        <span style="background: #fff1f2; color: #e11d48; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #fecdd3;">
                                            ⏳ Chưa duyệt
                                        </span>
                                    `}
                                    <span style="background: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                        👤 Người tạo: <b>${escapeHtml(col.created_by_name || 'Hệ thống')}</b>
                                    </span>
                                </div>

                                <h4 style="margin: 0 0 8px; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.3;">${escapeHtml(col.name)}</h4>
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                                    📅 Ngày ra mắt: <b>${formatDate(col.release_date)}</b>
                                </div>
                                <div style="font-size: 13px; color: #334155; margin-bottom: 12px; background: #fafafa; padding: 10px 14px; border-radius: 10px; border: 1px solid #f1f5f9; line-height: 1.5;">
                                    <b>💰 Giá:</b> ${escapeHtml(col.gia_san_pham || 'Chưa cập nhật')}
                                </div>
                            </div>

                            <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                                <button onclick="viewCollectionDetail(${col.id})" style="flex: 1; background: #4338ca; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;">👁️ Xem Chi Tiết</button>
                                ${(window._currentUser && window._currentUser.role === 'giam_doc') ? `
                                    <button onclick="deleteCollectionItem(${col.id})" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;">🗑️ Xóa</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function extractCollectionNameFromTask(task) {
    if (!task) return '';
    let name = task.title || '';

    // Remove leading CV-XXX - or CV-XXX-YYY - prefix if present
    name = name.replace(/^(CV-[A-Za-z0-9-]+)\s*-\s*/i, '');

    // Remove trailing date pattern e.g. - 21/08/2026 or - 2026-08-21
    name = name.replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/i, '');
    name = name.replace(/\s*-\s*\d{4}-\d{2}-\d{2}\s*$/i, '');

    // Remove trailing status in parentheses if present e.g. (cho_duyet)
    name = name.replace(/\s*\([^)]*\)\s*$/i, '');

    return name.trim();
}

function updateNameFromSelectedTask() {
    const nameInput = document.getElementById('iptCollectionName');
    const selTask = document.getElementById('selCollectionTask');
    if (!nameInput || !selTask) return;

    if (_bsutData.activeMode !== 'task_linked') return;

    const taskId = selTask.value;
    if (!taskId) {
        nameInput.value = '';
        return;
    }

    const task = (_bsutData.eligibleTasks || []).find(t => String(t.id) === String(taskId));
    if (task) {
        nameInput.value = extractCollectionNameFromTask(task);
    } else {
        const selectedOpt = selTask.options[selTask.selectedIndex];
        if (selectedOpt && selectedOpt.text) {
            nameInput.value = extractCollectionNameFromTask({ title: selectedOpt.text });
        }
    }
}

function populateEligibleTaskSelect(tasks) {
    const sel = document.getElementById('selCollectionTask');
    if (!sel) return;

    if (!tasks || tasks.length === 0) {
        sel.innerHTML = `<option value="">-- Không tìm thấy mã công việc Tư Liệu 2 nào --</option>`;
        updateNameFromSelectedTask();
        return;
    }

    sel.innerHTML = `<option value="">-- Chọn mã công việc Tư Liệu 2 --</option>` +
        tasks.map(t => `<option value="${t.id}">${t.cv_code} - ${escapeHtml(t.title)} (${t.status})</option>`).join('');

    updateNameFromSelectedTask();
}

function selectCollectionMode(mode) {
    _bsutData.activeMode = mode;
    const cardTask = document.getElementById('optCardTaskLinked');
    const cardFree = document.getElementById('optCardFree');
    const radTask = document.getElementById('radModeTaskLinked');
    const radFree = document.getElementById('radModeFree');
    const boxTaskSelect = document.getElementById('boxSelectTaskLinked');
    const nameInput = document.getElementById('iptCollectionName');

    if (mode === 'task_linked') {
        if (cardTask) { cardTask.style.borderColor = '#4338ca'; cardTask.style.background = '#eef2ff'; }
        if (cardFree) { cardFree.style.borderColor = '#cbd5e1'; cardFree.style.background = 'white'; }
        if (radTask) radTask.checked = true;
        if (boxTaskSelect) boxTaskSelect.style.display = 'block';

        if (nameInput) {
            nameInput.readOnly = true;
            nameInput.style.backgroundColor = '#f1f5f9';
            nameInput.style.color = '#64748b';
            nameInput.style.cursor = 'not-allowed';
            nameInput.style.borderColor = '#cbd5e1';
            nameInput.placeholder = 'Tên BST sẽ tự động điền theo Mã công việc được chọn...';
            updateNameFromSelectedTask();
        }
    } else {
        if (cardTask) { cardTask.style.borderColor = '#cbd5e1'; cardTask.style.background = 'white'; }
        if (cardFree) { cardFree.style.borderColor = '#4338ca'; cardFree.style.background = '#eef2ff'; }
        if (radFree) radFree.checked = true;
        if (boxTaskSelect) boxTaskSelect.style.display = 'none';

        if (nameInput) {
            nameInput.readOnly = false;
            nameInput.style.backgroundColor = '#ffffff';
            nameInput.style.color = '#0f172a';
            nameInput.style.cursor = 'text';
            nameInput.style.borderColor = '#cbd5e1';
            nameInput.placeholder = 'Ví dụ: BST Áo Nhóm Mùa Hè 2026...';
        }
    }
}

function toggleCoBotay(hasCo) {
    _bsutData.formState.hasCoBotay = hasCo;
    const yesBtn = document.getElementById('toggleCoBotay_yes');
    const noBtn = document.getElementById('toggleCoBotay_no');
    const filesBox = document.getElementById('boxCoBotayFiles');

    if (hasCo) {
        if (yesBtn) { yesBtn.style.borderColor = '#22c55e'; yesBtn.style.background = '#dcfce7'; yesBtn.style.color = '#166534'; }
        if (noBtn) { noBtn.style.borderColor = '#e2e8f0'; noBtn.style.background = 'white'; noBtn.style.color = '#94a3b8'; }
        if (filesBox) filesBox.style.display = 'flex';
    } else {
        if (yesBtn) { yesBtn.style.borderColor = '#e2e8f0'; yesBtn.style.background = 'white'; yesBtn.style.color = '#94a3b8'; }
        if (noBtn) { noBtn.style.borderColor = '#ef4444'; noBtn.style.background = '#fef2f2'; noBtn.style.color = '#dc2626'; }
        if (filesBox) filesBox.style.display = 'none';
        // Clear uploaded files
        _bsutData.formState.market_co_botay = { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] };
        const prevImg = document.getElementById('prev_market_co_botay_img');
        const prevPdf = document.getElementById('prev_market_co_botay_pdf');
        if (prevImg) prevImg.innerHTML = '';
        if (prevPdf) prevPdf.innerHTML = '';
        _bsutUpdatePairBadge('market_co_botay');
    }
}

function btnOpenCreateCollectionModal() {
    _bsutData.editingId = null;

    const modal = document.getElementById('modalCreateCollection');
    if (modal) {
        const headerTitle = modal.querySelector('h3');
        if (headerTitle) headerTitle.innerText = 'Tạo Bộ Sưu Tập Mới';
        const btnSubmit = document.getElementById('btnSubmitCollection');
        if (btnSubmit) btnSubmit.innerHTML = '<span>💾</span> Lưu Bộ Sưu Tập';
    }

    _bsutData.formState = {
        cover_image_url: '',
        hasCoBotay: true,
        market_mau: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        market_co_botay: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        phieu_ban_don: { image_urls: [], pdf_urls: [], original_image_urls: [], original_pdf_urls: [] },
        thong_so_mau_ao: { image_urls: [], original_image_urls: [] },
        chup_anh_mau_bst: []
    };
    
    // Reset cover image preview
    const coverPreview = document.getElementById('coverImagePreview');
    const coverPlaceholder = document.getElementById('coverImagePlaceholder');
    if (coverPreview) { coverPreview.style.display = 'none'; coverPreview.src = ''; }
    if (coverPlaceholder) coverPlaceholder.style.display = 'block';

    ['market_mau_img', 'market_mau_pdf', 'market_co_botay_img', 'market_co_botay_pdf', 'phieu_ban_don_img', 'phieu_ban_don_pdf', 'thong_so_mau_ao_img'].forEach(id => {
        const el = document.getElementById('prev_' + id);
        if (el) el.innerHTML = '';
    });

    ['market_mau', 'market_co_botay', 'phieu_ban_don', 'thong_so_mau_ao'].forEach(groupKey => {
        _bsutUpdatePairBadge(groupKey);
    });

    const prevChup = document.getElementById('prev_chup_anh_mau_bst');
    if (prevChup) prevChup.innerHTML = '';

    // Reset Cổ / Bo Tay toggle to "Có"
    toggleCoBotay(true);
    // Reset form inputs
    const giaInput = document.getElementById('txtGiaSanPham');
    if (giaInput) giaInput.value = '';
    const selTask = document.getElementById('selCollectionTask');
    if (selTask) selTask.value = '';

    // Reset mode to task_linked by default and lock name input
    selectCollectionMode('task_linked');

    if (modal) modal.style.display = 'flex';
}

function closeModalCreateCollection() {
    _bsutData.editingId = null;
    const modal = document.getElementById('modalCreateCollection');
    if (modal) modal.style.display = 'none';
}

async function uploadCoverImage(inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const boxEl = document.getElementById('boxCoverImage');
    const previewEl = document.getElementById('coverImagePreview');
    const placeholderEl = document.getElementById('coverImagePlaceholder');
    
    if (placeholderEl) placeholderEl.innerHTML = '<div style="font-size:12px;color:#4338ca;font-weight:700;">⏳ Đang tải...</div>';

    try {
        const res = await fetch('/api/collections/upload-file', {
            method: 'POST',
            headers: _bsutGetAuthHeaders(),
            credentials: 'include',
            body: formData
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Lỗi upload');

        _bsutData.formState.cover_image_url = data.url;

        if (previewEl) {
            previewEl.src = data.url;
            previewEl.style.display = 'block';
        }
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (boxEl) {
            boxEl.style.borderStyle = 'solid';
            boxEl.style.borderColor = '#10b981';
        }
    } catch(e) {
        alert('Lỗi upload ảnh đại diện: ' + e.message);
        if (placeholderEl) {
            placeholderEl.style.display = 'block';
            placeholderEl.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 8px; opacity: 0.6;">🖼️</div>
                <div style="font-size: 12px; font-weight: 700; color: #4338ca;">Click để chọn</div>
                <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Ảnh đại diện BST</div>
            `;
        }
    }
    inputEl.value = '';
}

async function uploadCollectionFiles(inputEl, groupKey, propKey) {
    if (!inputEl.files || inputEl.files.length === 0) return;
    const files = Array.from(inputEl.files);
    const isImage = propKey === 'image_urls';
    
    const prevEl = document.getElementById(`prev_${groupKey}_${isImage ? 'img' : 'pdf'}`);
    let statusDiv = document.getElementById(`upload_status_${groupKey}_${propKey}`);
    if (!statusDiv && prevEl) {
        statusDiv = document.createElement('div');
        statusDiv.id = `upload_status_${groupKey}_${propKey}`;
        statusDiv.style.cssText = 'font-size:12px;color:#2563eb;font-weight:600;margin-top:4px';
        prevEl.appendChild(statusDiv);
    }
    if (statusDiv) statusDiv.innerHTML = '⏳ Đang tải file lên...';

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/collections/upload-file', {
                method: 'POST',
                headers: _bsutGetAuthHeaders(),
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (data.ok && data.url) {
                if (!_bsutData.formState[groupKey][propKey]) {
                    _bsutData.formState[groupKey][propKey] = [];
                }
                _bsutData.formState[groupKey][propKey].push(data.url);

                const origKey = isImage ? 'original_image_urls' : 'original_pdf_urls';
                if (!_bsutData.formState[groupKey][origKey]) {
                    _bsutData.formState[groupKey][origKey] = [];
                }
                _bsutData.formState[groupKey][origKey].push(data.original_url || data.url);

                // Store original filename for display
                const fnKey = isImage ? '_img_filenames' : '_pdf_filenames';
                if (!_bsutData.formState[groupKey][fnKey]) {
                    _bsutData.formState[groupKey][fnKey] = [];
                }
                _bsutData.formState[groupKey][fnKey].push(data.filename || file.name || 'file');
            } else {
                alert('Lỗi upload file: ' + (data.error || 'Thất bại'));
            }
        } catch(e) {
            alert('Lỗi upload file: ' + e.message);
        }
    }

    if (statusDiv) statusDiv.remove();
    inputEl.value = '';
    _bsutRenderGroupFilesPreview(groupKey, propKey);
    ['market_mau', 'market_co_botay', 'phieu_ban_don', 'thong_so_mau_ao'].forEach(gk => {
        _bsutUpdatePairBadge(gk);
    });
}

function _bsutRenderGroupFilesPreview(groupKey, propKey) {
    const isImage = propKey === 'image_urls';
    const prevEl = document.getElementById(`prev_${groupKey}_${isImage ? 'img' : 'pdf'}`);
    if (!prevEl) return;

    const urls = (_bsutData.formState[groupKey] && _bsutData.formState[groupKey][propKey]) || [];
    
    if (urls.length === 0) {
        prevEl.innerHTML = '';
        return;
    }

    let html = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
    urls.forEach((url, idx) => {
        if (isImage) {
            html += `<div style="position:relative;display:inline-block">
                <img src="${url}" style="height:50px;width:50px;object-fit:cover;border-radius:6px;border:1px solid #10b981">
                <button type="button" onclick="_bsutRemoveGroupFile('${groupKey}', '${propKey}', ${idx})" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border:none;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:10px;font-weight:bold;line-height:1;display:flex;align-items:center;justify-content:center" title="Xóa file này">✕</button>
            </div>`;
        } else {
            const fnKey = '_pdf_filenames';
            const storedNames = (_bsutData.formState[groupKey] && _bsutData.formState[groupKey][fnKey]) || [];
            const fileName = storedNames[idx] || url.split('/').pop() || 'PDF';
            html += `<div style="display:inline-flex;align-items:center;gap:4px;background:#eef2ff;border:1px solid #c7d2fe;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;color:#3730a3">
                📄 <a href="${url}" target="_blank" style="color:#3730a3;text-decoration:none">${escapeHtml(fileName)}</a>
                <button type="button" onclick="_bsutRemoveGroupFile('${groupKey}', '${propKey}', ${idx})" style="background:transparent;color:#ef4444;border:none;cursor:pointer;font-weight:bold;font-size:12px;margin-left:2px" title="Xóa file này">✕</button>
            </div>`;
        }
    });
    html += '</div>';
    prevEl.innerHTML = html;
}

function _bsutRemoveGroupFile(groupKey, propKey, idx) {
    if (_bsutData.formState[groupKey] && _bsutData.formState[groupKey][propKey]) {
        _bsutData.formState[groupKey][propKey].splice(idx, 1);
        const isImage = propKey === 'image_urls';
        const origKey = isImage ? 'original_image_urls' : 'original_pdf_urls';
        if (_bsutData.formState[groupKey][origKey]) {
            _bsutData.formState[groupKey][origKey].splice(idx, 1);
        }
        const fnKey = isImage ? '_img_filenames' : '_pdf_filenames';
        if (_bsutData.formState[groupKey][fnKey]) {
            _bsutData.formState[groupKey][fnKey].splice(idx, 1);
        }
        _bsutRenderGroupFilesPreview(groupKey, propKey);
        ['market_mau', 'market_co_botay', 'phieu_ban_don', 'thong_so_mau_ao'].forEach(gk => {
            _bsutUpdatePairBadge(gk);
        });
    }
}

function _bsutUpdatePairBadge(groupKey) {
    const badgeEl = document.getElementById(`badge_${groupKey}_pair`);
    if (!badgeEl) return;

    const getImgCount = (gk) => {
        const g = _bsutData.formState[gk] || {};
        return (Array.isArray(g.image_urls) && g.image_urls.length > 0) ? g.image_urls.length : (g.image_url ? 1 : 0);
    };

    const getPdfCount = (gk) => {
        const g = _bsutData.formState[gk] || {};
        return (Array.isArray(g.pdf_urls) && g.pdf_urls.length > 0) ? g.pdf_urls.length : (g.pdf_url ? 1 : 0);
    };

    const mmImgCount = getImgCount('market_mau');
    const mmPdfCount = getPdfCount('market_mau');
    const targetN = mmImgCount;

    const curImgCount = getImgCount(groupKey);
    const curPdfCount = getPdfCount(groupKey);

    if (groupKey === 'market_mau') {
        if (curImgCount === 0 && curPdfCount === 0) {
            badgeEl.className = 'bcv-pair-badge empty';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = '⚠️ Chưa tải file nào (Bắt buộc ít nhất 1 cặp Ảnh + PDF để làm mốc N)';
        } else if (curImgCount === curPdfCount) {
            badgeEl.className = 'bcv-pair-badge matched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🟢 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF (Mốc mốc chuẩn N = ${curImgCount})`;
        } else {
            badgeEl.className = 'bcv-pair-badge mismatched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🔴 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF — Lệch Ảnh và PDF trong Mục 3`;
        }
    } else if (groupKey === 'market_co_botay') {
        if (curImgCount === 0 && curPdfCount === 0) {
            badgeEl.className = 'bcv-pair-badge empty';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = '⚠️ Chưa tải file nào (Bắt buộc ít nhất 1 cặp Ảnh + PDF)';
        } else if (curImgCount === curPdfCount) {
            badgeEl.className = 'bcv-pair-badge matched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🟢 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF (Đã khớp số lượng độc lập)`;
        } else {
            badgeEl.className = 'bcv-pair-badge mismatched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🔴 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF — ${curImgCount > curPdfCount ? `Cần tải thêm ${curImgCount - curPdfCount} file PDF` : `Cần tải thêm ${curPdfCount - curImgCount} file Ảnh`}`;
        }
    } else if (groupKey === 'phieu_ban_don') {
        if (targetN === 0) {
            badgeEl.className = 'bcv-pair-badge empty';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = '⏳ Đang chờ xác định mốc N từ Mục 3 (Market Mẫu)...';
        } else if (curImgCount === targetN && curPdfCount === targetN) {
            badgeEl.className = 'bcv-pair-badge matched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🟢 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF (Đã khớp chuẩn N = ${targetN} với Market Mẫu)`;
        } else {
            badgeEl.className = 'bcv-pair-badge mismatched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🔴 Đã tải: ${curImgCount} Ảnh | ${curPdfCount} PDF (Lệch mốc N = ${targetN}! Cần đúng ${targetN} Ảnh & ${targetN} PDF)`;
        }
    } else if (groupKey === 'thong_so_mau_ao') {
        if (targetN === 0) {
            badgeEl.className = 'bcv-pair-badge empty';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = '⏳ Đang chờ xác định mốc N từ Mục 3 (Market Mẫu)...';
        } else if (curImgCount === targetN) {
            badgeEl.className = 'bcv-pair-badge matched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🟢 Đã tải: ${curImgCount} Ảnh (Đã khớp chuẩn N = ${targetN} với Market Mẫu)`;
        } else {
            badgeEl.className = 'bcv-pair-badge mismatched';
            badgeEl.style.cssText = 'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;display:inline-flex;align-items:center;gap:4px;margin-top:8px';
            badgeEl.innerHTML = `🔴 Đã tải: ${curImgCount} Ảnh (Lệch mốc N = ${targetN}! Cần đúng ${targetN} Ảnh)`;
        }
    }
}

async function uploadSingleFile(inputEl, groupKey, fileProp) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];

    const formData = new FormData();
    formData.append('file', file);

    const prevEl = document.getElementById(`prev_${groupKey}_${fileProp === 'image_url' ? 'img' : 'pdf'}`);
    if (prevEl) prevEl.innerHTML = '⏳ Đang tải lên...';

    try {
        const res = await fetch('/api/collections/upload-file', {
            method: 'POST',
            headers: _bsutGetAuthHeaders(),
            credentials: 'include',
            body: formData
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Lỗi upload');

        _bsutData.formState[groupKey][fileProp] = data.url;
        _bsutData.formState[groupKey]['original_' + fileProp] = data.original_url || data.url;

        if (prevEl) {
            if (fileProp === 'image_url') {
                prevEl.innerHTML = `<img src="${data.url}" style="height: 50px; border-radius: 6px; margin-top: 4px; border: 1px solid #10b981;">`;
            } else {
                prevEl.innerHTML = `✅ <a href="${data.url}" target="_blank" style="color: #4338ca; font-weight: 600;">Xem PDF</a>`;
            }
        }
    } catch(e) {
        alert('Lỗi upload file: ' + e.message);
        if (prevEl) prevEl.innerHTML = `<span style="color: #ef4444;">❌ Thất bại</span>`;
    }
}

async function uploadMultipleImages(inputEl) {
    if (!inputEl.files || inputEl.files.length === 0) return;
    const files = Array.from(inputEl.files);
    const prevEl = document.getElementById('prev_chup_anh_mau_bst');

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/collections/upload-file', {
                method: 'POST',
                headers: _bsutGetAuthHeaders(),
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (data.ok) {
                _bsutData.formState.chup_anh_mau_bst.push({
                    url: data.url,
                    original_url: data.original_url || data.url
                });
                if (prevEl) {
                    const img = document.createElement('img');
                    img.src = data.url;
                    img.style.cssText = 'height: 45px; width: 45px; object-fit: cover; border-radius: 6px; border: 1px solid #10b981;';
                    prevEl.appendChild(img);
                }
            }
        } catch(e){}
    }
}

async function handlePasteBanGiaoMaket(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            const formData = new FormData();
            formData.append('file', file);

            const prevEl = document.getElementById('prev_ban_giao_maket');
            if (prevEl) prevEl.innerHTML = '⏳ Đang tải ảnh từ Clipboard...';

            try {
                const res = await fetch('/api/collections/upload-file', {
                    method: 'POST',
                    headers: _bsutGetAuthHeaders(),
                    credentials: 'include',
                    body: formData
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);

                _bsutData.formState.ban_giao_maket.image_url = data.url;
                _bsutData.formState.ban_giao_maket.original_image_url = data.original_url || data.url;
                if (prevEl) {
                    prevEl.innerHTML = `<img src="${data.url}" style="max-height: 120px; border-radius: 8px; border: 2px solid #10b981;">`;
                }
            } catch(err) {
                alert('Lỗi khi dán ảnh: ' + err.message);
            }
            break;
        }
    }
}

async function submitCreateCollection() {
    const name = (document.getElementById('iptCollectionName').value || '').trim();
    const linh_vuc = (document.getElementById('selCollectionLinhVuc')?.value || '').trim();
    const release_date = document.getElementById('iptCollectionReleaseDate').value;
    const task_id = document.getElementById('selCollectionTask').value;
    const gia_san_pham = (document.getElementById('txtGiaSanPham').value || '').trim();

    if (!name) return alert('Vui lòng nhập Tên Bộ Sưu Tập!');
    if (!linh_vuc) return alert('Vui lòng chọn Lĩnh Vực cho Bộ Sưu Tập! (Bắt buộc)');
    if (!release_date) return alert('Vui lòng chọn Ngày ra Bộ Sưu Tập!');

    // Validate cover image
    if (!_bsutData.formState.cover_image_url) {
        return alert('Vui lòng chọn Ảnh Đại Diện cho Bộ Sưu Tập! (Bắt buộc)');
    }

    if (_bsutData.activeMode === 'task_linked' && !task_id) {
        return alert('Ở Chế độ 1, bạn bắt buộc phải chọn 1 mã công việc thuộc Tư Liệu 2!');
    }

    const parseFormUrls = (groupKey, propKey) => {
        const group = _bsutData.formState[groupKey] || {};
        if (Array.isArray(group[propKey]) && group[propKey].length > 0) {
            return group[propKey].filter(Boolean);
        }
        const singleKey = propKey === 'image_urls' ? 'image_url' : 'pdf_url';
        if (group[singleKey]) return [group[singleKey]];
        return [];
    };

    // Section 3 Benchmark N
    const mmImgUrls = parseFormUrls('market_mau', 'image_urls');
    const mmPdfUrls = parseFormUrls('market_mau', 'pdf_urls');

    if (mmImgUrls.length === 0 || mmPdfUrls.length === 0) {
        return alert('Mục 3 (Market Mẫu) bắt buộc phải có ít nhất 1 file Hình Ảnh và 1 file PDF!');
    }
    if (mmImgUrls.length !== mmPdfUrls.length) {
        return alert(`Mục 3 (Market Mẫu): Số lượng file Hình Ảnh (${mmImgUrls.length}) và file PDF (${mmPdfUrls.length}) phải bằng nhau!`);
    }

    const targetN = mmImgUrls.length; // Target benchmark N from Section 3!

    // Section 4 - Only validate if user selected "Có Cổ / Bo Tay"
    if (_bsutData.formState.hasCoBotay) {
        const mcImgUrls = parseFormUrls('market_co_botay', 'image_urls');
        const mcPdfUrls = parseFormUrls('market_co_botay', 'pdf_urls');
        if (mcImgUrls.length === 0 || mcPdfUrls.length === 0) {
            return alert('Mục 4 (Market Cổ / Bo Tay): Bạn đã chọn "Có Cổ / Bo Tay" nên bắt buộc phải tải ít nhất 1 file Hình Ảnh và 1 file PDF!');
        }
        if (mcImgUrls.length !== mcPdfUrls.length) {
            return alert(`Mục 4 (Market Cổ / Bo Tay): Số lượng file Hình Ảnh (${mcImgUrls.length}) và file PDF (${mcPdfUrls.length}) phải bằng nhau!`);
        }
    }

    // Section 5 - Must match N!
    const pbImgUrls = parseFormUrls('phieu_ban_don', 'image_urls');
    const pbPdfUrls = parseFormUrls('phieu_ban_don', 'pdf_urls');
    if (pbImgUrls.length !== targetN || pbPdfUrls.length !== targetN) {
        return alert(`Mục 5 (Phiếu Bắn Đơn): Bắt buộc phải có đúng ${targetN} file Hình Ảnh và ${targetN} file PDF để khớp với Mục 3 (Market Mẫu)! (Hiện tại: ${pbImgUrls.length} Ảnh, ${pbPdfUrls.length} PDF)`);
    }

    // Section 6 - Must match N!
    const tsImgUrls = parseFormUrls('thong_so_mau_ao', 'image_urls');
    if (tsImgUrls.length !== targetN) {
        return alert(`Mục 6 (Thông Số Mẫu Áo): Bắt buộc phải có đúng ${targetN} file Hình Ảnh để khớp với Mục 3 (Market Mẫu)! (Hiện tại: ${tsImgUrls.length} Ảnh)`);
    }

    if (!gia_san_pham) {
        return alert('Mục 7 (Giá Sản Phẩm) không được để trống!');
    }

    const payload = {
        name,
        linh_vuc,
        release_date,
        cover_image: _bsutData.formState.cover_image_url,
        created_mode: _bsutData.activeMode,
        task_id: _bsutData.activeMode === 'task_linked' ? Number(task_id) : null,
        market_mau: _bsutData.formState.market_mau,
        market_co_botay: _bsutData.formState.market_co_botay,
        phieu_ban_don: _bsutData.formState.phieu_ban_don,
        thong_so_mau_ao: _bsutData.formState.thong_so_mau_ao,
        chup_anh_mau_bst: _bsutData.formState.chup_anh_mau_bst,
        gia_san_pham
    };

    const isEditing = !!_bsutData.editingId;
    const apiUrl = isEditing ? `/api/collections/${_bsutData.editingId}` : '/api/collections';
    const apiMethod = isEditing ? 'PUT' : 'POST';

    const btn = document.getElementById('btnSubmitCollection');
    if (btn) { btn.disabled = true; btn.innerText = isEditing ? '⏳ Đang cập nhật...' : '⏳ Đang lưu...'; }

    try {
        const res = await _bsutApi(apiUrl, apiMethod, payload);
        if (!res.ok) throw new Error(res.error || 'Thất bại');

        alert(isEditing ? '🎉 Cập nhật Bộ Sưu Tập thành công!' : '🎉 Lưu Bộ Sưu Tập thành công!');
        closeModalCreateCollection();
        await loadBosuutapData();
    } catch(e) {
        alert('❌ Lỗi khi lưu Bộ Sưu Tập: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = isEditing ? '💾 Cập Nhật Bộ Sưu Tập' : '💾 Lưu Bộ Sưu Tập'; }
    }
}

function viewCollectionDetail(id) {
    const col = _bsutData.collections.find(x => x.id === id);
    if (!col) return;

    const modal = document.getElementById('modalViewCollectionDetail');
    const content = document.getElementById('viewCollectionContent');
    if (!modal || !content) return;

    const isCreator = window._currentUser && (
        (col.created_by && Number(window._currentUser.id) === Number(col.created_by)) ||
        (col.created_by_name && window._currentUser.full_name && col.created_by_name.trim() === window._currentUser.full_name.trim())
    );
    const isGiamDoc = window._currentUser && window._currentUser.role === 'giam_doc';
    const canEdit = isCreator || isGiamDoc;

    const isAssignor = isGiamDoc || (col.task_created_by && window._currentUser && (
        Number(window._currentUser.id) === Number(col.task_created_by) ||
        (col.task_created_by_name && window._currentUser.full_name && col.task_created_by_name.trim() === window._currentUser.full_name.trim())
    ));
    const canApproveCollection = isGiamDoc || isAssignor;

    const mm = typeof col.market_mau === 'string' ? JSON.parse(col.market_mau) : (col.market_mau || {});
    const mc = typeof col.market_co_botay === 'string' ? JSON.parse(col.market_co_botay) : (col.market_co_botay || {});
    const pb = typeof col.phieu_ban_don === 'string' ? JSON.parse(col.phieu_ban_don) : (col.phieu_ban_don || {});
    const ts = typeof col.thong_so_mau_ao === 'string' ? JSON.parse(col.thong_so_mau_ao) : (col.thong_so_mau_ao || {});

    const renderSectionFilesDetailHtml = (groupObj, titleText, badgeNumber, accentColor) => {
        const imgUrls = Array.isArray(groupObj.image_urls) && groupObj.image_urls.length > 0 
            ? groupObj.image_urls.filter(Boolean) 
            : (groupObj.image_url ? [groupObj.image_url] : []);

        const origImgUrls = Array.isArray(groupObj.original_image_urls) && groupObj.original_image_urls.length > 0
            ? groupObj.original_image_urls.filter(Boolean)
            : (groupObj.original_image_url ? [groupObj.original_image_url] : imgUrls);

        const pdfUrls = Array.isArray(groupObj.pdf_urls) && groupObj.pdf_urls.length > 0 
            ? groupObj.pdf_urls.filter(Boolean) 
            : (groupObj.pdf_url ? [groupObj.pdf_url] : []);

        const origPdfUrls = Array.isArray(groupObj.original_pdf_urls) && groupObj.original_pdf_urls.length > 0
            ? groupObj.original_pdf_urls.filter(Boolean)
            : (groupObj.original_pdf_url ? [groupObj.original_pdf_url] : pdfUrls);

        const imgFileNames = Array.isArray(groupObj._img_filenames) ? groupObj._img_filenames : [];
        const pdfFileNames = Array.isArray(groupObj._pdf_filenames) ? groupObj._pdf_filenames : [];

        let html = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="font-weight: 800; font-size: 13.5px; color: ${accentColor.title}; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid ${accentColor.border};">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: ${accentColor.badgeBg}; color: white; width: 24px; height: 24px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${badgeNumber}</span>
                        <span>${titleText}</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; background: white; padding: 2px 8px; border-radius: 12px; color: #64748b; border: 1px solid #e2e8f0;">${imgUrls.length} Ảnh | ${pdfUrls.length} PDF</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
        `;

        if (imgUrls.length > 0) {
            html += `<div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">🖼️ Hình Ảnh:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
            imgUrls.forEach((u, i) => {
                const origU = origImgUrls[i] || u;
                const origName = imgFileNames[i] || `Market_Anh_${i+1}.jpg`;
                html += `<div style="background: white; border: 1px solid #e2e8f0; padding: 6px; border-radius: 10px; text-align: center; display: inline-flex; flex-direction: column; align-items: center; gap: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.04); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <a href="${origU}" target="_blank" title="Bấm để mở xem ảnh HD gốc">
                        <img src="${u}" style="height: 85px; width: 110px; object-fit: cover; object-position: top center; border-radius: 6px; border: 1px solid #f1f5f9; background: #f8fafc;">
                    </a>
                    <a href="${origU}" download="${escapeHtml(origName)}" target="_blank" style="color: #4338ca; font-size: 11px; font-weight: 700; text-decoration: none; background: #eef2ff; padding: 3px 8px; border-radius: 6px; border: 1px solid #c7d2fe; display: flex; align-items: center; gap: 4px; width: 100%; justify-content: center;">
                        ⬇️ Tải Ảnh HD
                    </a>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (pdfUrls.length > 0) {
            html += `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">📄 File PDF:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">`;
            pdfUrls.forEach((u, i) => {
                const origU = origPdfUrls[i] || u;
                const origName = pdfFileNames[i] || `Market_File_${i+1}.pdf`;
                html += `<a href="${origU}" download="${escapeHtml(origName)}" target="_blank" style="color: #047857; font-weight: 700; font-size: 11.5px; background: #dcfce7; border: 1px solid #86efac; padding: 6px 12px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='#bbf7d0'" onmouseout="this.style.background='#dcfce7'">
                    📄 <span>${escapeHtml(origName)}</span> <span style="font-size: 10px; opacity: 0.8;">↗</span>
                </a>`;
            });
            html += `</div></div>`;
        }

        if (imgUrls.length === 0 && pdfUrls.length === 0) {
            html += `<div style="font-size: 12px; color: #94a3b8; font-style: italic; padding: 12px 0;">(Chưa tải file nào)</div>`;
        }

        html += `</div></div>`;
        return html;
    };

    const coverImg = col.cover_image || mm.image_url || (mm.image_urls && mm.image_urls[0]) || '';

    content.innerHTML = `
        <!-- Header Banner -->
        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
            <div style="display: flex; gap: 20px; align-items: flex-start;">
                ${coverImg ? `
                    <div style="width: 130px; height: 175px; border-radius: 14px; overflow: hidden; border: 2px solid #e2e8f0; box-shadow: 0 8px 20px rgba(0,0,0,0.1); flex-shrink: 0; background: #f8fafc;">
                        <img src="${coverImg}" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;">
                    </div>
                ` : ''}
                <div style="display: flex; flex-direction: column; justify-content: center; padding-top: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                        <span style="background: linear-gradient(135deg, #4338ca, #6366f1); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800;">✨ BST #${col.id}</span>
                        <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #fde68a;">🏢 ${escapeHtml(col.linh_vuc || 'Khác')}</span>
                        ${col.task_code ? `<span style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">📌 ${escapeHtml(col.task_code)}</span>` : ''}
                        ${col.is_approved ? `
                            <span style="background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; border: 1px solid #86efac; display: inline-flex; align-items: center; gap: 4px;">
                                🟢 ĐÃ DUYỆT BỘ SƯU TẬP
                            </span>
                        ` : `
                            <span style="background: #fff1f2; color: #e11d48; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #fecdd3; display: inline-flex; align-items: center; gap: 4px;">
                                ⏳ CHƯA DUYỆT BỘ SƯU TẬP
                            </span>
                        `}
                    </div>
                    <h2 style="margin: 6px 0 10px; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">${escapeHtml(col.name)}</h2>
                    <div style="display: flex; gap: 16px; font-size: 13px; color: #64748b; flex-wrap: wrap;">
                        <span style="background: #f1f5f9; padding: 5px 12px; border-radius: 8px; font-weight: 600; color: #334155;">📅 Ngày ra mắt: <b>${formatDate(col.release_date)}</b></span>
                        <span style="background: #f1f5f9; padding: 5px 12px; border-radius: 8px; font-weight: 600; color: #334155;">👤 Người tạo: <b>${escapeHtml(col.created_by_name || 'Hệ thống')}</b></span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                ${(!col.is_approved && canApproveCollection) ? `
                    <button onclick="approveCollectionItem(${col.id})" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 800; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        ✅ DUYỆT BỘ SƯU TẬP
                    </button>
                ` : ''}
                ${canEdit ? `
                    <button onclick="openEditCollectionModal(${col.id})" style="background: linear-gradient(135deg, #4338ca, #6366f1); color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        ✏️ Chỉnh Sửa
                    </button>
                ` : ''}
                <button onclick="document.getElementById('modalViewCollectionDetail').style.display='none'" style="background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 16px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: #64748b; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0';this.style.color='#0f172a'" onmouseout="this.style.background='#f1f5f9';this.style.color='#64748b'">✕</button>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Bộ tài liệu (Mục 3, 4, 5, 6 Grid 2x2) -->
            <div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <span>📁</span> BỘ TÀI LIỆU MAKET & THIẾT KẾ
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    <!-- 3. Market Mẫu -->
                    <div style="background: #fffbeb; padding: 16px; border-radius: 14px; border: 1px solid #fde68a; box-shadow: 0 2px 6px rgba(245,158,11,0.05);">
                        ${renderSectionFilesDetailHtml(mm, 'Market Mẫu (Mốc chuẩn N)', '3', { title: '#92400e', border: '#fde68a', badgeBg: 'linear-gradient(135deg,#f59e0b,#d97706)' })}
                    </div>
                    <!-- 4. Market Cổ / Bo -->
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 14px; border: 1px solid #bbf7d0; box-shadow: 0 2px 6px rgba(34,197,94,0.05);">
                        ${renderSectionFilesDetailHtml(mc, 'Market Cổ / Bo Tay', '4', { title: '#166534', border: '#bbf7d0', badgeBg: 'linear-gradient(135deg,#22c55e,#16a34a)' })}
                    </div>
                    <!-- 5. Phiếu Bắn Đơn -->
                    <div style="background: #eef2ff; padding: 16px; border-radius: 14px; border: 1px solid #c7d2fe; box-shadow: 0 2px 6px rgba(67,56,202,0.05);">
                        ${renderSectionFilesDetailHtml(pb, 'Phiếu Bắn Đơn', '5', { title: '#3730a3', border: '#c7d2fe', badgeBg: 'linear-gradient(135deg,#4338ca,#6366f1)' })}
                    </div>
                    <!-- 6. Thông Số Áo -->
                    <div style="background: #fdf4ff; padding: 16px; border-radius: 14px; border: 1px solid #e9d5ff; box-shadow: 0 2px 6px rgba(147,51,234,0.05);">
                        ${renderSectionFilesDetailHtml(ts, 'Thông Số Mẫu Áo', '6', { title: '#6b21a8', border: '#e9d5ff', badgeBg: 'linear-gradient(135deg,#9333ea,#7c3aed)' })}
                    </div>
                </div>
            </div>

            <!-- Giá Sản Phẩm (Mục 7) -->
            <div style="background: linear-gradient(135deg, #ffffec 0%, #fef3c7 100%); padding: 18px 22px; border-radius: 14px; border: 1px solid #fde68a; box-shadow: 0 2px 6px rgba(217,119,6,0.08);">
                <div style="font-weight: 800; font-size: 14px; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span style="background: #d97706; color: white; width: 24px; height: 24px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">7</span>
                    💰 Giá Sản Phẩm & Gợi Ý Chất Liệu:
                </div>
                <div style="font-size: 14px; color: #78350f; font-weight: 600; white-space: pre-wrap; line-height: 1.6; padding: 10px 14px; background: rgba(255,255,255,0.7); border-radius: 10px; border: 1px solid #fcd34d;">${escapeHtml(col.gia_san_pham || 'Chưa cập nhật')}</div>
            </div>

            <!-- Liên kết 9 & 10 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: #faf5ff; padding: 16px; border-radius: 14px; border: 1.5px dashed #d8b4fe; text-align: center; transition: all 0.2s;" onmouseover="this.style.borderColor='#a855f7'" onmouseout="this.style.borderColor='#d8b4fe'">
                    <div style="font-size: 22px; margin-bottom: 4px;">🔗</div>
                    <div style="font-size: 13.5px; font-weight: 800; color: #7c3aed;">9. Bàn Giao Maket cho BP. Thiết Kế</div>
                    <div style="font-size: 11.5px; color: #a78bfa; margin-top: 4px; font-weight: 600;">(Liên kết đang cấu hình)</div>
                </div>
                <div style="background: #fdf2f8; padding: 16px; border-radius: 14px; border: 1.5px dashed #f9a8d4; text-align: center; transition: all 0.2s;" onmouseover="this.style.borderColor='#ec4899'" onmouseout="this.style.borderColor='#f9a8d4'">
                    <div style="font-size: 22px; margin-bottom: 4px;">🤝</div>
                    <div style="font-size: 13.5px; font-weight: 800; color: #db2777;">10. Thông Tin Họp Với Sale</div>
                    <div style="font-size: 11.5px; color: #f472b6; margin-top: 4px; font-weight: 600;">(Liên kết đang cấu hình)</div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function openEditCollectionModal(id) {
    const col = _bsutData.collections.find(x => x.id === id);
    if (!col) return alert('Không tìm thấy Bộ Sưu Tập!');

    // Close detail modal first
    const detailModal = document.getElementById('modalViewCollectionDetail');
    if (detailModal) detailModal.style.display = 'none';

    _bsutData.editingId = id;

    // Open create collection modal in EDIT mode
    const modal = document.getElementById('modalCreateCollection');
    if (!modal) return;

    // Change title and button text
    const headerTitle = modal.querySelector('h3');
    if (headerTitle) headerTitle.innerText = `✏️ Chỉnh Sửa Bộ Sưu Tập #${id}`;

    const btnSubmit = document.getElementById('btnSubmitCollection');
    if (btnSubmit) btnSubmit.innerHTML = '<span>💾</span> Cập Nhật Bộ Sưu Tập';

    // Populate basic fields
    const iptName = document.getElementById('iptCollectionName');
    if (iptName) iptName.value = col.name || '';

    const selLinhVuc = document.getElementById('selCollectionLinhVuc');
    if (selLinhVuc) selLinhVuc.value = col.linh_vuc || '';

    const iptDate = document.getElementById('iptCollectionReleaseDate');
    if (iptDate) {
        const dStr = col.release_date ? new Date(col.release_date).toISOString().slice(0, 10) : '';
        iptDate.value = dStr;
    }

    const txtGia = document.getElementById('txtGiaSanPham');
    if (txtGia) txtGia.value = col.gia_san_pham || '';

    // Set mode
    const mode = col.created_mode === 'task_linked' ? 'task_linked' : 'free';
    selectCollectionMode(mode);

    if (mode === 'task_linked') {
        const selTask = document.getElementById('selCollectionTask');
        if (selTask) selTask.value = col.task_id || '';
        if (iptName) {
            iptName.readOnly = false;
            iptName.style.background = 'white';
            iptName.style.color = '#0f172a';
            iptName.style.cursor = 'text';
            iptName.value = col.name || '';
        }
    }

    // Parse JSON sections
    const mm = typeof col.market_mau === 'string' ? JSON.parse(col.market_mau) : (col.market_mau || {});
    const mc = typeof col.market_co_botay === 'string' ? JSON.parse(col.market_co_botay) : (col.market_co_botay || {});
    const pb = typeof col.phieu_ban_don === 'string' ? JSON.parse(col.phieu_ban_don) : (col.phieu_ban_don || {});
    const ts = typeof col.thong_so_mau_ao === 'string' ? JSON.parse(col.thong_so_mau_ao) : (col.thong_so_mau_ao || {});
    const chup = typeof col.chup_anh_mau_bst === 'string' ? JSON.parse(col.chup_anh_mau_bst) : (col.chup_anh_mau_bst || []);

    // Set formState
    _bsutData.formState.cover_image_url = col.cover_image || '';
    _bsutData.formState.hasCoBotay = (mc.image_urls && mc.image_urls.length > 0) || (mc.pdf_urls && mc.pdf_urls.length > 0) || !!mc.image_url || !!mc.pdf_url;
    _bsutData.formState.market_mau = mm;
    _bsutData.formState.market_co_botay = mc;
    _bsutData.formState.phieu_ban_don = pb;
    _bsutData.formState.thong_so_mau_ao = ts;
    _bsutData.formState.chup_anh_mau_bst = chup;

    // Cover image preview
    const coverPreview = document.getElementById('coverImagePreview');
    const coverPlaceholder = document.getElementById('coverImagePlaceholder');
    if (col.cover_image && coverPreview) {
        coverPreview.src = col.cover_image;
        coverPreview.style.display = 'block';
        if (coverPlaceholder) coverPlaceholder.style.display = 'none';
    } else {
        if (coverPreview) coverPreview.style.display = 'none';
        if (coverPlaceholder) coverPlaceholder.style.display = 'block';
    }

    // Set Bo Tay toggle choice
    toggleCoBotay(_bsutData.formState.hasCoBotay);

    // Render group file previews
    ['market_mau', 'market_co_botay', 'phieu_ban_don', 'thong_so_mau_ao'].forEach(gk => {
        _bsutRenderGroupFilesPreview(gk, 'image_urls');
        _bsutRenderGroupFilesPreview(gk, 'pdf_urls');
        _bsutUpdatePairBadge(gk);
    });

    modal.style.display = 'flex';
}

async function deleteCollectionItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa Bộ Sưu Tập này?')) return;
    try {
        const res = await _bsutApi('/api/collections/' + id, 'DELETE');
        if (!res.ok) throw new Error(res.error || 'Xóa thất bại');
        alert('Xóa Bộ Sưu Tập thành công!');
        await loadBosuutapData();
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

function formatDate(dStr) {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function approveCollectionItem(id) {
    if (!confirm('Bạn có chắc chắn muốn Duyệt Bộ Sưu Tập này?')) return;
    try {
        const res = await _bsutApi('/api/collections/' + id + '/approve', 'PATCH');
        if (!res.ok) throw new Error(res.error || 'Duyệt thất bại');
        alert('🎉 Đã duyệt Bộ Sưu Tập thành công!');
        const modal = document.getElementById('modalViewCollectionDetail');
        if (modal) modal.style.display = 'none';
        await loadBosuutapData();
        viewCollectionDetail(id);
    } catch(e) {
        alert('❌ Lỗi khi duyệt Bộ Sưu Tập: ' + e.message);
    }
}
