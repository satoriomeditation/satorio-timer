import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

type ProfileProps = {
  onBack: () => void
}

type ProfileRow = {
  id: string
  first_name: string | null
  email: string | null
  created_at: string | null
  total_minutes?: number | null
  grains_of_rice?: number | null
  share_location?: boolean | null
  lat?: number | null
  lng?: number | null
}

export default function Profile({ onBack }: ProfileProps) {
  const [loading, setLoading] = useState(true)
  const [savingLocation, setSavingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  // 1. Load current user + profile row
  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          setError('You are not logged in.')
          return
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (isMounted) setProfile(data as ProfileRow)
      } catch (err: any) {
        console.error('Load profile error:', err)
        if (isMounted) setError(err.message ?? 'Error loading profile')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Logout
  async function handleLogout() {
    await supabase.auth.signOut()
    onBack()
  }

  // 3. Password reset (send email)
  async function handleResetPassword() {
    if (!profile?.email) {
      alert('No email found for this account.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      console.error('Reset password error:', error)
      alert(error.message)
      return
    }

    alert('Password reset email sent. Please check your inbox.')
  }

  // 4. Ask for browser location + save to Supabase
  async function handleShareLocation() {
    if (!profile) return

    if (!('geolocation' in navigator)) {
      alert('Location is not supported in this browser.')
      return
    }

    setSavingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        try {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              share_location: true,
              lat: latitude,
              lng: longitude,
            })
            .eq('id', profile.id)
            .select()
            .single()

          if (error) throw error

          setProfile(data as ProfileRow)
        } catch (err: any) {
          console.error('Update location error:', err)
          setError(err.message ?? 'Could not save location.')
          alert('There was a problem saving your location.')
        } finally {
          setSavingLocation(false)
        }
      },
      (geoError) => {
        console.error('Geolocation error:', geoError)

        // ✅ nicer, inline handling for "denied"
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            'Location permission was denied. If you change your mind, you can enable location for this site in your browser settings and try again.'
          )
        } else {
          setError('Could not get your location. Please try again.')
        }

        // no extra alert for denied – just show the message above
        setSavingLocation(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
      }
    )
  }

  // 5. Turn off sharing
  async function handleStopSharingLocation() {
    if (!profile) return
    setSavingLocation(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          share_location: false,
          lat: null,
          lng: null,
        })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data as ProfileRow)
    } catch (err: any) {
      console.error('Stop sharing location error:', err)
      setError(err.message ?? 'Could not update location settings.')
      alert('There was a problem updating your location settings.')
    } finally {
      setSavingLocation(false)
    }
  }

  const displayName = profile?.first_name || '—'
  const displayEmail = profile?.email || '—'
  const joined =
    profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'
  const totalMinutes = profile?.total_minutes ?? '—'
  const grains = profile?.grains_of_rice ?? '—'

  const sharingOn = !!profile?.share_location

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 640, width: '100%' }}>
        <div
          className="title"
          style={{
            fontSize: 22,
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Thanks for meditating with Satorio.
        </div>
        <p
          className="subtitle"
          style={{ textAlign: 'center', fontSize: 16, marginBottom: 24 }}
        >
          This page will soon show your total minutes, grains of rice donated, and more.
        </p>

        {loading && <div style={{ textAlign: 'center' }}>Loading profile…</div>}
        {error && (
          <div style={{ textAlign: 'center', color: '#fecaca', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {!loading && profile && (
          <>
            {/* Basic info */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Name</div>
              <div style={{ marginBottom: 12 }}>{displayName}</div>

              <div style={{ marginBottom: 6, fontWeight: 600 }}>Email</div>
              <div style={{ marginBottom: 12 }}>{displayEmail}</div>

              <div style={{ marginBottom: 6, fontWeight: 600 }}>Joined</div>
              <div>{joined}</div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,.25)', margin: '16px 0' }} />

            {/* Totals (placeholder for now) */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Total minutes</div>
              <div style={{ marginBottom: 12 }}>{totalMinutes}</div>

              <div style={{ marginBottom: 6, fontWeight: 600 }}>Grains of rice</div>
              <div>{grains}</div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,.25)', margin: '16px 0' }} />

            {/* LOCATION SECTION */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Location sharing</div>

              {sharingOn ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    Location sharing is <strong>on</strong>.
                  </div>
                  {profile.lat != null && profile.lng != null && (
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.85,
                        marginBottom: 10,
                      }}
                    >
                      Saved coordinates: {profile.lat.toFixed(3)}, {profile.lng.toFixed(3)}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-secondary btn-lg"
                    onClick={handleStopSharingLocation}
                    disabled={savingLocation}
                    style={{
                      minWidth: 0,
                      padding: '8px 18px',
                      fontSize: 14,
                    }}
                  >
                    {savingLocation ? 'Updating…' : 'Stop sharing location'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}>
                    Share your approximate location to appear on the global meditation map.
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleShareLocation}
                    disabled={savingLocation}
                    style={{
                      minWidth: 0,
                      padding: '8px 18px',
                      fontSize: 14,
                    }}
                  >
                    {savingLocation ? 'Saving…' : 'Share my location'}
                  </button>
                </>
              )}
            </div>

            {/* Footer buttons */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <button
                className="btn-secondary btn-lg"
                type="button"
                onClick={onBack}
                style={{ minWidth: 180, fontSize: 16 }}
              >
                Back to home
              </button>

              <button
                className="btn-primary btn-lg"
                type="button"
                onClick={handleLogout}
                style={{ minWidth: 180, fontSize: 16 }}
              >
                Log out
              </button>

              <button
                type="button"
                onClick={handleResetPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e5e7eb',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                Reset password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
