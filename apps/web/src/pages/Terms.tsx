// apps/web/src/pages/Terms.tsx
export default function Terms({ onBack }: { onBack: () => void }) {
  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div className="title">Terms &amp; Conditions</div>
        <button className="pill" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="spacer" />

      <p>
        This is a placeholder for your Terms &amp; Conditions. You can replace this
        copy later with your final legal text.
      </p>

      <p className="muted">
        Edit this page in <code>src/pages/Terms.tsx</code>.
      </p>
    </div>
  );
}

