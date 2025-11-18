import React from 'react'

export default function BuyMeACoffeeButton() {
  const handleClick = () => {
    // Opens your Buy Me a Coffee page in a new tab
    window.open(
      'https://www.buymeacoffee.com/satorio',
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Support Satorio on Buy Me a Coffee"
      title="Support Satorio"
      style={{
        position: 'fixed',
        left: 20,          // mirror of profile-fab (right: 20)
        bottom: 20,        // same vertical level
        width: 66,
        height: 66,
        borderRadius: '999px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,.65)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(0,0,0,.25)',
        transition: 'box-shadow .2s ease, transform .06s ease, background .2s ease, border-color .2s ease',
        zIndex: 30,
      }}
    >
      {/* Simple coffee icon – you can swap this for an image later if you like */}
      <span style={{ fontSize: 24 }}>☕</span>
    </button>
  )
}
