
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use path.join to ensure compatibility across different OS
let db;
try {
  db = new Database(path.join(__dirname, '/pain-tracker.db'));
  console.log('Connected to SQLite database');
} catch (err) {
  console.error('Error opening database:', err.message);
};

// Create the pain_tracker table if it doesn't exist
try {

  db.prepare(`
    CREATE TABLE IF NOT EXISTS pain_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_date TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      pain_location TEXT,
      pain_type INTEGER NOT NULL DEFAULT 0,
      pain_level INTEGER NOT NULL,
      answers TEXT NOT NULL,
      notes TEXT
    )
  `).run();

  console.log('Database initialized.');
} catch (err) {
  console.error('Error initializing database:', err.message);
}

const submissionDate = new Date().toISOString();

export function insertEntry(entryDate, painLocation, painLevel, submissionDate, answers, painType, notes) {
  const insert = db.prepare(`
      INSERT INTO pain_tracker (entry_date, pain_location, pain_level, submission_date, answers, pain_type, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    insert.run(entryDate, painLocation, painLevel, submissionDate, JSON.stringify(answers), painType, notes);
    console.log('Entry added:', { entryDate, painLocation, painLevel, painType, submissionDate, answers, notes });
  } catch (error) {
    console.error('Error inserting entry:', error);
  }
}


export function getEntries() {
  try {
    const select = db.prepare('SELECT * FROM pain_tracker');
    const entries = select.all();
    console.log('All entries:', entries); // Check if entries are correctly fetched
    return entries;
  } catch (err) {
    console.error('Error fetching entries:', err.message); // Log any fetching errors
  }
}
getEntries();

export default db;