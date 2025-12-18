# MechanicNow Deployment Checklist

This checklist covers all configuration steps required for full deployment.

## ✅ Frontend Environment Variables (.env.local)

Copy `.env.example` to `.env.local` and configure:

- [ ] **GEMINI_API_KEY** - Get from [AI Studio](https://aistudio.google.com/app/apikey)
- [ ] **FIREBASE_API_KEY** - From Firebase Console → Project Settings → Web App Config
- [ ] **FIREBASE_AUTH_DOMAIN** - Format: `your_project_id.firebaseapp.com`
- [ ] **FIREBASE_PROJECT_ID** - Your Firebase project ID
- [ ] **FIREBASE_STORAGE_BUCKET** - Format: `your_project_id.appspot.com`
- [ ] **FIREBASE_MESSAGING_SENDER_ID** - From Firebase Console
- [ ] **FIREBASE_APP_ID** - From Firebase Console
- [ ] **FIREBASE_MEASUREMENT_ID** - Format: `G-XXXXXXXXXX` (optional)
- [ ] **VITE_STRIPE_PUBLISHABLE_KEY** - Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## ✅ Firebase Project Setup

### Authentication
- [ ] Go to Firebase Console → Authentication
- [ ] Click "Get started"
- [ ] Enable "Email/Password" sign-in method

### Firestore Database
- [ ] Go to Firestore Database
- [ ] Create database (production mode recommended)
- [ ] Deploy security rules: `firebase deploy --only firestore:rules`

### Storage
- [ ] Go to Storage
- [ ] Get started and configure rules
- [ ] Enable for user uploads (profile pictures, documents)

### Cloud Functions
- [ ] Upgrade to Blaze (Pay as you go) plan
- [ ] Required for payment processing and notifications

## ✅ Firebase Functions Configuration

Set backend environment variables (from your project directory):

```bash
firebase functions:config:set \
  stripe.secret="sk_live_YOUR_STRIPE_SECRET_KEY" \
  twilio.sid="AC_YOUR_TWILIO_ACCOUNT_SID" \
  twilio.token="YOUR_TWILIO_AUTH_TOKEN" \
  twilio.phone="+1234567890" \
  checkr.api_key="YOUR_CHECKR_API_KEY"
```

### Individual Services Setup:

#### Stripe (Required for payments)
- [ ] Create account at [stripe.com](https://stripe.com)
- [ ] Get Secret Key from [Dashboard](https://dashboard.stripe.com/apikeys)
- [ ] Get Publishable Key (for frontend .env.local)
- [ ] Enable Stripe Connect in dashboard
- [ ] Configure redirect URLs in Connect settings

#### Twilio (Optional - for SMS notifications)
- [ ] Create account at [twilio.com](https://www.twilio.com)
- [ ] Get Account SID and Auth Token
- [ ] Purchase a phone number for sending SMS

#### Checkr (Optional - for background checks)
- [ ] Create account at [checkr.com](https://checkr.com)
- [ ] Get API key from dashboard
- [ ] Required for mechanic verification feature

## ✅ Stripe Connect Configuration

- [ ] Login to [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Go to Connect → Settings
- [ ] Add redirect URLs:
  - `https://yourdomain.com/mechanic-dashboard` (production)
  - `http://localhost:3000/mechanic-dashboard` (development)
- [ ] Choose account type: Express (recommended for MVP)

## ✅ Build and Deploy

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Deploy to Firebase
```bash
firebase deploy
```

This deploys:
- Frontend (Hosting)
- Cloud Functions (Backend)
- Firestore Rules
- Storage Rules

## ✅ Post-Deployment Verification

### Test Authentication
- [ ] Visit your deployed URL
- [ ] Try creating an account
- [ ] Test login/logout
- [ ] Verify user data saves to Firestore

### Test Payment Flow
- [ ] Use [Stripe test cards](https://stripe.com/docs/testing)
- [ ] Test card: `4242 4242 4242 4242`
- [ ] Verify payment intent creation
- [ ] Check Stripe Dashboard for test payments

### Test Mechanic Features
- [ ] Register as a mechanic
- [ ] Complete Stripe Connect onboarding
- [ ] Test accepting a job
- [ ] Verify earnings tracking

## 🔒 Security Checklist

- [ ] Never commit `.env.local` to Git (already in `.gitignore`)
- [ ] Use Firebase security rules to protect data
- [ ] Enable Firebase App Check (optional, for production)
- [ ] Use HTTPS only in production
- [ ] Regularly rotate API keys
- [ ] Enable 2FA on all service accounts (Firebase, Stripe, etc.)

## 📊 Monitoring (Optional but Recommended)

- [ ] Enable Firebase Analytics
- [ ] Set up Firebase Crashlytics
- [ ] Configure Stripe webhooks for payment events
- [ ] Set up error tracking (e.g., Sentry)

## 🚀 Production vs Development

### Development (.env.local)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
Use Stripe test keys and Firebase test project.

### Production (.env.local)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```
Use Stripe live keys and Firebase production project.

## 💡 Quick Start for Testing

If you want to test locally without all integrations:

1. **Minimum Configuration:**
   ```bash
   cp .env.example .env.local
   # Add only GEMINI_API_KEY and Firebase keys
   npm install --legacy-peer-deps
   npm run dev
   ```

2. **The app will run with limited functionality:**
   - ✅ UI and navigation works
   - ✅ Firebase Authentication works
   - ✅ AI car diagnosis works (with Gemini key)
   - ❌ Payments won't work (needs Stripe)
   - ❌ SMS won't work (needs Twilio)
   - ❌ Background checks won't work (needs Checkr)

## 📞 Support

For detailed setup instructions, see:
- [API_KEYS_INSTRUCTIONS.md](API_KEYS_INSTRUCTIONS.md) - Backend setup
- [STRIPE_SETUP.md](STRIPE_SETUP.md) - Stripe integration guide
- [FIREBASE_SETUP_VERIFICATION.md](FIREBASE_SETUP_VERIFICATION.md) - Firebase verification
