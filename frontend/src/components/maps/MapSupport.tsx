import { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";

export function MapResizer() {
  const map = useMap();
  useEffect(() => {
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    resize();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [map]);
  return null;
}

export function MapTiles() {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  return <>
    <TileLayer key={retry} maxZoom={19}
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
      eventHandlers={{ tileerror: () => setFailed(true) }} />
    {failed && <div role="status" className="absolute bottom-8 left-2 right-2 z-[1000] rounded-lg bg-white px-3 py-2 text-xs text-slate-900 shadow">
      Some map tiles could not load. Check your connection.
      <button className="ml-2 underline font-bold" onClick={() => { setFailed(false); setRetry(n => n + 1); }}>Retry map</button>
    </div>}
  </>;
}
