// Animated background: night over the Galeras volcano, a road whose lines move and
// buses that cross with their lights on. Only CSS (no libraries); with "reduce
// motion" turned on in the system it stays still.
function RoadScene({ className = "" }: { className?: string }) {
  return (
    <div className={`road-scene ${className}`} aria-hidden="true">
      <div className="road-glow"></div>
      <div className="road-stars"></div>
      <svg className="road-mountains" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path
          className="mountain-far"
          d="M0 220V150l90-30 110 20 120-55 90 25 130-70 60 22 40-10 90 52 130-40 120 45 110-20 110 30v101z"
        />
        <path className="mountain-near" d="M0 220v-40l140-20 160 25 180-45 150 30 170-25 200 30 200-15v90z" />
      </svg>
      <div className="road">
        <div className="road-lines"></div>
        <div className="road-bus bus-a">
          <BusSide />
        </div>
        <div className="road-bus bus-b">
          <BusSide />
        </div>
      </div>
    </div>
  );
}

function BusSide() {
  return (
    <svg viewBox="0 0 120 44" width="120" height="44">
      <rect x="2" y="4" width="112" height="30" rx="7" className="bus-body" />
      <rect x="10" y="9" width="16" height="11" rx="2" className="bus-window" />
      <rect x="30" y="9" width="16" height="11" rx="2" className="bus-window" />
      <rect x="50" y="9" width="16" height="11" rx="2" className="bus-window" />
      <rect x="70" y="9" width="16" height="11" rx="2" className="bus-window" />
      <path d="M92 9h14a4 4 0 0 1 4 4v8H92z" className="bus-window" />
      <rect x="2" y="24" width="112" height="3" className="bus-stripe" />
      <circle cx="26" cy="36" r="6" className="bus-wheel" />
      <circle cx="92" cy="36" r="6" className="bus-wheel" />
      <circle cx="113" cy="28" r="2.5" className="bus-light" />
    </svg>
  );
}

export default RoadScene;
