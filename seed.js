require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to Atlas for seeding...");
        await User.deleteMany({});
        const hashedPassword = await bcrypt.hash('@Prisha12', 10);

        const prisha = new User({
            userId: "USR4314",
            name: "Prisha Anand",
            email: "prishaanand1507@gmail.com",
            password: hashedPassword,
            stats: { busesTracked: 5, reportsHandled: 2 }
        });
        await prisha.save();
        console.log("✅ SUCCESS: Prisha Anand has been added to the Cloud Database!");

        process.exit();
    } catch (err) {
        console.error("❌ Error seeding database:", err);
        process.exit(1);
    }
}

seedDatabase();