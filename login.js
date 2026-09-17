// ===== Xử lý màn hình Đăng nhập / Đăng ký =====

const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");
const btnLogin = document.getElementById("btnLogin");

const registerModal = document.getElementById("registerModal");
const btnRegister = document.getElementById("btnRegister");
const regCancel = document.getElementById("regCancel");
const regSubmit = document.getElementById("regSubmit");
const regErrorBox = document.getElementById("regErrorBox");

function showError(box, message) {
  box.textContent = message;
  box.style.display = "block";
}
function hideError(box) {
  box.style.display = "none";
}

// --- Đăng nhập ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(errorBox);

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showError(errorBox, "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Đang đăng nhập...";

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    // Lưu thông tin phiên đăng nhập vào sessionStorage để dashboard.js sử dụng
    sessionStorage.setItem("vabank_user", JSON.stringify(data));
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(errorBox, err.message);
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Đăng nhập";
  }
});

// --- Mở / đóng modal đăng ký ---
btnRegister.addEventListener("click", () => {
  hideError(regErrorBox);
  registerModal.style.display = "flex";
});
regCancel.addEventListener("click", () => {
  registerModal.style.display = "none";
});

// --- Gửi đăng ký ---
regSubmit.addEventListener("click", async () => {
  hideError(regErrorBox);

  const fullName = document.getElementById("regFullName").value.trim();
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!username || !password) {
    showError(regErrorBox, "Vui lòng nhập tên đăng nhập và mật khẩu.");
    return;
  }

  regSubmit.disabled = true;
  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, fullName }),
    });
    alert("Đăng ký thành công! Vui lòng đăng nhập.");
    registerModal.style.display = "none";
    document.getElementById("username").value = username;
  } catch (err) {
    showError(regErrorBox, err.message);
  } finally {
    regSubmit.disabled = false;
  }
});

// Nếu đã đăng nhập từ trước, chuyển thẳng vào dashboard
if (sessionStorage.getItem("vabank_user")) {
  window.location.href = "dashboard.html";
}
