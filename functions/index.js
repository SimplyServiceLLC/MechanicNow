
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// --- Configuration ---
// Safely access config to prevent crashes if keys are missing during deployment
const config = functions.config();
const stripeSecret = config.stripe ? config.stripe.secret : 'sk_test_mock';
const endpointSecret = config.stripe ? config.stripe.webhook_secret : '';
const stripe = require('stripe')(stripeSecret);

const twilioSid = config.twilio ? config.twilio.sid : undefined;
const twilioToken = config.twilio ? config.twilio.token : undefined;
const twilioPhone = config.twilio ? config.twilio.phone : undefined;

let twilioClient;
if (twilioSid && twilioToken) {
    try {
        twilioClient = require('twilio')(twilioSid, twilioToken);
    } catch(e) {
        console.warn("Twilio init failed", e);
    }
}

// Nodemailer Transporter
const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.email ? config.email.user : 'test@example.com',
        pass: config.email ? config.email.pass : 'password',
    },
});

// --- Stripe Connect & Payments ---

// 1. Initiate Stripe Connect Onboarding
exports.createConnectAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  
  // Create an Express account for the mechanic
  const account = await stripe.accounts.create({
    type: 'express',
    email: data.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Create the account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://mechanicnow.app/mechanic-dashboard', // Replace with your production URL
    return_url: 'https://mechanicnow.app/mechanic-dashboard',
    type: 'account_onboarding',
  });

  return { url: accountLink.url, accountId: account.id };
});

// 2. Finalize Stripe Onboarding
exports.onboardStripe = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    
    // In a real flow, you might fetch the account status from Stripe here
    await db.collection('mechanics').doc(context.auth.uid).update({
        stripeConnected: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// 3. Create Payment Intent (Split Payment)
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { amount, currency, mechanicStripeId } = data;
    
    const paymentIntentConfig = {
        amount: amount,
        currency: currency || 'usd',
        capture_method: 'manual', // Hold funds
        application_fee_amount: Math.round(amount * 0.20), // 20% Platform Fee
    };

    // If mechanic is connected, set transfer destination
    if (mechanicStripeId) {
        paymentIntentConfig.transfer_data = {
            destination: mechanicStripeId,
        };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);
    
    return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
});

// 4. Capture Payment (Job Completion)
exports.capturePayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { jobId, amount } = data;
    const jobRef = db.collection('job_requests').doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) throw new functions.https.HttpsError('not-found', 'Job not found.');
    
    const paymentIntentId = jobDoc.data().paymentIntentId;
    if (!paymentIntentId) throw new functions.https.HttpsError('failed-precondition', 'No payment intent found.');

    // Capture the funds
    try {
        await stripe.paymentIntents.capture(paymentIntentId, {
            amount_to_capture: Math.round(amount * 100)
        });
        
        await jobRef.update({ paymentStatus: 'CAPTURED', status: 'COMPLETED' });
        
        return { success: true };
    } catch (error) {
        console.error("Capture failed", error);
        throw new functions.https.HttpsError('internal', 'Payment capture failed.');
    }
});

// 5. Payout to Bank (Mechanic Cash Out)
exports.payoutToBank = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const mechanicRef = db.collection('mechanics').doc(context.auth.uid);
    const mechDoc = await mechanicRef.get();
    const stripeAccountId = mechDoc.data().stripeAccountId;

    if (!stripeAccountId) throw new functions.https.HttpsError('failed-precondition', 'Stripe account not connected.');

    try {
        const payout = await stripe.payouts.create({
            amount: Math.round(data.amount * 100),
            currency: 'usd',
        }, {
            stripeAccount: stripeAccountId,
        });

        // Reset local earnings tracking (optional, depends on your ledger logic)
        await mechanicRef.update({ "earnings.week": 0 });

        return { success: true, payoutId: payout.id };
    } catch (e) {
        console.error("Payout Failed", e);
        throw new functions.https.HttpsError('internal', 'Payout failed: ' + e.message);
    }
});

// --- Reviews ---

exports.submitReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const { mechanicId, jobId, rating, text, authorName } = data;

    const mechanicRef = db.collection('mechanics').doc(mechanicId);
    
    await db.runTransaction(async (t) => {
        const mechDoc = await t.get(mechanicRef);
        if (!mechDoc.exists) throw new functions.https.HttpsError('not-found', 'Mechanic not found');

        const currentData = mechDoc.data();
        const currentReviews = currentData.reviews || [];
        const currentRating = currentData.rating || 5.0;
        
        // Calculate new average
        const newReview = {
            id: 'rev_' + Date.now(),
            author: authorName,
            rating: Number(rating),
            text: text,
            date: new Date().toLocaleDateString()
        };
        
        const newReviews = [newReview, ...currentReviews];
        const totalScore = newReviews.reduce((acc, r) => acc + r.rating, 0);
        const newAvg = totalScore / newReviews.length;

        // Update mechanic
        t.update(mechanicRef, {
            reviews: newReviews,
            rating: parseFloat(newAvg.toFixed(1))
        });

        // Mark job as reviewed (optional)
        const jobRef = db.collection('job_requests').doc(jobId);
        t.update(jobRef, { hasReview: true });
    });

    return { success: true };
});

// --- Notifications ---

exports.sendSms = functions.https.onCall(async (data, context) => {
    if (!twilioClient) return { success: false, error: "Twilio not configured" };
    
    try {
        await twilioClient.messages.create({
            body: data.message,
            from: twilioPhone,
            to: data.phone
        });
        
        // Log SMS to Firestore for Admin Panel
        await db.collection('sms_logs').add({
            to: data.phone,
            body: data.message,
            status: 'sent',
            sid: 'mock_sid',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (e) {
        console.error("SMS Error", e);
        return { success: false, error: e.message };
    }
});

exports.sendEmail = functions.https.onCall(async (data, context) => {
    const mailOptions = {
        from: '"MechanicNow" <noreply@mechanicnow.app>',
        to: data.email,
        subject: data.subject,
        text: data.body,
    };

    try {
        await mailTransport.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new functions.https.HttpsError('internal', 'Unable to send email');
    }
});

// --- Background Checks ---

exports.verifyBackground = functions.https.onCall(async (data, context) => {
    // In a production environment, this would call the Checkr API
    // For this deployment, we simulate a successful check
    
    // const checkr = require('checkr-api')(config.checkr.api_key);
    // const candidate = await checkr.candidates.create({ ... });
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { status: 'clear', id: 'chk_' + Date.now() };
});

// --- Webhooks ---

exports.stripeWebhook = functions.https.onRequest(async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment logic here (e.g., update DB if not handled by client)
      break;
    case 'account.updated':
      const account = event.data.object;
      if (account.payouts_enabled) {
          // Find mechanic by stripeAccountId and update status
          const snapshot = await db.collection('mechanics').where('stripeAccountId', '==', account.id).get();
          if (!snapshot.empty) {
              snapshot.docs[0].ref.update({ stripeConnected: true });
          }
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.json({received: true});
});
