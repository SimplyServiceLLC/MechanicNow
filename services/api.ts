

import { UserProfile, JobRequest, PaymentMethod, Mechanic, MechanicRegistrationData } from '../types';
import * as firebaseApp from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, query, limit, orderBy, where } from 'firebase/firestore';

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

// Check if keys exist to determine mode
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let db: any, auth: any;
let connectionMode: 'MOCK' | 'REAL' = 'MOCK';

if (isFirebaseConfigured) {
  try {
    // Attempt to initialize using different export patterns to handle environment inconsistencies
    const app = (firebaseApp as any).initializeApp 
      ? (firebaseApp as any).initializeApp(firebaseConfig) 
      : (firebaseApp as any).default.initializeApp(firebaseConfig);
      
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Lazy load analytics with safety check for named export vs default export
    if (typeof window !== 'undefined') {
       import('firebase/analytics').then((analyticsMod: any) => {
          const getAnalytics = analyticsMod.getAnalytics || analyticsMod.default?.getAnalytics;
          if (getAnalytics) {
            try { getAnalytics(app); } catch (e) { console.warn("Analytics failed to load", e); }
          }
       });
    }

    connectionMode = 'REAL';
    console.log(`✅ [MechanicNow] Connected to Google Cloud: ${firebaseConfig.projectId}`);
  } catch (e) {
    console.error("❌ Firebase initialization failed. Falling back to Mock Mode.", e);
  }
} else {
    console.warn("⚠️ No valid Firebase Config found. Running in MOCK MODE.");
}

// --- Helper to simulate network latency for Mock Mode ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms / 2));

// --- Mock Data (Fallback) ---
const MOCK_REQUESTS: JobRequest[] = []; 

const DEFAULT_EARNINGS = { today: 0, week: 0, month: 0 };

// --- Persistence Helper (Mock Mode) ---
const getDbItem = <T>(key: string, defaultVal: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultVal;
};

const setDbItem = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

