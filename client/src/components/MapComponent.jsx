import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

function MapEvents({ onMapClick }) {
    const map = useMap();
    useEffect(() => {
        const handleClick = (e) => {
            onMapClick(e.latlng);
        };
        map.on("click", handleClick);
        return () => {
            map.off("click", handleClick);
        };
    }, [map, onMapClick]);
    return null;
}

function MapComponent({ start, end, route, onMapClick }) {
    const center = [45.4215, -75.6972]; // Ottawa center

    return (
        <MapContainer
            center={center}
            zoom={13}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            <MapEvents onMapClick={onMapClick} />

            {start && (
                <Marker position={[start.lat, start.lng]}>
                </Marker>
            )}

            {end && (
                <Marker position={[end.lat, end.lng]}>
                </Marker>
            )}

            {route && route.segments && route.segments.map((segment, idx) => {
                const score = segment.score ?? 0.5;
                let color = "#ef4444"; // Default Red
                if (score > 0.8) color = "#22c55e"; // Green
                else if (score > 0.6) color = "#84cc16"; // Lime
                else if (score > 0.45) color = "#f59e0b"; // Amber

                return (
                    <Polyline
                        key={`seg-${idx}`}
                        positions={segment.path.map(([lat, lon]) => [lat, lon])}
                        pathOptions={{ color, weight: 6, opacity: 0.9 }}
                    >
                    </Polyline>
                );
            })}

            {!route?.segments && route?.polyline && (
                <Polyline
                    positions={route.polyline.map(([lat, lon]) => [lat, lon])}
                    pathOptions={{ color: "var(--primary)", weight: 6, opacity: 0.8 }}
                />
            )}
        </MapContainer>
    );
}

export default MapComponent;
