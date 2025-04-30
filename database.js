const mysql = require('mysql2/promise');

// Create database connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'attendance_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database tables if they don't exist
async function initializeDatabase() {
    const connection = await pool.getConnection();
    try {
        // Create pegawai table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pegawai (
                id_pegawai VARCHAR(20) PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                jenis_pegawai ENUM('ASN', 'Non-ASN', 'Pekerja') NOT NULL,
                role ENUM('Guru', 'Tenaga Pendidik', 'Pekerja') NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create admin table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin (
                id_admin INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                nama_admin VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create presensi table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS presensi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_pegawai VARCHAR(20) NOT NULL,
                tanggal DATE NOT NULL,
                waktu_datang TIME,
                status_datang ENUM('hadir', 'terlambat'),
                waktu_pulang TIME,
                status_pulang ENUM('pulang tepat waktu', 'tidak sesuai'),
                latitude_datang DOUBLE,
                longitude_datang DOUBLE,
                latitude_pulang DOUBLE,
                longitude_pulang DOUBLE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai)
            )
        `);

        // Create izin table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS izin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_pegawai VARCHAR(20) NOT NULL,
                tanggal_mulai DATE NOT NULL,
                tanggal_selesai DATE NOT NULL,
                kategori ENUM('izin sakit', 'izin dinas keluar') NOT NULL,
                status_verifikasi ENUM('Menunggu Verifikasi', 'Disetujui', 'Ditolak') DEFAULT 'Menunggu Verifikasi',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai)
            )
        `);

        // Insert default admin if it doesn't exist
        await connection.query(`
            INSERT IGNORE INTO admin (username, password, nama_admin) 
            VALUES ('admin', '$2b$12$xAnHJ7FDOROIUHck/8have1q.iA6.zwPLdVhkI3BEax9IokwMXIzi', 'Administrator')
        `);        

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        connection.release();
    }
}

// Initialize database on module load
initializeDatabase();

module.exports = {
    pool,
    query: (sql, params) => pool.query(sql, params)
};