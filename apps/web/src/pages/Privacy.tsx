// apps/web/src/pages/Privacy.tsx
export default function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div className="title">Privacy Policy</div>
        <button className="pill" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="spacer" />

      <p>
        This is a placeholder for your Privacy Policy. You can replace this
        copy later with your final legal text.
      </p>

      <p className="muted">
        Edit this page in <code>src/pages/Privacy.tsx</code>.
      </p>
    </div>
  );
}

