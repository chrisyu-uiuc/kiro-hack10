# Google Maps Itinerary Optimization

## Overview
Enhance the travel itinerary generator with Google Maps APIs to provide realistic routing, accurate travel times, and optimized scheduling instead of relying on basic Bedrock Agent timing estimates.

## Current State
- Bedrock Agent generates itineraries with basic timing estimates
- Google Places API provides spot details (photos, reviews, etc.)
- No real geocoding or transit time calculations
- Basic scheduling without travel time constraints

## Goals
- **Real Geocoding**: Convert spot names to precise coordinates
- **Actual Transit Times**: Calculate real travel times between locations
- **Route Optimization**: Minimize total travel time with optimal ordering
- **Realistic Scheduling**: Account for opening hours, travel time, and visit duration
- **Navigation Integration**: Provide direct Google Maps navigation links

## Key Features

### 1. Google Maps Integration
- **Geocoding API**: Convert addresses to coordinates
- **Distance Matrix API**: Calculate travel times between multiple points
- **Directions API**: Get detailed routing information
- **Maps JavaScript API**: Optional embedded maps (future enhancement)

### 2. Route Optimization
- **Traveling Salesman Problem (TSP)**: Find optimal visit order
- **Time Windows**: Respect opening hours and constraints
- **Travel Mode Support**: Walking, driving, transit options
- **Buffer Time**: Account for parking, walking between transport

### 3. Enhanced Scheduling
- **Dynamic Time Allocation**: Adjust visit duration based on spot type
- **Opening Hours Integration**: Schedule around business hours
- **Travel Time Buffers**: Realistic time between locations
- **Meal Break Scheduling**: Automatic lunch/dinner breaks

### 4. User Experience
- **Interactive Maps**: Show route visualization
- **Navigation Links**: Direct links to Google Maps navigation
- **Alternative Routes**: Provide backup routing options
- **Time Estimates**: Show arrival times and durations

## Technical Implementation

### Backend Services
1. **GoogleMapsService**: New service for routing and geocoding
2. **RouteOptimizer**: Algorithm for optimal spot ordering
3. **ScheduleBuilder**: Generate realistic time schedules
4. **Enhanced ItineraryService**: Combine all services

### API Endpoints
- `POST /api/itinerary/optimize` - Generate optimized itinerary
- `GET /api/itinerary/route/:sessionId` - Get route details
- `POST /api/itinerary/reorder` - Reorder spots with new optimization

### Frontend Enhancements
- Enhanced itinerary display with maps
- Travel time indicators
- Navigation buttons for each leg
- Route visualization (optional)

## Success Criteria
- Accurate travel times (within 10% of actual)
- Optimized routes reduce total travel time by 20%+
- Realistic scheduling respects opening hours
- Direct navigation integration works seamlessly
- Performance: Route optimization completes within 5 seconds

## Dependencies
- Google Maps Platform APIs (Geocoding, Distance Matrix, Directions)
- Enhanced Google Places API usage
- Route optimization algorithm
- Updated frontend components