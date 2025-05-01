// script.js – perbaikan masalah login type

document.addEventListener("DOMContentLoaded", function () {
  const page = window.location.pathname.split("/").pop();
  switch (page) {
    case "login.html":
      initLogin();
      break;
    case "dashboard-admin.html":
      initAdminDashboard();
      break;
    case "dashboard-employee.html":
      initEmployeeDashboard();
      break;
    default:
      break;
  }
});

function initLogin() {
  // Inisialisasi tipe login dari URL atau default ke "pegawai"
  const urlParams = new URLSearchParams(window.location.search);
  let loginType = urlParams.get("type") || "pegawai";
  const loginTitle = document.getElementById("login-title");
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");
  const adminButton = document.getElementById("admin-toggle");
  const pegawaiButton = document.getElementById("pegawai-toggle");
  const container = document.getElementById("container");

  // Set judul login sesuai tipe dari URL
  updateLoginUI();

  // Event listeners untuk tombol toggle
  adminButton.addEventListener("click", function () {
    container.classList.add("active");
    loginType = "admin";
    updateLoginUI();
    updateLoginType("admin");
  });

  pegawaiButton.addEventListener("click", function () {
    container.classList.remove("active");
    loginType = "pegawai";
    updateLoginUI();
    updateLoginType("pegawai");
  });

  // Function untuk memperbarui tampilan UI berdasarkan tipe login
  function updateLoginUI() {
    loginTitle.textContent =
      loginType === "admin" ? "Login Admin" : "Login Pegawai";

    // Update tampilan container jika perlu
    if (loginType === "admin" && !container.classList.contains("active")) {
      container.classList.add("active");
    } else if (
      loginType === "pegawai" &&
      container.classList.contains("active")
    ) {
      container.classList.remove("active");
    }
  }

  // Function untuk mengupdate URL dengan tipe login
  function updateLoginType(type) {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set("type", type);
    window.history.pushState({}, "", currentUrl);
  }

  // Event listener untuk submit form
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Tentukan endpoint berdasarkan tipe login aktif
    const endpoint =
      loginType === "admin" ? "/api/login/admin" : "/api/login/pegawai";

    console.log("Login attempt as:", loginType, "to endpoint:", endpoint); // Debug

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        password,
        type: loginType, // Tambahkan tipe login ke body request
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          errorMessage.textContent = data.message;
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        errorMessage.textContent = "Terjadi kesalahan. Silakan coba lagi.";
      });
  });

  // Inisialisasi tampilan sesuai URL saat halaman pertama kali dimuat
  if (loginType === "admin") {
    container.classList.add("active");
  } else {
    container.classList.remove("active");
  }
}

function initAdminDashboard() {
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "/api/logout";
  });

  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      navItems.forEach((i) => i.classList.remove("active"));
      contentSections.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.target).classList.add("active");
      if (this.dataset.target === "employees") loadEmployees();
      else if (this.dataset.target === "attendance") loadAttendanceAdmin();
      else if (this.dataset.target === "leaves") loadLeaveRequests();
    });
  });

  document.getElementById("add-employee-btn").addEventListener("click", () => {
    document.getElementById("employee-form").reset();
    document.getElementById("employee-id").removeAttribute("data-edit");
    document.getElementById("employee-id").disabled = false; // agar ID bisa diubah
    document.getElementById("employee-form-container").style.display = "block";
  });

  document.querySelectorAll("#cancel-employee-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("employee-form-container").style.display = "none";
    });
  });

  document
    .getElementById("employee-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("employee-id").value.trim();
      const nama = document.getElementById("employee-nama").value;
      const jenis = document.getElementById("employee-jenis").value;
      const role = document.getElementById("employee-role").value;
      const password = document.getElementById("employee-password").value;

      const isEdit = document
        .getElementById("employee-id")
        .hasAttribute("data-edit");

      const endpoint = isEdit
        ? `/api/admin/employee/${id}`
        : "/api/admin/employee";
      const method = isEdit ? "PUT" : "POST";

      fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_pegawai: id,
          nama,
          jenis_pegawai: jenis,
          role,
          password,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            document.getElementById("employee-form-container").style.display =
              "none";
            loadEmployees();
          } else {
            alert(data.message);
          }
        })
        .catch((err) => console.error("Simpan pegawai gagal:", err));
    });

  loadEmployees();
}

