
# Production Deployment & API Key Configuration

To make MechanicNow fully functional with real payments, notifications, and data storage, you must configure the following services.

## 1. Stripe Connect (Payments)

You provided the secret reference: `projects/1049072117216/secrets/firestore-stripe-payments-STRIPE_API_KEY-lsz1`.

This indicates you are likely using the **"Install Stripe Payments"** extension or Google Cloud Secret Manager.

### How to Configure:
1.  **Frontend (`.env` file)**:
    You need the **Publishable Key** for the frontend.
    ```env
    VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
    ```

2.  **Backend (Cloud Functions)**:
    Do **NOT** put the secret key in the frontend code. Instead, deploy the backend functions (found in `functions/` if you create a firebase project) and grant them access to the secret.

    If using Firebase CLI to set the config:
    ```bash
    firebase functions:config:set stripe.secret="projects/1049072117216/secrets/firestore-stripe-payments-STRIPE_API_KEY-lsz1"
    ```

## 2. Firebase Storage (Image Uploads)

For mechanic licenses and insurance proofs:
1.  Go to **Firebase Console > Storage**.
2.  Click **"Get Started"** to create a bucket.
3.  Update `firestore.rules` (Storage tab) to allow writes:
    ```
    match /uploads/{userId}/{fileName} {
      allow write: if request.auth.uid == userId;
      allow read: if request.auth.uid == userId;
    }
    ```

## 3. Twilio (SMS Notifications)

1.  Get your **Account SID** and **Auth Token** from Twilio Console.
2.  Get a **Twilio Phone Number**.
3.  Set them in Firebase Config (Backend):
    ```bash
    firebase functions:config:set twilio.sid="AC..." twilio.token="..." twilio.phone="+1555..."
    ```

## 4. Checkr (Background Checks)

1.  Get your **API Key** from the Checkr Dashboard (Test or Live).
2.  Set in Firebase Config:
    ```bash
    firebase functions:config:set checkr.api_key="sk_..."
    ```

---

## Building for Production

When you are ready to deploy the React App:

1.  Create a file named `.env.production` in the root folder.
2.  Add your public keys:
    ```
    FIREBASE_API_KEY=AIza...
    FIREBASE_AUTH_DOMAIN=mechanicnow-19ed9.firebaseapp.com
    FIREBASE_PROJECT_ID=mechanicnow-19ed9
    FIREBASE_STORAGE_BUCKET=mechanicnow-19ed9.firebasestorage.app
    FIREBASE_MESSAGING_SENDER_ID=1049072117216
    FIREBASE_APP_ID=1:1049072117216:web:...
    ```
3.  Run the build command (if using Vite/Create React App):
    ```bash
    npm run build
    ```
4.  Deploy to Firebase Hosting:
    ```bash
    firebase deploy --only hosting
    ```
