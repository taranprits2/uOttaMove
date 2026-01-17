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
    if (selectionMode === "start") {
      setStart(latlng);
      setRoute(null);
      // Auto-switch to end if start is set
      setSelectionMode("end");
    } else {
      setEnd(latlng);
      setRoute(null);
    }
  };

  const handleGetRoute = async () => {
    if (!start || !end) return;

    setLoading(true);
    setError(null);
    try {
      const routeData = await planWalkingRoute({
        start: { lat: start.lat, lon: start.lng },
        end: { lat: end.lat, lon: end.lng },
        options: { allowLimitedSegments: true }
      });
      setRoute(routeData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to find route");
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
