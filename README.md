# uOttaMove

uOttaMove is an accessibility-aware routing web application designed for users in Ottawa. It prioritizes wheelchair-friendly walking routes using OpenStreetMap data.

## Features
- **Accessibility Routing**: Avoids steps, steep inclines, and poor surfaces.
- **Search**: Integrated with Nominatim (Ottawa focused).
- **Interactive Map**: Built with React and Leaflet.
- **Profiles**: Wheelchair (strict) vs Pedestrian (relaxed).

## Project Structure
- `back_end/`: Node.js Express API.
  - `src/services/map_data`: OSM fetching and geocoding.
  - `src/services/accessibility`: Scoring logic.
  - `src/services/routing`: A* pathfinding.
- `front_end/`: React + Vite application.
- `data/`: (Optional) Folder for local datasets.

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm

### Installation
1. Install Backend Dependencies:
   ```bash
   cd back_end
   npm install
   ```
2. Install Frontend Dependencies:
   ```bash
   cd front_end
   npm install
   ```

### Running the App
1. Start the Backend:
   ```bash
   cd back_end
   npm start
   # Runs on http://localhost:3000
   ```
2. Start the Frontend:
   ```bash
   cd front_end
   npm run dev
   # Runs on http://localhost:5173
   ```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Endpoints
- `GET /api/map/search?query=...`: Search for places.
- `POST /api/routes/walking`: Calculate route.
  - Body: `{ "start": {lat, lon}, "end": {lat, lon}, "profile": "wheelchair" }`
