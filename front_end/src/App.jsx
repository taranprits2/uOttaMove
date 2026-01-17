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
  const [selectionMode, setSelectionMode] = useState(null); // 'start', 'end', or null

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

  const handleMapClick = (latlng) => {
    if (selectionMode === 'start') {
      setStart({ lat: latlng.lat, lon: latlng.lng, name: `Map Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})` });
      setSelectionMode(null);
    } else if (selectionMode === 'end') {
      setEnd({ lat: latlng.lat, lon: latlng.lng, name: `Map Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})` });
      setSelectionMode(null);
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
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
      />

      {selectionMode && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3000, background: '#2c3e50', color: 'white', padding: '10px 20px', borderRadius: '30px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)', fontWeight: 'bold'
        }}>
          Click map to set {selectionMode.toUpperCase()}
        </div>
      )}

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
