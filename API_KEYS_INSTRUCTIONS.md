
# Production Deployment & API Key Configuration

To make MechanicNow fully functional with real payments, notifications, and data storage, you must configure the following services.

## 1. Firebase Project Setup

1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Enable **Firestore Database**.
3.  Enable **Authentication** (Email/Password).
4.  Enable **Storage**.
5.  Enable **Functions** (Requires Blaze Plan / Billing enabled).

## 2. API Key Configuration

You must set the secret keys in the Firebase Functions environment so the backend code can access them.

Run the following command in your terminal:

```bash
firebase functions:config:set \
  stripe.secret="sk_live_..." \
  twilio.sid="AC..." \
  twilio.token="..." \
  twilio.phone="+15550000000" \
  checkr.api_key="..."
```

## 3. Deployment

1.  **Build the Frontend**:
    ```bash
    npm install
    npm run build
    ```

2.  **Deploy Backend & Frontend**:
    ```bash
    firebase deploy
    ```

## 4. Environment Variables (.env)

Ensure your frontend `.env` file contains the public keys:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
```

## 5. Stripe Connect Settings

1.  In Stripe Dashboard, go to **Connect > Settings**.
2.  Add your production URL (e.g., `https://mechanicnow.app/mechanic-dashboard`) to the **Redirects** allowlist.

