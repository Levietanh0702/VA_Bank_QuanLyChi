// ===== Xử lý màn hình Dashboard chính =====

// Lấy thông tin phiên đăng nhập; nếu chưa đăng nhập thì quay lại login.html
const userSession = JSON.parse(sessionStorage.getItem("vabank_user") || "null");
if (!userSession) {
  window.location.href = "login.html";
}
const USER_ID = userSession?.userId;

const balanceValueEl = document.getElementById("balanceValue");
const greetingTextEl = document.getElementById("greetingText");

let currentSavingsGoal = 0; // cache lại để dùng khi mở modal Tiết kiệm

// ---------- Hàm chung: mở / đóng modal ----------
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    closeModal(e.target.closest(".modal-overlay").id);
  });
});

function setMsg(elId, text, type) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = "modal-msg" + (type ? " " + type : "");
}

// ---------- Tải & hiển thị số dư ----------
async function loadBalance() {
  try {
    const data = await apiFetch(`/wallet/balance?userId=${USER_ID}`);
    balanceValueEl.textContent = `${formatVND(data.totalBalance)} vnđ`;
    currentSavingsGoal = data.savingsGoal;
  } catch (err) {
    console.error(err);
  }
}

greetingTextEl.textContent = `Xin chào ${userSession?.fullName || userSession?.username || "user"}`;
loadBalance();

// ---------- Gắn sự kiện cho 6 nút chức năng ----------
document.querySelectorAll(".fn-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "deposit") openModal("modalDeposit");
    if (action === "pay") openModal("modalPay");
    if (action === "savings") {
      document.getElementById("savingsGoalInput").value = currentSavingsGoal || "";
      openModal("modalSavings");
    }
    if (action === "interest") openModal("modalInterest");
    if (action === "history") { openModal("modalHistory"); loadHistory(); }
    if (action === "stats") { openModal("modalStats"); loadStats(); }
  });
});

// ===== 1) THÊM TIỀN =====
document.getElementById("submitDeposit").addEventListener("click", async () => {
  const amount = Number(document.getElementById("depositAmount").value);
  const note = document.getElementById("depositNote").value.trim();
  setMsg("depositMsg", "", "");

  if (!amount || amount <= 0) {
    setMsg("depositMsg", "Vui lòng nhập số tiền hợp lệ.", "error");
    return;
  }

  try {
    await apiFetch("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ userId: USER_ID, amount, note }),
    });
    setMsg("depositMsg", "Nạp tiền thành công!", "success");
    await loadBalance();
    setTimeout(() => {
      closeModal("modalDeposit");
      document.getElementById("depositAmount").value = "";
      document.getElementById("depositNote").value = "";
      setMsg("depositMsg", "", "");
    }, 700);
  } catch (err) {
    setMsg("depositMsg", err.message, "error");
  }
});

// ===== 2) THANH TOÁN =====
document.getElementById("submitPay").addEventListener("click", async () => {
  const amount = Number(document.getElementById("payAmount").value);
  const category = document.getElementById("payCategory").value;
  const note = document.getElementById("payNote").value.trim();
  setMsg("payMsg", "", "");

  if (!amount || amount <= 0) {
    setMsg("payMsg", "Vui lòng nhập số tiền hợp lệ.", "error");
    return;
  }

  try {
    const data = await apiFetch("/wallet/pay", {
      method: "POST",
      body: JSON.stringify({ userId: USER_ID, amount, category, note }),
    });

    await loadBalance();

    if (data.isWarning) {
      setMsg("payMsg", data.warningMessage, "warning");
    } else {
      setMsg("payMsg", "Thanh toán thành công!", "success");
      setTimeout(() => {
        closeModal("modalPay");
        document.getElementById("payAmount").value = "";
        document.getElementById("payNote").value = "";
        setMsg("payMsg", "", "");
      }, 700);
    }
  } catch (err) {
    setMsg("payMsg", err.message, "error");
  }
});

