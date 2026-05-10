import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Auth, { BrutalistPathStub } from './pages/Auth.jsx';
import ChildLogin from './pages/ChildLogin.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import ChildDashboard from './pages/child/ChildDashboard.jsx';
import ActiveTimer from './pages/child/ActiveTimer.jsx';
import HomePage from './pages/HomePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AiWorkspacePage from './pages/AiWorkspacePage.jsx';
import ChildAiPage from './pages/ChildAiPage.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ParentOnboarding from './pages/ParentOnboarding.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Privacy from './pages/Privacy.jsx';
import Support from './pages/Support.jsx';
import { apiRequest, syncDemoModeFromUrl } from './api/client.js';
import NavBar from './components/NavBar.jsx';
import ThemeToggleButton from './components/ThemeToggleButton.jsx';
import ToastStack from './components/ToastStack.jsx';
import { trackEvent } from './utils/analytics.js';
import { useLenisScroll } from './hooks/useLenisScroll.js';
import './styles/kinetic-palette.css';
import './styles/kinetic-typography.css';
import './styles/onebit-shell.css';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M3 10.5L12 3l9 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  useLenisScroll(); // Enable kinetic smooth scroll

  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('gametime_auth');
    return raw ? JSON.parse(raw) : { token: '', role: '', user: null };
  });
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('gametime_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return 'light';
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem('gametime_auth', JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    syncDemoModeFromUrl();
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem('gametime_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function handleAuth(nextAuth) {
    setAuth(nextAuth);
  }

  async function handleLogout() {
    try {
      if (auth.token) {
        await apiRequest('/auth/logout', { method: 'POST', token: auth.token });
      }
    } catch {
      // Always continue local logout even if server logout fails.
    } finally {
      setAuth({ token: '', role: '', user: null });
      localStorage.removeItem('gametime_auth');
      localStorage.removeItem('gametime_demo_mode');
      trackEvent('logout', { fromPath: location.pathname });
    }
  }

  function pushToast(nextToast) {
    const toast = { id: `${Date.now()}-${Math.random()}`, ...nextToast };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, 4500);
  }

  useEffect(() => {
    const onToast = (event) => pushToast(event.detail || { message: 'Update' });
    const onSessionExpired = async () => {
      if (!auth.token) return;
      await handleLogout();
      navigate('/login', { replace: true });
      pushToast({ type: 'warning', title: 'Session expired', message: 'Please sign in again.' });
    };

    window.addEventListener('gametime:toast', onToast);
    window.addEventListener('gametime:session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('gametime:toast', onToast);
      window.removeEventListener('gametime:session-expired', onSessionExpired);
    };
  }, [auth.token]);

  async function switchToChild(childId) {
    try {
      const response = await apiRequest('/auth/child-login', { method: 'POST', token: auth.token, body: { childId } });
      setAuth({ token: response.token, role: 'child', user: response.child });
      navigate('/child/dashboard');
      trackEvent('switch_to_child_success', { childId });
    } catch (error) {
      trackEvent('switch_to_child_failed', { childId, error: error.message });
      pushToast({
        type: 'error',
        title: 'Unable to open child view',
        message: error.message || 'Please try again.'
      });
    }
  }

  const onAuthShell = /^\/(login|signup|works|blog)\/?$/.test(location.pathname);
  const showUtility = !auth.token && !onAuthShell;
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      {showUtility && (
        <div className="utility-bar" aria-label="Global navigation controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Go back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          >
            <BackIcon />
          </button>
          <button type="button" className="icon-button" aria-label="Go home" onClick={() => navigate('/')}>
            <HomeIcon />
          </button>
          <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
          <span className="utility-path">{location.pathname}</span>
        </div>
      )}

      {auth.token && <NavBar role={auth.role} token={auth.token} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} isAdmin={Boolean(auth.user?.isAdmin)} />}
      <Routes>
        <Route path="/" element={<HomePage auth={auth} />} />
        <Route path="/signup" element={<Auth onAuth={handleAuth} />} />
        <Route path="/login" element={<Auth onAuth={handleAuth} />} />
        <Route path="/works" element={<BrutalistPathStub title="WORKS" />} />
        <Route path="/blog" element={<BrutalistPathStub title="BLOG" />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        <Route path="/child-login" element={<ChildLogin onAuth={handleAuth} />} />
        <Route
          path="/parent/dashboard"
          element={
            auth.role === 'parent' ? (
              <ParentDashboard token={auth.token} onSwitchToChild={switchToChild} parentName={auth.user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* AI is the primary parent landing - redirect /parent to it */}
        <Route
          path="/parent"
          element={auth.role === 'parent' ? <Navigate to="/parent/ai" replace /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/child/dashboard"
          element={auth.role === 'child' ? <ChildDashboard token={auth.token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/child/active-timer"
          element={auth.role === 'child' ? <ActiveTimer token={auth.token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/parent/ai"
          element={
            auth.role === 'parent' ? (
              <AiWorkspacePage token={auth.token} parentName={auth.user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/settings"
          element={
            auth.role === 'parent' ? (
              <SettingsPage
                token={auth.token}
                theme={theme}
                onToggleTheme={toggleTheme}
                parentName={auth.user?.name}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/child/ai"
          element={
            auth.role === 'child' ? (
              <ChildAiPage token={auth.token} childName={auth.user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/onboarding"
          element={
            auth.role === 'parent' ? (
              <ParentOnboarding token={auth.token} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            auth.role === 'parent' && auth.user?.isAdmin
              ? <AdminPage token={auth.token} />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  );
}
