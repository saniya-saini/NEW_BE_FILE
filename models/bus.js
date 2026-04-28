const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  route: String,
  origin: String,
  destination: String,
  departure: String,
  arrival: String,
  duration: String,
  location: String,
  operator: String,
  status: String
});

module.exports = mongoose.model('Bus', busSchema, 'buses');