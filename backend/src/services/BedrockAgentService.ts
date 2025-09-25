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
      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId,
        inputText: prompt,
      });

      const response = await this.client.send(command);
      
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

      return fullResponse.trim();
    } catch (error) {
      console.error('Error invoking Bedrock Agent:', error);
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
      const prompt = `Generate 10-20 tourist spots and attractions for ${city}. For each spot, provide:
      - Name of the spot
      - Category (e.g., Museum, Park, Restaurant, Historical Site, etc.)
      - Location/Region within the city
      - Brief description (1-2 sentences)
      
      Format the response as a JSON array with objects containing: id, name, category, location, description fields.`;
      
      const response = await this.invokeAgent(prompt, sessionId);
      
      // Parse the JSON response
      try {
        // Extract JSON from the response if it's wrapped in text
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        
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
        throw new Error('Failed to parse spots data from agent response');
      }
    } catch (error) {
      console.error('Error generating spots:', error);
      throw new Error(`Failed to generate spots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate an itinerary from selected spots using the Bedrock Agent
   */
  async generateItinerary(selectedSpots: Spot[], sessionId: string): Promise<Itinerary> {
    try {
      const spotsText = selectedSpots.map(spot => 
        `${spot.name} (${spot.category}) - ${spot.description}`
      ).join('\n');
      
      const prompt = `Create a detailed travel itinerary for these selected spots:
      
      ${spotsText}
      
      Please provide:
      - A title for the itinerary
      - Total estimated duration for the entire itinerary
      - A schedule with time slots, including:
        - Recommended time to visit each spot
        - Duration to spend at each location
        - Transportation method between spots
        - Any helpful notes or tips
      
      Format the response as JSON with: title, totalDuration, and schedule array containing objects with: time, spot, duration, transportation, notes fields.`;
      
      const response = await this.invokeAgent(prompt, sessionId);
      
      // Parse the JSON response
      try {
        // Extract JSON from the response if it's wrapped in text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        
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
        throw new Error('Failed to parse itinerary data from agent response');
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw new Error(`Failed to generate itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}