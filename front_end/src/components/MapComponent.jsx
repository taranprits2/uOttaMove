import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Sub-component to handle map clicks
const MapEvents = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
};

const MapComponent = ({ start, end, route, onMapClick }) => {
    const center = [45.4215, -75.6972]; // Ottawa

    function ChangeView({ center }) {
        const map = useMap();
        map.setView(center);
        return null;
    }

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapEvents onClick={onMapClick} />

            {start && <Marker position={[start.lat, start.lon]}><Popup>Start</Popup></Marker>}
            {end && <Marker position={[end.lat, end.lon]}><Popup>End</Popup></Marker>}

            {route && <Polyline positions={route.features[0].geometry.coordinates.map(c => [c[1], c[0]])} color="blue" weight={5} />}

            {start && <ChangeView center={[start.lat, start.lon]} />}
        </MapContainer>
    );
};

export default MapComponent;
