const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5000;

// Create HTTP server to integrate both Express logic and WebSockets together
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets')); 
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Middleware Configurations ---
app.use(express.json());
app.use(cors());

// Serve static layout files from root, and explicitly expose the upload folder
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- Database Connection ---
mongoose.connect('mongodb+srv://sanjanaverma200320_db_user:3XHozPoT8VYbgTH7@cluster0.wekcyix.mongodb.net/dreamlander?appName=Cluster0')
  .then(() => console.log('Connected Securely to MongoDB Atlas Cloud System.'))
  .catch(err => console.error('Database Connectivity Failure Context:', err));

// --- Database Schemas & Models Definitions ---
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    eventType: { type: String, required: true },
    eventDate: { type: Date, required: true },
    guests: { type: Number },
    message: { type: String }
}));

const Review = mongoose.model('Review', new mongoose.Schema({
    name: { type: String, required: true },
    message: { type: String, required: true },
    avatar: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now }
}));

const Payment = mongoose.model('Payment', new mongoose.Schema({
    paymentId: String,
    email: String,
    amount: Number,
    currency: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
}));

// --- Custom Front-End HTML View Route Mappings ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname,  'index.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname,  'checkout.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname,  'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname,  'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));

// --- REST API Endpoints ---

// 1. User Account Registration Route
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'This email account is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: 'Registration completed successfully! Please login to continue.' });
    } catch (err) {
        res.status(500).json({ message: 'Server Signup failure operational error.' });
    }
});

// 2. User Authentication & JWT Session Generation Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid email components or password credentials.' });
        }

        const token = jwt.sign({ id: user._id }, 'APP_JWT_SECRET_KEY_HOOK', { expiresIn: '2h' });
        res.status(200).json({ token, name: user.name, message: "Login successful!" });
    } catch (err) {
        res.status(500).json({ message: 'Server Login execution pipeline dropped.' });
    }
});

// 3. Client Event Booking Submission Route
app.post('/api/bookings', async (req, res) => {
    try {
        const entry = new Booking(req.body);
        await entry.save();
        res.status(201).json({ message: 'Saved client entry processing array hook details.' });
    } catch (err) {
        res.status(500).json({ message: 'Error processing server persistent structure dataset allocation.' });
    }
});

// 4. Secure Sandbox Checkout Retainer Payment Route
app.post('/api/checkout', async (req, res) => {
    try {
        const { email, amount, currency } = req.body;

        const randomId = 'mock_ch_' + Math.random().toString(36).substr(2, 9);
        const newPayment = {
            paymentId: randomId,
            email: email,
            amount: amount,
            currency: currency,
            status: 'paid'
        };

        const savedPayment = await Payment.create(newPayment);
        io.emit('payment_received', savedPayment);

        res.json({ status: 'paid', success: true, payment: savedPayment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Fetch Global Payment Ledger Ledger History for Admin Dashboard
app.get('/api/payments', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 }).limit(50);
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Route to get all stored reviews for the homepage
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reviews.' });
    }
});

// 7. Route to submit a new review WITH a custom file upload
app.post('/api/reviews', upload.single('avatar'), async (req, res) => {
    try {
        const { name, message } = req.body;
        if (!name || !message) {
            return res.status(400).json({ message: 'Name and message are required.' });
        }

        let avatarPath = 'assets/review.png';
        if (req.file) {
            avatarPath = 'assets/' + req.file.filename;
        }

        const newReview = new Review({ 
            name, 
            message, 
            avatar: avatarPath 
        });
        
        await newReview.save();
        io.emit('review_published', newReview);

        res.status(201).json({ success: true, review: newReview });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error while uploading review.' });
    }
});

// 8. Route to delete a specific review by its unique ID (Moved safely above server.listen)
app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        
        const deletedReview = await Review.findByIdAndDelete(reviewId);
        if (!deletedReview) {
            return res.status(404).json({ message: "Review not found." });
        }

        io.emit('review_deleted', reviewId);
        res.status(200).json({ success: true, message: "Review removed successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while deleting review." });
    }
});

// --- Socket.io Live Monitoring Channel Hooks ---
io.on('connection', (socket) => {
    console.log('Admin dashboard live monitoring tab hooked in.');
});

// --- Boot Application Server Pipeline ---
server.listen(PORT, () => {
    console.log(`Dream Lander unified ecosystem executing live on http://localhost:${PORT}`);
});
