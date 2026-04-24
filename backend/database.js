const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./weatherwise.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      country TEXT,
      activity TEXT,
      startDate TEXT,
      endDate TEXT,
      temperature REAL,
      feelsLike REAL,
      description TEXT,
      humidity INTEGER,
      windSpeed REAL,
      recommendation TEXT,
      mapLink TEXT,
      forecastJson TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
