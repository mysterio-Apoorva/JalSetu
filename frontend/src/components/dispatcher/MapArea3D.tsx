import { Layers } from "lucide-react";
import type { Ward, Depot, Tanker, Coordinates } from "../../types";
interface Props {
  depots: Depot[];
  wards: Ward[];
  fleet: Tanker[];
  onSelectTanker?: (t: Tanker) => void;
  onSwitchToTacticalMap?: () => void;
}
export function MapArea3D({
  depots,
  wards,
  fleet,
  onSelectTanker,
  onSwitchToTacticalMap,
}: Props) {
  const points = [
    ...wards.map((x) => x.coordinates),
    ...depots.map((x) => x.coordinates),
    ...fleet.map((x) => x.currentCoordinates),
  ];
  const minLat = Math.min(...points.map((x) => x.lat), 28.42),
    maxLat = Math.max(...points.map((x) => x.lat), 28.88),
    minLng = Math.min(...points.map((x) => x.lng), 76.9),
    maxLng = Math.max(...points.map((x) => x.lng), 77.4);
  const xy = (p: Coordinates) => ({
    x: 50 + ((p.lng - minLng) / (maxLng - minLng)) * 600,
    y: 380 - ((p.lat - minLat) / (maxLat - minLat)) * 330,
  });
  return (
    <div className="rounded-2xl border border-emerald-900 bg-[#183d33] overflow-hidden shadow-lg">
      <div className="p-4 flex justify-between items-center text-emerald-100 text-xs">
        <span>DELHI / NETWORK RADAR</span>
        <button
          className="flex gap-2 items-center"
          onClick={onSwitchToTacticalMap}
        >
          <Layers size={14} />
          Street map
        </button>
      </div>
      <svg
        viewBox="0 0 700 430"
        className="w-full"
        role="img"
        aria-label="Network diagram of ward, depot and tanker coordinates"
      >
        <defs>
          <pattern
            id="radar-grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path d="M35 0H0V35" fill="none" stroke="#80a18a" opacity=".13" />
          </pattern>
        </defs>
        <rect width="700" height="430" fill="url(#radar-grid)" />
        {wards.map((w) => {
          const p = xy(w.coordinates);
          return (
            <g key={w.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r="19"
                fill={w.deficitSeverity === "CRITICAL" ? "#e28b6a" : "#afc38b"}
                opacity=".23"
              />
              <circle cx={p.x} cy={p.y} r="3" fill="#d6e5bb" />
              <text x={p.x + 10} y={p.y - 10} fill="#bbcdbc" fontSize="9">
                {w.name}
              </text>
            </g>
          );
        })}
        {depots.map((d) => {
          const p = xy(d.coordinates);
          return (
            <rect
              key={d.id}
              x={p.x - 4}
              y={p.y - 4}
              width="8"
              height="8"
              fill="#d4c095"
            >
              <title>{d.name}</title>
            </rect>
          );
        })}
        {fleet.map((t) => {
          const p = xy(t.currentCoordinates);
          return (
            <g key={t.id}>
              {t.assignedRoute.map((stop, i) => {
                const a = i === 0 ? p : xy(t.assignedRoute[i - 1].coordinates),
                  b = xy(stop.coordinates);
                return (
                  <line
                    key={stop.requestId}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#c5ddaa"
                    opacity=".4"
                    strokeDasharray="4 5"
                  />
                );
              })}
              <g
                role="button"
                tabIndex={0}
                aria-label={`Select tanker ${t.vehicleNumber}`}
                onClick={() => onSelectTanker?.(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectTanker?.(t);
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="#45745d"
                  stroke="#d7e9b3"
                />
                <circle cx={p.x} cy={p.y} r="4" fill="#e4edce" />
              </g>
            </g>
          );
        })}
      </svg>
      <div className="p-4 text-[10px] text-emerald-100/60 border-t border-white/10">
        Coordinate overview · Lines connect assigned stops and are not road
        geometry.
      </div>
    </div>
  );
}
