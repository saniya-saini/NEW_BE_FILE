const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html', 'PROJECT'));

app.use(session({
  secret: 'bus_tracking_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use('/css', express.static(path.join(__dirname, 'css', 'PROJECT')));
app.use('/js', express.static(path.join(__dirname, 'js', 'PROJECT')));
app.use('/html', express.static(path.join(__dirname, 'html', 'PROJECT')));

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'PROJECT', 'db.json');

app.get('/api/set-preferences', (req, res) => {
  res.cookie('lastVisit', new Date().toLocaleString(), {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  });
  res.json({ message: "Cookie set successfully! Check the 'Application' tab in Inspect." });
});

app.get('/api/get-hash', async (req, res) => {
  const hash = await bcrypt.hash('@Liesha12', 10);
  res.send(hash);
});


app.get('/api/session-user', (req, res) => {
  if (req.session.isLoggedIn) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: "No active session" });
  }
});

app.get('/api/user/dashboard/:userId', (req, res) => {

  const userId = req.params.userId;

  const db = readDb();

  const user = db.users.find(u => u.userId === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const userTickets = db.tickets;

  res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email
    },
    tickets: userTickets
  });

});
// User Login
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.clearCookie('connect.sid'); // Clears the session cookie
    res.json({ success: true });
  });
});
app.post('/api/user/login', async (req, res) => {
  const { userId, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.userId === userId);

  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  // --- FINAL SYNC LOGIC ---
  const newHash = await bcrypt.hash(password, 10);
  user.password = newHash;

  // Force the name and email to match your requirements
  user.name = "Prisha Anand";
  user.email = "prishaanand1507@gmail.com";

  writeDb(db); // This writes "Prisha Anand" into db.json permanently
  // ------------------------

  req.session.isLoggedIn = true;
  req.session.user = {
    userId: user.userId,
    name: user.name,
    email: user.email
  };

  res.json({ success: true, user: req.session.user });
});
app.get('/api/get-hash', async (req, res) => {
  const hash = await bcrypt.hash('@Liesha12', 10);
  res.send(hash);
});

