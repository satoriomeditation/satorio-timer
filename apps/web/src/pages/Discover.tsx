export default function Discover({ onBack }: { onBack: () => void }) {
  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div className="title">Discover more</div>
        <button className="pill" onClick={onBack}>← Back</button>
      </div>

      <div className="spacer"></div>

      {/* --- Your YouTube video embed (NEW) --- */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src="https://www.youtube.com/embed/G2-4kAGaJiE"
            title="Discover Satorio"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: 12,
            }}
          ></iframe>
        </div>
      </div>
      {/* --------------------------------------- */}

      <p>
        New to meditation? Don't worry, we'll get you started in no time.
      </p>
      <ol>
        <li>Sit in a comfortable position, upright, but relaxed. Close your eyes when you are ready.</li><br></br>
        <li>Start to place your attention on your breathing.</li><br></br>
        <li>Whenever the mind wanders, acknowledge the thought and let it pass. Then, gently return to the breath.</li>
      </ol>
     
    </div>
  )
}
