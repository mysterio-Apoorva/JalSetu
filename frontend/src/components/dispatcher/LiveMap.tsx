import React from "react";
import { TelemetryStatus } from "./TelemetryStatus";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import { Ward, Depot, Tanker, WaterRequest } from "../../types";
import { Layers } from "lucide-react";

interface LiveMapProps {
  wards: Ward[];
  depots: Depot[];
  fleet: Tanker[];
  requests: WaterRequest[];
  selectedTanker: Tanker | null;
  onSelectTanker: (tanker: Tanker) => void;
  isOptimizedMode: boolean;
  onSwitchTo3D?: () => void;
}

// Custom Leaflet Icons styled for Bharat Builds
const createCustomIcon = (htmlString: string, size = 36) => {
  return L.divIcon({
    html: htmlString,
    className: "custom-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const depotIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 border-2 border-white shadow-lg text-white">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  </div>
`);

const tankerNormalIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-md text-emerald-300">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
    <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
    </span>
  </div>
`);

const tankerAnomalyIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-rose-600 border-2 border-white shadow-lg text-white animate-bounce">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </div>
`);

export const LiveMap: React.FC<LiveMapProps> = ({
  wards,
  depots,
  fleet,
  requests: _requests,
  selectedTanker,
  onSelectTanker,
  isOptimizedMode,
  onSwitchTo3D,
}) => {
  const delhiCenter: [number, number] = [28.6139, 77.209];

  // Calculate route lines
  const routesToRender = fleet.map((tanker) => {
    const isAnomaly = tanker.status === "ANOMALY_FLAGGED";
    const isSelected = selectedTanker?.id === tanker.id;
    const points: [number, number][] = [
      [tanker.currentCoordinates.lat, tanker.currentCoordinates.lng],
      ...tanker.assignedRoute.map(
        (w) => [w.coordinates.lat, w.coordinates.lng] as [number, number],
      ),
    ];

    return {
      tankerId: tanker.id,
      points,
      color: isAnomaly
        ? "#E11D48"
        : isSelected
          ? "#D9532F"
          : isOptimizedMode
            ? "#0D6E4F"
            : "#D97706",
      dashArray: isOptimizedMode ? undefined : "6, 8",
      weight: isSelected ? 4.5 : 3,
    };
  });

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl bg-white">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-bold text-slate-900 tracking-tight">
            Delhi Tactical Water Grid
          </span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-slate-600 font-mono">
          {fleet.length} Tankers tracked
        </span>
        <span className="text-slate-300">|</span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isOptimizedMode
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-amber-50 text-amber-800 border border-amber-300"
          }`}
        >
          {isOptimizedMode
            ? "⚡ Assigned route overview"
            : "⏳ Legacy Nearest-First Baseline"}
        </span>
      </div>

      {/* Switch to 3D Radar View Button */}
      {onSwitchTo3D && (
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={onSwitchTo3D}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white border border-slate-200 shadow-md text-xs font-bold text-purple-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Network radar</span>
          </button>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] hidden md:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>DJB Booster Depot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Critical Deficit Ward</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span>Verified Tanker</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
          <span>Anomaly Flagged</span>
        </div>
      </div>

      <MapContainer
        center={delhiCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Crisp Architectural CartoDB Positron Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polylines */}
        {routesToRender.map((route, idx) => (
          <Polyline
            key={`route-${route.tankerId}-${idx}`}
            positions={route.points}
            pathOptions={{
              color: route.color,
              weight: route.weight,
              dashArray: route.dashArray,
              opacity: 0.85,
            }}
          />
        ))}

        {/* Depots */}
        {depots.map((depot) => (
          <Marker
            key={depot.id}
            position={[depot.coordinates.lat, depot.coordinates.lng]}
            icon={depotIcon}
          >
            <Popup>
              <div className="text-xs space-y-1.5 p-1">
                <div className="font-bold text-blue-700 text-sm">
                  {depot.name}
                </div>
                <div className="text-slate-600 font-medium">{depot.zone}</div>
                <div className="font-mono text-slate-700">
                  Capacity: {(depot.capacityLiters / 1000).toLocaleString()}k
                  Liters
                </div>
                <div className="text-emerald-700 font-semibold">
                  {depot.activeTankersCount} Tankers Operational
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ward Deficit Circles */}
        {wards.map((ward) => {
          const isCritical = ward.deficitSeverity === "CRITICAL";
          const color = isCritical
            ? "#E11D48"
            : ward.deficitSeverity === "HIGH"
              ? "#D97706"
              : "#0D6E4F";
          return (
            <CircleMarker
              key={ward.id}
              center={[ward.coordinates.lat, ward.coordinates.lng]}
              radius={isCritical ? 24 : 18}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: isCritical ? 0.35 : 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1.5 p-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{ward.name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{ backgroundColor: `${color}18`, color: color }}
                    >
                      {ward.deficitSeverity}
                    </span>
                  </div>
                  <div className="text-slate-600">Zone: {ward.zone}</div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[9px]">
                        Dry Days
                      </span>
                      <strong className="text-amber-700">Not reported</strong>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[9px]">
                        Active Reqs
                      </span>
                      <strong className="text-slate-900">
                        {ward.activeRequestsCount}
                      </strong>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[10px] pt-1">
                    Groundwater Depletion:{" "}
                    <strong className="text-rose-600">
                      {ward.groundwaterDepletionScore == null ? "Not recorded" : `${ward.groundwaterDepletionScore}/100`}
                    </strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Active Tankers */}
        {fleet.map((tanker) => {
          const isAnomaly = tanker.status === "ANOMALY_FLAGGED";
          return (
            <Marker
              key={tanker.id}
              position={[
                tanker.currentCoordinates.lat,
                tanker.currentCoordinates.lng,
              ]}
              icon={isAnomaly ? tankerAnomalyIcon : tankerNormalIcon}
              eventHandlers={{
                click: () => onSelectTanker(tanker),
              }}
            >
              <Popup>
                <div className="text-xs space-y-2 p-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      {tanker.vehicleNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isAnomaly
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {tanker.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <div>
                      <strong>Driver:</strong> {tanker.driverName} (
                      {tanker.driverPhone})
                    </div>
                    <div>
                      <strong>Depot:</strong> {tanker.depotName}
                    </div>
                    <div className="font-mono text-slate-800">
                      Recorded inventory:{" "}
                      {tanker.currentWaterLevelLiters.toLocaleString()} /{" "}
                      {tanker.capacityLiters.toLocaleString()} L
                    </div>
                    <div className="text-slate-500">
                      Speed: {tanker.speedKmph} km/h
                    </div>
                    <div className="text-slate-600"><TelemetryStatus sampledAt={tanker.telemetryAt} /></div>
                  </div>

                  {tanker.anomalyWarning && (
                    <div className="p-2 rounded bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-medium">
                      ⚠️ <strong>Anomaly Flag:</strong> {tanker.anomalyWarning}
                    </div>
                  )}

                  <button
                    onClick={() => onSelectTanker(tanker)}
                    className="w-full mt-1 py-1.5 px-2 rounded btn-terracotta font-bold text-[11px] transition"
                  >
                    Inspect Tanker Telemetry
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
