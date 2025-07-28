const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pdfkit = require('pdfkit');
const fs = require('fs');
const qrcode = require('qrcode');
require('dotenv').config();

const Package = require('./models/Package');
const User = require('./models/User');

// Importo 'path' për të punuar me rrugët e skedarëve
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Shërbe skedarët statikë nga dosja 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rruga kryesore – kthen index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lidhja me MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/packages')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Konfigurimi i nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware për autentikim me JWT
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

// Funksion ndihmës për gjenerimin e PDF‑it me QR Code
async function generatePackagePdf(pkg) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new pdfkit();
      const dir = 'pdfs';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const filePath = `${dir}/package_${pkg._id}.pdf`;
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Titulli
      doc.fontSize(20).text('Detajet e Paketës', { align: 'center' });
      doc.moveDown();

      // Të dhënat e paketës
      doc.fontSize(12);
      doc.text(`Emri: ${pkg.emri}`);
      doc.text(`Mbiemri: ${pkg.mbiemri}`);
      doc.text(`Adresa: ${pkg.adresa}`);
      doc.text(`Qyteti: ${pkg.qyteti}`);
      doc.text(`Telefoni: ${pkg.telefoni}`);
      doc.text(`Email dërgues: ${pkg.emailSender}`);
      doc.text(`Email marrës: ${pkg.emailReceiver}`);
      doc.text(`Kg: ${pkg.kg}`);
      doc.text(`Çmimi: ${pkg.cmimi}`);
      doc.text(
        `Data: ${pkg.data ? new Date(pkg.data).toISOString().split('T')[0] : ''}`,
      );
      doc.text(`Tracking ID: ${pkg.trackingId}`);
      doc.text(`Status: ${pkg.status}`);

      doc.moveDown();
      doc.text('QR Code:', { underline: true });

      // Gjenerimi i QR Code‑it nga ID‑ja e paketës
      const qrData = JSON.stringify({ id: pkg._id });
      qrcode.toDataURL(qrData, { errorCorrectionLevel: 'H' }, (err, url) => {
        if (err) {
          doc.text('Error generating QR code');
        } else {
          doc.image(url, { fit: [150, 150] });
        }
        doc.end();
      });

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// Rrutat e API‑së

// POST /api/packages – Krijo një paketë të re
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
    const { kg, cmimi, data, trackingId, status } = req.body;

    const pkg = new Package({
      emri,
      mbiemri,
      adresa,
      qyteti,
      telefoni,
      emailSender,
      emailReceiver,
      kg,
      cmimi,
      data,
      trackingId: trackingId || mongoose.Types.ObjectId().toString().slice(-8),
      status: status || 'e re',
    });
    await pkg.save();

    // Gjenero PDF dhe dërgo email‑et
    const pdfPath = await generatePackagePdf(pkg);

    const mailOptionsSender = {
      from: process.env.EMAIL_USER,
      to: emailSender,
      subject: 'Konfirmim për regjistrimin e paketës',
      text: `Përshëndetje ${emri}, paketa juaj është regjistruar me sukses. ID: ${pkg._id}`,
      attachments: [
        { filename: `paketa_${pkg._id}.pdf`, path: pdfPath },
      ],
    };
    const mailOptionsReceiver = {
      from: process.env.EMAIL_USER,
      to: emailReceiver,
      subject: 'Informacion për paketën tuaj',
      text: `Përshëndetje, ju keni një paketë të dërguar nga ${emri} ${mbiemri}. ID e paketës: ${pkg._id}`,
      attachments: [
        { filename: `paketa_${pkg._id}.pdf`, path: pdfPath },
      ],
    };
    transporter.sendMail(mailOptionsSender).catch((err) => console.error(err));
    transporter.sendMail(mailOptionsReceiver).catch((err) => console.error(err));

    res.json({ success: true, package: pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/packages – Lista e pakove (vetëm admini)
app.get('/api/packages', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const packages = await Package.find().sort({ createdAt: -1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/packages/:id – Merr një paketë të vetme (duhet autentikim)
app.get('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Not found' });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/packages/:id – Përditëso paketë (vetëm admini)
app.put('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/packages/:id – Fshi paketë (vetëm admini)
app.delete('/api/packages/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    await Package.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/login – Autentikim
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '12h' },
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/register – Regjistro klient/biznes të ri
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, business } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role: 'client', business });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/register-operator – Shtoni një operator të ri (admin)
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

// GET /api/track/:trackingId – Gjurmo paketën publikisht
app.get('/api/track/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const pkg = await Package.findOne({ trackingId });
    if (!pkg) return res.status(404).json({ error: 'Not found' });
    res.json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/track/:trackingId/status – Përditëso statusin e paketës (postier ose admin)
app.put('/api/track/:trackingId/status', authenticateToken, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { status } = req.body;
    if (!['postier', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const pkg = await Package.findOneAndUpdate(
      { trackingId },
      { status: status || 'dorëzuar' },
      { new: true },
    );
    if (!pkg) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, package: pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/scan – Skanoni QR/BarKod (pa autentikim)
app.post('/api/scan', async (req, res) => {
  try {
    const { trackingId } = req.body;
    if (!trackingId) return res.status(400).json({ error: 'trackingId missing' });
    const pkg = await Package.findOne({ trackingId });
    if (!pkg) return res.status(404).json({ error: 'Not found' });
    res.json(pkg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/report – Raporti mujor (vetëm admini)
app.get('/api/report', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    const { month } = req.query; // formati: YYYY-MM
    if (!month) return res.status(400).json({ error: 'Parametri month i mungon' });
    const [year, monthNum] = month.split('-');
    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 1);
    const packages = await Package.find({ createdAt: { $gte: start, $lt: end } });
    // CSV me fushat e reja
    let report = 'ID,Emri,Mbiemri,Adresa,Qyteti,Telefoni,Email dërgues,Email marrës,Kg,Cmimi,Data,Tracking ID,Status\\n';
    packages.forEach((p) => {
      report += `${p._id},${p.emri},${p.mbiemri},${p.adresa},${p.qyteti},${p.telefoni},${p.emailSender},${p.emailReceiver},${p.kg},${p.cmimi},${p.createdAt.toISOString()},${p.trackingId},${p.status}\\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', \`attachment; filename=\"report_\${month}.csv\"\`);
    res.send(report);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Nis serverin
app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
