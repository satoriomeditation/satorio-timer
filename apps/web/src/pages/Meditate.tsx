import { supabase } from '../supabaseClient'
import React, { useEffect, useRef, useState } from 'react'
import { createCountdown, formatMMSS } from '@core/index'

// Use your own sounds from /public/assets
// bell.mp3  -> start / end bell
// Intro_Synth.mp3 -> plays once during the 10s countdown
function useBell() {
  const bellRef = useRef<HTMLAudioElement | null>(null)
  const introRef = useRef<HTMLAudioElement | null>(null)

  function ensureBell() {
    if (!bellRef.current) {
      bellRef.current = new Audio('/assets/bell.mp3')
    }
  }

  function ensureIntro() {
    if (!introRef.current) {
      introRef.current = new Audio('/assets/Intro_Synth.mp3')
    }
  }

  // Prime audio on a user gesture so mobile can play it later
  async function prime() {
    try {
      ensureBell()
      const bell = bellRef.current!
      const prevVol = bell.volume
      bell.volume = 0.0001
      await bell.play()
      bell.pause()
      bell.currentTime = 0
      bell.volume = prevVol
    } catch {
      /* ignore autoplay errors */
    }
  }

  async function playBell() {
    try {
      ensureBell()
      const bell = bellRef.current!
      bell.currentTime = 0
      await bell.play()
    } catch {
      /* ignore */
    }
  }

  async function playIntro() {
    try {
      ensureIntro()
      const intro = introRef.current!
      intro.currentTime = 0
      await intro.play()
    } catch {
      /* ignore */
    }
  }

  return { prime, playBell, playIntro }
}

