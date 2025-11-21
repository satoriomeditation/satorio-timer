import BuyMeACoffeeButton from './components/BuyMeACoffeeButton';
import React, { useEffect } from 'react';
import Home from './pages/Home';
import Meditate from './pages/Meditate';
import Discover from './pages/Discover';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Welcome from './pages/Welcome';
import { supabase } from './supabaseClient';

type Route =
  | 'home'
  | 'meditate'
  | 'discover'
  | 'profile'
  | 'terms'
  | 'privacy'
  | 'welcome'
  | 'email-confirmed';

// very simple email check for nicer client-side errors
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = React.useState<Route>(
    () => ((location.hash.replace('#/', '') as Route) || 'home')
  );

  React.useEffect(() => {
    const onHash = () => {
      const r = (location.hash.replace('#/', '') as Route) || 'home';
      setRoute(r);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const nav = (r: Route) => {
    location.hash = `/${r}`;
  };

  return [route, nav];
}

export default function App() {
  const [route, nav] = useHashRoute();

  // “not signed up yet” popup flag (first CTA popup)
  const [showSignup, setShowSignup] = React.useState(false);

  // Auth modal (actual signup / login / reset form)
  const [showAuth, setShowAuth] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'signup' | 'login' | 'reset'>(
    'signup'
  );

  // Human-confirmation step
  const [showHumanCheck, setShowHumanCheck] = React.useState(false);
  const [pendingAuthMode, setPendingAuthMode] = React.useState<
    'signup' | 'login'
  >('signup');
  const [humanChecked, setHumanChecked] = React.useState(false);

  // Form state
  const [firstName, setFirstName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreeTerms, setAgreeTerms] = React.useState(false);

  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authLoading, setAuthLoading] = React.useState(false);

  // Field-level errors for nicer styling
  const [fieldErrors, setFieldErrors] = React.useState<{
    firstName?: string;
    email?: string;
    password?: string;
  }>({});

  // Keep UI in sync with Supabase session
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && route === 'profile') {
        setAuthMode('login');
        setShowAuth(true);
      }
    });
  }, [route]);

  // Close popups with Escape key
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSignup(false);
        setShowAuth(false);
        setShowHumanCheck(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function resetErrors() {
    setAuthError(null);
    setFieldErrors({});
  }

  // Open login/signup flow but route through "I'm human" first
  function openAuthWithHuman(target: 'signup' | 'login') {
    resetErrors();
    setPendingAuthMode(target);
    setHumanChecked(false);
    setShowSignup(false);
    setShowHumanCheck(true);
  }

  function proceedFromHumanCheck() {
    setShowHumanCheck(false);
    setAuthMode(pendingAuthMode);
    setShowAuth(true);
  }

  // SIGN UP with Supabase
  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();

    const errors: typeof fieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'Please enter your first name.';
    }

    if (!EMAIL_RE.test(email)) {
      errors.email = 'That email address doesn’t look right';
    }

    if (password.length < 8) {
      errors.password = 'Your password must be at least 8 characters';
    }

    if (!agreeTerms) {
      setAuthError('Please agree to the Terms & Conditions to continue.');
    }

    if (Object.keys(errors).length > 0 || !agreeTerms) {
      setFieldErrors(errors);
      return;
    }

    setAuthLoading(true);

    try {
      // 1) Create auth user (email + password)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Signup error:', error);
        setAuthError(error.message);
        return;
      }

      const user = data.user;
      if (!user) {
        const msg = 'Signup succeeded but no user returned — please try again.';
        setAuthError(msg);
        return;
      }

      // 2) Create / update profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id, // important: matches profiles.id
            first_name: firstName,
            email: email,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        setAuthError('Account created, but there was a problem saving your profile.');
      } else {
        setAuthError(null);
      }

      // 3) Close modal & go to WELCOME page
      setShowAuth(false);
      setShowSignup(false);
      nav('welcome');
    } finally {
      setAuthLoading(false);
    }
  }

  // LOG IN with Supabase
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();

    const errors: typeof fieldErrors = {};
    if (!EMAIL_RE.test(email)) {
      errors.email = 'That email address doesn’t look right';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setAuthError(error.message);
        return;
      }

      console.log('Login OK:', data);
      setShowAuth(false);
      setShowSignup(false);
      setPassword('');
      nav('profile');
    } catch (err) {
      console.error('Unexpected login error:', err);
      setAuthError('Unexpected error while logging in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  // RESET PASSWORD (send email)
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();

    const errors: typeof fieldErrors = {};
    if (!EMAIL_RE.test(email)) {
      errors.email = 'That email address doesn’t look right';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Reset password error:', error);
        setAuthError(error.message);
        return;
      }

      alert('Password reset email sent. Please check your inbox.');
      setShowAuth(false);
    } catch (err) {
      console.error('Unexpected reset error:', err);
      setAuthError('Unexpected error while sending reset email. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Social login – works once providers are configured in Supabase
  async function handleSocialLogin(provider: 'google' | 'facebook' | 'apple') {
    resetErrors();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) {
        console.error('Social login error:', error);
        setAuthError(error.message);
      }
    } catch (err) {
      console.error('Unexpected social login error:', err);
      setAuthError('Unexpected error while logging in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <>
      {/* Darken background on meditate screen */}
      {route === 'meditate' && <div className="scrim-strong" aria-hidden />}

      {/* HOME */}
      {route === 'home' && (
        <Home
          onMeditate={() => nav('meditate')}
          onDiscover={() => nav('discover')}
          onProfile={() => setShowSignup(true)}
        />
      )}

      {/* MEDITATE */}
      {route === 'meditate' && (
  	<div className="container">
	    <Meditate
	      onBack={() => nav('home')}
	      onProfile={() => setShowSignup(true)}
	      onCompletedLoggedOut={() => {
	        // open signup popup 5 seconds after a logged-out session completes
	        setTimeout(() => {
	          setShowSignup(true)
	        }, 5000)
	      }}
	    />
	  </div>
	)}


      {/* DISCOVER */}
      {route === 'discover' && (
        <div className="container">
          <Discover onBack={() => nav('home')} />
        </div>
      )}

      {/* PROFILE PAGE */}
      {route === 'profile' && <Profile onBack={() => nav('home')} />}

      {/* TERMS PAGE */}
      {route === 'terms' && (
        <div className="container">
          <Terms onBack={() => nav('home')} />
        </div>
      )}

      {/* PRIVACY PAGE */}
      {route === 'privacy' && (
        <div className="container">
          <Privacy onBack={() => nav('home')} />
        </div>
      )}

      {/* WELCOME PAGE (after signup) */}
      {route === 'welcome' && (
        <div className="container">
          <Welcome
            onGoToProfile={() => nav('profile')}
            onBackHome={() => nav('home')}
          />
        </div>
      )}

      {/* 1) SIGNUP CTA POPUP (Create a calmer, kinder world) */}
      {showSignup && (
        <div
          className="signup-backdrop"
          onClick={() => setShowSignup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
        >
          <div
            className="signup-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 820,
              width: '90%',
              background: 'rgba(15,23,42,0.98)',
              borderRadius: 18,
              padding: '40px 48px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* X close */}
            <button
              type="button"
              onClick={() => setShowSignup(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#e5e7eb',
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div
              className="title"
              style={{
                fontSize: 42,
                fontWeight: 500,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              Create a calmer, kinder world
            </div>

            <p
              className="subtitle"
              style={{
                textAlign: 'center',
                fontSize: 19,
                lineHeight: 1.5,
                marginBottom: 28,
              }}
            >
              Sign up for free and we’ll donate your first 1,000 grains of rice
              instantly – then track your sessions, see your total grow, and
              join thousands meditating worldwide.
            </p>

            {/* primary + login buttons side-by-side */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn-primary btn-lg"
                onClick={() => openAuthWithHuman('signup')}
              >
                Sign up for free
              </button>

              <button
                type="button"
                className="btn-secondary btn-lg"
                onClick={() => openAuthWithHuman('login')}
                style={{ minWidth: 200 }}
              >
                Log in
              </button>
            </div>

            <div style={{ display: 'grid', placeItems: 'center' }}>
              <button
                className="signup-later"
                type="button"
                onClick={() => setShowSignup(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e5e7eb',
                  fontSize: 18,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  opacity: 0.85,
                  marginTop: 4,
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1b) SIMPLE HUMAN CONFIRMATION MODAL */}
      {showHumanCheck && (
        <div
          className="signup-backdrop"
          onClick={() => setShowHumanCheck(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 55,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              width: '90%',
              background: 'rgba(15,23,42,0.98)',
              borderRadius: 18,
              padding: '28px 28px 24px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* X close */}
            <button
              type="button"
              onClick={() => setShowHumanCheck(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#e5e7eb',
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div
              className="title"
              style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}
            >
              Before we continue...
            </div>
            <p
              className="subtitle"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Please tick the box below to confirm you are a human (and not a bot).
            </p>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.9)',
                background: '#020617',
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={humanChecked}
                onChange={(e) => setHumanChecked(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>I’m human</span>
            </label>

            <button
              type="button"
              className="btn-primary btn-lg"
              disabled={!humanChecked}
              onClick={proceedFromHumanCheck}
              style={{
                opacity: humanChecked ? 1 : 0.6,
                cursor: humanChecked ? 'pointer' : 'default',
                minWidth: 200,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* 2) AUTH MODAL (SIGN UP / LOG IN / RESET) */}
      {showAuth && (
        <div
          className="signup-backdrop"
          onClick={() => setShowAuth(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 60,
          }}
        >
          <div
            className="signup-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 820,
              width: '90%',
              background: 'rgba(15,23,42,0.98)',
              borderRadius: 18,
              padding: '40px 48px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* X close */}
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#e5e7eb',
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            {/* Header: title + switch link */}
            <div style={{ marginBottom: 12 }}>
              <div
                className="title"
                style={{
                  fontSize: authMode === 'reset' ? 32 : 38,
                  fontWeight: 600,
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                {authMode === 'signup'
                  ? 'Create your Satorio account'
                  : authMode === 'login'
                  ? 'Log into your account'
                  : 'Reset your password'}
              </div>

              <div
                className="subtitle"
                style={{ textAlign: 'center', fontSize: 14, opacity: 0.85 }}
              >
                {authMode === 'signup' && (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        resetErrors();
                        setAuthMode('login');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Log in
                    </button>
                  </>
                )}

                {authMode === 'login' && (
                  <>
                    Don’t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        resetErrors();
                        setAuthMode('signup');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Sign up
                    </button>
                  </>
                )}

                {authMode === 'reset' && (
                  <>
                    Remembered your password?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        resetErrors();
                        setAuthMode('login');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Top-level auth error (Supabase etc.) */}
            {authError && (
              <div
                style={{
                  marginBottom: 12,
                  color: '#fecaca',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {authError}
              </div>
            )}

            {/* FORM */}
            {authMode === 'signup' ? (
              // SIGNUP MODE
              <form
                onSubmit={handleSignupSubmit}
                className="auth-form"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {/* First name */}
                <div
                  className="auth-input-row"
                  style={{ width: '100%', maxWidth: 380 }}
                >
                  <input
                    className="auth-input"
                    type="text"
                    required
                    placeholder="First name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{
                      borderColor: fieldErrors.firstName
                        ? '#fb7185'
                        : undefined,
                    }}
                  />
                  {fieldErrors.firstName && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.firstName}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div
                  className="auth-input-row"
                  style={{ width: '100%', maxWidth: 380 }}
                >
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      borderColor: fieldErrors.email ? '#fb7185' : undefined,
                    }}
                  />
                  {fieldErrors.email && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                {/* Password + eye */}
                <div
                  className="auth-input-row auth-password-row"
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    position: 'relative',
                  }}
                >
                  <input
                    className="auth-input auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password (8+ characters) *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      borderColor: fieldErrors.password ? '#fb7185' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    👁
                  </button>
                  {fieldErrors.password && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.password}
                    </div>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="auth-checkbox-row">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <div className="auth-legal-text">
                    I agree to Satorio’s{' '}
                    <a href="#/terms" style={{ textDecoration: 'underline' }}>
                      Terms &amp; Conditions
                    </a>{' '}
                    and acknowledge the{' '}
                    <a
                      href="#/privacy"
                      style={{ textDecoration: 'underline' }}
                    >
                      Privacy Policy
                    </a>
                    .
                  </div>
                </div>

                {/* Main Sign up button */}
                <button
                  type="submit"
                  className="btn-primary btn-lg auth-submit"
                  disabled={authLoading}
                  style={{
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'default' : 'pointer',
                  }}
                >
                  {authLoading ? 'Signing up…' : 'Continue'}
                </button>

                {/* OR divider */}
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 8,
                    width: '100%',
                    maxWidth: 380,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'rgba(148,163,184,0.5)',
                    }}
                  />
                  <span>OR</span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'rgba(148,163,184,0.5)',
                    }}
                  />
                </div>

                {/* Social icons row */}
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    width: '100%',
                    maxWidth: 380,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('apple')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Apple
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Google
                  </button>
                </div>
              </form>
            ) : authMode === 'login' ? (
              // LOGIN MODE
              <form
                onSubmit={handleLoginSubmit}
                className="auth-form"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {/* Email */}
                <div
                  className="auth-input-row"
                  style={{ width: '100%', maxWidth: 380 }}
                >
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      borderColor: fieldErrors.email ? '#fb7185' : undefined,
                    }}
                  />
                  {fieldErrors.email && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                {/* Password + eye */}
                <div
                  className="auth-input-row auth-password-row"
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    position: 'relative',
                  }}
                >
                  <input
                    className="auth-input auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      borderColor: fieldErrors.password ? '#fb7185' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    👁
                  </button>
                  {fieldErrors.password && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.password}
                    </div>
                  )}
                </div>

                {/* Forgot password link */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    textAlign: 'right',
                    fontSize: 13,
                    marginTop: -4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      resetErrors();
                      setAuthMode('reset');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#38bdf8',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Log in button */}
                <button
                  type="submit"
                  className="btn-primary btn-lg auth-submit"
                  disabled={authLoading}
                  style={{
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'default' : 'pointer',
                  }}
                >
                  {authLoading ? 'Logging in…' : 'Continue'}
                </button>

                {/* OR divider */}
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 8,
                    width: '100%',
                    maxWidth: 380,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12,
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'rgba(148,163,184,0.5)',
                    }}
                  />
                  <span>OR</span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: 'rgba(148,163,184,0.5)',
                    }}
                  />
                </div>

                {/* Social icons row */}
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    width: '100%',
                    maxWidth: 380,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('apple')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Apple
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="auth-social-btn"
                    style={{
                      width: '100%',
                      borderRadius: 999,
                      fontSize: 14,
                    }}
                  >
                    Continue with Google
                  </button>
                </div>

                {/* Terms text under buttons */}
                <div
                  style={{
                    maxWidth: 420,
                    fontSize: 11,
                    textAlign: 'center',
                    marginTop: 10,
                    opacity: 0.8,
                  }}
                >
                  By clicking Continue, you agree to our{' '}
                  <a href="#/terms" style={{ textDecoration: 'underline' }}>
                    Terms
                  </a>{' '}
                  and acknowledge that you have read our{' '}
                  <a href="#/privacy" style={{ textDecoration: 'underline' }}>
                    Privacy Policy
                  </a>
                  .
                </div>
              </form>
            ) : (
              // RESET MODE
              <form
                onSubmit={handleResetSubmit}
                className="auth-form"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    maxWidth: 380,
                    fontSize: 13,
                    textAlign: 'center',
                    marginBottom: 4,
                    opacity: 0.9,
                  }}
                >
                  Enter the email you signed up with and we’ll send you a link to
                  reset your password.
                </div>

                {/* Email only */}
                <div
                  className="auth-input-row"
                  style={{ width: '100%', maxWidth: 380 }}
                >
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      borderColor: fieldErrors.email ? '#fb7185' : undefined,
                    }}
                  />
                  {fieldErrors.email && (
                    <div
                      style={{
                        color: '#fb7185',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                {/* Send reset link */}
                <button
                  type="submit"
                  className="btn-primary btn-lg auth-submit"
                  disabled={authLoading}
                  style={{
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'default' : 'pointer',
                  }}
                >
                  {authLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3) THANKS FOR CONFIRMING POPUP (email confirmed) */}
      {route === 'email-confirmed' && (
        <div
          className="signup-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 65,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              width: '90%',
              background: 'rgba(15,23,42,0.98)',
              borderRadius: 18,
              padding: '28px 28px 24px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* X close */}
            <button
              type="button"
              onClick={() => nav('home')}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#e5e7eb',
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div
              className="title"
              style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}
            >
              Thanks for confirming ✨
            </div>

            <p
              className="subtitle"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Your email has been verified. You can now access your profile and
              track your meditation sessions.
            </p>

            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="btn-primary btn-lg"
                onClick={() => nav('profile')}
              >
                Go to your profile
              </button>
              <button
                type="button"
                className="btn-secondary btn-lg"
                onClick={() => nav('home')}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      <BuyMeACoffeeButton />

      <div className="footer">© {new Date().getFullYear()} Satorio.co</div>
    </>
  );
}

