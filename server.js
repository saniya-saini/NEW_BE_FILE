const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'db.json');


const readDB = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return { users: [], tracking: [], routes: [] };
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Read Error:", err);
        return { users: [], tracking: [], routes: [] };
    }
};



app.post('/login', (req, res) => {
    const db = readDB();

    const { userId, password } = req.body;

    const user = db.users.find(u => u.userId === userId && u.password === password);

    if (user) {
        console.log(`✅ Login successful for: ${user.name} (${user.userId})`);


        const { password: _, ...userSafeData } = user;

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: userSafeData
        });
    } else {
        console.log(`❌ Login failed for User ID: ${userId}`);
        res.status(401).json({
            success: false,
            message: "Invalid User ID or Password"
        });
    }
});

app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db.users);
});

app.post('/users', (req, res) => {
    const db = readDB();
    const newUser = req.body;
    if (db.users.find(u => u.userId === newUser.userId || u.email === newUser.email)) {
        return res.status(400).json({ message: "User already exists" });
    }
    db.users.push(newUser);
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    res.status(201).json(newUser);
});

app.get('/api/routes', (req, res) => {
    const db = readDB();
    res.json(db.routes);
});

io.on('connection', (socket) => {
    console.log('📡 Dashboard linked to Live Tracking');

    const trackingInterval = setInterval(() => {
        const db = readDB();

        const liveUpdates = db.tracking.map(bus => ({
            id: bus.ticketId,
            route: `${bus.nextStop} Direction`,
            status: bus.status.toLowerCase().includes('delayed') ? 'stopped' : 'moving',
            speed: bus.currentSpeed,
            location: bus.currentLocation
        }));

        socket.emit('bus_update', liveUpdates);
    }, 5000);

    socket.on('disconnect', () => clearInterval(trackingInterval));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'userlogin.html'));
});

app.get('/newdashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'PROJECT', 'newdashboard.html'));
});

app.get('/html/PROJECT/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'PROJECT', req.params.filename));
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 Login mode: User ID & Password`);
    console.log(`📍 Real-time: ACTIVE`);
    console.log(`-----------------------------------------`);
});

const protectRoute = (req, res, next) => {

    const isLoggedIn = true;

    if (isLoggedIn) {
        next();
    } else {
        res.status(401).redirect('/login.html');
    }
};


app.get('/newdashboard.html', protectRoute, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'newdashboard.html'));
});



app.post('/update-profile', (req, res) => {
    const updatedData = req.body;
    const dbPath = path.join(__dirname, 'db.json');

    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).send("Error reading database");

        let db = JSON.parse(data);
        const userIndex = db.users.findIndex(u => u.id === updatedData.id);
        if (userIndex !== -1) {
            db.users[userIndex] = { ...db.users[userIndex], ...updatedData };

            fs.writeFile(dbPath, JSON.stringify(db, null, 2), (err) => {
                if (err) return res.status(500).send("Error saving data");
                res.send({ message: "Profile updated in db.json successfully!" });
            });
        }
    });
});