function loadEmployees() {
  fetch("/api/admin/employees", { credentials: "include" })
    .then((res) => res.json())
    .then((result) => {
      console.log("📦 Hasil fetch:", result); // 🧪 debug hasil fetch

      const data = result.data; // ✅ tambahkan baris ini

      const tableBody = document.getElementById("employees-table-body");
      tableBody.innerHTML = "";

      data.forEach((emp) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                <td>${emp.id_pegawai}</td>
                <td>${emp.nama}</td>
                <td>${emp.jenis_pegawai}</td>
                <td>${emp.role}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${emp.id_pegawai}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${emp.id_pegawai}">Hapus</button>
                </td>
            `;
        tableBody.appendChild(row);
      });

      // tombol edit
      tableBody.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const emp = data.find((e) => e.id_pegawai == btn.dataset.id);
          document.getElementById("employee-id").value = emp.id_pegawai;
          document
            .getElementById("employee-id")
            .setAttribute("data-edit", "true");
          document.getElementById("employee-id").disabled = true; // jangan ubah ID saat edit
          document.getElementById("employee-nama").value = emp.nama;
          document.getElementById("employee-jenis").value = emp.jenis_pegawai;
          document.getElementById("employee-role").value = emp.role;
          document.getElementById("employee-password").value = "";
          document.getElementById("employee-form-container").style.display =
            "block";
        });
      });

      // tombol hapus
      tableBody.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (confirm("Yakin ingin menghapus pegawai ini?")) {
            fetch(`/api/admin/employee/${btn.dataset.id}`, {
              method: "DELETE",
              credentials: "include",
            })
              .then(() => loadEmployees())
              .catch(console.error);
          }
        });
      });
    })
    .catch((err) => console.error("Gagal load pegawai:", err));
}

function loadAttendanceAdmin() {
  fetch("/api/admin/attendance", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const list = data.data;
        const tableBody = document.getElementById("attendance-table-body");
        tableBody.innerHTML = "";
        list.forEach((rec) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${rec.nama}</td>
                    <td>${rec.jenis_pegawai}</td>
                    <td>${rec.role}</td>
                    <td>${rec.tanggal}</td>
                    <td>${rec.waktu_datang || "-"}</td>
                    <td>${rec.status_datang || "-"}</td>
                    <td>${rec.waktu_pulang || "-"}</td>
                    <td>${rec.status_pulang || "-"}</td>
                `;
          tableBody.appendChild(row);
        });
      }
    })
    .catch((err) => console.error("Gagal load presensi:", err));
}

function loadLeaveRequests() {
  fetch("/api/admin/leave", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const list = data.data;
        const tableBody = document.getElementById("leave-table-body");
        tableBody.innerHTML = "";
        list.forEach((req) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                    <td>${req.nama}</td>
                    <td>${req.jenis_pegawai}</td>
                    <td>${req.role}</td>
                    <td>${req.kategori}</td>
                    <td>${req.tanggal_mulai}</td>
                    <td>${req.tanggal_selesai}</td>
                    <td>${req.status_verifikasi}</td>
                    <td>
                        <button class="btn btn-sm btn-success verify-btn" data-id="${req.id}" data-status="approved">Approve</button>
                        <button class="btn btn-sm btn-danger verify-btn" data-id="${req.id}" data-status="rejected">Reject</button>
                    </td>
                `;
          tableBody.appendChild(row);
        });

        tableBody.querySelectorAll(".verify-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            fetch(`/api/admin/leave/${btn.dataset.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ status_verifikasi: btn.dataset.status }),
            })
              .then(() => loadLeaveRequests())
              .catch(console.error);
          });
        });
      }
    })
    .catch((err) => console.error("Gagal load izin:", err));
}

