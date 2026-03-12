import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if config is valid before initializing
const isFirebaseConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

let app;
let auth: any;
let googleProvider: any;

if (isFirebaseConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { auth, googleProvider, isFirebaseConfigValid };

export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    alert("Firebase 未正確設定，請檢查 Secrets 中的 VITE_FIREBASE_API_KEY 等變數。");
    return;
  }
  
  try {
    // In some iframe environments, popup might be blocked. 
    // We try popup first as it's better UX, but handle errors.
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      alert("此網域尚未在 Firebase 授權網域列表中。\n\n請將目前的網址加入 Firebase 控制台的「授權網域」中。");
    } else if (error.code === 'auth/popup-blocked') {
      alert("登入視窗被瀏覽器攔截了，請允許此網頁開啟彈出視窗。");
    } else {
      console.error("Sign in error:", error);
      alert("登入失敗: " + (error.message || "未知錯誤"));
    }
  }
};

export const logout = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};
