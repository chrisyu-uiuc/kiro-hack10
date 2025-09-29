/**
 * Node11 Itinerary Service
 * Exact implementation of the node11.js multi-day planning algorithm
 */

export interface LocationData {
    name: string;
    lat: number;
    lng: number;
    durationSec: number;
}

export interface RouteItem {
    name: string;
    arrivalTs: number;
    departureTs: number;
    isLunch?: boolean;
    travelSec?: number;
}

export interface DayPlan {
    day: number;
    route: RouteItem[];
}

export interface Node11Itinerary {
    days: DayPlan[];
    locationData: Map<string, LocationData>;
}

export class Node11ItineraryService {
    private readonly apiKey: string;
    private readonly routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    private readonly geocodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    private readonly apiCache = new Map();

    // Constants from node11.js
    private readonly START_TIME_OF_DAY = 9; // 9 AM
    private readonly END_TIME_OF_DAY = 22; // 10 PM
    private readonly LUNCH_DURATION_MIN = 60;
    private readonly LUNCH_WINDOW_START = 12; // 12 PM
    private readonly LUNCH_WINDOW_END = 14; // 2 PM
    private readonly POLITE_DELAY_MS = 100;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';

        if (!this.apiKey) {
            throw new Error('Google Maps API key is required');
        }
    }

    /**
     * Sleep function for polite API delays
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Geocode a place (exact node11.js implementation)
     */
    private async geocodePlace(name: string): Promise<LocationData> {
        const cacheKey = `geo:${name}`;
        if (this.apiCache.has(cacheKey)) {
            return this.apiCache.get(cacheKey);
        }

        const q = encodeURIComponent(name);
        const url = `${this.geocodingUrl}?address=${q}&key=${this.apiKey}`;
        const res = await fetch(url);
        const j = await res.json() as any;

        if (!j.results || j.results.length === 0) {
            throw new Error("Geocode failed for: " + name);
        }

        const { lat, lng } = j.results[0].geometry.location;
        const result: LocationData = { name, lat, lng, durationSec: 0 };
        this.apiCache.set(cacheKey, result);
        return result;
    }

    /**
     * Calculate transit time between two locations (exact node11.js implementation)
     */
    private async transitTimeBetween(
        a: LocationData,
        b: LocationData,
        departureUnixTs: number
    ): Promise<{ durationSec: number }> {
        if (a.name === b.name) return { durationSec: 0 };

        const cacheKey = `transit:${a.name}-${b.name}-${departureUnixTs}`;
        if (this.apiCache.has(cacheKey)) {
            return this.apiCache.get(cacheKey);
        }

        await this.sleep(this.POLITE_DELAY_MS);

        const body = {
            origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
            destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
            travelMode: "TRANSIT",
            departureTime: new Date(departureUnixTs * 1000).toISOString(),
        };

        const res = await fetch(this.routesUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': this.apiKey,
                'X-Goog-FieldMask': 'routes.duration'
            },
            body: JSON.stringify(body)
        });

        const j = await res.json() as any;

        if (!j.routes || j.routes.length === 0 || !j.routes[0].duration) {
            console.warn(`Warning: Could not find a transit route from ${a.name} to ${b.name}.`);
            return { durationSec: Infinity };
        }

        const durationStr = j.routes[0].duration;
        const durationSec = parseInt(durationStr.replace('s', ''), 10);
        const result = { durationSec };
        this.apiCache.set(cacheKey, result);
        return result;
    }

    /**
     * Build Google Maps link (exact node11.js implementation)
     */
    private buildGoogleMapsLink(a: LocationData, b: LocationData, departureUnix: number): string {
        const params = new URLSearchParams({
            api: '1',
            origin: `${a.lat},${a.lng}`,
            destination: `${b.lat},${b.lng}`,
            travelmode: 'transit',
            departure_time: String(departureUnix)
        });
        return `https://www.google.com/maps/dir/?${params.toString()}`;
    }

    /**
     * Main planning function (exact node11.js algorithm)
     */
    async planItinerary(
        spots: Array<{ name: string; durationMin: number }>,
        hotelLocation: string
    ): Promise<Node11Itinerary> {
        console.log("Geocoding all locations...");

        // Geocode all locations
        const allLocationNames = [hotelLocation, ...spots.map(s => s.name)];
        const locationData = new Map<string, LocationData>();

        for (const name of allLocationNames) {
            const loc = await this.geocodePlace(name);
            const spotInfo = spots.find(s => s.name === name);
            locationData.set(name, {
                ...loc,
                durationSec: (spotInfo?.durationMin || 0) * 60
            });
            console.log(` - Geocoded ${name}`);
        }

        const hotel = locationData.get(hotelLocation)!;
        let unvisitedSpots = new Set(spots.map(s => s.name));
        const itinerary: DayPlan[] = [];
        let dayNumber = 1;

        let today = new Date();
        today.setHours(this.START_TIME_OF_DAY, 0, 0, 0);
        let currentTime = today.getTime(); // in milliseconds

        while (unvisitedSpots.size > 0) {
            console.log(`\nPlanning Day ${dayNumber}...`);
            const dayPlan: DayPlan = { day: dayNumber, route: [] };
            let currentLocationName: string;
            let hadLunchToday = false;

            const endOfDayLimit = new Date(currentTime);
            endOfDayLimit.setHours(this.END_TIME_OF_DAY, 0, 0, 0);

            // EXACT Day 1 logic from node11.js
            if (dayNumber === 1) {
                console.log(" - Finding the best starting spot for Day 1...");
                let bestStartingSpot: string | null = null;
                let minTravelTimeToStart = Infinity;

                // Find the closest spot to the hotel to begin the entire tour
                for (const spotName of unvisitedSpots) {
                    const { durationSec: travelSec } = await this.transitTimeBetween(
                        hotel,
                        locationData.get(spotName)!,
                        currentTime / 1000
                    );
                    if (travelSec < minTravelTimeToStart) {
                        minTravelTimeToStart = travelSec;
                        bestStartingSpot = spotName;
                    }
                }

                if (bestStartingSpot) {
                    const spotLoc = locationData.get(bestStartingSpot)!;
                    const arrivalTs = currentTime + minTravelTimeToStart * 1000;
                    const departureTs = arrivalTs + spotLoc.durationSec * 1000;
                    const { durationSec: travelToHotelSec } = await this.transitTimeBetween(
                        spotLoc,
                        hotel,
                        departureTs / 1000
                    );
                    const finalArrivalAtHotelTs = departureTs + travelToHotelSec * 1000;

                    // Ensure the very first spot of the trip fits within a day's schedule
                    if (finalArrivalAtHotelTs <= endOfDayLimit.getTime()) {
                        console.log(` - Starting Day 1 by traveling to: ${bestStartingSpot}`);
                        dayPlan.route.push({
                            name: bestStartingSpot,
                            arrivalTs: arrivalTs,
                            departureTs: departureTs
                        });
                        unvisitedSpots.delete(bestStartingSpot);
                        currentLocationName = bestStartingSpot;
                        currentTime = departureTs;
                    } else {
                        console.log(" - No spot could be visited on Day 1. Ending plan.");
                        unvisitedSpots.clear();
                        continue;
                    }
                } else {
                    console.log(" - No spots to visit. Ending plan.");
                    break;
                }
            } else {
                // For Day 2+, start the day at the hotel as usual
                currentLocationName = hotelLocation;
                dayPlan.route.push({
                    name: hotelLocation,
                    arrivalTs: currentTime,
                    departureTs: currentTime
                });
            }

            // Main planning loop (exact node11.js logic)
            while (true) {
                // LUNCH CHECK (exact logic from node11.js)
                const currentHour = new Date(currentTime).getHours();
                if (!hadLunchToday && currentHour >= this.LUNCH_WINDOW_START && currentHour < this.LUNCH_WINDOW_END) {
                    const lunchDepartureTs = currentTime + this.LUNCH_DURATION_MIN * 60 * 1000;
                    dayPlan.route.push({
                        name: "Lunch Break",
                        arrivalTs: currentTime,
                        departureTs: lunchDepartureTs,
                        isLunch: true
                    });
                    currentTime = lunchDepartureTs;
                    hadLunchToday = true;
                    console.log(" - Scheduling lunch break.");
                }

                // FIND NEXT BEST SPOT (exact node11.js logic)
                let bestNextSpot: RouteItem | null = null;
                let minTravelTime = Infinity;

                for (const spotName of unvisitedSpots) {
                    const fromLoc = locationData.get(currentLocationName)!;
                    const toLoc = locationData.get(spotName)!;

                    const { durationSec: travelToSpotSec } = await this.transitTimeBetween(
                        fromLoc,
                        toLoc,
                        currentTime / 1000
                    );

                    if (travelToSpotSec === Infinity) continue;

                    const arrivalAtSpotTs = currentTime + travelToSpotSec * 1000;
                    const departureFromSpotTs = arrivalAtSpotTs + toLoc.durationSec * 1000;

                    const { durationSec: travelToHotelSec } = await this.transitTimeBetween(
                        toLoc,
                        hotel,
                        departureFromSpotTs / 1000
                    );

                    if (travelToHotelSec === Infinity) continue;

                    const finalArrivalAtHotelTs = departureFromSpotTs + travelToHotelSec * 1000;

                    if (finalArrivalAtHotelTs <= endOfDayLimit.getTime()) {
                        if (travelToSpotSec < minTravelTime) {
                            minTravelTime = travelToSpotSec;
                            bestNextSpot = {
                                name: spotName,
                                travelSec: travelToSpotSec,
                                arrivalTs: arrivalAtSpotTs,
                                departureTs: departureFromSpotTs
                            };
                        }
                    }
                }

                if (bestNextSpot) {
                    // Commit to visiting this spot
                    dayPlan.route.push(bestNextSpot);
                    unvisitedSpots.delete(bestNextSpot.name);
                    currentLocationName = bestNextSpot.name;
                    currentTime = bestNextSpot.departureTs;
                    console.log(` - Adding to itinerary: ${bestNextSpot.name}`);
                } else {
                    // No more spots can be visited today, end the day
                    break;
                }
            }

            // Add final leg back to the hotel (exact node11.js logic)
            const lastSpotName = dayPlan.route.length > 0 ? dayPlan.route[dayPlan.route.length - 1].name : hotelLocation;
            const lastSpot = locationData.get(lastSpotName)!;
            const { durationSec: travelToHotelSec } = await this.transitTimeBetween(
                lastSpot,
                hotel,
                currentTime / 1000
            );
            const finalArrivalTs = currentTime + travelToHotelSec * 1000;

            dayPlan.route.push({
                name: hotelLocation,
                arrivalTs: finalArrivalTs,
                departureTs: finalArrivalTs
            });

            itinerary.push(dayPlan);

            // Prepare for the next day (exact node11.js logic)
            dayNumber++;
            today.setDate(today.getDate() + 1);
            today.setHours(this.START_TIME_OF_DAY, 0, 0, 0);
            currentTime = today.getTime();
        }

        return {
            days: itinerary,
            locationData
        };
    }

    /**
     * Convert Node11 itinerary to our UI format
     */
    convertToUIFormat(node11Itinerary: Node11Itinerary, city: string) {
        const { days, locationData } = node11Itinerary;

        const uiDays = days.map(dayPlan => ({
            day: dayPlan.day,
            date: new Date(Date.now() + (dayPlan.day - 1) * 24 * 60 * 60 * 1000).toDateString(),
            schedule: this.convertRouteToSchedule(dayPlan.route, locationData),
            totalDuration: this.calculateDayDuration(dayPlan.route),
            totalTravelTime: this.calculateDayTravelTime(dayPlan.route)
        }));

        return {
            title: `${days.length}-Day ${city} Itinerary`,
            totalDuration: this.calculateTotalDuration(uiDays),
            totalTravelTime: this.calculateTotalTravelTime(uiDays),
            schedule: this.flattenSchedule(uiDays),
            route: {
                orderedSpots: [],
                totalTravelTime: 0,
                totalDistance: 0,
                routeSteps: []
            },
            multiDay: {
                days: uiDays,
                totalDays: days.length,
                hotelLocation: days[0]?.route.find(r => r.name !== days[0].route[0].name)?.name
            }
        };
    }

    private convertRouteToSchedule(route: RouteItem[], locationData: Map<string, LocationData>) {
        return route.map((item, index) => {
            const arrivalTime = new Date(item.arrivalTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const departureTime = new Date(item.departureTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let scheduleItem: any = {
                time: arrivalTime,
                spot: item.name,
                duration: item.isLunch ? '60 mins' : `${Math.round((item.departureTs - item.arrivalTs) / (1000 * 60))} mins`,
                arrivalTime,
                departureTime
            };

            // Add navigation URL for next leg
            if (index < route.length - 1) {
                const nextItem = route[index + 1];
                const travelTimeMin = Math.round((nextItem.arrivalTs - item.departureTs) / (1000 * 60));

                if (travelTimeMin > 0) {
                    const fromLoc = locationData.get(item.name);
                    const toLoc = locationData.get(nextItem.name);

                    if (fromLoc && toLoc) {
                        scheduleItem.navigationUrl = this.buildGoogleMapsLink(fromLoc, toLoc, Math.floor(item.departureTs / 1000));
                        scheduleItem.travelTime = `${travelTimeMin} mins`;
                        scheduleItem.transportation = 'Public Transit';
                    }
                }
            }

            // Add notes
            if (item.isLunch) {
                scheduleItem.notes = 'Recommended lunch break - explore local cuisine';
            }

            return scheduleItem;
        });
    }

    private calculateDayDuration(route: RouteItem[]): string {
        if (route.length === 0) return '0h 0m';
        const startTime = route[0].arrivalTs;
        const endTime = route[route.length - 1].arrivalTs;
        const durationMin = Math.round((endTime - startTime) / (1000 * 60));
        return this.formatDuration(durationMin);
    }

    private calculateDayTravelTime(route: RouteItem[]): string {
        let totalTravelMin = 0;
        for (let i = 0; i < route.length - 1; i++) {
            const travelTime = Math.round((route[i + 1].arrivalTs - route[i].departureTs) / (1000 * 60));
            totalTravelMin += travelTime;
        }
        return this.formatDuration(totalTravelMin);
    }

    private calculateTotalDuration(days: any[]): string {
        const totalMinutes = days.reduce((sum, day) => {
            return sum + this.parseDuration(day.totalDuration);
        }, 0);
        return this.formatDuration(totalMinutes);
    }

    private calculateTotalTravelTime(days: any[]): string {
        const totalMinutes = days.reduce((sum, day) => {
            return sum + this.parseDuration(day.totalTravelTime);
        }, 0);
        return this.formatDuration(totalMinutes);
    }

    private flattenSchedule(days: any[]) {
        return days.flatMap(day =>
            day.schedule.map((item: any) => ({
                ...item,
                notes: `Day ${day.day}: ${item.notes || ''}`
            }))
        );
    }

    private formatDuration(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    private parseDuration(durationStr: string): number {
        const match = durationStr.match(/(\d+)h?\s*(\d+)?m?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        return hours * 60 + minutes;
    }
}