# 🚶‍♀️ uOttaMove  
Accessibility-First Navigation for the University of Ottawa & Ottawa Region

uOttaMove is an accessibility-focused navigation app designed for the **University of Ottawa campus and surrounding Ottawa area**. It helps users with mobility challenges find **safe, usable walking routes** by accounting for sidewalk conditions, curb cuts, incline, steps, and other accessibility features ignored by standard map apps.

---

## 🎯 Problem

Most navigation apps optimize for distance or time, not accessibility. As a result, routes may include:

- Stairs or missing curb cuts  
- Steep inclines  
- Poor or uneven surfaces  
- Pathways unusable for wheelchairs or mobility aids  

What works for able-bodied users often **does not work at all** for people with mobility challenges.

---

## 💡 Solution

uOttaMove uses **OpenStreetMap accessibility data** and a **custom routing engine** to generate wheelchair-aware routes that prioritize accessibility over raw distance.

Routes consider:
- Sidewalk surface quality  
- Curb height and curb cuts  
- Incline and slope  
- Steps and obstacles  
- Tactile paving  
- Wheelchair accessibility tags  

---

## ✨ Key Features

### Accessibility-Aware Routing
- Prioritizes accessible sidewalks and paths  
- Penalizes steps, steep slopes, high curbs, and poor surfaces  
- Supports different accessibility needs:
  - Wheelchair users  
  - Mobility aids  
  - Visual impairments  
- Accessibility score assigned to each route segment  

### Smart Turn-by-Turn Directions
- Consolidated instructions (no spammy “continue straight” steps)  
- Street names included  
  - Example: *In 90 m, turn left onto Young Street*  
- Advance turn warnings and accessibility alerts  

### Search & Navigation
- Start and destination search  
- Use current GPS location  
- Featured accessible locations around campus and downtown Ottawa  

### Interactive Map
- Click or drag markers to adjust routes  
- Color-coded route accessibility  
- Smooth zoom and pan controls  

### Route Summary
- Total distance and estimated time  
- Distance to nearest accessible sidewalk  
- Accessibility overview of the route  

---

## 🛠️ Tech Stack

**Frontend**
- React (18.3.1)
- Vite
- Leaflet + React-Leaflet
- Vanilla CSS

**Backend**
- Node.js
- Express
- CORS

**Data & APIs**
- OpenStreetMap (Nominatim)
- Custom processed sidewalk accessibility dataset

---

## 🧠 Routing & Algorithms

- Graph built from sidewalk segments and intersections  
- Modified **Dijkstra’s algorithm** with accessibility weighting  
- Nearest-node snapping for start/end points  

**Weighting logic**
- Base weight = distance  
- Penalties applied for:
  - Steps (very high)
  - Poor surface
  - Steep incline
  - Low-confidence data  

Directions are generated using bearing calculations and merged into clear, readable instructions.

---

## 📊 Accessibility Data Tracked

- wheelchair: yes / no / limited  
- surface: paved / gravel / cobblestone  
- kerb: lowered / raised / flush  
- incline (direction + degrees)  
- tactile_paving  
- width  
- step_count  

---

## 🚧 Challenges Solved

- **White screen crash:** fixed coordinate mismatches (`lon` vs `lng`) and string parsing  
- **Too many directions:** consolidated straight segments  
- **Missing street names:** extracted from OSM tags  
- **Slow graph builds:** optimized intersection detection  
- **Accessibility scoring:** implemented multi-factor scoring model  

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/taranprits2/uOttaMove.git
cd uOttaMove

# Backend
cd server
npm install
npm run dev

# Frontend
cd ../client
npm install
npm run dev
