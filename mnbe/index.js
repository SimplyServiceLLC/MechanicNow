const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
let db;
try {
  // In production, Firebase Admin SDK will use Application Default Credentials
  // or credentials from GOOGLE_APPLICATION_CREDENTIALS environment variable
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  db = admin.firestore();
} catch (error) {
  console.warn('Firebase Admin initialization skipped (credentials not available):', error.message);
  db = null;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MechanicNow Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API Info endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'MechanicNow Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      stripe: '/api/stripe/*',
      notifications: '/api/notifications/*'
    }
  });
});

// Stripe endpoints placeholder
app.post('/api/stripe/create-connect-account', async (req, res) => {
  try {
    // This would integrate with Stripe API
    res.json({ 
      message: 'Stripe Connect account creation endpoint',
      note: 'Configure STRIPE_SECRET_KEY environment variable'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notification endpoints placeholder
app.post('/api/notifications/sms', async (req, res) => {
  try {
    res.json({ 
      message: 'SMS notification endpoint',
      note: 'Configure Twilio credentials'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MechanicNow Backend API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
