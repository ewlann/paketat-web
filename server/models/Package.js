const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    emri: { type: String, required: true },
    mbiemri: { type: String, required: true },
    adresa: { type: String, required: true },
    qyteti: { type: String, required: true },
    telefoni: { type: String, required: true },
    emailSender: { type: String, required: true },
    emailReceiver: { type: String, required: true },
    status: { type: String, default: 'Krijuar' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);