export default function Meditate({
  onBack,
  onProfile,
  onCompletedLoggedOut,
}: {
  onBack: () => void
  onProfile: () => void
  onCompletedLoggedOut?: () => void
}) {
  // remember last minutes (now 1..90)
  const [minutes, setMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('lastMinutes')
    const val = saved ? Number(saved) : 20
    return Math.min(90, Math.max(1, val))
  })

  const [phase, setPhase] = useState<'select' | 'preroll' | 'running' | 'done'>(
    'select'
  )
  const [display, setDisplay] = useState<string>('00:10')
  const endEpochRef = useRef<number>(0)

  // track actual session start time (when main timer begins, not preroll)
  const startMsRef = useRef<number | null>(null)
  const [completedMins, setCompletedMins] = useState<number | null>(null)

  const { prime, playBell, playIntro } = useBell()

  // is user logged in?
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data.user) setIsLoggedIn(true)
        else setIsLoggedIn(false)
      })
      .catch(() => {
        if (!cancelled) setIsLoggedIn(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // GUIDED MODE
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [isGuided, setIsGuided] = useState(false)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)

  function stopGuideAudio() {
    const a = guideAudioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }

  async function logSession(minutes: number) {
    if (minutes <= 0) return

    try {
      // check if user is logged in
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        // not logged in → just skip logging
        return
      }

      const user = userData.user
      const grains = minutes * 10

      const { error } = await supabase.from('sessions').insert({
        user_id: user.id,
        minutes,
        grains,
      })

      if (error) {
        console.error('Error logging session:', error.message)
      }
    } catch (err) {
      console.error('Unexpected error logging session:', err)
    }
  }

  // keep accurate when tab sleeps
  useEffect(() => {
    const onVis = () => {
      if (phase === 'preroll' || phase === 'running') {
        const cd = createCountdown(endEpochRef.current)
        setDisplay(formatMMSS(cd.remainingSeconds()))
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  useEffect(() => {
    let raf = 0
    function tick() {
      if (phase === 'preroll' || phase === 'running') {
        const cd = createCountdown(endEpochRef.current)
        const secs = cd.remainingSeconds()
        setDisplay(formatMMSS(secs))

        if (cd.isFinished()) {
          if (phase === 'preroll') {
            // transition to main timer
            setPhase('running')
            startMsRef.current = Date.now()

            // start bell
            playBell()

            // start guided audio if any
            if (isGuided && guideAudioRef.current) {
              const a = guideAudioRef.current
              a.currentTime = 0
              a.play().catch(() => {
                /* ignore autoplay failure */
              })
            }

            endEpochRef.current = Date.now() + minutes * 60_000
          } else {
            // natural completion
            const started = startMsRef.current ?? Date.now()
            const minsFloored = Math.floor((Date.now() - started) / 60000)
            setCompletedMins(minsFloored)

            stopGuideAudio()

            if (minsFloored >= 1) {
              // log to Supabase (don’t await – fire and forget)
              logSession(minsFloored)

              setPhase('done')
              playBell() // end bell

              // if not logged in, notify parent so it can show signup popup
              if (!isLoggedIn && typeof onCompletedLoggedOut === 'function') {
                onCompletedLoggedOut()
              }
            } else {
              onBack() // less than 1 minute -> go home
            }
          }

          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [phase, minutes, playBell, onBack, isGuided, isLoggedIn, onCompletedLoggedOut])

  // STANDARD SESSION
  function beginStandard() {
    localStorage.setItem('lastMinutes', String(minutes))
    setIsGuided(false)
    guideAudioRef.current = null

    // prime audio on user gesture so bells are allowed later
    prime()
    // play intro sound once during the 10-second countdown
    playIntro()
    setPhase('preroll')
    endEpochRef.current = Date.now() + 10_000
  }

  // GUIDED SESSION
  function beginGuidedSession(mins: number, src: string) {
    setShowGuideModal(false)
    localStorage.setItem('lastMinutes', String(mins))
    setMinutes(mins)
    setIsGuided(true)
    guideAudioRef.current = new Audio(src)

    prime()
    playIntro()
    setPhase('preroll')
    endEpochRef.current = Date.now() + 10_000
  }

  // user cancels early
  function endSessionEarly() {
    stopGuideAudio()

    if (startMsRef.current) {
      const minsFloored = Math.floor((Date.now() - startMsRef.current) / 60000)
      setCompletedMins(minsFloored)
      if (minsFloored >= 1) {
        // log to Supabase as well
        logSession(minsFloored)

        setPhase('done') // show congratulations with minutes
        return
      }
    }
    // If no full minute completed, go back home
    onBack()
  }

  function resetToSelect() {
    setPhase('select')
    setDisplay('00:10')
    startMsRef.current = null
    setCompletedMins(null)
    setIsGuided(false)
    stopGuideAudio()
  }

  // time shown while selecting (e.g., 20:00)
  const previewTime = formatMMSS(minutes * 60)

  return (
    <>
      {/* Top-centered logo like Home */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <img
          className="logo"
          src="/assets/meditationlogo.webp"
          alt="Logo"
          style={{ pointerEvents: 'auto' }}
          onClick={onBack}
        />
      </div>

      <div
        className="card"
        style={{
          background: 'rgba(0,0,0,.0)',
          border: 'none',
          padding: '24px',
          width: '100%',
        }}
      >
        {phase === 'select' && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <div className="time-xl" aria-live="polite">
                {previewTime}
              </div>
            </div>

            <div className="spacer"></div>
            <div
              className="subtitle"
              style={{ textAlign: 'center', fontWeight: 500 }}
            >
              Slide to how many minutes you want to meditate for
            </div>
            <div className="spacer"></div>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <input
                className="slider"
                type="range"
                min={1}
                max={90}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                style={
                  {
                    '--slider-bg': `linear-gradient(90deg, 
                    var(--btn-from) 0%, 
                    var(--btn-to) ${(minutes / 90) * 100}%, 
                    rgba(255,255,255,.4) ${(minutes / 90) * 100}%, 
                    rgba(255,255,255,.4) 100%
                  )`,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="spacer-lg"></div>
            <div className="spacer-lg"></div>
            <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
              <button className="btn-primary btn-lg" onClick={beginStandard}>
                Meditate now
              </button>

              {/* Guided mode trigger */}
              <button
                className="btn-primary btn-lg"
                onClick={() => setShowGuideModal(true)}
                style={{
                  background: '#84E291',
                  borderColor: '#84E291',
                  color: '#FFFFFF',
                }}
              >
                Need a guide? 🗺️
              </button>
            </div>
          </>
        )}

        {phase === 'preroll' && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <div className="time-xl" aria-live="polite">
                {display}
              </div>
            </div>
            <div className="spacer"></div>
            <div className="subtitle" style={{ textAlign: 'center' }}>
              Get comfortable, you are about to begin
            </div>
          </>
        )}

        {phase === 'running' && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <div className="time-xl" aria-live="polite">
                {display}
              </div>
            </div>
            <div className="spacer-lg"></div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <button className="btn-secondary btn-lg" onClick={endSessionEarly}>
                End session
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <div className="spacer"></div>

            {(() => {
              const mins = Math.max(0, completedMins ?? 0)
              const minuteWord = mins === 1 ? 'minute' : 'minutes'
              const rice = mins * 10
              const riceWord = rice === 1 ? 'grain' : 'grains'

              return (
                <div
                  className="title"
                  style={{ textAlign: 'center', fontSize: 20, marginBottom: 12 }}
                >
                  Congratulations. You completed <strong>{mins} {minuteWord}</strong> of
                  meditation and donated <strong>{rice} {riceWord} of rice</strong>.
                </div>
              )
            })()}

            <div className="spacer-lg"></div>

            <div
              style={{ display: 'grid', placeItems: 'center', gap: 12 }}
            >
              <button className="btn-primary btn-lg" onClick={resetToSelect}>
                New session
              </button>
              <button className="btn-secondary btn-lg" onClick={onBack}>
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>

      {/* Profile button like Home */}
      <button
        className="profile-fab"
        onClick={onProfile}
        title="Profile"
        aria-label="Open profile"
      >
        <img src="/assets/profile.webp" alt="" width="38" height="38" />
      </button>

      {/* GUIDED MODE MODAL */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 70,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: '90%',
              background: 'rgba(15,23,42,0.98)',
              borderRadius: 18,
              padding: '32px 28px 28px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div
              className="title"
              style={{
                fontSize: 32,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Guided Mode
            </div>
            <p
              className="subtitle"
              style={{
                fontSize: 16,
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Whether you're new to meditation, or simply in need of a refresh, here's a simple way
              to ease into your session. Pick the length you want, and we will
              guide you from the very first breath.
            </p>

            <div
              style={{
                display: 'grid',
                gap: 12,
                maxWidth: 260,
                margin: '0 auto 20px',
              }}
            >
              <button
                className="btn-primary btn-lg"
                style={{
                  background: '#84E291',
                  borderColor: '#84E291',
                  color: '#FFFFFF',
                }}
                onClick={() =>
                  beginGuidedSession(
                    2,
                    '/assets/satorio_timer_guide_2mins.mp3'
                  )
                }
              >
                2 Minutes
              </button>
              <button
                className="btn-primary btn-lg"
                style={{
                  background: '#84E291',
                  borderColor: '#84E291',
                  color: '#FFFFFF',
                }}
                onClick={() =>
                  beginGuidedSession(
                    5,
                    '/assets/satorio_timer_guide_5mins.mp3'
                  )
                }
              >
                5 Minutes
              </button>
              <button
                className="btn-primary btn-lg"
                style={{
                  background: '#84E291',
                  borderColor: '#84E291',
                  color: '#FFFFFF',
                }}
                onClick={() =>
                  beginGuidedSession(
                    10,
                    '/assets/satorio_timer_guide_10mins.mp3'
                  )
                }
              >
                10 Minutes
              </button>
            </div>

            <button
              className="btn-secondary btn-lg"
              type="button"
              onClick={() => setShowGuideModal(false)}
              style={{ minWidth: 180, fontSize: 16 }}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </>
  )
}


