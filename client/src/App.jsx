import { useState } from "react";
import MapComponent from "./components/MapComponent";
import ControlPanel from "./components/ControlPanel";
import { planWalkingRoute } from "./services/api";
import "./index.css";

function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selectionMode, setSelectionMode] = useState("start"); // "start" or "end"
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMapClick = (latlng) => {
    const coords = { lat: latlng.lat, lon: latlng.lng };
    if (selectionMode === "start") {
      setStart(coords);
      setRoute(null);
      // Auto-switch to end if start is set
      setSelectionMode("end");
    } else {
      setEnd(coords);
      setRoute(null);
    }
  };

  const handleGetRoute = async () => {
    if (!start || !end) return;

    setLoading(true);
    setError(null);
    try {
      const result = await planWalkingRoute({
        start: { lat: start.lat, lon: start.lon },
        end: { lat: end.lat, lon: end.lon }
      });
      if (result.success) {
        setRoute(result);
        setError(null);
      } else {
        const diag = result.diagnostics ? ` (Diag: ${result.diagnostics.start_snaps}->${result.diagnostics.end_snaps})` : '';
        setError(`${result.error}${diag}`);
        setRoute(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to find route");
      setRoute(null); // Clear route on network/unexpected error too
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="map-wrapper">
        <MapComponent
          start={start}
          end={end}
          route={route}
          onMapClick={handleMapClick}
        />
      </div>

      <div className="floating-overlay">
        <ControlPanel
          start={start}
          end={end}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          onGetRoute={handleGetRoute}
          loading={loading}
          routeInfo={route}
        />
        {error && (
          <div className="card" style={{ marginTop: '12px', background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', padding: '12px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
