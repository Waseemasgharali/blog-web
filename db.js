const sqlite3 = require("sqlite3").verbose();

// Open SQLite database
const db = new sqlite3.Database("database.db");

// Create posts table if not exists
db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT,
    image TEXT
)`);

module.exports = db;
