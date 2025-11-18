
import BuyMeACoffeeButton from './components/BuyMeACoffeeButton';


import React, { useEffect } from 'react'
import Home from './pages/Home'
import Meditate from './pages/Meditate'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import { supabase } from './supabaseClient'

type Route = 'home' | 'meditate' | 'discover' | 'profile'

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = React.useState<Route>(
    () => (location.hash.replace('#/', '') as Route) || 'home'
  )

  React.useEffect(() => {
    const onHash = () => {
      const r = (location.hash.replace('#/', '') as Route) || 'home'
      setRoute(r)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const nav = (r: Route) => {
    location.hash = `/${r}`
  }

  return [route, nav]
}

export default function App() {
  const [route, nav] = useHashRoute()

  // “not signed up yet” popup flag (first CTA popup)
  const [showSignup, setShowSignup] = React.useState(false)

  // Auth modal (actual signup / login / reset form)
  const [showAuth, setShowAuth] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<'signup' | 'login' | 'reset'>('signup')

  // Form state
  const [firstName, setFirstName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [agreeTerms, setAgreeTerms] = React.useState(false)

  const [authError, setAuthError] = React.useState<string | null>(null)
  const [authLoading, setAuthLoading] = React.useState(false)

  // Keep UI in sync with Supabase session
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && route === 'profile') {
        setShowAuth(true)
        setAuthMode('login')
      }
    })
  }, [route])

  // Close popups with Escape key
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSignup(false)
        setShowAuth(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // SIGN UP with Supabase
  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!agreeTerms) {
      alert('Please agree to the Terms & Conditions first.')
      return
    }

    setAuthError(null)
    setAuthLoading(true)

    try {
      // 1) Create auth user (email + password)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Signup error:', error)
        setAuthError(error.message)
        alert(error.message)
        return
      }

      const user = data.user
      if (!user) {
        const msg = 'Signup succeeded but no user returned — please try again.'
        setAuthError(msg)
        alert(msg)
        return
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
        )

      if (profileError) {
        console.error('Profile upsert error:', profileError)
        setAuthError(profileError.message)
        alert('Account created, but there was a problem saving your profile.')
      } else {
        setAuthError(null)
      }

      // 3) Close modal & go to profile
      setShowAuth(false)
      setShowSignup(false)
      nav('profile')
    } finally {
      setAuthLoading(false)
    }
  }

  // LOG IN with Supabase
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        setAuthError(error.message)
        return
      }

      console.log('Login OK:', data)
      setShowAuth(false)
      setShowSignup(false)
      setPassword('')
      nav('profile')
    } catch (err) {
      console.error('Unexpected login error:', err)
      setAuthError('Unexpected error while logging in. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  // RESET PASSWORD (send email)
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)

      if (error) {
        console.error('Reset password error:', error)
        setAuthError(error.message)
        return
      }

      alert('Password reset email sent. Please check your inbox.')
      setShowAuth(false)
    } catch (err) {
      console.error('Unexpected reset error:', err)
      setAuthError('Unexpected error while sending reset email. Please try again.')
    } finally {
      setAuthLoading(false)
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
            }}
          >
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
              Sign up for free and we’ll donate your first 1,000 grains of rice instantly – then
              track your sessions, see your total grow, and join thousands meditating worldwide.
            </p>

            <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn-primary btn-lg"
                onClick={() => {
                  setShowSignup(false)
                  setAuthMode('signup')
                  setShowAuth(true)
                }}
              >
                Sign up for free
              </button>

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
                }}
              >
                Maybe later
              </button>
            </div>
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
            }}
          >
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
                  ? 'Welcome back'
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
                      onClick={() => setAuthMode('login')}
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
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
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
                      onClick={() => setAuthMode('login')}
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

            {/* Error message (if any) */}
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
                <div className="auth-input-row" style={{ width: '100%' }}>
                  <input
                    className="auth-input"
                    type="text"
                    required
                    placeholder="First name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="auth-input-row" style={{ width: '100%' }}>
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password + eye */}
                <div
                  className="auth-input-row auth-password-row"
                  style={{ width: '100%', position: 'relative' }}
                >
                  <input
                    className="auth-input auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    👁
                  </button>
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
                      <a href="#" style={{ textDecoration: 'underline' }}>
                        Terms &amp; Conditions
                      </a>{' '}
                      and acknowledge the{' '}
                      <a href="#" style={{ textDecoration: 'underline' }}>
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
                  {authLoading ? 'Signing up…' : 'Sign up'}
                </button>

                {/* Social icons row (placeholder) */}
                <div className="auth-social-row">
                  <button type="button" className="auth-social-btn">
                    G
                  </button>
                  <button type="button" className="auth-social-btn">
                    
                  </button>
                  <button type="button" className="auth-social-btn">
                    f
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
                <div className="auth-input-row" style={{ width: '100%' }}>
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password + eye */}
                <div
                  className="auth-input-row auth-password-row"
                  style={{ width: '100%', position: 'relative' }}
                >
                  <input
                    className="auth-input auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    👁
                  </button>
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
                    onClick={() => setAuthMode('reset')}
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
                  {authLoading ? 'Logging in…' : 'Log in'}
                </button>

                {/* Social icons row (placeholder) */}
                <div className="auth-social-row">
                  <button type="button" className="auth-social-btn">
                    G
                  </button>
                  <button type="button" className="auth-social-btn">
                    
                  </button>
                  <button type="button" className="auth-social-btn">
                    f
                  </button>
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
                  Enter the email you signed up with and we’ll send you a link to reset your
                  password.
                </div>

                {/* Email only */}
                <div className="auth-input-row" style={{ width: '100%' }}>
                  <input
                    className="auth-input"
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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

 
          <BuyMeACoffeeButton />


      <div className="footer">© {new Date().getFullYear()} Meditation Timer</div>
    </>
  )
}

