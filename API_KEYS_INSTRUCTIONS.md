

# Production Deployment & API Key Configuration

To make MechanicNow fully functional with real payments, notifications, and data storage, you must configure the following services.

## 1. Firebase Project Setup

1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Enable **Firestore Database**:
    - Go to Firestore Database section
    - Click "Create database"
    - Choose production mode or test mode
    - Select a region closest to your users
3.  Enable **Authentication** (Email/Password):
    - Go to Authentication section
    - Click "Get started"
    - Enable "Email/Password" provider under Sign-in methods
4.  Enable **Storage**:
    - Go to Storage section
    - Click "Get started"
    - Configure security rules as needed
5.  Enable **Functions** (Requires Blaze Plan / Billing enabled):
    - Go to Functions section
    - Upgrade to Blaze plan if needed
6.  Get your **Web App Configuration**:
    - Go to Project Settings (gear icon)
    - Scroll down to "Your apps" section
    - Click the web icon (</>) to register a web app
    - Copy the firebaseConfig object values
    - Add these values to your `.env.local` file

## 2. API Key Configuration

You must set the secret keys in the Firebase Functions environment so the backend code can access them.

Run the following command in your terminal:

```bash
firebase functions:config:set \
  stripe.secret="sk_live_..." \
  twilio.sid="AC..." \
  twilio.token="..." \
  twilio.phone="+15550000000" \
  email.user="your_email@gmail.com" \
  email.pass="your_app_password" \
  checkr.api_key="..."
```

## 3. Deployment

1.  **Set Frontend Keys**: Create a `.env` file with `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

2.  **Build the Frontend**:
    ```bash
    npm install
    npm run build
    ```

3.  **Deploy Backend & Frontend**:
    ```bash
    firebase deploy
    ```

## 4. Environment Variables (.env.local)

Ensure your `.env.local` file contains all required keys. A template is provided in the repository:

```env
# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (from Firebase Console Project Settings)
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Stripe (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## 5. Stripe Connect Settings

1.  In Stripe Dashboard, go to **Connect > Settings**.
2.  Add your production URL (e.g., `https://mechanicnow.app/mechanic-dashboard`) to the **Redirects** allowlist.
