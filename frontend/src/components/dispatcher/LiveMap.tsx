import React, { useState, useEffect } from "react";
import { TelemetryStatus } from "./TelemetryStatus";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";

import { MapResizer, MapTiles } from "../maps/MapSupport";
import { Ward, Depot, Tanker, WaterRequest } from "../../types";
import {
  Layers,
  Truck,
  Radio,
  Navigation2,
  Compass,
  Droplets,
} from "lucide-react";

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

// Custom Leaflet Icons with high-tech badges & pulse rings
const createCustomIcon = (htmlString: string, size = 40) => {
  return L.divIcon({
    html: htmlString,
    className: "custom-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const depotIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border-2 border-white shadow-xl text-white">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    <span class="absolute -top-1 -right-1 flex h-3 w-3">
      <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-400 border border-white"></span>
    </span>
  </div>
`, 40);

const tankerNormalIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-xl text-emerald-300">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
    <span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
    </span>
  </div>
`, 40);

const tankerAnomalyIcon = createCustomIcon(`
  <div class="relative flex items-center justify-center w-11 h-11 rounded-full bg-rose-600 border-2 border-white shadow-2xl text-white animate-bounce">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </div>
`, 44);

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
  const [mapStyle, setMapStyle] = useState<"voyager" | "standard">("voyager");
  const [showGeofences, setShowGeofences] = useState(true);

  // Calculate route lines with high-visibility styling
  const routesToRender = fleet.flatMap((tanker) => {
    const isAnomaly = tanker.status === "ANOMALY_FLAGGED";
    const isSelected = selectedTanker?.id === tanker.id;
    const points: [number, number][][] = tanker.assignedRoute
      .filter(stop => !stop.isCompleted && stop.roadGeometry?.length)
      .map(stop => stop.roadGeometry!.map(([lng, lat]) => [lat, lng] as [number, number]))
      .filter(segment => segment.length >= 2);
    if (!points.length) return [];

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
      weight: isSelected ? 5.5 : 3.5,
    };
  });

  const totalTransitLiters = fleet.filter(t => ["EN_ROUTE", "DISPENSING"].includes(t.status)).reduce(
    (acc, t) => acc + (t.currentWaterLevelLiters || 0),
    0
  );

  return (
    <div className="relative isolate w-full h-[580px] rounded-3xl overflow-hidden border border-slate-300/80 shadow-2xl bg-slate-900 font-sans">
      {/* Top Left: Glassmorphism Tactical HUD */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-[1000] pointer-events-none flex flex-wrap items-center gap-2.5 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="font-black text-white tracking-tight uppercase">
            Delhi Fleet Map
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5 font-mono text-slate-300">
          <Truck size={13} className="text-emerald-400" />
          <span>{fleet.length} Recorded Tankers</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5 font-mono text-cyan-300">
          <Droplets size={13} className="text-cyan-400" />
          <span>{(totalTransitLiters / 1000).toFixed(0)}k L in Transit</span>
        </div>
        <span className="text-slate-600">|</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isOptimizedMode
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}
        >
          {isOptimizedMode ? "⚡ VRP Optimized" : "⏳ Baseline FIFO"}
        </span>
      </div>

      {/* Top Right: Layer & 3D Controls */}
      <div className="absolute top-28 sm:top-20 right-3 z-[1000] flex-wrap max-w-[90%] flex items-center gap-2">
        <button
          onClick={() => setMapStyle(mapStyle === "voyager" ? "standard" : "voyager")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl text-xs font-bold transition backdrop-blur-md"
        >
          <Compass size={13} className="text-cyan-400" />
          <span>{mapStyle === "voyager" ? "HD Voyager" : "Standard OSM"}</span>
        </button>

        <button
          onClick={() => setShowGeofences(!showGeofences)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-xl text-xs font-bold transition backdrop-blur-md ${
            showGeofences
              ? "bg-orange-600/90 hover:bg-orange-600 text-white border-orange-500"
              : "bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800"
          }`}
        >
          <Radio size={13} />
          <span>Geofences</span>
        </button>

        {onSwitchTo3D && (
          <button
            onClick={onSwitchTo3D}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400 shadow-xl text-xs font-bold transition backdrop-blur-md"
          >
            <Layers size={13} />
            <span>3D Radar</span>
          </button>
        )}
      </div>

      {/* Bottom Right: Architectural Map Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] hidden md:flex items-center gap-3.5 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl text-[11px] font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          <span>Registered Depot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
          <span>Crisis Ward (200m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          <span>Active Tanker</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
          <span>Anomaly Flagged</span>
        </div>
      </div>

      {/* Bottom Left: Selected Tanker Quick HUD Inspector */}
      {selectedTanker && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 text-white backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/50 shadow-2xl text-xs max-w-sm hidden sm:block">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <Navigation2 size={13} className="text-emerald-400" />
              {selectedTanker.vehicleNumber}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
              {selectedTanker.status.replace("_", " ")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-300 font-mono">
            <div>
              <span className="text-slate-500 block text-[9px]">Driver</span>
              <strong>{selectedTanker.driverName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Speed</span>
              <strong>{selectedTanker.speedKmph} km/h</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Water Volume</span>
              <strong className="text-cyan-400">
                {selectedTanker.currentWaterLevelLiters.toLocaleString()} L
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Assigned Stops</span>
              <strong>{selectedTanker.assignedRoute?.length || 0} stops</strong>
            </div>
          </div>
        </div>
      )}

      {fleet.some(t => t.assignedRoute.some(stop => !stop.isCompleted && !stop.roadGeometry?.length)) &&
        <p className="absolute bottom-20 left-3 right-3 z-[1000] rounded bg-white/95 p-2 text-xs text-slate-800">Road geometry is unavailable for some assigned stops. Their routes are not drawn.</p>}
      {/* Map Container */}
      <MapContainer
        center={delhiCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Standard High-Performance OpenStreetMap Tiles (No API key required) */}
        <MapTiles key={mapStyle} style={mapStyle} />
        <MapResizer /><SelectedTankerView tanker={selectedTanker} />

        {/* Only provider road geometry is rendered; missing data is never a straight-line route. */}
        {routesToRender.map((route, idx) => (
          <Polyline
            key={`route-${route.tankerId}-${idx}`}
            positions={route.points}
            pathOptions={{
              color: route.color,
              weight: route.weight,
              dashArray: route.dashArray,
              opacity: 0.88,
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
              <div className="text-xs space-y-1.5 p-1 font-sans">
                <div className="font-bold text-blue-700 text-sm">
                  {depot.name}
                </div>
                <div className="text-slate-600 font-medium">{depot.zone}</div>
                <div className="font-mono text-slate-700">
                  Capacity: {(depot.capacityLiters / 1000).toLocaleString()}k Liters
                </div>
                <div className="text-emerald-700 font-semibold">
                  {depot.activeTankersCount} Tankers Operational
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ward Deficit Circles & Geofence Rings */}
        {wards.map((ward) => {
          const isCritical = ward.deficitSeverity === "CRITICAL";
          const color = isCritical
            ? "#E11D48"
            : ward.deficitSeverity === "HIGH"
              ? "#D97706"
              : "#0D6E4F";

          return (
            <React.Fragment key={ward.id}>
              {/* Outer Geofence Ring if toggled */}
              {showGeofences && (
                <Circle
                  center={[ward.coordinates.lat, ward.coordinates.lng]}
                  radius={200}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isCritical ? 0.12 : 0.06,
                    weight: 1.5,
                    dashArray: "4 4",
                  }}
                />
              )}

              {/* Core Ward Target */}
              <CircleMarker
                center={[ward.coordinates.lat, ward.coordinates.lng]}
                radius={isCritical ? 18 : 14}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: isCritical ? 0.45 : 0.3,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 p-1 font-sans">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{ward.name}</span>
                      <span
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase"
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
                        {ward.groundwaterDepletionScore == null
                          ? "Not recorded"
                          : `${ward.groundwaterDepletionScore}/100`}
                      </strong>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
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
                <div className="text-xs space-y-2 p-1 font-sans">
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
                    <div className="text-slate-600">
                      <TelemetryStatus sampledAt={tanker.telemetryAt} />
                    </div>
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
export default LiveMap;

function SelectedTankerView({ tanker }: { tanker: Tanker | null }) {
  const map = useMap();
  const lat = tanker?.currentCoordinates.lat, lng = tanker?.currentCoordinates.lng;
  useEffect(() => {
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}
