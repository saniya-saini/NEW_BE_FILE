const Bus = require('./models/Bus');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const User = require('./models/User');

const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Report = require('./models/Report');
const JWT_SECRET = process.env.JWT_SECRET || 'trackbus_jwt_secret_2025';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
app.set('io', io);
io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});
const PORT = 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🚀 MONGODB ATLAS: CONNECTION ESTABLISHED"))
  .catch(err => console.error("❌ MongoDB Connection Error: ", err));

// ─── MIDDLEWARES ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // Body-parser (built into Express)
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html', 'PROJECT'));

app.use(session({
  secret: 'bus_tracking_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

// Request logger middleware
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${req.method} → ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname)));
app.use('/js', express.static(path.join(__dirname, 'js/PROJECT')));
app.use('/css', express.static(path.join(__dirname, 'css/PROJECT')));
// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────
const checkAuth = (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

// ─── ROUTE IMPORTS ───────────────────────────────────────────────────────────
const reportRoutes = require('./routes/reportRoutes');
const bookingRoutes = require('./routes/bookingRoutes');  // NEW
const reviewRoutes = require('./routes/reviewRoutes');    // NEW

app.use('/reports', reportRoutes);
app.use('/book-ticket', bookingRoutes);   // NEW: /book-ticket/tickets, /book-ticket/cities etc.
app.use('/reviews', reviewRoutes);        // NEW: /reviews GET/POST/DELETE

// ─── HELPER ──────────────────────────────────────────────────────────────────
const getProjectData = async (req) => {
  try {
    const user = await User.findOne({ userId: req.session.user.userId });
    return { user, reviews: [], cities: [], routes: [] };
  } catch (err) {
    console.error("Error fetching data from Atlas:", err);
    return { user: null, reviews: [], cities: [], routes: [] };
  }
};

// ─── PAGE ROUTES ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userlogin.html'));
});

app.get('/busschedule', (req, res) => {
  res.render('busschedule');
});

app.get('/userdashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userdashboard.html'));
});
// ─── AUTH API ────────────────────────────────────────────────────────────────
app.post('/api/user/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.isLoggedIn = true;
      req.session.user = { userId: user.userId, name: user.name, email: user.email };

      // JWT Token
      const token = jwt.sign(
        { userId: user.userId, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.cookie('jwtToken', token, { httpOnly: true, maxAge: 3600000 });
      res.json({ success: true, user: req.session.user });
    } else {
      res.status(401).json({ success: false, message: "Invalid Password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.get('/newdashboard', checkAuth, async (req, res) => {
  const projectData = await getProjectData(req);
  res.cookie('last_visit', new Date().toLocaleTimeString(), { maxAge: 900000, httpOnly: true });
  res.render('newdashboard', { user: projectData.user });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('connect.sid');
    res.clearCookie('last_visit');
    res.clearCookie('jwtToken');

    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ success: false, message: "Could not log out" });
        }
        res.json({ success: true });
    });
});
app.get('/api/cities', (req, res) => res.json([]));
app.get('/api/routes', (req, res) => res.json([]));
app.get('/api/reviews', (req, res) => res.json([]));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBusSchedule(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Bus schedule must be a JSON object.' };
  }
  const requiredFields = ['route','origin','destination','departure','arrival','duration','location','operator','status'];
  for (const field of requiredFields) {
    if (!isNonEmptyString(input[field])) {
      return { ok: false, message: `Missing or invalid field: ${field}` };
    }
  }
  const allowedStatuses = new Set(['on-time', 'delayed', 'boarding']);
  if (!allowedStatuses.has(String(input.status).toLowerCase())) {
    return { ok: false, message: 'Invalid status. Allowed: on-time, delayed, boarding.' };
  }
  return { ok: true };
}

const busRouter = express.Router();

busRouter.use((req, res, next) => {
  console.log('  -> Bus API request:', req.method, req.path);
  next();
});

busRouter.get('/', async (req, res) => {
  try {
    const { origin, destination, operator } = req.query;
    let query = {};
    if (origin) query.origin = new RegExp(origin, 'i');
    if (destination) query.destination = new RegExp(destination, 'i');
    if (operator) query.operator = new RegExp(operator, 'i');
    const buses = await Bus.find(query);
    res.json(buses);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching buses');
  }
});

app.get('/api/busschedules', async (req, res) => {
  const { origin, destination, operator } = req.query;
  let query = {};
  if (origin) query.origin = new RegExp(origin, 'i');
  if (destination) query.destination = new RegExp(destination, 'i');
  if (operator) query.operator = new RegExp(operator, 'i');
  const buses = await Bus.find(query);
  res.json(buses);
});
app.get('/businfo', async (req, res) => {
  const busId = req.query.busId;

  const bus = await Bus.findOne({
    route: { $regex: busId, $options: 'i' }
  });

  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  res.json(bus);
});
busRouter.post('/', async (req, res) => {
  try {
    const newBus = new Bus(req.body);
    await newBus.save();
    res.status(201).json(newBus);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding bus');
  }
});

busRouter.patch('/:id', async (req, res) => {
  try {
    const updated = await Bus.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating bus');
  }
});

app.use('/api/busschedules', busRouter);

// ─── ERROR HANDLERS ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).send('404 - Page Not Found');
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('500 - Internal Server Error');
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});