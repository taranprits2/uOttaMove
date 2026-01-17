import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';
import { searchPlace, getWalkingRoute } from './services/api';
import './App.css';

function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [profile, setProfile] = useState('wheelchair');
  const [route, setRoute] = useState(null);

  // Selection mode is no longer needed as we use a sequential click logic

  const handleSearch = async (query) => {
    return await searchPlace(query);
  };

  const handleRoute = async () => {
    if (start && end) {
      try {
        const data = await getWalkingRoute(start, end, profile);
        setRoute(data);
      } catch (error) {
        console.error(error);
        alert("Could not calculate route. Check backend console for details or try points closer together.");
      }
    }
  };

  // Auto-calculate route when start and end are set
  React.useEffect(() => {
    if (start && end) {
      handleRoute();
    }
  }, [start, end, profile]);

  const handleMapClick = (latlng) => {
    const newPoint = {
      lat: latlng.lat,
      lon: latlng.lng,
      name: `Map Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`
    };

    if (!start) {
      // First click: Set Start
      setStart(newPoint);
    } else if (!end) {
      // Second click: Set End (triggers useEffect -> route)
      setEnd(newPoint);
    } else {
      // Third click: Reset (New Start, Clear End/Route)
      setStart(newPoint);
      setEnd(null);
      setRoute(null);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      <Sidebar
        onSearch={handleSearch}
        onRoute={handleRoute}
        start={start}
        end={end}
        setStart={setStart}
        setEnd={setEnd}
        profile={profile}
        setProfile={setProfile}
      // Removed selectionMode props from Sidebar as they are no longer used for logic
      />

      <div style={{ width: '100%', height: '100%', zIndex: 0 }}>
        <MapComponent
          start={start}
          end={end}
          route={route}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
}

export default App;