// --- MOCK API ---
const MockApi = {
  status: { getConnectionInfo: () => ({ mode: 'MOCK' as const, connected: true, provider: 'Local Storage' }) },
  auth: {
    login: async (name: string, email: string) => {
      await delay(600); 
      // User starts with empty garage in Real Mode.
      // We check if this user exists in LS, if not create new.
      let existing = getDbItem<UserProfile | null>('mn_user', null);
      if (!existing || existing.email !== email) {
           const newUser: UserProfile = {
            id: 'u1', 
            name, 
            email, 
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
            vehicles: [], 
            history: []
          };
          setDbItem('mn_user', newUser);
          return newUser;
      }
      return existing;
    },
    logout: async () => { await delay(200); localStorage.removeItem('mn_user'); },
    getCurrentUser: async () => { await delay(400); return getDbItem<UserProfile | null>('mn_user', null); },
    updateProfile: async (user: UserProfile) => { await delay(300); setDbItem('mn_user', user); return user; }
  },
  payment: {
    // Mock Stripe Create Payment Intent
    createPaymentIntent: async (amount: number, currency: string = 'usd') => {
        await delay(500);
        return { clientSecret: 'pi_mock_secret_12345', id: 'pi_mock_12345' };
    },
    authorize: async (amount: number, method: PaymentMethod) => {
        await delay(1500);
        // Simulate card processing
        if (amount > 5000) throw new Error("Card declined - Limit Exceeded");
        return { success: true, transactionId: `tx_${Math.random().toString(36).substr(2, 9)}` };
    },
    capture: async (jobId: string, amount: number) => {
        await delay(1000);
        return { success: true };
    }
  },
  notifications: {
      sendSMS: async (phone: string, message: string) => {
          console.log(`[MOCK SMS (Twilio)] To: ${phone} | Body: ${message}`);
          return true;
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          console.log(`[MOCK EMAIL (SendGrid)] To: ${email} | Subject: ${subject}`);
          return true;
      }
  },
  mechanic: {
    register: async (data: MechanicRegistrationData) => {
        await delay(1000);
        const newMechanic: Mechanic = {
            id: `mech_${Date.now()}`,
            name: data.name,
            rating: 5.0, // New mechanic starts fresh
            jobsCompleted: 0,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff`,
            distance: '0.5 mi', // Mock distance relative to user
            eta: 'Available Now',
            availability: 'Available Now',
            yearsExperience: data.yearsExperience,
            bio: data.bio,
            specialties: data.specialties,
            certifications: data.certifications,
            reviews: []
        };
        
        // 1. Add to mechanics list for booking flow
        const existingMechanics = getDbItem<Mechanic[]>('mn_registered_mechanics', []);
        setDbItem('mn_registered_mechanics', [newMechanic, ...existingMechanics]);

        // 2. Log them in as a user
        const newUser: UserProfile = {
            id: newMechanic.id,
            name: data.name,
            email: data.email,
            avatar: newMechanic.avatar,
            vehicles: [],
            history: []
        };
        setDbItem('mn_user', newUser);
        
        // 3. Send Welcome Email
        await MockApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");
        
        return newUser;
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
      await delay(500);
      const storedMechanics = getDbItem<Mechanic[]>('mn_registered_mechanics', []);
      return storedMechanics;
    },
    getDashboardData: async () => {
      await delay(300);
      return { 
        requests: getDbItem('mn_dashboard_requests', MOCK_REQUESTS), 
        earnings: getDbItem('mn_earnings_stats', DEFAULT_EARNINGS), 
        isOnline: getDbItem('mn_is_online', false),
        stripeConnected: getDbItem('mn_stripe_connected', false)
      };
    },
    onboardStripe: async () => {
        await delay(1500);
        setDbItem('mn_stripe_connected', true);
        return { success: true };
    },
    createJobRequest: async (job: JobRequest) => {
      const requests = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS);
      setDbItem('mn_dashboard_requests', [job, ...requests]);
      
      // Notify Mechanic
      if (job.mechanicId) {
          // In real app, look up mechanic phone
          MockApi.notifications.sendSMS("+15550000000", `New Job Request: ${job.vehicle} - ${job.issue}. Est Payout: $${job.payout}`);
      }
      return job.id;
    },
    updateStatus: async (isOnline: boolean) => { setDbItem('mn_is_online', isOnline); return isOnline; },
    updateJobRequest: async (updatedJob: JobRequest) => {
      const requests = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS);
      setDbItem('mn_dashboard_requests', requests.map(r => r.id === updatedJob.id ? updatedJob : r));
      
      // Notify Customer of changes
      if (updatedJob.status === 'ACCEPTED') {
          MockApi.notifications.sendSMS("+15550000000", `MechanicNow: Your mechanic is on the way!`);
      } else if (updatedJob.status === 'ARRIVED') {
           MockApi.notifications.sendSMS("+15550000000", `MechanicNow: Your mechanic has arrived.`);
      }

      return updatedJob;
    },
    updateLocation: async (jobId: string, lat: number, lng: number) => {
        const requests = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS);
        const updated = requests.map(r => r.id === jobId ? { ...r, driverLocation: { lat, lng } } : r);
        setDbItem('mn_dashboard_requests', updated);
    },
    deleteJobRequest: async (jobId: string) => {
      const requests = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS);
      setDbItem('mn_dashboard_requests', requests.filter(r => r.id !== jobId));
      return true;
    },
    updateEarnings: async (amount: number) => { 
        const current = getDbItem('mn_earnings_stats', DEFAULT_EARNINGS);
        const updated = {
            today: current.today + amount,
            week: current.week + amount,
            month: current.month + amount
        };
        setDbItem('mn_earnings_stats', updated);
        return updated;
    },
    resetDemoData: async () => {
      localStorage.removeItem('mn_dashboard_requests');
      localStorage.removeItem('mn_earnings_stats');
      localStorage.removeItem('mn_stripe_connected');
      return { requests: MOCK_REQUESTS, earnings: DEFAULT_EARNINGS, isOnline: false };
    },
    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        const interval = setInterval(() => {
            const job = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS).find(r => r.id === jobId);
            if (job) callback(job);
        }, 1000);
        return () => clearInterval(interval);
    },
    subscribeToDashboard: (callback: (data: any) => void) => {
         const interval = setInterval(() => {
            callback({ 
                requests: getDbItem('mn_dashboard_requests', MOCK_REQUESTS),
                earnings: getDbItem('mn_earnings_stats', DEFAULT_EARNINGS),
                stripeConnected: getDbItem('mn_stripe_connected', false)
            });
         }, 1000);
         return () => clearInterval(interval);
    }
  }
};

// --- REAL FIREBASE API ---
const mapUser = (user: User, data?: any): UserProfile => ({
  id: user.uid,
  name: user.displayName || data?.name || 'User',
  email: user.email || '',
  avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || data?.name || 'User')}&background=0D8ABC&color=fff`,
  vehicles: data?.vehicles || [],
  history: data?.history || []
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
        // For real mode, we generally want registration to be distinct, but handling hybrid for this structure:
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-email') {
             // Fallback Registration for new users if explicitly allowed or simplify to just error
             // For public launch, prefer explicit errors.
             // throw new Error("Account not found. Please register.");
             
             // However, for this 'Uber-like' feel, seamless entry is often preferred. 
             // We'll allow registration if not found, but it should ideally be a separate flow.
             const cred = await createUserWithEmailAndPassword(auth, email, password);
             user = cred.user;
             await updateProfile(user, { displayName: name });
             await setDoc(doc(db, 'users', user.uid), { name, email, vehicles: [], history: [], isMechanic: false });
        } else {
            throw e;
        }
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return mapUser(user, userDoc.data());
    },

    logout: async () => { if (auth) await signOut(auth); },
    
    getCurrentUser: async (): Promise<UserProfile | null> => {
      if (!auth) return null;
      return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { vehicles: user.vehicles, history: user.history });
      return user;
    }
  },

  payment: {
    // Stripe Real Implementation Stub
    createPaymentIntent: async (amount: number, currency: string = 'usd') => {
        // Call your backend Cloud Function here:
        // const httpsCallable = getFunctions(app, 'createStripePaymentIntent');
        // const result = await httpsCallable({ amount, currency });
        // return result.data;
        await delay(500);
        return { clientSecret: 'pi_mock_secret_12345', id: 'pi_mock_12345' };
    },
    authorize: async (amount: number, method: PaymentMethod) => {
        // Integration Point: Stripe or Square API would go here
        await delay(1000); 
        console.log(`[Payment] Authorizing $${amount} on card ending ${method.last4}`);
        return { success: true, transactionId: `tx_${Date.now()}` };
    },
    capture: async (jobId: string, amount: number) => {
         await delay(800);
         console.log(`[Payment] Captured $${amount} for Job ${jobId}`);
         if (db) await updateDoc(doc(db, 'job_requests', jobId), { paymentStatus: 'CAPTURED' });
         return { success: true };
    }
  },
  
  notifications: {
      sendSMS: async (phone: string, message: string) => {
          // Call Cloud Function `sendSms` which uses Twilio SDK
          console.log(`[REAL SMS] (Stub) To: ${phone} | Body: ${message}`);
          return true;
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          // Call Cloud Function `sendEmail` which uses SendGrid SDK
           console.log(`[REAL EMAIL] (Stub) To: ${email} | Subject: ${subject}`);
          return true;
      }
  },

  mechanic: {
    register: async (data: MechanicRegistrationData) => {
        if (!auth || !db) throw new Error("Firebase not initialized");
        if (!data.password) throw new Error("Password required");

        // 1. Create Auth User
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = cred.user;
        await updateProfile(user, { displayName: data.name });

        // 2. Create User Profile
        await setDoc(doc(db, 'users', user.uid), {
            name: data.name,
            email: data.email,
            isMechanic: true,
            phone: data.phone,
            vehicles: [],
            history: []
        });

        // 3. Create Mechanic Profile
        const mechanicData: Partial<Mechanic> = {
            id: user.uid,
            name: data.name,
            rating: 5.0, // Start with 5 stars (New)
            jobsCompleted: 0,
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff`,
            bio: data.bio,
            yearsExperience: data.yearsExperience,
            specialties: data.specialties,
            certifications: data.certifications,
            availability: 'Offline',
            reviews: []
        };
        await setDoc(doc(db, 'mechanics', user.uid), mechanicData);
        
        // 4. Send Welcome Email
        await RealApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");

        return mapUser(user, { name: data.name });
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
       if (!db) return [];
       // Geo-query placeholder. For MVP, fetching all active mechanics.
       const q = query(collection(db, 'mechanics'), where('availability', '!=', 'Offline'));
       const snapshot = await getDocs(q);
       
       return snapshot.docs.map(d => {
           const data = d.data();
           return {
               id: d.id,
               name: data.name || 'Unknown Mechanic',
               rating: data.rating || 5.0,
               jobsCompleted: data.jobsCompleted || 0,
               avatar: data.avatar || 'https://via.placeholder.com/150',
               distance: '2.5 mi', // Real distance calc would happen here using Haversine formula
               eta: 'Varies',
               availability: data.availability || 'Available Now',
               yearsExperience: data.yearsExperience || 1,
               bio: data.bio || '',
               specialties: data.specialties || [],
               certifications: data.certifications || [],
               reviews: data.reviews || [],
               lat: data.lat,
               lng: data.lng
           } as Mechanic;
       });
    },

    getDashboardData: async () => {
      if (!auth?.currentUser) throw new Error("Not authenticated");
      
      const q = query(collection(db, 'job_requests'), limit(50));
      const snapshot = await getDocs(q);
      
      let requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any } as JobRequest));

      const statsDoc = await getDoc(doc(db, 'mechanics', auth.currentUser.uid));
      const statsData = (statsDoc.exists() ? statsDoc.data() as any : null) || { earnings: { today: 0, week: 0, month: 0 }, isOnline: false };

      return { requests, earnings: statsData.earnings || { today: 0, week: 0, month: 0 }, isOnline: !!statsData.isOnline, stripeConnected: !!statsData.stripeConnected };
    },
    
    onboardStripe: async () => {
         // In real app, call Cloud Function `createConnectAccount`
         if (!auth?.currentUser || !db) throw new Error("Error");
         await updateDoc(doc(db, 'mechanics', auth.currentUser.uid), { stripeConnected: true });
         return { success: true };
    },

    createJobRequest: async (job: JobRequest) => {
        if (!db) throw new Error("Database not connected");
        await setDoc(doc(db, 'job_requests', job.id), job);
        
        // Notify Mechanic
        if (job.mechanicId) {
             // Fetch mechanic phone from DB in real app
            RealApi.notifications.sendSMS("+15550000000", `New Job Request: ${job.vehicle}`);
        }
        
        return job.id;
    },

    updateStatus: async (isOnline: boolean) => {
       if (!auth?.currentUser) return false;
       await setDoc(doc(db, 'mechanics', auth.currentUser.uid), { isOnline, availability: isOnline ? 'Available Now' : 'Offline' }, { merge: true });
       return isOnline;
    },

    updateJobRequest: async (updatedJob: JobRequest) => {
       if (!db) throw new Error("Database not connected");
       await updateDoc(doc(db, 'job_requests', updatedJob.id), { ...updatedJob });
       
       // Notify Customer
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
       if (!auth?.currentUser) return DEFAULT_EARNINGS;
       const statsRef = doc(db, 'mechanics', auth.currentUser.uid);
       const docSnap = await getDoc(statsRef);
       const currentStats = (docSnap.data() as any)?.earnings || { today: 0, week: 0, month: 0 };
       
       const newStats = { today: currentStats.today + amount, week: currentStats.week + amount, month: currentStats.month + amount };
       await setDoc(statsRef, { earnings: newStats }, { merge: true });
       return newStats;
    },

    resetDemoData: async () => {
       return { requests: [], earnings: DEFAULT_EARNINGS, isOnline: false };
    },

    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        if (!db) return () => {};
        return onSnapshot(doc(db, 'job_requests', jobId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...doc.data() as any } as JobRequest);
        });
    },

    subscribeToDashboard: (callback: (data: any) => void) => {
        if (!db) return () => {};
        const q = query(collection(db, 'job_requests'), limit(50));
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as JobRequest));
            // We also need live earnings
            getDoc(doc(db, 'mechanics', auth.currentUser.uid)).then(statsDoc => {
                const statsData = statsDoc.data() as any;
                callback({ requests, earnings: statsData?.earnings, stripeConnected: statsData?.stripeConnected });
            });
        });
    }
  }
};

export const api = connectionMode === 'REAL' ? RealApi : MockApi;