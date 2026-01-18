import { useState } from "react";
import MapComponent from "./components/MapComponent";
import Header from "./components/Header";
import RecommendedPanel from "./components/RecommendedPanel";
import DestinationPanel from "./components/DestinationPanel";
import DirectionsPanel from "./components/DirectionsPanel";
import FloatingActionButton from "./components/FloatingActionButton";
import Logo from "./components/Logo";
import { planWalkingRoute } from "./services/api";
import "./index.css";

function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selectionMode, setSelectionMode] = useState("start"); // "start" or "end"
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessibilityFilter, setAccessibilityFilter] = useState('all');
  const [filterThreshold, setFilterThreshold] = useState(0.3);

  const handleMapClick = (latlng) => {
    if (selectionMode === "start") {
      setStart(latlng);
      setRoute(null);
      // Auto-switch to end if start is set
      setSelectionMode("end");
    } else {
      setEnd(latlng);
      setRoute(null);
      // Auto-fetch route when both points are set
      if (start) {
        handleGetRoute(start, latlng);
      }
    }
  };

  const handleGetRoute = async (startPoint = start, endPoint = end) => {
    if (!startPoint || !endPoint) return;

    setLoading(true);
    setError(null);
    try {
      const routeData = await planWalkingRoute({
        start: { lat: startPoint.lat, lon: startPoint.lng },
        end: { lat: endPoint.lat, lon: endPoint.lng },
        options: {
          allowLimitedSegments: true,
          limitedThreshold: filterThreshold
        }
      });
      setRoute(routeData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to find route");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = () => {
    alert("Review feature coming soon!");
  };

  const handleDestinationSelect = (location, displayName) => {
    // Set as destination
    setEnd(location);
    setRoute(null);
    // Auto-fetch route if start is already set
    if (start) {
      handleGetRoute(start, location);
    }
  };

  const handleStartLocationSelect = (location, displayName) => {
    // Set as start point
    setStart(location);
    setRoute(null);
    setSelectionMode("end");
    // Auto-fetch route if end is already set
    if (end) {
      handleGetRoute(location, end);
    }
  };

  const handleCurrentLocationClick = (location) => {
    // Set as start point
    setStart(location);
    setRoute(null);
    setSelectionMode("end");
    // Auto-fetch route if end is already set
    if (end) {
      handleGetRoute(location, end);
    }
  };

  const handleFilterChange = (filterValue, threshold) => {
    setAccessibilityFilter(filterValue);
    setFilterThreshold(threshold);
    // Re-fetch route if both points are set
    if (start && end) {
      handleGetRoute(start, end);
    }
  };

  const handleStartDrag = (newPosition) => {
    setStart(newPosition);
    setRoute(null);
    // Auto-fetch route if end is set
    if (end) {
      handleGetRoute(newPosition, end);
    }
  };

  const handleEndDrag = (newPosition) => {
    setEnd(newPosition);
    setRoute(null);
    // Auto-fetch route if start is set
    if (start) {
      handleGetRoute(start, newPosition);
    }
  };

  return (
    <div className="app-container">
      <Header
        onLocationSelect={handleDestinationSelect}
        onStartLocationSelect={handleStartLocationSelect}
        onCurrentLocationClick={handleCurrentLocationClick}
        onFilterChange={handleFilterChange}
        currentFilter={accessibilityFilter}
      />

      <div className="map-wrapper">
        <MapComponent
          start={start}
          end={end}
          route={route}
          onMapClick={handleMapClick}
          onStartDrag={handleStartDrag}
          onEndDrag={handleEndDrag}
        />
      </div>

      <RecommendedPanel />

      {end && (
        <DestinationPanel
          destination={end}
          start={start}
          routeInfo={route}
        />
      )}

      {route && (
        <DirectionsPanel
          route={route}
          start={start}
          end={end}
        />
      )}

      <FloatingActionButton onClick={handleReviewClick} />
      <Logo />

      {error && (
        <div style={{
          position: 'fixed',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow)',
          zIndex: 2000
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{
          position: 'fixed',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow)',
          zIndex: 2000
        }}>
          Calculating route...
        </div>
      )}
    </div>
  );
}

export default App;
