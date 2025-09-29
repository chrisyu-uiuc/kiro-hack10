// Verify specific NYC route segments
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_KEY = "AIzaSyAYdP_ulJiLFRzszz2sIf7aymq1bdYPp3w";

async function verifyRoute(origin, destination, expectedTime) {
    console.log(`\n🚇 Verifying: ${origin} → ${destination}`);
    console.log(`   Expected: ${expectedTime}`);
    
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
            const actualMinutes = Math.round(parseInt(route.duration.replace('s', '')) / 60);
            const status = actualMinutes <= parseInt(expectedTime.replace('m', '')) + 5 ? '✅' : '⚠️';
            
            console.log(`   Actual: ${actualMinutes}m ${status}`);
            return actualMinutes;
        } else {
            console.log(`   ❌ No route found`);
            return null;
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return null;
    }
}

(async function main() {
    console.log("🗽 Verifying Corrected NYC Itinerary Routes\n");
    
    const routes = [
        ["Times Square, New York", "Central Park, New York", "25m"],
        ["Central Park, New York", "Metropolitan Museum of Art, New York", "9m"],
        ["Metropolitan Museum of Art, New York", "Statue of Liberty, New York", "80m"],
        ["Statue of Liberty, New York", "Times Square, New York", "56m"]
    ];
    
    let totalActual = 0;
    let totalExpected = 0;
    
    for (const [origin, destination, expected] of routes) {
        const actual = await verifyRoute(origin, destination, expected);
        if (actual) {
            totalActual += actual;
            totalExpected += parseInt(expected.replace('m', ''));
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Total Travel Time:`);
    console.log(`   Expected: ${totalExpected} minutes`);
    console.log(`   Actual: ${totalActual} minutes`);
    console.log(`   Accuracy: ${totalActual ? Math.round((1 - Math.abs(totalExpected - totalActual) / totalExpected) * 100) : 0}%`);
    
    if (Math.abs(totalExpected - totalActual) <= 15) {
        console.log(`\n✅ Itinerary timing is accurate!`);
    } else {
        console.log(`\n⚠️ Consider adjusting timing by ${Math.abs(totalExpected - totalActual)} minutes`);
    }
})();