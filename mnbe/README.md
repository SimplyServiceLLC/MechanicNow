# MechanicNow Backend API

This is a standalone Express.js backend for MechanicNow, deployable to platforms like Render.com.

## Purpose

The main application uses Firebase Cloud Functions (in the `functions/` directory) for its backend. This directory provides an alternative Express.js backend that can be deployed to traditional hosting platforms.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   export PORT=3000
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-credentials.json
   export STRIPE_SECRET_KEY=sk_test_...
   ```

3. Run the server:
   ```bash
   npm start
   ```

4. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Deployment to Render

1. In your Render dashboard, create a new Web Service
2. Connect your GitHub repository
3. Set the **Root Directory** to: `mnbe`
4. Set the **Build Command** to: `npm install`
5. Set the **Start Command** to: `npm start`
6. Add environment variables:
   - `GOOGLE_APPLICATION_CREDENTIALS` (for Firebase)
   - `STRIPE_SECRET_KEY` (for Stripe payments)
   - `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (for SMS)

## Environment Variables

- `PORT`: Server port (default: 3000, Render sets this automatically)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Firebase service account JSON
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /api/stripe/create-connect-account` - Create Stripe Connect account
- `POST /api/notifications/sms` - Send SMS notification

## Note

This backend is a minimal implementation. For full functionality, see the Firebase Cloud Functions in the `functions/` directory which contain the complete business logic.
