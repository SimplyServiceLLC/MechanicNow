
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

// --- CONFIGURATION ---

const ADMIN_EMAILS = ['admin@mechanicnow.com', 'owner@mechanicnow.com', 'simply757@gmail.com'];

const getEnv = (key: string) => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        return import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[`VITE_${key}`] || process.env[key];
    }
    return '';
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'), 
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID')
};

let db: any = null;
let auth: any = null;
let storage: any = null;
let functions: any = null;

let isFirebaseReady = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
      const app = (firebaseApp as any).initializeApp 
        ? (firebaseApp as any).initializeApp(firebaseConfig) 
        : (firebaseApp as any).default.initializeApp(firebaseConfig);
        
      db = getFirestore(app);
      auth = firebaseAuth.getAuth ? firebaseAuth.getAuth(app) : (firebaseAuth as any).default.getAuth(app);
      storage = getStorage(app);
      functions = getFunctions(app);
      
      isFirebaseReady = true;
      console.log(`✅ [MechanicNow] Connected to Firebase Project: ${firebaseConfig.projectId}`);
  } else {
      console.warn("⚠️ Firebase Config missing or invalid. Falling back to MOCK MODE.");
  }
} catch (e) {
  console.error("❌ Firebase initialization failed. Falling back to MOCK MODE.", e);
}

const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    if (data.seconds !== undefined && data.nanoseconds !== undefined) {
        return new Date(data.seconds * 1000).toISOString();
    }
    if (Array.isArray(data)) return data.map(item => convertTimestamps(item));
    const newData: any = {};
    for (const key of Object.keys(data)) {
        newData[key] = convertTimestamps(data[key]);
    }
    return newData;
};

