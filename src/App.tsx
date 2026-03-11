import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Home, User } from "lucide-react";
import { cn } from "./lib/utils";
import HomePage from "./pages/Home";
import DailyDetailPage from "./pages/DailyDetail";
import ProfilePage from "./pages/Profile";

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
