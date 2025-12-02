

# Stripe Connect Integration Guide for MechanicNow

## 1. Create a Stripe Connect Platform Account
1. Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Create an account and name your platform "MechanicNow".
3. Navigate to **Connect** settings.
4. Select **Express** accounts for your mechanics (easiest onboarding) or **Custom** (full white-label). Express is recommended for MVP.

## 2. Backend Implementation (Firebase Cloud Functions)
You need a secure backend to talk to Stripe. Do NOT put secret keys in your frontend code.

Install dependencies in your functions folder:
`npm install stripe`

Create a function to onboard mechanics:
```javascript
const stripe = require('stripe')(functions.config().stripe.secret_key);

exports.createConnectAccount = functions.https.onCall(async (data, context) => {
  const account = await stripe.accounts.create({
    type: 'express',
    email: data.email,
    capabilities: {
      card_payments: {requested: true},
      transfers: {requested: true},
    },
  });
  
  // Return the account link for the mechanic to finish setup
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://mechanicnow.app/dashboard',
    return_url: 'https://mechanicnow.app/dashboard',
    type: 'account_onboarding',
  });
  
  return { url: accountLink.url, accountId: account.id };
});
```

## 3. Creating Payments (Split Payments)
When a customer pays, you collect the money and split it automatically.

```javascript
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: data.amount, // e.g. 10000 (100.00)
    currency: 'usd',
    capture_method: 'manual', // Important: Hold funds until job completion
    application_fee_amount: data.amount * 0.20, // 20% platform fee
    transfer_data: {
      destination: data.mechanicStripeId, // The mechanic's connect account ID
    },
  });
  return { clientSecret: paymentIntent.client_secret };
});
```

## 4. Capturing Payments & Payouts
When the mechanic completes the job, capture the funds. This automatically triggers the transfer to the mechanic's Stripe balance.

```javascript
const admin = require('firebase-admin');

exports.capturePayment = functions.https.onCall(async (data, context) => {
    // data.jobId is passed from frontend
    // Retrieve the paymentIntentId from the Job document in Firestore
    const jobDoc = await admin.firestore().collection('job_requests').doc(data.jobId).get();
    const paymentIntentId = jobDoc.data().paymentIntentId;

    if (!paymentIntentId) throw new Error("No payment method on file.");

    // Capture the funds (finalizes the charge)
    const intent = await stripe.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: Math.round(data.amount * 100) // Support partial capture if total changed
    });
    
    return { success: true };
});

exports.payoutToBank = functions.https.onCall(async (data, context) => {
    // Triggered when mechanic clicks "Cash Out"
    // Requires the mechanic's Stripe Account ID stored in their profile
    const mechanicId = context.auth.uid;
    const mechDoc = await admin.firestore().collection('mechanics').doc(mechanicId).get();
    const stripeAccountId = mechDoc.data().stripeAccountId;

    if (!stripeAccountId) throw new Error("Stripe account not connected");

    // Create a payout to their external bank account
    const payout = await stripe.payouts.create({
        amount: Math.round(data.amount * 100),
        currency: 'usd',
    }, {
        stripeAccount: stripeAccountId,
    });

    return { success: true, payoutId: payout.id };
});
```

## 5. Frontend Integration
1. Install `@stripe/react-stripe-js` and `@stripe/stripe-js`.
2. Wrap your `BookingConfirmation` component in `<Elements>`.
3. Use `useStripe()` and `useElements()` to handle the card submission using the `clientSecret` returned from your backend.