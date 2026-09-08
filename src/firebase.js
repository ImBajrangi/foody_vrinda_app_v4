import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsmUPg2plkJS86sFkXU-QkJttJJcOj8dw",
  authDomain: "vrinda-cloud-kitchen.firebaseapp.com",
  projectId: "vrinda-cloud-kitchen",
  storageBucket: "vrinda-cloud-kitchen.firebasestorage.app",
  messagingSenderId: "166281611781",
  appId: "1:166281611781:web:5090b4106e97e08931aa6c",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence + experimental long polling to bypass network drops
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

export { app, db, auth };
