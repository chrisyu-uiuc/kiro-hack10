import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

export interface Spot {
    id: string;
    name: string;
    category: string;
    location: string;
    description: string;
}

export interface Itinerary {
    title: string;
    totalDuration: string;
    schedule: ScheduleItem[];
}

export interface ScheduleItem {
    time: string;
    spot: string;
    duration: string;
    transportation: string;
    notes: string;
}

export class BedrockAgentService {
    private client: BedrockAgentRuntimeClient;
    private agentId: string;
    private agentAliasId: string;

    constructor() {
        this.client = new BedrockAgentRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        this.agentId = process.env.BEDROCK_AGENT_ID || 'BTATPBP5VG';
        this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID || 'JFTVDFJYFF';
    }

    /**
     * Invoke the Bedrock Agent with a prompt and session management
     */
    async invokeAgent(prompt: string, sessionId: string): Promise<string> {
        try {
            console.log('🔧 Bedrock Agent Config:', {
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                region: process.env.AWS_REGION,
                hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
                hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
            });

            const command = new InvokeAgentCommand({
                agentId: this.agentId,
                agentAliasId: this.agentAliasId,
                sessionId,
                inputText: prompt,
            });

            console.log('📤 Sending command to Bedrock Agent...');
            const response = await this.client.send(command);
            console.log('📥 Received response from Bedrock Agent');

            if (!response.completion) {
                throw new Error('No completion received from Bedrock Agent');
            }

            // Process the streaming response
            let fullResponse = '';
            for await (const chunk of response.completion) {
                if (chunk.chunk?.bytes) {
                    const text = new TextDecoder().decode(chunk.chunk.bytes);
                    fullResponse += text;
                }
            }

            console.log('✅ Full response processed, length:', fullResponse.length);
            return fullResponse.trim();
        } catch (error) {
            console.error('❌ Error invoking Bedrock Agent:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'Unknown',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new Error(`Failed to invoke Bedrock Agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Verify if a city exists using the Bedrock Agent
     */
    async verifyCityExists(city: string): Promise<boolean> {
        try {
            const prompt = `Please verify if "${city}" is a valid city name that exists. Respond with only "YES" if it's a valid city, or "NO" if it's not a valid city.`;
            const sessionId = `city-verification-${Date.now()}`;

            const response = await this.invokeAgent(prompt, sessionId);

            // Parse the response to determine if city is valid
            const normalizedResponse = response.toUpperCase().trim();
            return normalizedResponse.includes('YES') || normalizedResponse.startsWith('YES');
        } catch (error) {
            console.error('Error verifying city:', error);
            throw new Error(`Failed to verify city: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate spots for a given city using the Bedrock Agent
     */
    async generateSpots(city: string, sessionId: string): Promise<Spot[]> {
        try {
            const prompt = `You must respond with ONLY a valid JSON array. Generate exactly 10 tourist spots for ${city}. 

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
[
  {
    "id": "spot-1",
    "name": "Spot Name",
    "category": "Museum",
    "location": "District Name",
    "description": "Brief description (max 100 characters)"
  }
]

Do not include any text before or after the JSON. Keep descriptions short. Categories should be: Museum, Park, Restaurant, Historical Site, Shopping, Entertainment, Religious Site, Market, Viewpoint, or Beach.`;

            const response = await this.invokeAgent(prompt, sessionId);

            console.log('🔍 Raw Bedrock Agent Response:', response);

            // Check if the response indicates an error or inability to help
            if (response.toLowerCase().includes('sorry') || response.toLowerCase().includes('cannot') || response.toLowerCase().includes('unable')) {
                console.error('❌ Bedrock Agent returned an error response:', response);
                // Return fallback data for demo purposes
                return this.getFallbackSpots(city);
            }

            // Parse the JSON response
            try {
                // Extract JSON from the response if it's wrapped in text
                let jsonMatch = response.match(/\[[\s\S]*\]/);
                let jsonString = jsonMatch ? jsonMatch[0] : response;

                console.log('🔍 Extracted JSON string length:', jsonString.length);

                // Handle truncated JSON by trying to fix it
                if (!jsonString.endsWith(']')) {
                    console.log('⚠️ JSON appears truncated, attempting to fix...');

                    // Find the last complete object
                    const lastCompleteObject = jsonString.lastIndexOf('},');
                    if (lastCompleteObject > 0) {
                        jsonString = jsonString.substring(0, lastCompleteObject + 1) + '\n]';
                        console.log('🔧 Fixed truncated JSON, new length:', jsonString.length);
                    }
                }

                const spots = JSON.parse(jsonString);

                // Validate and ensure each spot has required fields
                return spots.map((spot: any, index: number) => ({
                    id: spot.id || `spot-${index + 1}`,
                    name: spot.name || 'Unknown Spot',
                    category: spot.category || 'Attraction',
                    location: spot.location || 'City Center',
                    description: spot.description || 'No description available',
                }));
            } catch (parseError) {
                console.error('Error parsing spots JSON:', parseError);
                console.log('🔍 Attempting to use fallback spots for:', city);
                return this.getFallbackSpots(city);
            }
        } catch (error) {
            console.error('Error generating spots:', error);
            console.log('🔍 Using fallback spots due to error for:', city);
            return this.getFallbackSpots(city);
        }
    }

    /**
     * Provide fallback spots when Bedrock Agent fails
     */
    private getFallbackSpots(city: string): Spot[] {
        return [
            {
                id: 'spot-1',
                name: `${city} Central Park`,
                category: 'Park',
                location: 'City Center',
                description: `A beautiful central park in the heart of ${city}, perfect for relaxation and outdoor activities.`
            },
            {
                id: 'spot-2',
                name: `${city} Museum of History`,
                category: 'Museum',
                location: 'Cultural District',
                description: `Learn about the rich history and culture of ${city} through fascinating exhibits and artifacts.`
            },
            {
                id: 'spot-3',
                name: `${city} Old Town`,
                category: 'Historical Site',
                location: 'Historic Quarter',
                description: `Explore the charming old town area with traditional architecture and local shops.`
            },
            {
                id: 'spot-4',
                name: `${city} Market Square`,
                category: 'Market',
                location: 'Downtown',
                description: `A vibrant market square where you can find local crafts, food, and souvenirs.`
            },
            {
                id: 'spot-5',
                name: `${city} Observation Deck`,
                category: 'Viewpoint',
                location: 'City Heights',
                description: `Get panoramic views of ${city} from this popular observation deck.`
            }
        ];
    }

    /**
     * Generate an itinerary from selected spots using the Bedrock Agent
     */
    async generateItinerary(selectedSpots: Spot[], sessionId: string): Promise<Itinerary> {
        try {
            const spotsText = selectedSpots.map(spot =>
                `${spot.name} (${spot.category}) - ${spot.description}`
            ).join('\n');

            const prompt = `You must respond with ONLY a valid JSON object. Create a realistic travel itinerary for these spots with proper timing constraints:
      
      ${spotsText}
      
TIMING REQUIREMENTS:
- Plan for a full day starting at 9:00 AM
- Include realistic visit durations based on attraction type (museums: 2-3 hours, parks: 1-2 hours, restaurants: 1 hour, viewpoints: 30-45 minutes)
- Add 15-30 minutes travel time between locations depending on distance
- Group nearby attractions together to minimize travel time
- Include a lunch break (1 hour) around 12:00-1:00 PM
- End the day by 6:00 PM
- Consider typical opening hours (most attractions open 9-10 AM, close 5-6 PM)

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
{
  "title": "Your Travel Itinerary Title",
  "totalDuration": "9 hours (9:00 AM - 6:00 PM)",
  "schedule": [
    {
      "time": "9:00 AM - 10:30 AM",
      "spot": "Spot Name",
      "duration": "1.5 hours",
      "transportation": "15 min walk from previous location",
      "notes": "Best visited in the morning. Arrive early to avoid crowds."
    }
  ]
}

Do not include any text before or after the JSON.`;

            let response: string;
            
            try {
                // Try the enhanced prompt first
                response = await this.invokeAgent(prompt, sessionId);
                console.log('🔍 Raw Bedrock Agent Itinerary Response (Enhanced):', response);
            } catch (enhancedError) {
                console.warn('⚠️ Enhanced prompt failed, falling back to basic prompt:', enhancedError);
                
                // Fallback to simpler prompt if enhanced one fails
                const basicPrompt = `You must respond with ONLY a valid JSON object. Create a travel itinerary for these spots:
      
      ${spotsText}
      
IMPORTANT: Your response must be ONLY valid JSON in this exact format:
{
  "title": "Your Travel Itinerary Title",
  "totalDuration": "X hours",
  "schedule": [
    {
      "time": "9:00 AM - 10:30 AM",
      "spot": "Spot Name",
      "duration": "1.5 hours",
      "transportation": "Walking",
      "notes": "Helpful tip"
    }
  ]
}

Do not include any text before or after the JSON.`;
                
                try {
                    response = await this.invokeAgent(basicPrompt, sessionId);
                    console.log('🔍 Raw Bedrock Agent Itinerary Response (Basic):', response);
                } catch (basicError) {
                    console.error('❌ Both enhanced and basic prompts failed:', basicError);
                    return this.getFallbackItinerary(selectedSpots);
                }
            }

            // Check if the response indicates an error or inability to help
            if (response.toLowerCase().includes('sorry') || response.toLowerCase().includes('cannot') || response.toLowerCase().includes('unable')) {
                console.error('❌ Bedrock Agent returned an error response for itinerary:', response);
                return this.getFallbackItinerary(selectedSpots);
            }

            // Parse the JSON response
            try {
                // Extract JSON from the response if it's wrapped in text
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : response;

                console.log('🔍 Extracted Itinerary JSON string:', jsonString);

                const itinerary = JSON.parse(jsonString);

                // Validate and ensure itinerary has required structure
                return {
                    title: itinerary.title || 'Your Travel Itinerary',
                    totalDuration: itinerary.totalDuration || '1 day',
                    schedule: (itinerary.schedule || []).map((item: any) => ({
                        time: item.time || '9:00 AM',
                        spot: item.spot || 'Unknown Location',
                        duration: item.duration || '1 hour',
                        transportation: item.transportation || 'Walking',
                        notes: item.notes || '',
                    })),
                };
            } catch (parseError) {
                console.error('Error parsing itinerary JSON:', parseError);
                console.log('🔍 Using fallback itinerary due to parse error');
                return this.getFallbackItinerary(selectedSpots);
            }
        } catch (error) {
            console.error('Error generating itinerary:', error);
            console.log('🔍 Using fallback itinerary due to error');
            return this.getFallbackItinerary(selectedSpots);
        }
    }

    /**
     * Provide fallback itinerary when Bedrock Agent fails
     */
    private getFallbackItinerary(selectedSpots: Spot[]): Itinerary {
        const schedule = selectedSpots.map((spot, index) => {
            // More realistic timing with proper durations based on category
            let duration = '1.5 hours';
            let startTime = 9 + (index * 2);
            
            // Adjust duration based on spot category
            if (spot.category === 'Museum') duration = '2-3 hours';
            else if (spot.category === 'Park') duration = '1-2 hours';
            else if (spot.category === 'Restaurant') duration = '1 hour';
            else if (spot.category === 'Viewpoint') duration = '45 minutes';
            
            // Add lunch break after 2-3 spots
            if (index === 2) {
                startTime = 12; // Lunch time
                duration = '1 hour';
            } else if (index > 2) {
                startTime = 13 + ((index - 3) * 2); // Resume after lunch
            }
            
            const endTime = startTime + (duration.includes('2-3') ? 2.5 : duration.includes('1-2') ? 1.5 : 1);
            const timeString = `${startTime}:00 ${startTime < 12 ? 'AM' : 'PM'} - ${Math.floor(endTime)}:${endTime % 1 === 0.5 ? '30' : '00'} ${endTime < 12 ? 'AM' : 'PM'}`;
            
            return {
                time: timeString,
                spot: spot.name,
                duration,
                transportation: index === 0 ? 'Start here' : '15-20 min walk/transit',
                notes: `Visit ${spot.name} - ${spot.description.substring(0, 80)}${spot.description.length > 80 ? '...' : ''}`
            };
        });

        return {
            title: 'Your Custom Travel Itinerary',
            totalDuration: '9 hours (9:00 AM - 6:00 PM)',
            schedule
        };
    }
}