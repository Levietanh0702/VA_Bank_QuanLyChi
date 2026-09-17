// ==== Cấu hình chung cho toàn bộ Frontend ====
// Đổi URL này nếu Backend chạy ở địa chỉ/cổng khác (mặc định ASP.NET Core dev: 5000/5001)
const API_URL = "https://floppy-guests-wait.loca.lt";

// Helper: gọi API bằng fetch, tự động parse JSON và ném lỗi nếu response không OK
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // Một số API (vd DELETE reset) có thể không trả JSON body
  }

  if (!res.ok) {
    const message = data?.message || `Lỗi ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// Format số tiền kiểu VNĐ: 1234567 -> "1.234.567"
function formatVND(amount) {
  return Number(amount || 0).toLocaleString("vi-VN");
}
