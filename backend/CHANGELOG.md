# Changelog

All notable changes to the Travel Itinerary Generator Backend API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2023-11-20

### Added - Enhanced Itinerary Service & Google Maps Optimization

#### New API Endpoints
- **POST /api/itinerary/optimize** - Generate optimized itinerary with Google Maps integration
  - Route optimization using Google Maps APIs
  - Multi-modal travel support (walking, driving, transit)
  - Multi-day itinerary support
  - Intelligent fallback when APIs unavailable
  - Comprehensive validation and error handling

#### Monitoring & Performance Endpoints
- **GET /api/monitoring/google-maps/metrics** - Google Maps API usage metrics
- **GET /api/monitoring/google-maps/logs** - Request logs with filtering
- **GET /api/monitoring/google-maps/report** - Comprehensive performance report
- **POST /api/monitoring/google-maps/reset** - Reset metrics (admin)
- **GET /api/monitoring/performance/overview** - System performance overview
- **GET /api/monitoring/performance/cache** - Cache statistics
- **GET /api/monitoring/performance/optimization** - Route optimization metrics
- **POST /api/monitoring/performance/clear** - Clear performance data
- **POST /api/monitoring/performance/preload** - Preload common locations
- **GET /api/monitoring/health** - Enhanced health check with metrics

#### New Services
- **EnhancedItineraryService** - Core optimization engine combining Bedrock Agent insights with Google Maps routing
- **GoogleMapsService** - Google Maps API integration with intelligent caching and TSP algorithms
- **RouteOptimizationMonitor** - Performance monitoring for route optimization with real-time metrics
- **GeocodingCache** - Intelligent caching system with 24-hour TTL and automatic cleanup

#### Enhanced Error Handling
- Specific error codes for different failure scenarios
- Google Maps API quota and rate limit handling
- Graceful fallback behavior with clear indicators
- Detailed error responses with actionable information

#### Performance Features
- **Geocoding Cache**: 24-hour TTL with automatic cleanup
- **Route Optimization**: TSP-based fallback algorithm
- **Request Batching**: Optimized API usage
- **Memory Management**: Efficient cache management
- **Performance Monitoring**: Real-time metrics and alerting

### Enhanced
- **Session Management**: Extended to support optimization data
- **Validation**: Comprehensive request validation with detailed error messages
- **Logging**: Enhanced logging with performance metrics
- **Health Checks**: Expanded health monitoring with system status

### Documentation
- **Complete API Documentation**: Comprehensive endpoint documentation
- **Quick Reference Guide**: Developer-friendly API reference
- **Integration Examples**: Frontend and backend integration samples
- **Error Handling Guide**: Detailed error code reference
- **Performance Guide**: Optimization and monitoring best practices

### Technical Improvements
- **Enhanced Architecture**: Sophisticated service integration with intelligent fallback systems
- **TypeScript**: Enhanced type definitions for all new endpoints and services
- **Testing**: Comprehensive test coverage including multi-day scenarios and error handling
- **Error Boundaries**: Robust error handling with specific error codes and recovery strategies
- **Monitoring**: Real-time performance and health monitoring with detailed metrics
- **Caching Strategy**: Multi-layer caching system for optimal performance and cost reduction

## [1.1.0] - 2023-11-15

### Added - Spot Information Feature

#### New API Endpoints
- **GET /api/spots/:spotId/details** - Get detailed spot information
- **GET /api/spots/:spotId/photos** - Get spot photos with optimization
- **GET /api/spots/:spotId/reviews** - Get spot reviews and ratings

#### New Services
- **GooglePlacesService** - Google Places API integration
- Enhanced error handling with retry mechanisms
- Image optimization and caching

#### Frontend Components
- **SpotInfoPopup** - Comprehensive spot information modal
- **PhotoGallery** - Interactive photo gallery with lazy loading
- **ReviewsSection** - Google Places reviews display
- **OptimizedImage** - Performance-optimized image component
- **SpotInfoErrorBoundary** - Spot-specific error handling

