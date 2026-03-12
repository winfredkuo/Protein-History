import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Home, User, LogIn, LogOut } from "lucide-react";
import { cn } from "./lib/utils";
import HomePage from "./pages/Home";
import DailyDetailPage from "./pages/DailyDetail";
import ProfilePage from "./pages/Profile";
import { useStore } from "./store/useStore";
import { signInWithGoogle, logout as firebaseLogout, isFirebaseConfigValid } from "./lib/firebase";

function Header() {
  const { user } = useStore();
  const isIframe = window !== window.top;

  const handleLoginClick = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        alert("登入視窗被瀏覽器攔截了，請允許此網頁開啟彈出視窗，或在新分頁中開啟此網頁。");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("此網域尚未在 Firebase 授權網域列表中。");
      } else {
        alert("登入失敗: " + (error.message || "未知錯誤"));
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">P</span>
        </div>
        <span className="font-bold text-slate-900">Protein Tracker</span>
      </div>
      
      {isFirebaseConfigValid ? (
        user ? (
          <div className="flex items-center space-x-3">
            <img 
              src={user.photoURL || ""} 
              alt={user.displayName || ""} 
              className="w-8 h-8 rounded-full border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={firebaseLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          isIframe ? (
            <a 
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              title="在新分頁開啟以登入"
            >
              <LogIn className="w-4 h-4 text-indigo-600" />
              <span>在新分頁登入</span>
            </a>
          ) : (
            <button 
              onClick={handleLoginClick}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogIn className="w-4 h-4 text-indigo-600" />
              <span>Google 登入</span>
            </button>
          )
        )
      ) : null}
    </header>
  );
}

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <item.icon
                className={cn("w-5 h-5", isActive && "fill-indigo-50")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <main className="max-w-md mx-auto min-h-screen bg-white shadow-sm sm:border-x sm:border-slate-200 relative">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/day/:date" element={<DailyDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <Navigation />
      </div>
    </Router>
  );
}
