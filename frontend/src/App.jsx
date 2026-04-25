import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ParentSignUp from './pages/ParentSignUp.jsx';
import ParentLogin from './pages/ParentLogin.jsx';
import ChildLogin from './pages/ChildLogin.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import ChildDashboard from './pages/ChildDashboard.jsx';
import HomePage from './pages/HomePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AiWorkspacePage from './pages/AiWorkspacePage.jsx';
import ChildAiPage from './pages/ChildAiPage.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ParentOnboarding from './pages/ParentOnboarding.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { apiRequest } from './api/client.js';
import NavBar from './components/NavBar.jsx';
import ThemeToggleButton from './components/ThemeToggleButton.jsx';
import ToastStack from './components/ToastStack.jsx';
import LayoutLanding from './components/LayoutLanding.jsx';
import LayoutDashboard from './components/LayoutDashboard.jsx';
import { trackEvent } from './utils/analytics.js';

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
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('gametime_auth');
    return raw ? JSON.parse(raw) : { token: '', role: '', user: null };
  });
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('gametime_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    // Fall back to OS preference if no saved preference exists
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem('gametime_auth', JSON.stringify(auth));
  }, [auth]);

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

  const showUtility = !auth.token;
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
        {/* ── Public landing surface (cinematic StringTune physics) ───── */}
        <Route
          path="/"
          element={
            <LayoutLanding>
              <HomePage auth={auth} />
            </LayoutLanding>
          }
        />

        {/* ── Application surface (snappy SaaS, no scroll-jacking) ─────── */}
        <Route
          path="/signup"
          element={
            <LayoutDashboard>
              <ParentSignUp onAuth={handleAuth} />
            </LayoutDashboard>
          }
        />
        <Route
          path="/login"
          element={
            <LayoutDashboard>
              <ParentLogin onAuth={handleAuth} />
            </LayoutDashboard>
          }
        />
        <Route
          path="/child-login"
          element={
            <LayoutDashboard>
              <ChildLogin onAuth={handleAuth} />
            </LayoutDashboard>
          }
        />
        <Route
          path="/parent/dashboard"
          element={
            auth.role === 'parent' ? (
              <LayoutDashboard>
                <ParentDashboard token={auth.token} onSwitchToChild={switchToChild} parentName={auth.user?.name} />
              </LayoutDashboard>
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
          element={
            auth.role === 'child' ? (
              <LayoutDashboard>
                <ChildDashboard token={auth.token} />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/ai"
          element={
            auth.role === 'parent' ? (
              <LayoutDashboard>
                <AiWorkspacePage token={auth.token} parentName={auth.user?.name} />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/settings"
          element={
            auth.role === 'parent' ? (
              <LayoutDashboard>
                <SettingsPage
                  token={auth.token}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  parentName={auth.user?.name}
                />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/child/ai"
          element={
            auth.role === 'child' ? (
              <LayoutDashboard>
                <ChildAiPage token={auth.token} childName={auth.user?.name} />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/onboarding"
          element={
            auth.role === 'parent' ? (
              <LayoutDashboard>
                <ParentOnboarding token={auth.token} />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            auth.role === 'parent' && auth.user?.isAdmin ? (
              <LayoutDashboard>
                <AdminPage token={auth.token} />
              </LayoutDashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            <LayoutDashboard>
              <ForgotPassword />
            </LayoutDashboard>
          }
        />
        <Route
          path="/reset-password"
          element={
            <LayoutDashboard>
              <ResetPassword />
            </LayoutDashboard>
          }
        />
      </Routes>
    </div>
  );
}
