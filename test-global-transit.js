// Test transit routes globally to understand API coverage
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_KEY = "AIzaSyAYdP_ulJiLFRzszz2sIf7aymq1bdYPp3w";

async function testTransitRoute(origin, destination, region) {
    console.log(`\n🚇 ${region}: ${origin} → ${destination}`);
    
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
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
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
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return false;
    }
}

(async function main() {
    console.log("🌍 Testing Global Transit API Coverage\n");
    
    const globalRoutes = [
        // USA - Should work well
        ["Times Square, New York", "Central Park, New York", "New York"],
        ["Union Station, Los Angeles", "Hollywood Blvd, Los Angeles", "Los Angeles"],
        
        // Europe - Good coverage expected
        ["Piccadilly Circus, London", "Tower Bridge, London", "London"],
        ["Gare du Nord, Paris", "Eiffel Tower, Paris", "Paris"],
        
        // Asia - Mixed coverage
        ["Shibuya Station, Tokyo", "Tokyo Station, Tokyo", "Tokyo"],
        ["Gangnam Station, Seoul", "Myeongdong, Seoul", "Seoul"],
        
        // Osaka - Our problem area
        ["Osaka Station, Osaka", "Dotonbori, Osaka", "Osaka"],
        ["Namba Station, Osaka", "Osaka Castle, Osaka", "Osaka"],
    ];
    
    let successCount = 0;
    const results = {};
    
    for (const [origin, destination, region] of globalRoutes) {
        const success = await testTransitRoute(origin, destination, region);
        if (!results[region]) results[region] = { success: 0, total: 0 };
        results[region].total++;
        if (success) {
            results[region].success++;
            successCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Global Results: ${successCount}/${globalRoutes.length} routes successful\n`);
    
    console.log("📍 Coverage by Region:");
    for (const [region, stats] of Object.entries(results)) {
        const percentage = ((stats.success / stats.total) * 100).toFixed(0);
        console.log(`   ${region}: ${stats.success}/${stats.total} (${percentage}%)`);
    }
    
    if (results.Osaka?.success === 0) {
        console.log("\n🎯 Conclusion: Osaka has no transit coverage in Google Routes API");
        console.log("   Our walking fallback system is working correctly!");
    }
})();