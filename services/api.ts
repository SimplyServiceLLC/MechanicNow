

import { UserProfile, JobRequest, PaymentMethod, Mechanic, MechanicRegistrationData } from '../types';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { 
    getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, 
    onSnapshot, query, limit, orderBy, where, increment, serverTimestamp, addDoc,
    getCountFromServer 
} from 'firebase/firestore';
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

let db: any = null;
let auth: any = null;
let storage: any = null;
let functions: any = null;

try {
  // Check if config is populated
  const hasConfig = Object.values(firebaseConfig).some(v => v !== undefined && v !== '');
  
  if (hasConfig) {
      const app = (firebaseApp as any).initializeApp 
        ? (firebaseApp as any).initializeApp(firebaseConfig) 
        : (firebaseApp as any).default.initializeApp(firebaseConfig);
        
      db = getFirestore(app);
      auth = firebaseAuth.getAuth ? firebaseAuth.getAuth(app) : (firebaseAuth as any).default.getAuth(app);
      storage = getStorage(app);
      functions = getFunctions(app);
      
      if (typeof window !== 'undefined') {
          import('firebase/analytics').then((analyticsMod: any) => {
            const getAnalytics = analyticsMod.getAnalytics || analyticsMod.default?.getAnalytics;
            if (getAnalytics) {
              try { getAnalytics(app); } catch (e) { console.warn("Analytics failed to load", e); }
            }
          });
      }
      console.log(`✅ [MechanicNow] Connected to Google Cloud: ${firebaseConfig.projectId}`);
  } else {
      console.warn("⚠️ Firebase Config missing. App running in detached mode. Add API Keys to .env to connect.");
  }

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

const mapUser = (user: any, data?: any): UserProfile => ({
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

// Helper guards
const ensureAuth = () => { if (!auth) throw new Error("Firebase Auth not initialized. Check .env keys."); return auth; };
const ensureDb = () => { if (!db) throw new Error("Firestore not initialized. Check .env keys."); return db; };
const ensureFunctions = () => { if (!functions) throw new Error("Cloud Functions not initialized. Check .env keys."); return functions; };

const RealApi = {
  status: { getConnectionInfo: () => ({ mode: 'REAL' as const, connected: !!auth, provider: 'Google Cloud' }) },
  
  auth: {
    login: async (name: string, email: string, password?: string): Promise<UserProfile> => {
      const authInstance = ensureAuth();
      if (!password) throw new Error("Password is required.");
      
      let user: any;
      
      // Handle imports dynamically for shim compatibility
      const signIn = firebaseAuth.signInWithEmailAndPassword || (firebaseAuth as any).default.signInWithEmailAndPassword;
      const createUser = firebaseAuth.createUserWithEmailAndPassword || (firebaseAuth as any).default.createUserWithEmailAndPassword;
      const updateProfileFn = firebaseAuth.updateProfile || (firebaseAuth as any).default.updateProfile;

      try {
        const cred = await signIn(authInstance, email, password);
        user = cred.user;
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials' || e.code === 'auth/invalid-email') {
             try {
                 const cred = await createUser(authInstance, email, password);
                 user = cred.user;
                 await updateProfileFn(user, { displayName: name });
                 await setDoc(doc(ensureDb(), 'users', user.uid), { 
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
        const userDoc = await getDoc(doc(ensureDb(), 'users', user.uid));
        return mapUser(user, userDoc.data());
      } catch (e) {
        return mapUser(user);
      }
    },

    logout: async () => { if (auth) await (firebaseAuth.signOut || (firebaseAuth as any).default.signOut)(auth); },
    
    getCurrentUser: async (): Promise<UserProfile | null> => {
      if (!auth) return null;
      const onAuthStateChanged = firebaseAuth.onAuthStateChanged || (firebaseAuth as any).default.onAuthStateChanged;
      return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
              unsubscribe();
              if (user) {
                  try {
                    const userDoc = await getDoc(doc(ensureDb(), 'users', user.uid));
                    resolve(mapUser(user, userDoc.data()));
                  } catch(e) { resolve(mapUser(user)); }
              } else { resolve(null); }
          });
      });
    },

    updateProfile: async (user: UserProfile) => {
      const authInstance = ensureAuth();
      if (!authInstance.currentUser) throw new Error("Not authenticated");
      const updateData: any = {
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          vehicles: JSON.parse(JSON.stringify(user.vehicles)),
          history: JSON.parse(JSON.stringify(user.history))
      };
      await updateDoc(doc(ensureDb(), 'users', authInstance.currentUser.uid), updateData);
      return user;
    },

    resetPassword: async (email: string) => {
        const authInstance = ensureAuth();
        const sendReset = firebaseAuth.sendPasswordResetEmail || (firebaseAuth as any).default.sendPasswordResetEmail;
        await sendReset(authInstance, email);
    }
  },

  payment: {
    createPaymentIntent: async (amount: number, currency: string = 'usd', mechanicId?: string) => {
        const fns = ensureFunctions();
        const dbInstance = ensureDb();

        let stripeDestination = undefined;
        if (mechanicId) {
             try {
                 const mechDoc = await getDoc(doc(dbInstance, 'mechanics', mechanicId));
                 if (mechDoc.exists() && mechDoc.data().stripeAccountId) {
                     stripeDestination = mechDoc.data().stripeAccountId;
                 }
             } catch(e) {
                 console.warn("Could not resolve Stripe Account ID", e);
             }
        }

        const createPaymentIntentFn = httpsCallable(fns, 'createPaymentIntent');
        try {
            const result: any = await createPaymentIntentFn({ amount, currency, mechanicStripeId: stripeDestination });
            return result.data as { clientSecret: string, id: string };
        } catch (e: any) {
            console.error("Payment Intent Error:", e);
            throw new Error(e.message || "Failed to initiate payment");
        }
    },
    authorize: async (amount: number, method: PaymentMethod) => {
        return { success: true, transactionId: `tx_${Date.now()}` };
    },
    capture: async (jobId: string, amount: number) => {
         const fns = ensureFunctions();
         const capturePaymentFn = httpsCallable(fns, 'capturePayment');
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
          const dbInstance = ensureDb();
          const authInstance = ensureAuth();
          if (!authInstance.currentUser) throw new Error("Not logged in");
          
          const docRef = await addDoc(collection(dbInstance, 'support_tickets'), {
              userId: authInstance.currentUser.uid,
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
        const authInstance = ensureAuth();
        const dbInstance = ensureDb();
        if (!data.password) throw new Error("Password required");

        const createUser = firebaseAuth.createUserWithEmailAndPassword || (firebaseAuth as any).default.createUserWithEmailAndPassword;
        const updateProfileFn = firebaseAuth.updateProfile || (firebaseAuth as any).default.updateProfile;

        const cred = await createUser(authInstance, data.email, data.password);
        const user = cred.user;
        await updateProfileFn(user, { displayName: data.name });

        await setDoc(doc(dbInstance, 'users', user.uid), {
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
            schedule: data.schedule,
            availability: 'Offline',
            reviews: [],
            lat: 36.8508, 
            lng: -76.2859,
            verified: false
        };
        await setDoc(doc(dbInstance, 'mechanics', user.uid), mechanicData);
        await RealApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");

        return mapUser(user, { name: data.name });
    },
    verifyBackground: async (email: string, ssn: string) => {
        const fns = ensureFunctions();
        const verifyFn = httpsCallable(fns, 'verifyBackground');
        try {
            const result: any = await verifyFn({ email, ssn });
            return result.data;
        } catch (e: any) {
            console.warn("Background Check Trigger Failed", e);
            return { status: 'pending_manual' };
        }
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
       const dbInstance = ensureDb();
       // Only show verified and online mechanics
       const q = query(collection(dbInstance, 'mechanics'), where('availability', '!=', 'Offline'), where('verified', '==', true));
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
               schedule: data.schedule || {},
               lat: data.lat || lat,
               lng: data.lng || lng,
               verified: !!data.verified
           } as Mechanic;
       });
    },

    getDashboardData: async () => {
      const authInstance = ensureAuth();
      const dbInstance = ensureDb();
      if (!authInstance.currentUser) throw new Error("Not authenticated");
      
      const qNew = query(collection(dbInstance, 'job_requests'), where('status', '==', 'NEW'), limit(50));
      const qMy = query(collection(dbInstance, 'job_requests'), where('mechanicId', '==', authInstance.currentUser.uid), limit(50));
      
      const [snapNew, snapMy] = await Promise.all([getDocs(qNew), getDocs(qMy)]);
      
      const requestsMap = new Map();
      snapNew.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      snapMy.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      
      const requests = Array.from(requestsMap.values()).sort((a:any, b:any) => {
           const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
           const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
           return tB - tA;
      });

      const statsDoc = await getDoc(doc(dbInstance, 'mechanics', authInstance.currentUser.uid));
      const statsData = (statsDoc.exists() ? statsDoc.data() as any : null) || { earnings: { today: 0, week: 0, month: 0 }, isOnline: false };

      return { requests, earnings: statsData.earnings || { today: 0, week: 0, month: 0 }, isOnline: !!statsData.isOnline, stripeConnected: !!statsData.stripeConnected };
    },
    
    createStripeConnectAccount: async () => {
        const fns = ensureFunctions();
        const createAccountFn = httpsCallable(fns, 'createConnectAccount');
        try {
            const result: any = await createAccountFn({ email: auth.currentUser?.email });
            return result.data;
        } catch(e: any) {
            throw new Error("Failed to init Stripe Connect");
        }
    },
    
    onboardStripe: async (authCode?: string) => {
         const fns = ensureFunctions();
         const dbInstance = ensureDb();
         const authInstance = ensureAuth();

         const onboardFn = httpsCallable(fns, 'onboardStripe');
         try {
             const result: any = await onboardFn({ code: authCode });
             if (result.data?.success && authInstance.currentUser) {
                 await updateDoc(doc(dbInstance, 'mechanics', authInstance.currentUser.uid), { stripeConnected: true });
             }
             return result.data;
         } catch(e: any) {
             console.error("Stripe Onboarding Failed", e);
             throw new Error("Stripe Onboarding Failed");
         }
    },

    payoutToBank: async (amount: number) => {
        const fns = ensureFunctions();
        const dbInstance = ensureDb();
        const authInstance = ensureAuth();
        if (!authInstance.currentUser) throw new Error("Error");

        const payoutFn = httpsCallable(fns, 'payoutToBank');
        try {
            await payoutFn({ amount });
            const ref = doc(dbInstance, 'mechanics', authInstance.currentUser.uid);
            await updateDoc(ref, { "earnings.week": 0 });
            return { success: true };
        } catch(e) {
            throw new Error("Payout failed");
        }
    },

    createJobRequest: async (job: JobRequest) => {
        const dbInstance = ensureDb();
        const authInstance = ensureAuth();

        const safeJob = JSON.parse(JSON.stringify({ 
            ...job, 
            customerId: authInstance.currentUser?.uid,
            createdAt: serverTimestamp() 
        }));
        await setDoc(doc(dbInstance, 'job_requests', job.id), safeJob);
        if (job.mechanicId) RealApi.notifications.sendSMS("+15550000000", `New Job Request: ${job.vehicle}`);
        return job.id;
    },

    updateStatus: async (isOnline: boolean) => {
       const dbInstance = ensureDb();
       const authInstance = ensureAuth();
       if (!authInstance?.currentUser) return false;
       await updateDoc(doc(dbInstance, 'mechanics', authInstance.currentUser.uid), { isOnline, availability: isOnline ? 'Available Now' : 'Offline' });
       return isOnline;
    },

    updateJobRequest: async (updatedJob: JobRequest) => {
       const dbInstance = ensureDb();
       const safeJob = JSON.parse(JSON.stringify(updatedJob));
       delete safeJob.createdAt;
       await updateDoc(doc(dbInstance, 'job_requests', updatedJob.id), safeJob);
       return updatedJob;
    },

    updateLocation: async (jobId: string, lat: number, lng: number) => {
        if (!db) return;
        await updateDoc(doc(db, 'job_requests', jobId), { driverLocation: { lat, lng } });
    },

    deleteJobRequest: async (jobId: string) => {
       const dbInstance = ensureDb();
       await deleteDoc(doc(dbInstance, 'job_requests', jobId));
       return true;
    },

    updateEarnings: async (amount: number) => {
       const dbInstance = ensureDb();
       const authInstance = ensureAuth();
       if (!authInstance?.currentUser) return { today: 0, week: 0, month: 0 };
       
       const statsRef = doc(dbInstance, 'mechanics', authInstance.currentUser.uid);
       await updateDoc(statsRef, {
           "earnings.today": increment(amount),
           "earnings.week": increment(amount),
           "earnings.month": increment(amount)
       });
       return { today: 0, week: 0, month: 0 }; 
    },

    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        if (!db) return () => {};
        return onSnapshot(doc(db, 'job_requests', jobId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...convertTimestamps(doc.data()) } as JobRequest);
        });
    },

    subscribeToDashboard: (callback: (data: any) => void) => {
        if (!db || !auth?.currentUser) return () => {};
        
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

        const unsubMy = onSnapshot(qMy, (snapshot) => {
            myJobs = snapshot.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) } as JobRequest));
            mergeAndNotify();
        });

        return () => { unsubNew(); unsubMy(); };
    }
  },
  
  admin: {
    getStats: async () => {
        const dbInstance = ensureDb();
        try {
            const [mechanicsSnap, usersSnap, jobsSnap, completedSnap] = await Promise.all([
                getCountFromServer(collection(dbInstance, 'mechanics')),
                getCountFromServer(collection(dbInstance, 'users')),
                getCountFromServer(collection(dbInstance, 'job_requests')),
                getCountFromServer(query(collection(dbInstance, 'job_requests'), where('status', '==', 'COMPLETED')))
            ]);
            
            return {
                totalUsers: usersSnap.data().count,
                totalMechanics: mechanicsSnap.data().count,
                totalJobs: jobsSnap.data().count,
                completedJobs: completedSnap.data().count,
                totalRevenue: 15400 // Placeholder until aggregation extension is enabled
            };
        } catch (e) {
            console.warn("Stats fetch failed", e);
            return { totalUsers: 0, totalMechanics: 0, totalJobs: 0, completedJobs: 0, totalRevenue: 0 };
        }
    },
    getAllMechanics: async () => {
        const dbInstance = ensureDb();
        const snap = await getDocs(collection(dbInstance, 'mechanics'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Mechanic));
    },
    getAllJobs: async () => {
        const dbInstance = ensureDb();
        const snap = await getDocs(query(collection(dbInstance, 'job_requests'), orderBy('createdAt', 'desc'), limit(100)));
        return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as JobRequest));
    },
    approveMechanic: async (id: string) => {
        const dbInstance = ensureDb();
        await updateDoc(doc(dbInstance, 'mechanics', id), { verified: true });
    }
  }
};

export const api = RealApi;