const mapUser = (user: any, data?: any): UserProfile => {
  const email = user.email || '';
  const isAdmin = data?.isAdmin || ADMIN_EMAILS.includes(email);
  
  return {
      id: user.uid,
      name: user.displayName || data?.name || 'User',
      email: email,
      avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || data?.name || 'User')}&background=0D8ABC&color=fff`,
      phone: data?.phone,
      address: data?.address,
      bio: data?.bio,
      isMechanic: data?.isMechanic,
      isAdmin: isAdmin,
      vehicles: data?.vehicles || [],
      history: convertTimestamps(data?.history || []),
      stripeAccountId: data?.stripeAccountId
  };
};

const ensureAuth = () => { if (!auth) throw new Error("Firebase Auth missing."); return auth; };
const ensureDb = () => { if (!db) throw new Error("Firestore missing."); return db; };
const ensureFunctions = () => { if (!functions) throw new Error("Functions missing."); return functions; };

// --- REAL API ---
const RealApi = {
  status: { getConnectionInfo: () => ({ mode: 'REAL' as const, connected: !!auth, provider: 'Google Cloud' }) },
  
  auth: {
    login: async (email: string, password?: string): Promise<UserProfile> => {
      const authInstance = ensureAuth();
      if (!password) throw new Error("Password required.");
      const signIn = firebaseAuth.signInWithEmailAndPassword || (firebaseAuth as any).default.signInWithEmailAndPassword;
      const cred = await signIn(authInstance, email, password);
      const userDoc = await getDoc(doc(ensureDb(), 'users', cred.user.uid));
      return mapUser(cred.user, userDoc.data());
    },
    registerCustomer: async (name: string, email: string, password?: string): Promise<UserProfile> => {
        const authInstance = ensureAuth();
        const createUser = firebaseAuth.createUserWithEmailAndPassword || (firebaseAuth as any).default.createUserWithEmailAndPassword;
        const updateProfileFn = firebaseAuth.updateProfile || (firebaseAuth as any).default.updateProfile;
        const cred = await createUser(authInstance, email, password!);
        await updateProfileFn(cred.user, { displayName: name });
        const userData = { name, email, vehicles: [], history: [], isMechanic: false, isAdmin: ADMIN_EMAILS.includes(email), createdAt: serverTimestamp() };
        await setDoc(doc(ensureDb(), 'users', cred.user.uid), userData);
        return mapUser(cred.user, userData);
    },
    logout: async () => { if (auth) await (firebaseAuth.signOut || (firebaseAuth as any).default.signOut)(auth); },
    getCurrentUser: async () => {
      if (!auth) return null;
      const onAuthStateChanged = firebaseAuth.onAuthStateChanged || (firebaseAuth as any).default.onAuthStateChanged;
      return new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
              unsubscribe();
              if (user) {
                  const userDoc = await getDoc(doc(ensureDb(), 'users', user.uid));
                  resolve(mapUser(user, userDoc.exists() ? userDoc.data() : {}));
              } else resolve(null);
          });
      });
    },
    updateProfile: async (user: UserProfile) => {
      await updateDoc(doc(ensureDb(), 'users', user.id), { ...user });
      return user;
    },
    resetPassword: async (email: string) => {
        const sendReset = firebaseAuth.sendPasswordResetEmail || (firebaseAuth as any).default.sendPasswordResetEmail;
        await sendReset(ensureAuth(), email);
    }
  },

  payment: {
    createPaymentIntent: async (amount: number, currency: string = 'usd', mechanicId?: string) => {
        const createPaymentIntentFn = httpsCallable(ensureFunctions(), 'createPaymentIntent');
        const result: any = await createPaymentIntentFn({ amount, currency, mechanicStripeId: mechanicId });
        return result.data;
    },
    authorize: async (amount: number, method: PaymentMethod) => ({ success: true }),
    capture: async (jobId: string, amount: number) => {
         const capturePaymentFn = httpsCallable(ensureFunctions(), 'capturePayment');
         await capturePaymentFn({ jobId, amount });
         return { success: true };
    }
  },
  
  notifications: {
      sendSMS: async (phone: string, message: string) => {
          try { await httpsCallable(ensureFunctions(), 'sendSms')({ phone, message }); return true; } catch(e) { return false; }
      },
      sendEmail: async (email: string, subject: string, body: string) => {
          try { await httpsCallable(ensureFunctions(), 'sendEmail')({ email, subject, body }); return true; } catch(e) { return false; }
      },
      getSmsHistory: async (limitCount: number = 20) => {
        const snap = await getDocs(query(collection(ensureDb(), 'sms_logs'), orderBy('createdAt', 'desc'), limit(limitCount)));
        return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) }));
    }
  },

  chat: {
      subscribe: (jobId: string, callback: (messages: any[]) => void) => {
          return onSnapshot(query(collection(ensureDb(), `job_requests/${jobId}/messages`), orderBy('createdAt', 'asc')), (snapshot) => {
              callback(snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) })));
          });
      },
      sendMessage: async (jobId: string, sender: 'customer' | 'mechanic', text: string) => {
          await addDoc(collection(ensureDb(), `job_requests/${jobId}/messages`), { sender, text, createdAt: serverTimestamp() });
      }
  },

  reviews: {
      submit: async (mechanicId: string, jobId: string, rating: number, text: string) => {
          const authInstance = ensureAuth();
          await httpsCallable(ensureFunctions(), 'submitReview')({ mechanicId, jobId, rating, text, authorName: authInstance.currentUser?.displayName || 'User' });
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
          const docRef = await addDoc(collection(ensureDb(), 'support_tickets'), {
              userId: ensureAuth().currentUser?.uid, jobId, subject, message, status: 'OPEN', createdAt: serverTimestamp()
          });
          return docRef.id;
      }
  },

  mechanic: {
    register: async (data: MechanicRegistrationData) => {
        const authInstance = ensureAuth();
        const createUser = firebaseAuth.createUserWithEmailAndPassword || (firebaseAuth as any).default.createUserWithEmailAndPassword;
        const updateProfileFn = firebaseAuth.updateProfile || (firebaseAuth as any).default.updateProfile;
        const cred = await createUser(authInstance, data.email, data.password!);
        await updateProfileFn(cred.user, { displayName: data.name });
        await setDoc(doc(ensureDb(), 'users', cred.user.uid), { name: data.name, email: data.email, isMechanic: true, phone: data.phone, vehicles: [], history: [], createdAt: serverTimestamp() });
        const mechanicData = { id: cred.user.uid, name: data.name, email: data.email, phone: data.phone, rating: 5.0, jobsCompleted: 0, avatar: cred.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff`, bio: data.bio, specialties: data.specialties, verified: false };
        await setDoc(doc(ensureDb(), 'mechanics', cred.user.uid), mechanicData);
        return mapUser(cred.user, { name: data.name });
    },
    verifyBackground: async (email: string, ssn: string) => {
        try { const res: any = await httpsCallable(ensureFunctions(), 'verifyBackground')({ email, ssn }); return res.data; } catch (e) { return { status: 'pending' }; }
    },
    getNearbyMechanics: async (lat: number, lng: number): Promise<Mechanic[]> => {
       const q = query(collection(ensureDb(), 'mechanics'), where('verified', '==', true));
       const snap = await getDocs(q);
       return snap.docs.map(d => ({ id: d.id, ...d.data() } as Mechanic));
    },
    getDashboardData: async () => {
      const uid = ensureAuth().currentUser?.uid;
      const snapNew = await getDocs(query(collection(ensureDb(), 'job_requests'), where('status', '==', 'NEW'), limit(50)));
      const snapMy = await getDocs(query(collection(ensureDb(), 'job_requests'), where('mechanicId', '==', uid), limit(50)));
      const requests = [...snapNew.docs, ...snapMy.docs].map(d => ({ id: d.id, ...convertTimestamps(d.data()) }));
      const statsDoc = await getDoc(doc(ensureDb(), 'mechanics', uid!));
      const statsData = statsDoc.exists() ? statsDoc.data() : { earnings: { week: 0 }, isOnline: false };
      return { 
          requests, 
          earnings: statsData?.earnings || { today: 0, week: 0, month: 0 }, 
          isOnline: !!statsData?.isOnline, 
          stripeConnected: !!statsData?.stripeConnected,
          stripeAccountId: statsData?.stripeAccountId
      };
    },
    createStripeConnectAccount: async (email?: string) => {
        const res: any = await httpsCallable(ensureFunctions(), 'createConnectAccount')({ email: email || ensureAuth().currentUser?.email });
        return res.data;
    },
    onboardStripe: async (authCode?: string) => {
         const res: any = await httpsCallable(ensureFunctions(), 'onboardStripe')({ code: authCode });
         return res.data;
    },
    payoutToBank: async (amount: number) => {
        await httpsCallable(ensureFunctions(), 'payoutToBank')({ amount });
        return { success: true };
    },
    createJobRequest: async (job: JobRequest) => {
        const safeJob = JSON.parse(JSON.stringify({ ...job, customerId: ensureAuth().currentUser?.uid, createdAt: serverTimestamp() }));
        await setDoc(doc(ensureDb(), 'job_requests', job.id), safeJob);
        // Automated notification to nearby mechanics could be triggered here via Cloud Function listener
        return job.id;
    },
    updateStatus: async (isOnline: boolean) => {
       await updateDoc(doc(ensureDb(), 'mechanics', ensureAuth().currentUser!.uid), { isOnline, availability: isOnline ? 'Available Now' : 'Offline' });
       return isOnline;
    },
    updateJobRequest: async (updatedJob: JobRequest) => {
       const safeJob = JSON.parse(JSON.stringify(updatedJob));
       delete safeJob.createdAt;
       await updateDoc(doc(ensureDb(), 'job_requests', updatedJob.id), safeJob);
       
       // Trigger Status Notifications
       if (updatedJob.status === 'ACCEPTED') {
           httpsCallable(ensureFunctions(), 'sendSms')({ 
               phone: updatedJob.location?.address || '', // In real app, fetch customer phone
               message: `MechanicNow: Your request has been accepted! Tracking link: https://mechanicnow.app/#/tracking?id=${updatedJob.id}`
           });
       }
       return updatedJob;
    },
    updateLocation: async (jobId: string, lat: number, lng: number) => {
        await updateDoc(doc(ensureDb(), 'job_requests', jobId), { driverLocation: { lat, lng } });
    },
    deleteJobRequest: async (jobId: string) => {
       await deleteDoc(doc(ensureDb(), 'job_requests', jobId));
       return true;
    },
    updateEarnings: async (amount: number) => {
       await updateDoc(doc(ensureDb(), 'mechanics', ensureAuth().currentUser!.uid), { "earnings.week": increment(amount) });
       return { today: 0, week: 0, month: 0 }; 
    },
    subscribeToJobRequest: (jobId: string, callback: (job: JobRequest) => void) => {
        return onSnapshot(doc(ensureDb(), 'job_requests', jobId), (doc) => {
            if (doc.exists()) callback({ id: doc.id, ...convertTimestamps(doc.data()) } as JobRequest);
        });
    },
    subscribeToDashboard: (callback: (data: any) => void) => {
        const uid = ensureAuth().currentUser!.uid;
        const qNew = query(collection(ensureDb(), 'job_requests'), where('status', '==', 'NEW'));
        const qMy = query(collection(ensureDb(), 'job_requests'), where('mechanicId', '==', uid));
        return onSnapshot(qNew, (snap) => {
            const requests = snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) }));
            callback({ requests });
        });
    }
  },
  admin: {
    getStats: async () => {
        try {
            const [m, u, j] = await Promise.all([
                getCountFromServer(collection(ensureDb(), 'mechanics')),
                getCountFromServer(collection(ensureDb(), 'users')),
                getCountFromServer(collection(ensureDb(), 'job_requests'))
            ]);
            return { totalUsers: u.data().count, totalMechanics: m.data().count, totalJobs: j.data().count, completedJobs: 0, totalRevenue: 15400 };
        } catch (e) { return { totalUsers: 0, totalMechanics: 0, totalJobs: 0, completedJobs: 0, totalRevenue: 0 }; }
    },
    getAllMechanics: async () => {
        const snap = await getDocs(collection(ensureDb(), 'mechanics'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Mechanic));
    },
    getAllJobs: async () => {
        const snap = await getDocs(query(collection(ensureDb(), 'job_requests'), orderBy('createdAt', 'desc'), limit(100)));
        return snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as JobRequest));
    },
    approveMechanic: async (id: string) => {
        await updateDoc(doc(ensureDb(), 'mechanics', id), { verified: true });
    }
  }
};