function initEmployeeDashboard() {
  fetch("/api/user", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("user-name").textContent = data.user.nama;
      }
    });

  document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "/api/logout";
  });

  const today = new Date();
  document.getElementById("current-date").textContent = today
    .toISOString()
    .split("T")[0];

  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      navItems.forEach((i) => i.classList.remove("active"));
      contentSections.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.target).classList.add("active");
      if (this.dataset.target === "attendance") loadTodayAttendance();
      else if (this.dataset.target === "leaves") loadLeaveHistory();
    });
  });

  document
    .getElementById("password-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const currentPassword = document.getElementById("current-password").value;
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      const messageElement = document.getElementById("password-message");

      if (newPassword !== confirmPassword) {
        messageElement.textContent = "Password baru dan konfirmasi tidak cocok";
        return;
      }

      fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
        .then((res) => res.json())
        .then((data) => {
          messageElement.textContent = data.message;
        })
        .catch((err) => console.error("Gagal ganti password:", err));
    });

  function loadTodayAttendance() {
    fetch("/api/attendance/today", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const att = data.data;
          document.getElementById("in-status").textContent =
            att.status_datang || "-";
          document.getElementById("in-time").textContent =
            att.waktu_datang || "-";
          document.getElementById("out-status").textContent =
            att.status_pulang || "-";
          document.getElementById("out-time").textContent =
            att.waktu_pulang || "-";
          document.getElementById("check-in-btn").disabled = !!att.waktu_datang;
          document.getElementById("check-out-btn").disabled =
            !att.waktu_datang || !!att.waktu_pulang;
        }
      });
  }

  document.getElementById("check-in-btn").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ latitude, longitude }),
          })
            .then((res) => res.json())
            .then((data) => {
              alert(data.message);
              loadTodayAttendance();
            });
        },
        (error) => {
          alert("Gagal mendapatkan lokasi. Aktifkan GPS Anda.");
        }
      );
    } else {
      alert("Geolocation tidak didukung di browser ini.");
    }
  });

  document.getElementById("check-out-btn").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          fetch("/api/attendance/check-out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ latitude, longitude }),
          })
            .then((res) => res.json())
            .then((data) => {
              alert(data.message);
              loadTodayAttendance();
            });
        },
        (error) => {
          alert("Gagal mendapatkan lokasi. Aktifkan GPS Anda.");
        }
      );
    } else {
      alert("Geolocation tidak didukung di browser ini.");
    }
  });

  document
    .getElementById("leave-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const kategori = document.querySelector(
        'input[name="leave-type"]:checked'
      ).value;
      const tanggal_mulai = document.getElementById("leave-start").value;
      const tanggal_selesai = document.getElementById("leave-end").value;
      const messageElement = document.getElementById("leave-message");

      fetch("/api/leave/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kategori, tanggal_mulai, tanggal_selesai }),
      })
        .then((res) => res.json())
        .then((data) => {
          messageElement.textContent = data.message;
          if (data.success) {
            document.getElementById("leave-start").value = "";
            document.getElementById("leave-end").value = "";
            loadLeaveHistory();
          }
        });
    });

  function loadLeaveHistory() {
    fetch("/api/leave/history", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const tableBody = document.getElementById("leave-table-body");
          tableBody.innerHTML = "";
          data.data.forEach((record) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                        <td>${record.kategori}</td>
                        <td>${record.tanggal_mulai}</td>
                        <td>${record.tanggal_selesai}</td>
                        <td>${record.status_verifikasi}</td>
                        <td>${record.created_at}</td>
                    `;
            tableBody.appendChild(row);
          });
        }
      });
  }

  loadTodayAttendance();
  loadLeaveHistory();
}

// Hapus event listener duplicate di sini
// document.addEventListener("DOMContentLoaded", initLogin);
