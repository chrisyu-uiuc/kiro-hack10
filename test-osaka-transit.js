// Simple test for Osaka transit routes
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_KEY = "AIzaSyAYdP_ulJiLFRzszz2sIf7aymq1bdYPp3w";

async function testTransitRoute(origin, destination) {
    console.log(`\n🚇 Testing transit route: ${origin} → ${destination}`);
    
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "TRANSIT",
        departureTime: new Date().toISOString(),
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps.transitDetails'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            console.log(`✅ SUCCESS: Duration ${route.duration}, Distance ${route.distanceMeters}m`);
            
            // Check for transit details
            const hasTransit = route.legs?.some(leg => 
                leg.steps?.some(step => step.transitDetails)
            );
            console.log(`   Transit details found: ${hasTransit ? 'YES' : 'NO'}`);
        } else {
            console.log(`❌ FAILED: No routes found`);
            console.log(`   Response:`, JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.log(`❌ ERROR:`, error.message);
    }
}

async function testWalkingRoute(origin, destination) {
    console.log(`\n🚶 Testing walking route: ${origin} → ${destination}`);
    
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "WALK",
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            console.log(`✅ SUCCESS: Duration ${route.duration}, Distance ${route.distanceMeters}m`);
        } else {
            console.log(`❌ FAILED: No routes found`);
        }
    } catch (error) {
        console.log(`❌ ERROR:`, error.message);
    }
}

(async function main() {
    console.log("🗾 Testing Osaka Routes API");
    
    // Test popular Osaka routes
    const routes = [
        ["Osaka Station", "Osaka Castle"],
        ["Dotonbori", "Osaka Castle"],
        ["Namba Station", "Universal Studios Japan"],
        ["Osaka Station", "Sumiyoshi Taisha"],
        ["Tennoji Station", "Dotonbori"]
    ];
    
    for (const [origin, destination] of routes) {
        await testTransitRoute(origin, destination);
        await testWalkingRoute(origin, destination);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
})();