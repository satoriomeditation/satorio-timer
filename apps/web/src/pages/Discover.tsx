
import React from 'react'

export default function Discover({ onBack }: { onBack: () => void }) {
  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div className="title">Discover more</div>
        <button className="pill" onClick={onBack}>← Back</button>
      </div>
      <div className="spacer"></div>
      <p>
        This page can hold tips on posture, breath, and beginner guidance. You can replace this text with your own content later.
      </p>
      <ul>
        <li>Find a comfortable seat. Spine tall, shoulders soft.</li>
        <li>Set an intention. Keep it simple.</li>
        <li>When the mind wanders, gently return to the breath.</li>
      </ul>
      <p className="muted">You can edit this page’s content in <code>src/pages/Discover.tsx</code>.</p>
    </div>
  )
}
