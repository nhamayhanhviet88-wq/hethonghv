# Vietnam Timezone Convention

## Rule
**Mọi hiển thị thời gian trong hệ thống PHẢI dùng giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).**

## Frontend (public/js/app.js — Global)
Đã có sẵn các hàm global, dùng ở bất kỳ page JS nào:

```js
vnNow()           // → Date object giờ VN hiện tại
vnFormat(date)     // → "00:35 12/05/2026" (hiển thị cho user)
vnISOStr(date)     // → "2026-05-12T00:35" (cho input datetime-local)
vnDateStr(date)    // → "2026-05-12" (cho input date)
```

### Ví dụ dùng:
```js
// Hiển thị thời gian
'Cập nhật lúc: ' + vnFormat(row.updated_at)

// Input datetime-local mặc định giờ VN
'<input type="datetime-local" value="' + vnISOStr() + '">'

// So sánh ngày hôm nay (VN)
if (vnDateStr() === '2026-05-12') { ... }
```

## Backend (utils/timezone.js)
```js
const { vnNow, vnFormat, vnISOString, vnDateStr, vnTimeStr } = require('../utils/timezone');

vnNow()            // → Date object giờ VN
vnFormat(date)     // → "00:35 12/05/2026"
vnISOString(date)  // → "2026-05-12T00:35"
vnDateStr(date)    // → "2026-05-12"
vnTimeStr(date)    // → "00:35"
```

## ⚠️ KHÔNG được dùng:
- `new Date().toISOString()` → trả về UTC, SAI giờ VN
- `toLocaleString('vi-VN')` mà không có `timeZone: 'Asia/Ho_Chi_Minh'`
- `.getHours()` trực tiếp từ `new Date()` trên server (server có thể không chạy TZ=VN)

## Quy tắc cho code mới:
1. **Hiển thị → `vnFormat()`**
2. **Input datetime → `vnISOStr()`**  
3. **So sánh ngày → `vnDateStr()`**
4. **Lưu DB → giữ nguyên UTC** (PostgreSQL tự xử lý, chỉ convert khi hiển thị)