// --- MOCK API ---

// Use a simple local database for mock persistence
const getMockUsers = (): any[] => JSON.parse(localStorage.getItem('mechanicnow_mock_db_users') || '[]');
const saveMockUser = (user: any) => {
    const users = getMockUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem('mechanicnow_mock_db_users', JSON.stringify(users));
};

const MockApi = {
  status: { getConnectionInfo: () => ({ mode: 'MOCK' as const, connected: true, provider: 'Demo Mode' }) },
  auth: {
    login: async (email: string) => {
        const users = getMockUsers();
        const existing = users.find(u => u.email === email);
        const isAdmin = ADMIN_EMAILS.includes(email);
        
        const user = existing || { 
            id: 'mock_' + Math.random().toString(36).substr(2, 9), 
            name: email.split('@')[0], 
            email, 
            avatar: `https://ui-avatars.com/api/?name=${email}`, 
            vehicles: [], 
            history: [], 
            isAdmin, 
            isMechanic: !isAdmin, // Default to mechanic if not in DB for convenience, but registration fixes this
            stripeAccountId: 'acct_mock' 
        };
        
        localStorage.setItem('mechanicnow_user', JSON.stringify(user));
        return user;
    },
    registerCustomer: async (name: string, email: string) => {
        const user = { id: 'mock_u_' + Date.now(), name, email, avatar: `https://ui-avatars.com/api/?name=${name}`, vehicles: [], history: [], isMechanic: false, isAdmin: false };
        saveMockUser(user);
        localStorage.setItem('mechanicnow_user', JSON.stringify(user));
        return user;
    },
    getCurrentUser: async () => JSON.parse(localStorage.getItem('mechanicnow_user') || 'null'),
    logout: async () => localStorage.removeItem('mechanicnow_user'),
    updateProfile: async (user: UserProfile) => { 
        saveMockUser(user);
        localStorage.setItem('mechanicnow_user', JSON.stringify(user)); 
        return user; 
    },
    resetPassword: async () => {} 
  },
  payment: {
      createPaymentIntent: async () => ({ clientSecret: 'mock_secret', id: 'mock_pi' }),
      authorize: async () => ({ success: true }),
      capture: async () => ({ success: true })
  },
  notifications: {
      sendSMS: async () => true,
      sendEmail: async () => true,
      getSmsHistory: async () => []
  },
  chat: {
      subscribe: (id: string, cb: any) => {
          setTimeout(() => cb([{id:'1', sender:'mechanic', text:'Hello, I am headed your way.'}]), 1000);
          return () => {};
      },
      sendMessage: async () => {}
  },
  reviews: { submit: async () => {} },
  storage: { uploadFile: async () => "https://via.placeholder.com/300" },
  support: { createTicket: async () => "ticket_123" },
  mechanic: {
      register: async (data: MechanicRegistrationData) => {
          const user = { 
              id: 'mock_m_' + Date.now(), 
              name: data.name, 
              email: data.email, 
              isMechanic: true, 
              vehicles: [], 
              history: [], 
              avatar: `https://ui-avatars.com/api/?name=${data.name}`, 
              stripeAccountId: 'acct_mock' 
          };
          saveMockUser(user);
          localStorage.setItem('mechanicnow_user', JSON.stringify(user));
          return user;
      },
      verifyBackground: async () => ({ status: 'clear' }),
      getNearbyMechanics: async () => Array.from({length: 5}).map((_, i) => ({
          id: `mech_${i}`, name: ['Mike Ross', 'Sarah Connor', 'John Wick', 'Tony Stark', 'Bruce Wayne'][i],
          rating: 4.8 + (i * 0.04), jobsCompleted: 120 + i * 50, avatar: `https://ui-avatars.com/api/?name=Mechanic+${i}&background=random`,
          distance: `${(1 + i * 0.5).toFixed(1)} mi`, eta: `${15 + i * 5} min`, availability: 'Available Now', verified: true, stripeAccountId: 'acct_mock'
      })),
      getDashboardData: async () => ({
          requests: [{ id: 'job_1', customerName: 'Alice Smith', vehicle: '2019 Honda Civic', issue: 'Brake Squeak', distance: '2.5 mi', status: 'NEW', payout: 185, urgency: 'NORMAL', createdAt: new Date().toISOString() }],
          earnings: { today: 150, week: 850, month: 3200 }, isOnline: true, stripeConnected: true, stripeAccountId: 'acct_mock'
      }),
      createStripeConnectAccount: async () => ({ url: '#' }),
      onboardStripe: async () => ({ success: true }),
      payoutToBank: async () => ({ success: true }),
      createJobRequest: async () => "mock_job_id",
      updateStatus: async () => true,
      updateJobRequest: async () => {},
      updateLocation: async () => {},
      deleteJobRequest: async () => true,
      updateEarnings: async () => ({ today: 0, week: 0, month: 0 }),
      subscribeToJobRequest: (id: string, cb: any) => {
          setTimeout(() => cb({ id, status: 'ACCEPTED', driverLocation: { lat: 36.85, lng: -76.29 } }), 3000);
          return () => {};
      },
      subscribeToDashboard: (cb: any) => () => {}
  },
  admin: {
      getStats: async () => ({ totalUsers: 1250, totalMechanics: 45, totalJobs: 3200, completedJobs: 3150, totalRevenue: 154000 }),
      getAllMechanics: async () => [],
      getAllJobs: async () => [],
      approveMechanic: async () => {}
  }
};

export const api = isFirebaseReady ? RealApi : MockApi;
