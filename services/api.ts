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

import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, query, limit, orderBy, where, increment, serverTimestamp } from 'firebase/firestore';

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
    updateProfile: async (user: UserProfile) => { await delay(300); setDbItem('mn_user', user); return user; },
    resetPassword: async (email: string) => { await delay(500); console.log(`[Mock] Password reset email sent to ${email}`); }
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
          // In real implementation, this would call a Cloud Function connecting to Twilio
          console.log(`%c[Twilio SMS] To ${phone}: ${message}`, 'color: #ec4899; font-weight: bold; padding: 4px; border: 1px solid #ec4899; border-radius: 4px;');
          return true;
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          // In real implementation, this would call a Cloud Function connecting to SendGrid
          console.log(`%c[SendGrid Email] To ${email}: ${subject}`, 'color: #3b82f6; font-weight: bold; padding: 4px; border: 1px solid #3b82f6; border-radius: 4px;');
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
            history: [],
            isMechanic: true
        };
        setDbItem('mn_user', newUser);
        
        // 3. Send Welcome Email
        await MockApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");
        
        return newUser;
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
      await delay(600);
      const storedMechanics = getDbItem<Mechanic[]>('mn_registered_mechanics', []);
      
      // GENERATE LIVE GHOST MECHANICS FOR "UBER-LIKE" FEEL
      // This ensures wherever the user looks in the US, there are mechanics nearby.
      // In a real app, this would be a GeoQuery to Firestore.
      const ghostMechanics: Mechanic[] = Array.from({ length: 4 }).map((_, i) => ({
          id: `sim_${i}_${Date.now()}`,
          name: ['Mike R.', 'Sarah L.', 'Dave C.', 'Jose M.'][i],
          rating: 4.8 + (Math.random() * 0.2),
          jobsCompleted: 100 + Math.floor(Math.random() * 500),
          avatar: `https://ui-avatars.com/api/?name=Mechanic+${i}&background=random`,
          distance: `${(Math.random() * 3).toFixed(1)} mi`,
          eta: `${10 + Math.floor(Math.random() * 20)} min`,
          availability: 'Available Now',
          lat: lat + (Math.random() - 0.5) * 0.03, // Spread around location
          lng: lng + (Math.random() - 0.5) * 0.03,
          specialties: ['Brakes', 'Oil', 'General'],
          yearsExperience: 5
      }));
      
      // Explicitly include mechanic 'm1' with 'Available Now' status
      const m1Mechanic: Mechanic = {
          id: 'm1',
          name: 'Top Rated Pro (m1)',
          rating: 5.0,
          jobsCompleted: 1542,
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80',
          distance: '0.3 mi',
          eta: '5 min',
          availability: 'Available Now',
          lat: lat + 0.002,
          lng: lng + 0.002,
          specialties: ['Diagnostics', 'Engine', 'Electrical'],
          yearsExperience: 12,
          bio: 'Master Technician with 12 years of experience. Specializing in diagnostics and electrical systems.',
          certifications: ['ASE Master', 'Hybrid Specialist']
      };
      
      // If the current user is a mechanic, ensure they are in the list with their latest status
      const currentUser = getDbItem<UserProfile | null>('mn_user', null);
      let finalList = [m1Mechanic, ...storedMechanics, ...ghostMechanics];

      // Remove the current user from the list if they are already in storedMechanics to avoid dupes,
      // but strictly relying on `storedMechanics` is safer if we update it correctly in `updateStatus`.
      // The `updateStatus` function now handles sync, so `storedMechanics` should be up to date.

      return finalList;
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
      
      // Notify Mechanic via SMS (Simulated Twilio)
      if (job.mechanicId) {
          MockApi.notifications.sendSMS("+15550000000", `New Job: ${job.vehicle} - ${job.issue}. Payout: $${job.payout.toFixed(2)}`);
      }
      return job.id;
    },
    updateStatus: async (isOnline: boolean) => { 
        setDbItem('mn_is_online', isOnline); 
        
        // Sync with registry for demo purposes so user appears/disappears in search
        const currentUser = getDbItem<UserProfile | null>('mn_user', null);
        if (currentUser && currentUser.isMechanic) {
            const mechanics = getDbItem<Mechanic[]>('mn_registered_mechanics', []);
            // Check if mechanic exists in registry, if not add them
            const exists = mechanics.find(m => m.id === currentUser.id);
            let updated;
            if (exists) {
                updated = mechanics.map(m => 
                    m.id === currentUser.id 
                    ? { ...m, availability: isOnline ? 'Available Now' : 'Offline' }
                    : m
                );
            } else {
                 // Create temp mechanic profile for them if they aren't registered properly
                 const newMech: Mechanic = {
                     id: currentUser.id,
                     name: currentUser.name,
                     rating: 5.0,
                     jobsCompleted: 0,
                     avatar: currentUser.avatar,
                     distance: '0.1 mi',
                     eta: 'Nearby',
                     availability: isOnline ? 'Available Now' : 'Offline',
                     yearsExperience: 5
                 };
                 updated = [newMech, ...mechanics];
            }
            setDbItem('mn_registered_mechanics', updated);
        }
        
        return isOnline; 
    },
    updateJobRequest: async (updatedJob: JobRequest) => {
      const requests = getDbItem<JobRequest[]>('mn_dashboard_requests', MOCK_REQUESTS);
      setDbItem('mn_dashboard_requests', requests.map(r => r.id === updatedJob.id ? updatedJob : r));
      
      // Notify Customer of changes via SMS (Simulated Twilio)
      if (updatedJob.status === 'ACCEPTED') {
          MockApi.notifications.sendSMS("+15550000000", `MechanicNow: Your mechanic is on the way! Track them in the app.`);
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
  phone: data?.phone,
  address: data?.address,
  bio: data?.bio,
  isMechanic: data?.isMechanic,
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
        // Handle "User Not Found" or "Invalid Credential" (which might be user not found)
        // Note: 'auth/invalid-login-credentials' is generic for security, so we might try to register and catch 'email-already-in-use' if it was actually just a bad password
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials' || e.code === 'auth/invalid-email') {
             try {
                 // Implicit registration for seamless UX
                 const cred = await createUserWithEmailAndPassword(auth, email, password);
                 user = cred.user;
                 await updateProfile(user, { displayName: name });
                 // Create initial user doc
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
        // Fallback if doc fetch fails
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
    // Stripe Real Implementation Stub
    createPaymentIntent: async (amount: number, currency: string = 'usd') => {
        // In real app, call your backend Cloud Function here
        await delay(500);
        return { clientSecret: 'pi_mock_secret_12345', id: 'pi_mock_12345' };
    },
    authorize: async (amount: number, method: PaymentMethod) => {
        // Integration Point: Stripe or Square API
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
          // In real app, call Cloud Function `sendSms`
          console.log(`[REAL SMS] (Cloud Function) To: ${phone} | Body: ${message}`);
          return true;
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          // In real app, call Cloud Function `sendEmail`
           console.log(`[REAL EMAIL] (Cloud Function) To: ${email} | Subject: ${subject}`);
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
            history: [],
            createdAt: serverTimestamp()
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
            reviews: [],
            lat: 36.8508, // Default location (Hampton Roads, VA)
            lng: -76.2859
        };
        await setDoc(doc(db, 'mechanics', user.uid), mechanicData);
        
        // 4. Send Welcome Email
        await RealApi.notifications.sendEmail(data.email, "Welcome to MechanicNow", "Your application is under review.");

        return mapUser(user, { name: data.name });
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
       if (!db) return [];
       // Real Geo-query would involve GeoFire or Geohash range queries.
       // For this implementation, we fetch active mechanics and filter in client (acceptable for MVP volume).
       const q = query(collection(db, 'mechanics'), where('availability', '!=', 'Offline'));
       const snapshot = await getDocs(q);
       
       return snapshot.docs.map(d => {
           const data = d.data();
           // In real app, calculate actual distance using Haversine
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
               lng: data.lng || lng
           } as Mechanic;
       });
    },

    getDashboardData: async () => {
      if (!auth?.currentUser) throw new Error("Not authenticated");
      
      // Perform two specific queries to comply with Security Rules
      // 1. Open Jobs (NEW)
      const qNew = query(collection(db, 'job_requests'), where('status', '==', 'NEW'), limit(50));
      // 2. My Jobs (Assigned)
      const qMy = query(collection(db, 'job_requests'), where('mechanicId', '==', auth.currentUser.uid), limit(50));
      
      const [snapNew, snapMy] = await Promise.all([getDocs(qNew), getDocs(qMy)]);
      
      const requestsMap = new Map();
      snapNew.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      snapMy.docs.forEach(d => requestsMap.set(d.id, { id: d.id, ...convertTimestamps(d.data()) }));
      
      // Merge and Sort
      const requests = Array.from(requestsMap.values()).sort((a:any, b:any) => {
           const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
           const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
           return tB - tA;
      });

      const statsDoc = await getDoc(doc(db, 'mechanics', auth.currentUser.uid));
      const statsData = (statsDoc.exists() ? statsDoc.data() as any : null) || { earnings: { today: 0, week: 0, month: 0 }, isOnline: false };

      return { requests, earnings: statsData.earnings || { today: 0, week: 0, month: 0 }, isOnline: !!statsData.isOnline, stripeConnected: !!statsData.stripeConnected };
    },
    
    onboardStripe: async () => {
         if (!auth?.currentUser || !db) throw new Error("Error");
         await updateDoc(doc(db, 'mechanics', auth.currentUser.uid), { stripeConnected: true });
         return { success: true };
    },

    createJobRequest: async (job: JobRequest) => {
        if (!db) throw new Error("Database not connected");
        // Ensure no undefined values which crash Firestore
        const safeJob = JSON.parse(JSON.stringify({ 
            ...job, 
            customerId: auth.currentUser?.uid,
            createdAt: serverTimestamp() 
        }));
        
        await setDoc(doc(db, 'job_requests', job.id), safeJob);
        
        // Notify Mechanic
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
       delete safeJob.createdAt; // Don't overwrite timestamp
       
       await updateDoc(doc(db, 'job_requests', updatedJob.id), safeJob);
       
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
       // Use atomic increment for safety
       await updateDoc(statsRef, {
           "earnings.today": increment(amount),
           "earnings.week": increment(amount),
           "earnings.month": increment(amount)
       });
       
       // Return estimated new values (UI will update via subscription anyway)
       return { today: 0, week: 0, month: 0 }; 
    },

    resetDemoData: async () => {
       return { requests: [], earnings: DEFAULT_EARNINGS, isOnline: false };
    },

    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        if (!db) return () => {};
        return onSnapshot(doc(db, 'job_requests', jobId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...convertTimestamps(doc.data()) } as JobRequest);
        });
    },

    subscribeToDashboard: (callback: (data: any) => void) => {
        if (!db || !auth.currentUser) return () => {};
        
        // 1. Listen for NEW requests (Open Market)
        const qNew = query(collection(db, 'job_requests'), where('status', '==', 'NEW'), limit(50));
        
        // 2. Listen for MY jobs (Active/Completed)
        const qMy = query(collection(db, 'job_requests'), where('mechanicId', '==', auth.currentUser.uid), limit(50));
        
        let newJobs: JobRequest[] = [];
        let myJobs: JobRequest[] = [];

        const mergeAndNotify = () => {
             // Merge, Dedupe by ID, Sort
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
        
        // 3. Listen for mechanic profile
        const unsubMech = onSnapshot(doc(db, 'mechanics', auth.currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                callback({ 
                    earnings: data.earnings || DEFAULT_EARNINGS, 
                    stripeConnected: data.stripeConnected,
                    isOnline: data.isOnline
                });
            }
        });

        return () => {
            unsubNew();
            unsubMy();
            unsubMech();
        };
    }
  }
};

export const api = connectionMode === 'REAL' ? RealApi : MockApi;