# API Quick Reference - Google Maps Optimization

## Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/itinerary/optimize` | Generate optimized itinerary | Session ID |
| GET | `/api/monitoring/google-maps/metrics` | API usage metrics | No |
| GET | `/api/monitoring/google-maps/logs` | Request logs | No |
| GET | `/api/monitoring/performance/overview` | Performance overview | No |
| GET | `/api/monitoring/health` | System health check | No |
| POST | `/api/monitoring/performance/clear` | Clear performance data | No |

## Quick Examples

### Optimize Itinerary
```bash
curl -X POST http://localhost:3001/api/itinerary/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123",
    "selectedSpots": [
      {"id": "spot_1", "name": "Eiffel Tower"},
      {"id": "spot_2", "name": "Louvre Museum"}
    ],
    "city": "Paris",
    "travelMode": "walking"
  }'
```

### Check Health
```bash
curl http://localhost:3001/api/monitoring/health
```

### Get Metrics
```bash
curl http://localhost:3001/api/monitoring/google-maps/metrics
```

## Common Error Codes

| Code | Status | Meaning | Action |
|------|--------|---------|--------|
| `VALIDATION_ERROR` | 400 | Invalid parameters | Fix request |
| `SESSION_NOT_FOUND` | 404 | Session expired | Start new session |
| `GOOGLE_MAPS_QUOTA_EXCEEDED` | 503 | API quota exceeded | Wait for reset |
| `GOOGLE_MAPS_RATE_LIMITED` | 429 | Rate limited | Wait 30s, retry |

## Request Parameters

### Required
- `sessionId`: string
- `selectedSpots`: array (1-20 items)
- `city`: string

### Optional
- `travelMode`: 'walking' | 'driving' | 'transit'
- `startTime`: 'HH:MM' format
- `visitDuration`: number (15-480 minutes)
- `includeBreaks`: boolean
- `multiDay`: boolean

## Response Structure

### Success
```json
{
  "success": true,
  "data": {
    "itinerary": { /* optimized itinerary */ },
    "fallbackUsed": false,
    "message": "Success message"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { /* additional info */ }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

## Fallback Behavior

When Google Maps APIs are unavailable:
- `fallbackUsed: true` in response
- Basic itinerary without optimization
- Estimated times instead of calculated routes
- Simplified response structure

## Performance Tips

1. **Cache Usage**: Check cache hit rates via `/api/monitoring/performance/cache`
2. **Rate Limits**: Monitor via `/api/monitoring/google-maps/metrics`
3. **Health Checks**: Use `/api/monitoring/health` for system status
4. **Preloading**: Use `/api/monitoring/performance/preload` for common locations

## Environment Variables

```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=your_api_key_here

# Performance Settings
GEOCODING_CACHE_TTL=86400  # 24 hours
ROUTE_CACHE_TTL=3600       # 1 hour
MAX_CACHE_ENTRIES=10000

# Rate Limiting
GOOGLE_MAPS_REQUESTS_PER_SECOND=10
GOOGLE_MAPS_REQUESTS_PER_DAY=25000
```