#### Performance Features
- Image lazy loading and caching
- Request deduplication
- Session-based caching
- Mobile-optimized touch interactions

### Enhanced
- **Error Handling**: Comprehensive error boundaries
- **Mobile Support**: Touch-friendly interface
- **Performance**: Optimized image loading and caching
- **Accessibility**: Full keyboard navigation support

## [1.0.0] - 2023-11-10

### Added - Initial Release

#### Core API Endpoints
- **POST /api/verify-city** - Verify city exists using AWS Bedrock Agent
- **POST /api/generate-spots** - Generate recommended spots
- **POST /api/store-selections** - Store user selections
- **POST /api/generate-itinerary** - Generate travel itinerary
- **GET /health** - Basic health check

#### Core Services
- **BedrockAgentService** - AWS Bedrock Agent integration
- Session management with in-memory storage
- Request logging and error handling

#### Infrastructure
- **Express Server**: TypeScript-based API server
- **Security**: Helmet middleware, CORS configuration
- **Validation**: Request validation and sanitization
- **Logging**: Structured request/response logging
- **Testing**: Comprehensive test suite

#### Frontend Foundation
- **React 18**: Modern React with TypeScript
- **Vite**: Fast development and build tooling
- **Component Architecture**: Modular, reusable components
- **State Management**: Session-based state management
- **Routing**: React Router DOM integration

### Technical Foundation
- **Monorepo**: npm workspaces architecture
- **TypeScript**: Strict mode with path mapping
- **ESLint**: Code quality and consistency
- **Environment Configuration**: Flexible environment setup
- **Development Tools**: Hot reload, concurrent development

---

## Migration Guide

### Upgrading to 1.2.0

#### New Environment Variables
Add these to your `.env` file:
```bash
# Google Maps API Configuration (Required)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Performance Settings (Optional but Recommended)
GEOCODING_CACHE_TTL=86400                    # 24 hours
ROUTE_CACHE_TTL=3600                         # 1 hour
MAX_CACHE_ENTRIES=10000                      # Maximum cache entries

# Rate Limiting (Optional)
GOOGLE_MAPS_REQUESTS_PER_SECOND=10
GOOGLE_MAPS_REQUESTS_PER_DAY=25000

# Optimization Settings (Optional)
MAX_SPOTS_FOR_FULL_OPTIMIZATION=8           # Threshold for fast optimization
OPTIMIZATION_TIMEOUT=45000                   # 45 seconds
FALLBACK_TIMEOUT=30000                       # 30 seconds
```

#### Google Maps Platform Setup
1. Enable required APIs in Google Cloud Console:
   - Geocoding API (required for EnhancedItineraryService)
   - Distance Matrix API (required for route optimization)
   - Routes API (optional but recommended)
   - Places API (already required for existing features)

2. Configure API key restrictions for security
3. Set up usage quotas to control costs

#### API Changes
- **New Primary Endpoint**: `POST /api/itinerary/optimize` - Enhanced optimization with Google Maps integration
- **Enhanced Error Responses**: Specific error codes for different failure scenarios
- **New Monitoring Endpoints**: Comprehensive performance tracking and health monitoring
- **Fallback Support**: Graceful degradation when APIs are unavailable

#### Service Architecture Changes
- **EnhancedItineraryService**: New core service combining Bedrock Agent with Google Maps
- **Intelligent Caching**: Automatic caching reduces API usage and improves performance
- **Multi-Day Support**: Automatic day splitting with proper time constraints
- **Performance Monitoring**: Real-time metrics and health monitoring

#### Breaking Changes
None - all changes are additive and backward compatible. Existing endpoints continue to work as before.

### Upgrading to 1.1.0

#### New Environment Variables
```bash
# Google Places API Configuration
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

#### API Changes
- New spot detail endpoints
- Enhanced error handling
- Session data structure extended

---

## Support

For questions about API changes or migration assistance:
1. Check the [API Documentation](docs/api-optimization.md)
2. Review the [Quick Reference Guide](docs/api-quick-reference.md)
3. Examine the integration examples in the documentation
4. Check the comprehensive test suite for usage patterns