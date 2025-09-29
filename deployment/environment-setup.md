# Environment Configuration Guide

## Overview
This guide covers the environment configuration required for the Google Maps itinerary optimization features.

## Required Environment Variables

### Backend Environment Variables

Add these variables to your backend `.env` file:

```bash
# Google Places API Configuration (existing)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Google Maps API Configuration (new for route optimization)
# This key needs access to: Geocoding API, Distance Matrix API, Routes API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional: Google Maps API Configuration
GOOGLE_MAPS_REGION=US  # Optional: Bias results to specific region
GOOGLE_MAPS_LANGUAGE=en  # Optional: Language for API responses
```

### Frontend Environment Variables

The frontend doesn't require additional environment variables for Google Maps integration as all API calls are made through the backend.

## Google Maps Platform Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing for the project

### 2. Enable Required APIs
Enable these APIs in your Google Cloud Console:

- **Geocoding API**: Convert addresses to coordinates
- **Distance Matrix API**: Calculate travel times between locations  
- **Routes API**: Advanced routing and transit information (recommended)
- **Places API**: Location details, photos, and reviews (existing)

### 3. Create API Keys

#### Option 1: Single API Key (Simpler)
Create one API key with access to all required APIs:
- Geocoding API
- Distance Matrix API  
- Routes API
- Places API

Use this key for both `GOOGLE_PLACES_API_KEY` and `GOOGLE_MAPS_API_KEY`.

#### Option 2: Separate API Keys (More Secure)
Create separate API keys for different purposes:

**Google Places API Key** (for frontend/spot details):
- Restrict to: Places API only
- Add HTTP referrer restrictions (your domain)

**Google Maps API Key** (for backend routing):
- Restrict to: Geocoding API, Distance Matrix API, Routes API
- Add IP address restrictions (your server IP)

### 4. Configure API Key Restrictions

#### For Production Deployment:
```
HTTP referrers (web sites):
- https://yourdomain.com/*
- https://www.yourdomain.com/*

IP addresses (servers):
- Your EC2 instance IP address
- Your load balancer IP (if using one)
```

#### For Development:
```
HTTP referrers (web sites):
- http://localhost:3000/*
- http://127.0.0.1:3000/*

IP addresses (servers):
- 127.0.0.1
- Your development machine IP
```

## API Usage Quotas and Limits

### Recommended Daily Quotas (to control costs):
- **Geocoding API**: 1,000 requests/day
- **Distance Matrix API**: 1,000 requests/day  
- **Routes API**: 500 requests/day
- **Places API**: 1,000 requests/day

### Rate Limits:
- **Geocoding**: 50 requests/second
- **Distance Matrix**: 100 elements/second
- **Routes**: 100 requests/second
- **Places**: 100 requests/second

## Cost Estimation

### Google Maps Platform Pricing (as of 2024):
- **Geocoding**: $5.00 per 1,000 requests
- **Distance Matrix**: $5.00 per 1,000 requests
- **Routes**: $5.00 per 1,000 requests  
- **Places API**: $17.00 per 1,000 requests

### Monthly Cost Examples:
**Light Usage** (100 itineraries/month):
- ~300 geocoding requests: $1.50
- ~300 distance matrix requests: $1.50
- ~100 routes requests: $0.50
- **Total**: ~$3.50/month

**Medium Usage** (1,000 itineraries/month):
- ~3,000 geocoding requests: $15.00
- ~3,000 distance matrix requests: $15.00
- ~1,000 routes requests: $5.00
- **Total**: ~$35.00/month

**High Usage** (10,000 itineraries/month):
- ~30,000 geocoding requests: $150.00
- ~30,000 distance matrix requests: $150.00
- ~10,000 routes requests: $50.00
- **Total**: ~$350.00/month

## Environment File Templates

### Backend `.env` Template
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Bedrock Agent Configuration
BEDROCK_AGENT_ID=BTATPBP5VG
BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Google Places API Configuration
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Google Maps API Configuration (for route optimization)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional Google Maps Configuration
GOOGLE_MAPS_REGION=US
GOOGLE_MAPS_LANGUAGE=en
```

### Frontend `.env` Template
```bash
# API Configuration
VITE_API_URL=http://localhost:3001

# Development Configuration
VITE_NODE_ENV=development
```

## Deployment Checklist

### Before Deployment:
- [ ] Google Cloud Project created with billing enabled
- [ ] Required APIs enabled (Geocoding, Distance Matrix, Routes, Places)
- [ ] API keys created and properly restricted
- [ ] Environment variables configured in deployment environment
- [ ] API quotas set to prevent unexpected charges
- [ ] Test API keys with sample requests

### After Deployment:
- [ ] Verify API calls are working in production
- [ ] Monitor API usage in Google Cloud Console
- [ ] Set up billing alerts for cost control
- [ ] Configure CloudWatch monitoring for API errors
- [ ] Test route optimization with real data

## Troubleshooting

### Common Issues:

**"API key not valid" errors:**
- Check API key restrictions match your domain/IP
- Verify the API is enabled for your project
- Ensure billing is enabled on your Google Cloud project

**"OVER_QUERY_LIMIT" errors:**
- Check your daily quotas in Google Cloud Console
- Implement request caching to reduce API calls
- Consider upgrading your quota limits

**"REQUEST_DENIED" errors:**
- Verify API key has access to the required APIs
- Check IP/domain restrictions on the API key
- Ensure the API key is not expired or disabled

**High API costs:**
- Implement geocoding result caching
- Use batch requests for distance matrix calculations
- Set appropriate daily quotas
- Monitor usage patterns and optimize accordingly

## Security Best Practices

1. **Never expose API keys in frontend code**
2. **Use environment variables for all API keys**
3. **Implement proper API key restrictions**
4. **Monitor API usage regularly**
5. **Set up billing alerts**
6. **Rotate API keys periodically**
7. **Use separate keys for development and production**
8. **Implement request rate limiting in your application**

## Monitoring and Alerting

### Google Cloud Monitoring:
- Set up alerts for quota usage (80% threshold)
- Monitor error rates for each API
- Track response times and performance

### Application Monitoring:
- Log all Google Maps API requests and responses
- Monitor optimization performance metrics
- Track user experience improvements

### Cost Monitoring:
- Set up billing alerts at $10, $50, $100 thresholds
- Review monthly usage reports
- Optimize API usage patterns based on cost analysis