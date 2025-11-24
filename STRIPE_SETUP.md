
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
    application_fee_amount: data.amount * 0.20, // 20% platform fee
    transfer_data: {
      destination: data.mechanicStripeId, // The mechanic's connect account ID
    },
  });
  return { clientSecret: paymentIntent.client_secret };
});
```

## 4. Frontend Integration
1. Install `@stripe/react-stripe-js` and `@stripe/stripe-js`.
2. Wrap your `BookingConfirmation` component in `<Elements>`.
3. Use `useStripe()` and `useElements()` to handle the card submission using the `clientSecret` returned from your backend.
