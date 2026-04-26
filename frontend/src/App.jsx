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
import ToastStack from './components/ToastStack.jsx';
import { trackEvent } from './utils/analytics.js';
import { useAuth } from './context/AuthContext.jsx';

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
  const {
    token,
    role,
    user,
    cookieRole,
    sessionChecked,
    hasSession,
    showParentChrome,
    setAuth,
    clearAuth,
    refreshCookieRole,
    lockParentNav
  } = useAuth();
  const [toasts, setToasts] = useState([]);

  function handleAuth(nextAuth) {
    setAuth(nextAuth);
  }

  async function handleLogout() {
    try {
      if (token || hasSession) {
        await apiRequest('/auth/logout', { method: 'POST', token: token || undefined });
      }
    } catch {
      // Always continue local logout even if server logout fails.
    } finally {
      clearAuth();
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
      if (!hasSession && !token) return;
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
  }, [hasSession, token]);

  async function switchToChild(childId) {
    try {
      const response = await apiRequest('/auth/child-login', {
        method: 'POST',
        token: token || undefined,
        body: { childId }
      });
      setAuth({ token: response.token, role: 'child', user: response.child });
      lockParentNav();
      refreshCookieRole();
      window.dispatchEvent(new CustomEvent('gametime:cookie-role-refresh'));
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

  const navToken = token || (hasSession ? 'cookie' : '');
  const routeRole = cookieRole || role;
  const showUtility = sessionChecked && !hasSession;
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
          <span className="utility-path">{location.pathname}</span>
        </div>
      )}

      {hasSession && (
        <NavBar
          role={routeRole}
          token={navToken}
          onLogout={handleLogout}
          isAdmin={Boolean(user?.isAdmin)}
          showParentChrome={showParentChrome}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<ParentSignUp onAuth={handleAuth} />} />
        <Route path="/login" element={<ParentLogin onAuth={handleAuth} />} />
        <Route path="/child-login" element={<ChildLogin onAuth={handleAuth} />} />
        <Route
          path="/parent/dashboard"
          element={
            routeRole === 'parent' ? (
              <ParentDashboard token={token} onSwitchToChild={switchToChild} parentName={user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* AI is the primary parent landing - redirect /parent to it */}
        <Route
          path="/parent"
          element={routeRole === 'parent' ? <Navigate to="/parent/ai" replace /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/child/dashboard"
          element={routeRole === 'child' ? <ChildDashboard token={token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/parent/ai"
          element={
            routeRole === 'parent' ? (
              <AiWorkspacePage token={token} parentName={user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/settings"
          element={
            routeRole === 'parent' ? (
              <SettingsPage token={token} parentName={user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/child/ai"
          element={
            routeRole === 'child' ? (
              <ChildAiPage token={token} childName={user?.name} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/parent/onboarding"
          element={
            routeRole === 'parent' ? (
              <ParentOnboarding token={token} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            routeRole === 'parent' && user?.isAdmin
              ? <AdminPage token={token} />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  );
}
