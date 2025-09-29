// Test specific Osaka station-to-station transit routes
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_KEY = "AIzaSyAYdP_ulJiLFRzszz2sIf7aymq1bdYPp3w";

async function testTransitRoute(origin, destination) {
    console.log(`\n🚇 Testing: ${origin} → ${destination}`);
    
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
            console.log(`✅ SUCCESS: ${route.duration}, ${route.distanceMeters}m`);
            return true;
        } else {
            console.log(`❌ FAILED: No routes`);
            if (data.error) {
                console.log(`   Error: ${data.error.message}`);
            }
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return false;
    }
}

(async function main() {
    console.log("🗾 Testing Osaka Station-to-Station Transit Routes\n");
    
    // Test major station connections
    const stationRoutes = [
        // Major JR stations
        ["Osaka Station", "Tennoji Station"],
        ["Osaka Station", "Namba Station"],
        ["Tennoji Station", "Namba Station"],
        
        // Metro stations
        ["Umeda Station", "Namba Station"],
        ["Umeda Station", "Tennoji Station"],
        
        // Mixed with attractions
        ["Osaka Station", "Osaka Castle Park"],
        ["Namba Station", "Dotonbori"],
        ["Tennoji Station", "Tsutenkaku"],
        
        // International comparison (should work)
        ["Tokyo Station", "Shibuya Station"],
        ["Shinjuku Station", "Tokyo Station"],
    ];
    
    let successCount = 0;
    
    for (const [origin, destination] of stationRoutes) {
        const success = await testTransitRoute(origin, destination);
        if (success) successCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n📊 Results: ${successCount}/${stationRoutes.length} routes successful`);
    
    if (successCount === 0) {
        console.log("\n🔍 Transit API may not have coverage for Osaka region");
        console.log("   This explains why our fallback to walking mode is essential");
    }
})();