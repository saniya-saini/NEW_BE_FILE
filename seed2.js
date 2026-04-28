require('dotenv').config();
const mongoose = require('mongoose');
const Bus = require('./models/Bus');

// Random time generator
function randomTime() {
  const h = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const m = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  return `${h}:${m}`;
}

const origins = ['Delhi', 'Chandigarh', 'Amritsar', 'Ludhiana', 'Panipat'];
const destinations = ['Noida', 'Ambala', 'Jalandhar', 'Patiala', 'Karnal'];
const operators = ['Haryana Roadways', 'Punjab Roadways', 'Private'];
const statuses = ['on-time', 'delayed', 'boarding'];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // OLD DATA DELETE (important)
    await Bus.deleteMany({});

    const buses = [];

    for (let i = 1; i <= 20; i++) {
      const dep = randomTime();
      const arr = randomTime();

      buses.push({
        route: `BUS${i}`,
        origin: origins[Math.floor(Math.random() * origins.length)],
        destination: destinations[Math.floor(Math.random() * destinations.length)],
        departure: dep,
        arrival: arr,
        duration: `${Math.floor(Math.random() * 5) + 1}h`,
        location: "On Route",
        operator: operators[Math.floor(Math.random() * operators.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    }

    await Bus.insertMany(buses);

    console.log("🚀 20 buses added with random data!");
    mongoose.disconnect();
  })
  .catch(err => {
    console.log("❌ Error:", err);
  });