// ---------- Middleware ----------
const checkAuth = (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

// JSON body parser middleware
app.use(express.json());

// Application-level middleware: log request time and URL
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${req.method} ${req.url}`);
  next();
});

// Static file serving (CSS, JS, images, icons)
app.use(express.static(path.join(__dirname, 'bus-tracking')));

// ---------- File handling (fs module) ----------

function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    if (!Array.isArray(db.reviews)) {
      db.reviews = [];
    }
    return db;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { cities: [], routes: [], tickets: [], tracking: [], reviews: [] };
    }
    throw err;
  }
}

function writeDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    throw err;
  }
}

// ---------- Page routes (serve HTML) ----------

// Aliases for existing relative links (do not change HTML)
app.get('/book-ticket', (req, res) => {
  res.sendFile(path.join(__dirname, 'book-ticket.html'));
});

app.get('/book-ticket.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'book-ticket.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userlogin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userlogin.html'));
});

app.get('/newdashboard', checkAuth, (req, res) => {

  res.render('newdashboard', { user: req.session.user });
});
app.get('/busschedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'busschedule.html'));
});

app.get('/reporting', (req, res) => {
  res.sendFile(path.join(__dirname, 'reporting.html'));
});

app.get('/review', (req, res) => {
  res.sendFile(path.join(__dirname, 'review.html'));
});
app.get('/book-ticket', (req, res) => {
  res.sendFile(path.join(__dirname, 'book-ticket.html'));
});

// ---------- API Router (router-level middleware) ----------

const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  console.log('  -> API request:', req.method, req.path);
  next();
});

// GET /cities, /routes, /tickets, /tracking (for book-ticket page)
apiRouter.get('/cities', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.cities || []);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/routes', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.routes || []);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/tickets', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.tickets || []);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/tracking', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.tracking || []);
  } catch (err) {
    next(err);
  }
});

// POST /book-ticket – save booking data to db.json (syllabus endpoint)
apiRouter.post('/book-ticket', (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid input: body must be a JSON object' });
    }
    const { id, from, to, date, departureTime, arrivalTime, busName, seatNumber, status, price } = body;
    if (!id || !from || !to || !date) {
      return res.status(400).json({ error: 'Invalid input: id, from, to, date are required' });
    }
    const db = readDb();
    if (!Array.isArray(db.tickets)) db.tickets = [];
    const newTicket = {
      id,
      from,
      to,
      date,
      departureTime: departureTime || '',
      arrivalTime: arrivalTime || '',
      busName: busName || '',
      seatNumber: seatNumber || '',
      status: status || 'Upcoming',
      price: price || ''
    };
    db.tickets.unshift(newTicket);
    writeDb(db);
    res.status(201).json(newTicket);
  } catch (err) {
    next(err);
  }
});

// POST /tickets – same as book-ticket (for existing frontend compatibility)
apiRouter.post('/tickets', (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid input: body must be a JSON object' });
    }
    const { id, from, to, date, departureTime, arrivalTime, busName, seatNumber, status, price } = body;
    if (!id || !from || !to || !date) {
      return res.status(400).json({ error: 'Invalid input: id, from, to, date are required' });
    }
    const db = readDb();
    if (!Array.isArray(db.tickets)) db.tickets = [];
    const newTicket = {
      id,
      from,
      to,
      date,
      departureTime: departureTime || '',
      arrivalTime: arrivalTime || '',
      busName: busName || '',
      seatNumber: seatNumber || '',
      status: status || 'Upcoming',
      price: price || ''
    };
    db.tickets.unshift(newTicket);
    writeDb(db);
    res.status(201).json(newTicket);
  } catch (err) {
    next(err);
  }
});

// PATCH /tickets/:id (for cancel ticket)
apiRouter.patch('/tickets/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDb();
    if (!Array.isArray(db.tickets)) db.tickets = [];
    const index = db.tickets.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    Object.assign(db.tickets[index], req.body);
    writeDb(db);
    res.json(db.tickets[index]);
  } catch (err) {
    next(err);
  }
});

// GET /reviews – return all reviews from db.json
apiRouter.get('/reviews', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.reviews || []);
  } catch (err) {
    next(err);
  }
});

// POST /review – save review data to db.json (syllabus endpoint)
apiRouter.post('/review', (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid input: body must be a JSON object' });
    }
    const db = readDb();
    if (!Array.isArray(db.reviews)) db.reviews = [];
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newReview = {
      id,
      route: body.route || '',
      rating: typeof body.rating === 'number' ? body.rating : parseInt(body.rating, 10) || 0,
      text: body.text || body.reviewText || '',
      reviewText: body.reviewText || body.text || '',
      author: body.author || body.userName || 'Anonymous',
      userName: body.userName || body.author || 'Anonymous',
      date: body.date || body.createdAt || new Date().toISOString(),
      createdAt: body.createdAt || body.date || new Date().toISOString()
    };
    db.reviews.unshift(newReview);
    writeDb(db);
    res.status(201).json(newReview);
  } catch (err) {
    next(err);
  }
});

// GET /reports – return all incident reports
apiRouter.get('/reports', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.reports || []);
  } catch (err) {
    next(err);
  }
});

// POST /reports – save a new incident report
apiRouter.post('/reports', (req, res, next) => {
  try {
    const newReport = req.body || {};

    if (!newReport.busNumber || !newReport.description || !newReport.reportType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const db = readDb();
    if (!Array.isArray(db.reports)) db.reports = [];

    newReport.id = Date.now().toString();
    newReport.createdAt = new Date().toISOString();

    db.reports.push(newReport);
    writeDb(db);

    res.status(201).json(newReport);
  } catch (err) {
    next(err);
  }
});

// DELETE /reports/:id – delete a report by id
apiRouter.delete('/reports/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDb();
    if (!Array.isArray(db.reports)) db.reports = [];

    const index = db.reports.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Report not found' });
    }

    db.reports.splice(index, 1);
    writeDb(db);

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /reviews – same as POST /review (for existing review.js)
apiRouter.post('/reviews', (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid input: body must be a JSON object' });
    }
    const db = readDb();
    if (!Array.isArray(db.reviews)) db.reviews = [];
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newReview = {
      id,
      route: body.route || '',
      rating: typeof body.rating === 'number' ? body.rating : parseInt(body.rating, 10) || 0,
      text: body.text || body.reviewText || '',
      reviewText: body.reviewText || body.text || '',
      author: body.author || body.userName || 'Anonymous',
      userName: body.userName || body.author || 'Anonymous',
      date: body.date || body.createdAt || new Date().toISOString(),
      createdAt: body.createdAt || body.date || new Date().toISOString()
    };
    db.reviews.unshift(newReview);
    writeDb(db);
    res.status(201).json(newReview);
  } catch (err) {
    next(err);
  }
});

// DELETE /reviews/:id
apiRouter.delete('/reviews/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDb();
    if (!Array.isArray(db.reviews)) db.reviews = [];
    const index = db.reviews.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    db.reviews.splice(index, 1);
    writeDb(db);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Route parameters example: GET /booking/:id
apiRouter.get('/booking/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDb();
    const ticket = (db.tickets || []).find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

app.use('/', apiRouter);

// ---------- Bus schedule API (/api/busschedules) ----------

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBusSchedule(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Bus schedule must be a JSON object.' };
  }

  const requiredFields = [
    'route',
    'origin',
    'destination',
    'departure',
    'arrival',
    'duration',
    'location',
    'operator',
    'status'
  ];

  for (const field of requiredFields) {
    if (!isNonEmptyString(input[field])) {
      return { ok: false, message: `Missing or invalid field: ${field}` };
    }
  }

  const allowedStatuses = new Set(['on-time', 'delayed', 'boarding']);
  if (!allowedStatuses.has(String(input.status).toLowerCase())) {
    return {
      ok: false,
      message: 'Invalid status. Allowed: on-time, delayed, boarding.'
    };
  }

  return { ok: true };
}

function getNextBusScheduleId(list) {
  const max = list.reduce((acc, item) => {
    const n = parseInt(String(item && item.id), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return String(max + 1);
}

const busRouter = express.Router();

busRouter.use((req, res, next) => {
  console.log('  -> Bus API request:', req.method, req.path);
  next();
});

// GET /api/busschedules – all schedules
busRouter.get('/', (req, res, next) => {
  try {
    const db = readDb();
    res.json(db.busschedules || []);
  } catch (err) {
    next(err);
  }
});

// GET /api/busschedules/:id – single schedule by id
busRouter.get('/:id', (req, res, next) => {
  try {
    const db = readDb();
    const id = String(req.params.id);
    const list = Array.isArray(db.busschedules) ? db.busschedules : [];
    const found = list.find(s => String(s.id) === id);
    if (!found) {
      return res.status(404).json({ error: 'Bus schedule not found.' });
    }
    res.json(found);
  } catch (err) {
    next(err);
  }
});

// POST /api/busschedules – add new schedule
busRouter.post('/', (req, res, next) => {
  try {
    const validation = validateBusSchedule(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.message });
    }

    const db = readDb();
    const list = Array.isArray(db.busschedules) ? db.busschedules : [];

    const newSchedule = {
      id: getNextBusScheduleId(list),
      route: req.body.route.trim(),
      origin: req.body.origin.trim(),
      destination: req.body.destination.trim(),
      departure: req.body.departure.trim(),
      arrival: req.body.arrival.trim(),
      duration: req.body.duration.trim(),
      location: req.body.location.trim(),
      operator: req.body.operator.trim(),
      status: String(req.body.status).toLowerCase().trim()
    };

    const updatedList = [...list, newSchedule];
    db.busschedules = updatedList;
    writeDb(db);

    res.status(201).json(newSchedule);
  } catch (err) {
    next(err);
  }
});

app.use('/api/busschedules', busRouter);

// ---------- 404 handler ----------

app.use((req, res, next) => {
  res.status(404).send('404 - Page Not Found');
});

// ---------- Error handling middleware ----------

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('500 - Internal Server Error');
});

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});