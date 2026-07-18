# Pakistan SkillExchange Board

An interactive, peer-to-peer community platform designed for Pakistani residents to trade skills, knowledge, and hobbies locally without money changing hands. The system identifies reciprocal matches (e.g., teaching what someone else wants to learn, and vice versa) and maps connections on a customized, high-contrast national coordinate grid.

#To Preview Local Exchange Board Website

https://local-skill-exchange-borad.vercel.app/
---

## 🌟 Key Features

* **Reciprocal Match Engine**: Automatically computes and highlights "perfect exchanges" where users' offers and requests align with other community members' needs.
* **National Coordinate Grid & Map**: A beautifully styled, interactive SVG map highlighting major cities (Karachi, Lahore, Islamabad, Peshawar, Quetta) and a stylized Indus River guide, visualizing localized listings and spatial density.
* **Community Listing Directory**: Full search, filtering, and categorization system allowing users to browse through dedicated sections (Languages, Coding & Tech, Culinary Arts, Music & Instruments).
* **Localized Direct Messaging**: Private message boards supporting thread histories, context-linked listings, and automatic recipient routing.
* **Trust & Reputation Controls**: User review and rating metrics integrated directly into profiles to establish trust within the peer exchange network.
* **Pre-seeded Pakistani Demo Profiles**: Seamlessly switch between preconfigured profiles (Ayesha K., Zain A., Faisal S., Maryam B.) with one click for testing and demo flows.
* **Hybrid Database Support**: Operates gracefully out-of-the-box in secure offline-first Mock Fallback mode (retaining data in `localStorage`), or escalates to a fully persistent Cloud Database powered by Firebase/Firestore.

---

## 🛠️ Technology Stack

* **Frontend Framework**: React 19 + TypeScript (strict mode, type safety)
* **Build System**: Vite 6
* **Styling & Theme**: Tailwind CSS v4 (native build pipeline)
* **Animations**: Motion (`motion/react`) for smooth page/modal transitions
* **Icons**: Lucide React
* **Database & Authentication**: Firebase Firestore & Firebase Auth (with automatic client-side offline mock fallback)

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have **Node.js** (version 18 or above) installed on your system.

### 2. Installation

Clone the repository and install dependencies:

```bash
# Install package dependencies
npm install
```

### 3. Environment Variables Setup

The application is built to run directly out-of-the-box with a high-fidelity mock fallback mechanism. To connect your actual live database, configure Firebase credentials.

Create a `.env` file at the root of the project using the structure from `.env.example`:

```env
# Firebase Configuration Variables
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain-here
VITE_FIREBASE_PROJECT_ID=your-project-id-here
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket-here
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id-here
VITE_FIREBASE_APP_ID=your-app-id-here
```

### 4. Running the Development Server

Start the local server:

```bash
npm run dev
```

The application will launch on your local host (usually `http://localhost:3000`).

### 5. Code Quality & Formatting

To run the TypeScript compiler and verify type safety:

```bash
npm run lint
```

---

## 📦 Production Build

To compile a highly optimized, minified version of the static assets for deployment:

```bash
# Compiles React files into the dist/ directory
npm run build
```

You can preview the built production app locally using:

```bash
npm run preview
```

---

## 🏛️ Architectural Overview

### 🗺️ SVG Geo-Grid Mapping
Instead of relying on heavy third-party map loaders, the application maps Pakistan's geographic coordinate boundaries (`lat: 24.0` to `37.0`, `lng: 61.0` to `76.0`) dynamically into standard coordinates on a lightweight vector canvas.

```typescript
// Latitude mapping calculation formula
const latToY = (lat: number) => {
  const minLat = 24.0;
  const maxLat = 37.0;
  return mapHeight - (((lat - minLat) / (maxLat - minLat)) * mapHeight);
};
```

### 🔁 Reciprocity Matching Logic
The match engine scans the active user profile's offering categories and wanting categories, then queries potential partners whose desires perfectly mirror what the active user offers:

```typescript
const isReciprocal = (userA, userB) => {
  const aOffersBListings = userA.offers.some(category => userB.requests.includes(category));
  const bOffersAListings = userB.offers.some(category => userA.requests.includes(category));
  return aOffersBListings && bOffersAListings;
};
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
