# Travel Itinerary Frontend

React frontend application for the Travel Itinerary Generator.

## Features Implemented

### Task 8-14: Complete Frontend Implementation ✅

- **React Application Foundation**: TypeScript, React Router, global state management
- **CityInput Component**: City verification with loading states and error handling
- **SpotSelection Component**: Interactive spot selection with visual feedback
- **ItineraryDisplay Component**: Formatted itinerary display with timeline view
- **API Integration**: Axios-based service with comprehensive error handling
- **Navigation & State Management**: Multi-step flow with state persistence
- **Error Handling**: User-friendly error messages and loading indicators

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CityInput.tsx         # City input and verification
│   │   ├── SpotSelection.tsx     # Spot selection interface
│   │   ├── ItineraryDisplay.tsx  # Itinerary display
│   │   ├── ErrorBoundary.tsx     # Error boundary component
│   │   └── LoadingSpinner.tsx    # Loading indicator
│   ├── hooks/
│   │   └── useAppState.ts        # Global state management hook
│   ├── services/
│   │   └── api.ts                # API service with Axios
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── App.tsx                   # Main app component with routing
│   ├── main.tsx                  # React app entry point
│   └── index.css                 # Global styles
├── public/                       # Static assets
├── index.html                    # HTML template
├── vite.config.ts               # Vite configuration
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001

# Development Configuration
VITE_NODE_ENV=development
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## User Flow

The application provides a three-step user experience:

1. **City Input** (`/`)
   - Enter city name
   - Real-time validation
   - City verification via API

2. **Spot Selection** (`/spots`)
   - View 10-20 recommended spots
   - Interactive selection with visual feedback
   - Category, location, and description display

3. **Itinerary Display** (`/itinerary`)
   - Generated travel itinerary
   - Timeline view with timing and transportation
   - Print functionality

## Features

- **Responsive Design**: Works on mobile and desktop
- **Error Handling**: Comprehensive error messages and recovery
- **Loading States**: Visual feedback for all async operations
- **State Management**: Persistent state across navigation
- **Type Safety**: Full TypeScript implementation
- **Accessibility**: Semantic HTML and keyboard navigation

## API Integration

The frontend communicates with the backend API through:
- City verification endpoint
- Spot generation endpoint
- Selection storage endpoint
- Itinerary generation endpoint

All API calls include proper error handling, loading states, and retry logic.