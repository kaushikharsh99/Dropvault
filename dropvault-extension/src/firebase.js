import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function signInWithExtension() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError || new Error("No token found"));
        return;
      }
      try {
        const credential = GoogleAuthProvider.credential(null, token);
        const result = await signInWithCredential(auth, credential);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

const signInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
const signUpEmail = async (email, password, name) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return result;
};

export { auth, signInWithExtension, signOut, signInEmail, signUpEmail };