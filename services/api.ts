
import { UserProfile, JobRequest, PaymentMethod, Mechanic, MechanicRegistrationData } from '../types';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
// Shim for missing types in current environment
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail 
} = firebaseAuth as any;
type User = any;

import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, query, limit, orderBy, where, increment, serverTimestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- FIREBASE CONFIGURATION ---
// Ensure these are set in your .env file for Production
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, 
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

let db: any, auth: any, storage: any, functions: any;

try {
  // Attempt to initialize using different export patterns to handle environment inconsistencies
  const app = (firebaseApp as any).initializeApp 
    ? (firebaseApp as any).initializeApp(firebaseConfig) 
    : (firebaseApp as any).default.initializeApp(firebaseConfig);
    
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  // Lazy load analytics with safety check for named export vs default export
  if (typeof window !== 'undefined') {
      import('firebase/analytics').then((analyticsMod: any) => {
        const getAnalytics = analyticsMod.getAnalytics || analyticsMod.default?.getAnalytics;
        if (getAnalytics) {
          try { getAnalytics(app); } catch (e) { console.warn("Analytics failed to load", e); }
        }
      });
  }

  console.log(`✅ [MechanicNow] Connected to Google Cloud: ${firebaseConfig.projectId}`);
} catch (e) {
  console.error("❌ Firebase initialization failed. Please check your configuration.", e);
}

// --- Data Conversion Helper ---
const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    
    // Check for Firestore Timestamp (seconds, nanoseconds)
    if (data.seconds !== undefined && data.nanoseconds !== undefined) {
        return new Date(data.seconds * 1000).toISOString();
    }
    
    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    
    const newData: any = {};
    for (const key of Object.keys(data)) {
        newData[key] = convertTimestamps(data[key]);
    }
    return newData;
};

