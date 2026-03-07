const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

// Path to your existing db.json inside PROJECT folder
const DB_FILE = path.join(__dirname, 'PROJECT', 'db.json');

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// ── Helper: read entire db.json ──
function readDB() {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// ── Helper: write entire db.json ──
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ── GET /reports — return all reports ──
app.get('/reports', (req, res) => {
  try {
    const db = readDB();
    res.status(200).json(db.reports);
  } catch (error) {
    res.status(500).json({ message: 'Error reading reports', error: error.message });
  }
});

// ── POST /reports — save a new report ──
app.post('/reports', (req, res) => {
  try {
    const newReport = req.body;

    if (!newReport.busNumber || !newReport.description || !newReport.reportType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const db = readDB();

    newReport.id        = Date.now().toString();
    newReport.createdAt = new Date().toISOString();

    db.reports.push(newReport);
    writeDB(db);

    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ message: 'Error saving report', error: error.message });
  }
});

// ── DELETE /reports/:id — delete a report by id ──
app.delete('/reports/:id', (req, res) => {
  try {
    const reportId = req.params.id;
    const db       = readDB();
    const index    = db.reports.findIndex(r => r.id === reportId);

    if (index === -1) {
      return res.status(404).json({ message: 'Report not found' });
    }

    db.reports.splice(index, 1);
    writeDB(db);

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting report', error: error.message });
  }
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log(` Server is running!`);
  console.log(` Open: http://localhost:${PORT}/html/PROJECT/reporting.html`);
  console.log(` Using database: db.json`);
  console.log('====================================');
});