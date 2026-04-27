require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const User = require('./models/User');

const app = express();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🚀 MONGODB ATLAS: CONNECTION ESTABLISHED"))
  .catch(err => console.error("❌ MongoDB Connection Error: ", err));

// --- MIDDLEWARES ---
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

app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css', 'PROJECT')));
app.use('/js', express.static(path.join(__dirname, 'js', 'PROJECT')));

const checkAuth = (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};

const getProjectData = async (req) => {
  try {
    const user = await User.findOne({ userId: req.session.user.userId });
    return {
      user: user,
      reviews: [],
      cities: [],
      routes: []
    };
  } catch (err) {
    console.error("Error fetching data from Atlas:", err);
    return { user: null, reviews: [], cities: [], routes: [] };
  }
};

app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userlogin.html'));
});
app.post('/api/user/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId: userId });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.isLoggedIn = true;
      req.session.user = { userId: user.userId, name: user.name, email: user.email };
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
  res.render('newdashboard', { user: projectData.user });
});
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});
app.get('/api/cities', (req, res) => res.json([]));
app.get('/api/routes', (req, res) => res.json([]));
app.get('/api/reviews', (req, res) => res.json([]));

app.use((req, res) => res.status(404).send('404 - Page Not Found'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});