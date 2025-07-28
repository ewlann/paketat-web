const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pdfkit = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const Package = require('./models/Package');
const User = require('./models/User');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/packages')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Utils: Generate PDF with package details and QR code
async function generatePackagePdf(pkg) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new pdfkit();
      // File path
      const dir = 'pdfs';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const filePath = `${dir}/package_${pkg._id}.pdf`;
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Title
      doc.fontSize(20).text('Detajet e Paketës', { align: 'center' });
      doc.moveDown();

      // Package details
      doc.fontSize(12);
      doc.text(`Emri: ${pkg.emri}`);
      doc.text(`Mbiemri: ${pkg.mbiemri}`);
      doc.text(`Adresa: ${pkg.adresa}`);
      doc.text(`Qyteti: ${pkg.qyteti}`);
      doc.text(`Telefoni: ${pkg.telefoni}`);
      doc.text(`Email dërgues: ${pkg.emailSender}`);
      doc.text(`Email marrës: ${pkg.emailReceiver}`);

      doc.moveDown();
      doc.text('QR Code:', { underline: true });

      // Generate QR Code using a simple placeholder (QR generation on server side can be implemented with qrcode library)
      // For demonstration we encode package id as QR content
      const qr = require('qrcode');
      const qrData = JSON.stringify({ id: pkg._id });
      qr.toDataURL(qrData, { errorCorrectionLevel: 'H' }, (err, url) => {
        if (err) {
          doc.text('Error generating QR code');
        } else {
          // Embed QR image
          doc.image(url, { fit: [150, 150] });
        }
        doc.end();
      });

      stream.on('finish', () => {
        resolve(filePath);
      });
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// Routes

// POST /api/packages - Create a new package
app.post('/api/packages', async (req, res) => {
  try {
    const {
      emri,
      mbiemri,
      adresa,
      qyteti,
      telefoni,
      emailSender,
      emailReceiver,
    } = req.body;
    const pkg = new Package({
      emri,
      mbiemri,
      adresa,
      qyteti,
      telefoni,
      emailSender,
      emailReceiver,
    });
    await pkg.save();

    // Generate PDF
    const pdfPath = await generatePackagePdf(pkg);

    // Send confirmation emails
    const mailOptionsSender = {
      from: process.env.EMAIL_USER,
      to: emailSender,
      subject: 'Konfirmim për regjistrimin e paketës',
      text: `Përshëndetje ${emri}, paketa juaj është regjistruar me sukses. ID: ${pkg._id}`,
      attachments: [
        {
          filename: `paketa_${pkg._id}.pdf`,
          path: pdfPath,
        },
      ],
    };
    const mailOptionsReceiver = {
      from: process.env.EMAIL_USER,
      to: emailReceiver,
      subject: 'Informacion për paketën tuaj',
      text: `Përshëndetje, ju keni një paketë të dërguar nga ${emri} ${mbiemri}. ID e paketës: ${pkg._id}`,
      attachments: [
        {
          filename: `paketa_${pkg._id}.pdf`,
          path: pdfPath,
        },
      ],
    };
    // Send both emails in parallel; ignore errors
    transporter.sendMail(mailOptionsSender).catch((err) => console.error(err));
    transporter.sendMail(mailOptionsReceiver).catch((err) => console.error(err));

    res.json({ success: true, package: pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/packages - List packages (admin only)
app.get('/api/packages', authenticateToken, async (req, res) => {
  try {
    // Only admin can list
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const packages = await Package.find().sort({ createdAt: -1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/packages/:id - Get single package (authenticated)
app.get('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Not found' });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/packages/:id - Update package (admin)
app.put('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/packages/:id - Delete package (admin)
app.delete('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    await Package.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/login - Authenticate user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '12h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/register-operator - Register new operator (admin)
app.post('/api/register-operator', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { username, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role: role || 'operator' });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/report - Generate monthly report (admin)
app.get('/api/report', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { month } = req.query; // month format: YYYY-MM
    if (!month) return res.status(400).json({ error: 'Parametri month i mungon' });
    const [year, monthNum] = month.split('-');
    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 1);
    const packages = await Package.find({ createdAt: { $gte: start, $lt: end } });
    // Create CSV-like string
    let report = 'ID,Emri,Mbiemri,Adresa,Qyteti,Telefoni,Email dërgues,Email marrës,Data\n';
    packages.forEach((p) => {
      report += `${p._id},${p.emri},${p.mbiemri},${p.adresa},${p.qyteti},${p.telefoni},${p.emailSender},${p.emailReceiver},${p.createdAt.toISOString()}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${month}.csv"`);
    res.send(report);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
