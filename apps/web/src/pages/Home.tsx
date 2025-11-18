import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget'
import BuyMeACoffeeButton from '../components/BuyMeACoffeeButton'


type HomeProps = {
  onMeditate: () => void
  onDiscover: () => void
  onProfile: () => void
}

type MapMarker = {
  id: string
  lat: number
  lng: number
}

export default function Home({ onMeditate, onDiscover, onProfile }: HomeProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([])

  useEffect(() => {
    async function loadMarkers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, lat, lng')
        .eq('share_location', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) {
        console.error('Error loading map markers:', error)
        return
      }

      setMarkers(
        (data || [])
          .filter((row): row is { id: string; lat: number; lng: number } =>
            row.lat !== null && row.lng !== null
          )
      )
    }

    loadMarkers()
  }, [])

  return (
    <>
      {/* Top-centered logo */}
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
        />
      </div>

      {/* Center stack + map wrapper */}
      <div className="container">
        <div style={{ width: '100%', maxWidth: 920, marginTop: 80 }}>
          {/* Existing hero content (unchanged) */}
          <div className="stack">
            <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
              <div
                className="title big"
                style={{ fontSize: 38, marginBottom: 4, marginTop: 36 }}
              >
                Meditation Timer For A Calmer Mind
              </div>
              <div
                className="subtitle"
                style={{ fontSize: 22, opacity: 0.9 }}
              >
                Every minute meditated = 10 grains of rice donated on your
                behalf
              </div>
            </div>

            <button className="btn-primary btn-lg" onClick={onMeditate}>
              Meditate
            </button>
            <button className="btn-secondary btn-lg" onClick={onDiscover}>
              Discover More
            </button>
          </div>

          {/* World map (no text, just image + dots) */}
          <WorldMap markers={markers} />
        </div>
      </div>

      {/* Profile button */}
      <button
        className="profile-fab"
        onClick={onProfile}
        title="Profile"
        aria-label="Open profile"
      >
        <img src="/assets/profile.webp" alt="" width="38" height="38" />
      </button>






    </>
  )
}

/**
 * Simple world map using your transparent image and equirectangular math
 * to place glowing dots where users are.
 */
function WorldMap({ markers }: { markers: MapMarker[] }) {
  // if you ever want to hide it when there are no markers, you can early-return null here

  return (
    <div
      style={{
        marginTop: 40,
        width: '100%',
        position: 'relative',
        aspectRatio: '16 / 9', // keeps a nice shape
      }}
    >
      {/* Background world map image */}
      <img
        src="/assets/worldmap.webp"
        alt="Global meditators"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Dots */}
      {markers.map((m) => {
        // simple equirectangular projection assuming your image is world [-180..180], [-90..90]
        const x = ((m.lng + 180) / 360) * 100
        const y = ((90 - m.lat) / 180) * 100

        return (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              width: 14,
              height: 14,
              borderRadius: '999px',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(59,130,246,0.9) 40%, rgba(59,130,246,0) 70%)',
              boxShadow: '0 0 14px rgba(59,130,246,0.9)',
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </div>
  )
}
