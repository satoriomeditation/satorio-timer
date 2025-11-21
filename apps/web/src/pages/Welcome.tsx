// apps/web/src/pages/Welcome.tsx
export default function Welcome({
  onGoToProfile,
  onBackHome,
}: {
  onGoToProfile: () => void;
  onBackHome: () => void;
}) {
  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div className="title">Welcome to Satorio</div>
        <button className="pill" onClick={onBackHome}>
          ← Back
        </button>
      </div>

      <div className="spacer" />

      <p className="subtitle" style={{ fontSize: 18, lineHeight: 1.6 }}>
        Thanks for creating your account. We’ve sent a confirmation link to your
        email. Please click that link to verify your address before you continue.
      </p>

      <div className="spacer-lg" />

      <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
        <button className="btn-primary btn-lg" onClick={onGoToProfile}>
          Go to your profile
        </button>
        <button className="btn-secondary btn-lg" onClick={onBackHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

