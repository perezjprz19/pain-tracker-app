// server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';


const date = new Date(); // This will give you the current date and time
const app = express();
import db from '../database/initDb.js';
import { insertEntry } from '../database/initDb.js';

// Middleware
// Allow all methods from the same origin (you can restrict it if needed)
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], // Explicitly allow POST
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static('public'));

app.post('/saveData', async (req, res) => {
    // Log the received request body
    console.log('Request Body:', req.body);

    // Destructure the required fields from the request body
    const { entryDate, painLocation, painLevel, notes, paintype, answers } = req.body;

    const stringifiedAnswers = JSON.stringify(answers); // Stringify the answers array
    const submissionDate = new Date().toISOString(); // Get the current date for submission date

    // Save to the database
    try {
        const stmt = db.prepare('INSERT INTO pain_tracker (entry_date, pain_level, answers, notes, pain_location, pain_type, submission_date) VALUES (?, ?, ?, ?, ?, ?, ?)');

        stmt.run(entryDate, painLevel, stringifiedAnswers, notes, painLocation, paintype, submissionDate); // Include submissionDate
        res.status(200).send('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error.message); // Log error message
        res.status(500).send('Error saving data');
    }
});



// Route to get entries based on date
app.get('/api/getEntries', (req, res) => {
    const { date } = req.query; // Get date from query parameters

    // Fetch entries from the database based on the date
    const selectEntries = db.prepare('SELECT * FROM pain_tracker WHERE entry_date = ?');
    const entries = selectEntries.all(date); // Fetching entries

    // Check if entries were found
    if (entries.length >= 0) {
        res.json(entries); // Send back the entries as JSON
    } else
        res.status(404).json({ message: 'No entries found for this date.' }); // Send an error message
});

app.get('/api/highestPainLevel', async (req, res) => {

    try {
        const stmt = db.prepare(`
            SELECT pt.entry_date, pt.pain_level AS highest_pain_level, pt.pain_type
            FROM pain_tracker pt
            JOIN (
                SELECT entry_date, MAX(pain_level) AS max_pain_level
                FROM pain_tracker
                GROUP BY entry_date
            ) AS max_levels ON pt.entry_date = max_levels.entry_date AND pt.pain_level = max_levels.max_pain_level
        `);
        const rows = stmt.all();
        console.log(rows);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching highest pain levels:', error);
        res.status(500).send('Error fetching data');
    }
});



app.delete('/api/entries/:id', (req, res) => {
    const entryId = parseInt(req.params.id, 10);

    console.log(`entryId received: ${entryId} (Type: ${typeof entryId})`);
    console.log(`Attempting to delete entry with ID: ${entryId} (Type: ${typeof entryId})`);

    // Validate if id is a valid number
    if (isNaN(entryId) || entryId <= 0) {
        console.error('Invalid ID provided');
        return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    try {
        const stmt = db.prepare('DELETE FROM pain_tracker WHERE id = ?');
        console.log(`Executing DELETE statement with entryId: ${entryId} (Type: ${typeof entryId})`);

        const result = stmt.run(entryId);

        if (result.changes > 0) {
            console.log(`Entry with ID ${entryId} deleted successfully`);
            return res.status(200).json({ success: true, message: 'Entry deleted successfully' });
        } else {
            console.log(`No entry found with ID ${entryId}`);
            return res.status(404).json({ success: false, message: 'Entry not found' });
        }
    } catch (error) {
        console.error('Unexpected error during deletion:', error);
        return res.status(500).json({ success: false, message: 'Error deleting entry' });
    }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
