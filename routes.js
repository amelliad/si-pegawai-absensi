const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./database");
const path = require("path");

// Serve static files
router.use(express.static("public"));

// Serve the index page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Forbidden" });
  }
};

// Login routes
router.post("/api/login/pegawai", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query(
      "SELECT * FROM pegawai WHERE id_pegawai = ?",
      [username]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Username tidak ditemukan" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Password salah" });
    }

    req.session.user = {
      id: user.id_pegawai,
      nama: user.nama,
      role: user.role,
      jenis_pegawai: user.jenis_pegawai,
      isAdmin: false,
    };

    res.json({
      success: true,
      message: "Login berhasil",
      redirect: "/dashboard-employee.html",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/api/login/admin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query("SELECT * FROM admin WHERE username = ?", [
      username,
    ]);

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Username tidak ditemukan" });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Password salah" });
    }

    req.session.user = {
      id: admin.id_admin,
      nama: admin.nama_admin,
      isAdmin: true,
    };

    res.json({
      success: true,
      message: "Login berhasil",
      redirect: "/dashboard-admin.html",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Logout route
router.get("/api/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/index.html");
});

// Get user info
router.get("/api/user", isAuthenticated, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

// Attendance routes
router.post("/api/attendance/check-in", isAuthenticated, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const id_pegawai = req.session.user.id;
    const now = new Date();
    const tanggal = now.toISOString().split("T")[0];
    const waktu = now.toTimeString().split(" ")[0];

    // Check if already checked in today
    const [existing] = await db.query(
      "SELECT * FROM presensi WHERE id_pegawai = ? AND tanggal = ?",
      [id_pegawai, tanggal]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah melakukan absen datang hari ini",
      });
    }

    // Calculate distance from school (example coordinates)
    const schoolLat = -7.44227047427195; // replace with actual school coordinates
    const schoolLng = 108.18412428410255; // replace with actual school coordinates

    // Simple distance calculation (this is simplified, in production would use Haversine formula)
    const distance =
      Math.sqrt(
        Math.pow(latitude - schoolLat, 2) + Math.pow(longitude - schoolLng, 2)
      ) * 111000; // rough conversion to meters

    console.log("Koordinat Pegawai:", latitude, longitude);
    console.log("Koordinat Sekolah:", schoolLat, schoolLng);
    console.log("Jarak (meter):", distance);

    if (distance > 200) {
      return res.status(400).json({
        success: false,
        message: "Anda berada di luar radius absensi (200 meter dari sekolah)",
      });
    }

    // Determine status
    const hour = now.getHours();
    const minute = now.getMinutes();
    const status =
      hour > 7 || (hour === 7 && minute > 0) ? "terlambat" : "hadir";

    await db.query(
      `INSERT INTO presensi (id_pegawai, tanggal, waktu_datang, status_datang, latitude_datang, longitude_datang)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [id_pegawai, tanggal, waktu, status, latitude, longitude]
    );

    res.json({
      success: true,
      message: `Absen datang berhasil dengan status: ${status}`,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/api/attendance/check-out", isAuthenticated, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const id_pegawai = req.session.user.id;
    const now = new Date();
    const tanggal = now.toISOString().split("T")[0];
    const waktu = now.toTimeString().split(" ")[0];

    // Check if checked in today
    const [existing] = await db.query(
      "SELECT * FROM presensi WHERE id_pegawai = ? AND tanggal = ?",
      [id_pegawai, tanggal]
    );

    if (existing.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Anda belum melakukan absen datang hari ini",
      });
    }

    if (existing[0].waktu_pulang) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah melakukan absen pulang hari ini",
      });
    }

    // Calculate distance from school (example coordinates)
    const schoolLat = -7.44227047427195; // replace with actual school coordinates
    const schoolLng = 108.18412428410255; // replace with actual school coordinates

    // Simple distance calculation (this is simplified, in production would use Haversine formula)
    const distance =
      Math.sqrt(
        Math.pow(latitude - schoolLat, 2) + Math.pow(longitude - schoolLng, 2)
      ) * 111000; // rough conversion to meters

    if (distance > 200) {
      return res.status(400).json({
        success: false,
        message: "Anda berada di luar radius absensi (200 meter dari sekolah)",
      });
    }

    // Determine status
    const hour = now.getHours();
    const status = hour < 15 ? "tidak sesuai" : "pulang tepat waktu";

    await db.query(
      `UPDATE presensi SET waktu_pulang = ?, status_pulang = ?, latitude_pulang = ?, longitude_pulang = ?
             WHERE id_pegawai = ? AND tanggal = ?`,
      [waktu, status, latitude, longitude, id_pegawai, tanggal]
    );

    res.json({
      success: true,
      message: `Absen pulang berhasil dengan status: ${status}`,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route untuk lihat presensi hari ini (pegawai)
router.get("/api/attendance/today", isAuthenticated, async (req, res) => {
  try {
    const id_pegawai = req.session.user.id;
    const today = new Date().toISOString().split("T")[0];

    const [rows] = await db.query(
      "SELECT * FROM presensi WHERE id_pegawai = ? AND tanggal = ?",
      [id_pegawai, today]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: {} });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error get today attendance:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Leave request routes
router.post("/api/leave/request", isAuthenticated, async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_selesai, kategori } = req.body;
    const id_pegawai = req.session.user.id;

    await db.query(
      `INSERT INTO izin (id_pegawai, tanggal_mulai, tanggal_selesai, kategori)
             VALUES (?, ?, ?, ?)`,
      [id_pegawai, tanggal_mulai, tanggal_selesai, kategori]
    );

    res.json({
      success: true,
      message: "Pengajuan izin berhasil, menunggu verifikasi",
    });
  } catch (error) {
    console.error("Leave request error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/api/leave/history", isAuthenticated, async (req, res) => {
  try {
    const id_pegawai = req.session.user.id;

    const [rows] = await db.query(
      "SELECT * FROM izin WHERE id_pegawai = ? ORDER BY created_at DESC",
      [id_pegawai]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Leave history error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin routes
router.get("/api/admin/employees", async (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    // Tambahan debug: cek nama database aktif
    const [dbName] = await db.query("SELECT DATABASE() AS name");
    console.log("🛠️ Connected to DB:", dbName[0].name);

    const [pegawai] = await db.query("SELECT * FROM pegawai");
    console.log("📦 Pegawai result:", pegawai);

    res.json({ success: true, data: pegawai });
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/api/admin/employee", isAdmin, async (req, res) => {
  try {
    const { id_pegawai, nama, jenis_pegawai, role, password } = req.body;

    console.log("DATA DITERIMA:", {
      id_pegawai,
      nama,
      jenis_pegawai,
      role,
      password,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO pegawai (id_pegawai, nama, jenis_pegawai, role, password)
             VALUES (?, ?, ?, ?, ?)`,
      [id_pegawai, nama, jenis_pegawai, role, hashedPassword]
    );

    res.json({ success: true, message: "Pegawai berhasil ditambahkan" });
  } catch (error) {
    console.error("Add employee error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/api/admin/employee/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, jenis_pegawai, role } = req.body;

    await db.query(
      `UPDATE pegawai SET nama = ?, jenis_pegawai = ?, role = ? WHERE id_pegawai = ?`,
      [nama, jenis_pegawai, role, id]
    );

    res.json({ success: true, message: "Data pegawai berhasil diperbarui" });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/api/admin/employee/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await db.query("DELETE FROM izin WHERE id_pegawai = ?", [id]);
    await db.query("DELETE FROM presensi WHERE id_pegawai = ?", [id]);

    // Then delete the employee
    await db.query("DELETE FROM pegawai WHERE id_pegawai = ?", [id]);

    res.json({ success: true, message: "Pegawai berhasil dihapus" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/api/admin/attendance", isAdmin, async (req, res) => {
  try {
    const { month, role } = req.query;

    let query = `
            SELECT p.*, e.nama, e.jenis_pegawai, e.role
            FROM presensi p
            JOIN pegawai e ON p.id_pegawai = e.id_pegawai
        `;

    const params = [];

    if (month) {
      query += " WHERE MONTH(p.tanggal) = ?";
      params.push(month);

      if (role) {
        query += " AND e.role = ?";
        params.push(role);
      }
    } else if (role) {
      query += " WHERE e.role = ?";
      params.push(role);
    }

    query += " ORDER BY e.nama, p.tanggal DESC";

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/api/admin/leave", isAdmin, async (req, res) => {
  try {
    const { month, role } = req.query;

    let query = `
            SELECT i.*, e.nama, e.jenis_pegawai, e.role
            FROM izin i
            JOIN pegawai e ON i.id_pegawai = e.id_pegawai
        `;

    const params = [];

    if (month) {
      query += " WHERE MONTH(i.tanggal_mulai) = ?";
      params.push(month);

      if (role) {
        query += " AND e.role = ?";
        params.push(role);
      }
    } else if (role) {
      query += " WHERE e.role = ?";
      params.push(role);
    }

    query += " ORDER BY e.nama, i.tanggal_mulai DESC";

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get leave error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/api/admin/leave/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status_verifikasi } = req.body;

    await db.query("UPDATE izin SET status_verifikasi = ? WHERE id = ?", [
      status_verifikasi,
      id,
    ]);

    res.json({
      success: true,
      message: `Pengajuan izin berhasil ${status_verifikasi}`,
    });
  } catch (error) {
    console.error("Update leave error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DEBUG: Cek isi session
router.get("/debug/session", (req, res) => {
  res.json({
    session: req.session,
    user: req.session.user || null,
  });
});

module.exports = router;