// ===== 3) TIẾT KIỆM (đặt mục tiêu) =====
document.getElementById("submitSavings").addEventListener("click", async () => {
  const savingsGoal = Number(document.getElementById("savingsGoalInput").value) || 0;
  const savingsNote = document.getElementById("savingsNoteInput").value.trim();
  setMsg("savingsMsg", "", "");

  try {
    await apiFetch("/wallet/set-savings", {
      method: "POST",
      body: JSON.stringify({ userId: USER_ID, savingsGoal, savingsNote }),
    });
    currentSavingsGoal = savingsGoal;
    setMsg("savingsMsg", "Đã lưu mục tiêu tiết kiệm!", "success");
    setTimeout(() => closeModal("modalSavings"), 700);
  } catch (err) {
    setMsg("savingsMsg", err.message, "error");
  }
});

// ===== 4) SỐ DƯ MỚI (tính lãi tiết kiệm) =====
document.getElementById("submitInterest").addEventListener("click", async () => {
  setMsg("interestMsg", "Đang tính...", "");
  try {
    const data = await apiFetch("/wallet/savings-interest", {
      method: "POST",
      body: JSON.stringify({ userId: USER_ID }),
    });
    await loadBalance();
    setMsg(
      "interestMsg",
      `Đã cộng ${formatVND(data.interestAmount)} vnđ tiền lãi. Số dư mới: ${formatVND(data.newBalance)} vnđ.`,
      "success"
    );
  } catch (err) {
    setMsg("interestMsg", err.message, "error");
  }
});

// ===== 5) LỊCH SỬ GIAO DỊCH =====
async function loadHistory() {
  const listEl = document.getElementById("historyList");
  listEl.innerHTML = `<p class="empty-text">Đang tải...</p>`;
  try {
    const items = await apiFetch(`/transactions/history?userId=${USER_ID}`);
    if (!items.length) {
      listEl.innerHTML = `<p class="empty-text">Chưa có giao dịch nào.</p>`;
      return;
    }
    listEl.innerHTML = items
      .map((t) => {
        const isIncome = t.transactionType === "Income";
        const sign = isIncome ? "+" : "-";
        const cls = isIncome ? "income" : "expense";
        const date = new Date(t.createdDate).toLocaleString("vi-VN");
        return `
          <div class="history-item">
            <div>
              <div>${t.category}${t.note ? " — " + t.note : ""}</div>
              <div class="meta">${date}</div>
            </div>
            <div class="amount ${cls}">${sign}${formatVND(t.amount)} vnđ</div>
          </div>`;
      })
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="empty-text">${err.message}</p>`;
  }
}

// ===== 6) THỐNG KÊ (Chart.js) =====
let dailyChartInstance = null;
let categoryChartInstance = null;

async function loadStats() {
  try {
    const data = await apiFetch(`/transactions/stats?userId=${USER_ID}`);

    // --- Biểu đồ cột: chi tiêu theo ngày ---
    const dailyCtx = document.getElementById("dailyChart").getContext("2d");
    if (dailyChartInstance) dailyChartInstance.destroy();
    dailyChartInstance = new Chart(dailyCtx, {
      type: "bar",
      data: {
        labels: data.dailyStats.map((d) => d.date),
        datasets: [{
          label: "Chi tiêu (VNĐ)",
          data: data.dailyStats.map((d) => d.totalExpense),
          backgroundColor: "#9c3b7d",
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });

    // --- Biểu đồ tròn: tỉ lệ theo nhóm ---
    const catCtx = document.getElementById("categoryChart").getContext("2d");
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(catCtx, {
      type: "doughnut",
      data: {
        labels: data.categoryStats.map((c) => `${c.category} (${c.percent}%)`),
        datasets: [{
          data: data.categoryStats.map((c) => c.total),
          backgroundColor: ["#e8d16b", "#2244cc", "#3a2f9e", "#9c3b7d", "#dcdcdc"],
        }],
      },
      options: { responsive: true },
    });
  } catch (err) {
    console.error(err);
  }
}

// ===== Đăng xuất =====
document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("vabank_user");
  window.location.href = "login.html";
});

// ===== Xóa toàn bộ dữ liệu (yêu cầu xác nhận trước khi gọi API) =====
document.getElementById("btnReset").addEventListener("click", async () => {
  const confirmed = confirm(
    "Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử giao dịch và đưa số dư về 0? Hành động này không thể hoàn tác."
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/wallet/reset?userId=${USER_ID}`, { method: "DELETE" });
    alert("Đã xóa toàn bộ dữ liệu.");
    await loadBalance();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
});