const mapUser = (user: User, data?: any): UserProfile => ({
  id: user.uid,
  name: user.displayName || data?.name || 'User',
  email: user.email || '',
  avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || data?.name || 'User')}&background=0D8ABC&color=fff`,
  phone: data?.phone,
  address: data?.address,
  bio: data?.bio,
  isMechanic: data?.isMechanic,
  isAdmin: data?.isAdmin,
  vehicles: data?.vehicles || [],
  history: convertTimestamps(data?.history || [])
});

const RealApi = {
  status: { getConnectionInfo: () => ({ mode: 'REAL' as const, connected: !!auth, provider: 'Google Cloud' }) },
  
  auth: {
    login: async (name: string, email: string, password?: string): Promise<UserProfile> => {
      if (!auth) throw new Error("Firebase not initialized");
      if (!password) throw new Error("Password is required.");
      
      let user: User;
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials' || e.code === 'auth/invalid-email') {
             try {
                 const cred = await createUserWithEmailAndPassword(auth, email, password);
                 user = cred.user;
                 await updateProfile(user, { displayName: name });
                 await setDoc(doc(db, 'users', user.uid), { 
                     name: name || email.split('@')[0], 
                     email, 
                     vehicles: [], 
                     history: [], 
                     isMechanic: false,
                     createdAt: serverTimestamp() 
                });
             } catch (regError: any) {
                 if (regError.code === 'auth/email-already-in-use') {
                     throw new Error("Incorrect password for existing account.");
                 }
                 throw regError;
             }
        } else {
            throw e;
        }
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        return mapUser(user, userDoc.data());
      } catch (e) {
        return mapUser(user);
      }
    },

    logout: async () => { if (auth) await signOut(auth); },
    
    getCurrentUser: async (): Promise<UserProfile | null> => {
      if (!auth) return null;
      return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
              unsubscribe();
              if (user) {
                  try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    resolve(mapUser(user, userDoc.data()));
                  } catch(e) { resolve(mapUser(user)); }
              } else { resolve(null); }
          });
      });
    },

    updateProfile: async (user: UserProfile) => {
      if (!auth?.currentUser) throw new Error("Not authenticated");
      const updateData: any = {
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          vehicles: JSON.parse(JSON.stringify(user.vehicles)),
          history: JSON.parse(JSON.stringify(user.history))
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);
      return user;
    },

    resetPassword: async (email: string) => {
        if (!auth) throw new Error("Not initialized");
        await sendPasswordResetEmail(auth, email);
    }
  },

  payment: {
    // Calls Firebase Cloud Function 'createPaymentIntent'
    createPaymentIntent: async (amount: number, currency: string = 'usd', mechanicId?: string) => {
        if (!functions || !db) throw new Error("Functions not initialized");

        // Resolve Stripe Connect Account ID from mechanic's profile if possible
        let stripeDestination = undefined;
        if (mechanicId) {
             try {
                 const mechDoc = await getDoc(doc(db, 'mechanics', mechanicId));
                 if (mechDoc.exists() && mechDoc.data().stripeAccountId) {
                     stripeDestination = mechDoc.data().stripeAccountId;
                 }
             } catch(e) {
                 console.warn("Could not resolve Stripe Account ID", e);
             }
        }

        const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
        
        try {
            // Pass the split payment details to the backend
            const result: any = await createPaymentIntentFn({ amount, currency, mechanicStripeId: stripeDestination });
            return result.data as { clientSecret: string, id: string };
        } catch (e: any) {
            console.error("Payment Intent Error:", e);
            throw new Error(e.message || "Failed to initiate payment");
        }
    },
    authorize: async (amount: number, method: PaymentMethod) => {
        // Wrapper for logging; actual auth happens via Stripe Elements on client
        return { success: true, transactionId: `tx_${Date.now()}` };
    },
    // Calls Firebase Cloud Function 'capturePayment'
    capture: async (jobId: string, amount: number) => {
         if (!functions) throw new Error("Functions not initialized");
         const capturePaymentFn = httpsCallable(functions, 'capturePayment');
         
         try {
             await capturePaymentFn({ jobId, amount });
             return { success: true };
         } catch (e: any) {
             console.error("Capture Error:", e);
             throw new Error("Failed to capture payment");
         }
    }
  },
  
  notifications: {
      sendSMS: async (phone: string, message: string) => {
          if (!functions) return false;
          const sendSmsFn = httpsCallable(functions, 'sendSms');
          try {
              await sendSmsFn({ phone, message });
              return true;
          } catch(e) { 
              console.error("SMS Failed", e);
              return false; 
          }
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          if (!functions) return false;
          const sendEmailFn = httpsCallable(functions, 'sendEmail');
          try {
              await sendEmailFn({ email, subject, body });
              return true;
          } catch(e) {
              console.error("Email Failed", e);
              return false;
          }
      }
  },

  storage: {
      uploadFile: async (file: File, path: string) => {
          if (!storage || !auth?.currentUser) throw new Error("Storage unavailable");
          const storageRef = ref(storage, `uploads/${auth.currentUser.uid}/${path}/${file.name}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
      }
  },

  support: {
      createTicket: async (jobId: string, subject: string, message: string) => {
          if (!db || !auth?.currentUser) throw new Error("DB unavailable");
          const docRef = await addDoc(collection(db, 'support_tickets'), {
              userId: auth.currentUser.uid,
              jobId,
              subject,
              message,
              status: 'OPEN',
              createdAt: serverTimestamp()
          });
          return docRef.id;
      }
  },

  mechanic: {
    register: async (data: MechanicRegistrationData) => {
        if (!auth || !db) throw new Error("Firebase not initialized");
        if (!data.password) throw new Error("Password required");

        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = cred.user;
        await updateProfile(user, { displayName: data.name });

        await setDoc(doc(db, 'users', user.uid), {
            name: data.name,
            email: data.email,
            isMechanic: true,
            phone: data.phone,
            vehicles: [],
            history: [],
            createdAt: serverTimestamp()
        });

        const mechanicData: Partial<Mechanic> = {
            id: user.uid,
            name: data.name,
            rating: 5.0, 
            jobsCompleted: 0,
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff`,
            bio: data.bio,
            yearsExperience: data.yearsExperience,
            specialties: data.specialties,
            certifications: data.certifications,
            availability: 'Offline',
            reviews: [],
            lat: 36.8508, 
            lng: -76.2859,
            verified: false
        };
        await setDoc(doc(db, 'mechanics', user.uid), mechanicData);
        
        await RealApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");

        return mapUser(user, { name: data.name });
    },
    verifyBackground: async (email: string, ssn: string) => {
        if (!functions) throw new Error("Functions not initialized");
        const verifyFn = httpsCallable(functions, 'verifyBackground');
        try {
            const result: any = await verifyFn({ email, ssn });
            return result.data;
        } catch (e: any) {
            console.warn("Background Check Trigger Failed", e);
            return { status: 'pending_manual' };
        }
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
       if (!db) return [];
       // Only show active and verified mechanics in production
       const q = query(collection(db, 'mechanics'), where('availability', '!=', 'Offline'), where('verified', '==', true));
       const snapshot = await getDocs(q);
       
       return snapshot.docs.map(d => {
           const data = d.data();
           const mockDist = Math.sqrt(Math.pow(data.lat - lat, 2) + Math.pow(data.lng - lng, 2)) * 69; 
           
           return {
               id: d.id,
               name: data.name || 'Unknown Mechanic',
               rating: data.rating || 5.0,
               jobsCompleted: data.jobsCompleted || 0,
               avatar: data.avatar || 'https://via.placeholder.com/150',
               distance: `${mockDist.toFixed(1)} mi`,
               eta: '20 min',
               availability: data.availability || 'Available Now',
               yearsExperience: data.yearsExperience || 1,
               bio: data.bio || '',
               specialties: data.specialties || [],
               certifications: data.certifications || [],
               reviews: data.reviews || [],
               lat: data.lat || lat,
               lng: data.lng || lng,
               verified: !!data.verified
           } as Mechanic;
       });
    },

    getDashboardData: async () => {
      if (!auth?.currentUser) throw new Error("Not authenticated");
      
      const qNew = query(collection(db, 'job_requests'), where('status', '==', 'NEW'), limit(50));
      const qMy = query(collection(db, 'job_requests'), where('mechanicId', '==', auth.currentUser.uid), limit(50));
      
      const [snapNew, snapMy] = await Promise.all([getDocs(qNew), getDocs(qMy)]);
      
      const requestsMap = new Map();
      snapNew.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      snapMy.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      
      const requests = Array.from(requestsMap.values()).sort((a:any, b:any) => {
           const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
           const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
           return tB - tA;
      });

      const statsDoc = await getDoc(doc(db, 'mechanics', auth.currentUser.uid));
      const statsData = (statsDoc.exists() ? statsDoc.data() as any : null) || { earnings: { today: 0, week: 0, month: 0 }, isOnline: false };

      return { requests, earnings: statsData.earnings || { today: 0, week: 0, month: 0 }, isOnline: !!statsData.isOnline, stripeConnected: !!statsData.stripeConnected };
    },
    
    createStripeConnectAccount: async () => {
        if (!functions) throw new Error("Functions not initialized");
        const createAccountFn = httpsCallable(functions, 'createConnectAccount');
        try {
            const result: any = await createAccountFn({ email: auth.currentUser?.email });
            return result.data; // { url, accountId }
        } catch(e: any) {
            throw new Error("Failed to init Stripe Connect");
        }
    },
    
    onboardStripe: async (authCode?: string) => {
         if (!functions) throw new Error("Functions not initialized");
         const onboardFn = httpsCallable(functions, 'onboardStripe');
         try {
             // Pass the authorization code if using standard connect, or just trigger verification
             const result: any = await onboardFn({ code: authCode });
             
             // Update local firestore to reflect connected status if function doesn't do it
             if (result.data?.success && auth.currentUser) {
                 await updateDoc(doc(db, 'mechanics', auth.currentUser.uid), { stripeConnected: true });
             }
             
             return result.data;
         } catch(e: any) {
             console.error("Stripe Onboarding Failed", e);
             throw new Error("Stripe Onboarding Failed");
         }
    },

    payoutToBank: async (amount: number) => {
        if (!auth?.currentUser || !db || !functions) throw new Error("Error");
        
        const payoutFn = httpsCallable(functions, 'payoutToBank');
        try {
            await payoutFn({ amount });
            
            const ref = doc(db, 'mechanics', auth.currentUser.uid);
            await updateDoc(ref, { "earnings.week": 0 });
            return { success: true };
        } catch(e) {
            throw new Error("Payout failed");
        }
    },

    createJobRequest: async (job: JobRequest) => {
        if (!db) throw new Error("Database not connected");
        const safeJob = JSON.parse(JSON.stringify({ 
            ...job, 
            customerId: auth.currentUser?.uid,
            createdAt: serverTimestamp() 
        }));
        
        await setDoc(doc(db, 'job_requests', job.id), safeJob);
        
        if (job.mechanicId) {
            RealApi.notifications.sendSMS("+15550000000", `New Job Request: ${job.vehicle}`);
        }
        
        return job.id;
    },

    updateStatus: async (isOnline: boolean) => {
       if (!auth?.currentUser) return false;
       await updateDoc(doc(db, 'mechanics', auth.currentUser.uid), { isOnline, availability: isOnline ? 'Available Now' : 'Offline' });
       return isOnline;
    },

    updateJobRequest: async (updatedJob: JobRequest) => {
       if (!db) throw new Error("Database not connected");
       const safeJob = JSON.parse(JSON.stringify(updatedJob));
       delete safeJob.createdAt;
       
       await updateDoc(doc(db, 'job_requests', updatedJob.id), safeJob);
       
       if (updatedJob.status === 'ACCEPTED') {
          RealApi.notifications.sendSMS("+15550000000", `MechanicNow: Your mechanic is on the way!`);
       } else if (updatedJob.status === 'ARRIVED') {
           RealApi.notifications.sendSMS("+15550000000", `MechanicNow: Your mechanic has arrived.`);
       }

       return updatedJob;
    },

    updateLocation: async (jobId: string, lat: number, lng: number) => {
        if (!db) return;
        await updateDoc(doc(db, 'job_requests', jobId), { driverLocation: { lat, lng } });
    },

    deleteJobRequest: async (jobId: string) => {
       if (!db) throw new Error("Database not connected");
       await deleteDoc(doc(db, 'job_requests', jobId));
       return true;
    },

    updateEarnings: async (amount: number) => {
       if (!auth?.currentUser) return { today: 0, week: 0, month: 0 };
       
       const statsRef = doc(db, 'mechanics', auth.currentUser.uid);
       await updateDoc(statsRef, {
           "earnings.today": increment(amount),
           "earnings.week": increment(amount),
           "earnings.month": increment(amount)
       });
       
       return { today: 0, week: 0, month: 0 }; 
    },

    resetDemoData: async () => {
       // No-op in real api
       return { requests: [], earnings: { today: 0, week: 0, month: 0 }, isOnline: false };
    },

    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        if (!db) return () => {};
        return onSnapshot(doc(db, 'job_requests', jobId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...convertTimestamps(doc.data()) } as JobRequest);
        });
    },

    subscribeToDashboard: (callback: (data: any) => void) => {
        if (!db || !auth.currentUser) return () => {};
        
        const qNew = query(collection(db, 'job_requests'), where('status', '==', 'NEW'), limit(50));
        const qMy = query(collection(db, 'job_requests'), where('mechanicId', '==', auth.currentUser.uid), limit(50));
        
        let newJobs: JobRequest[] = [];
        let myJobs: JobRequest[] = [];

        const mergeAndNotify = () => {
             const allMap = new Map();
             newJobs.forEach(j => allMap.set(j.id, j));
             myJobs.forEach(j => allMap.set(j.id, j));
             
             const requests = Array.from(allMap.values()).sort((a:any, b:any) => {
                 const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                 const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                 return tB - tA;
             });
             
             callback({ requests });
        };

        const unsubNew = onSnapshot(qNew, (snapshot) => {
            newJobs = snapshot.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as JobRequest));
            mergeAndNotify();
        });

        const unsubMy = on