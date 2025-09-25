import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import dotenv from 'dotenv';

dotenv.config();

async function testBedrock() {
  console.log('🧪 Testing Bedrock Agent Connection...');
  
  const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log('📋 Configuration:');
  console.log('- Region:', process.env.AWS_REGION);
  console.log('- Agent ID:', process.env.BEDROCK_AGENT_ID);
  console.log('- Agent Alias ID:', process.env.BEDROCK_AGENT_ALIAS_ID);
  console.log('- Has Access Key:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('- Has Secret Key:', !!process.env.AWS_SECRET_ACCESS_KEY);

  try {
    const command = new InvokeAgentCommand({
      agentId: process.env.BEDROCK_AGENT_ID || 'BTATPBP5VG',
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'JFTVDFJYFF',
      sessionId: 'test-session-' + Date.now(),
      inputText: `You must respond with ONLY a valid JSON array. Generate 5 tourist spots for Tokyo. 

IMPORTANT: Your response must be ONLY valid JSON in this exact format:
[
  {
    "id": "spot-1",
    "name": "Spot Name",
    "category": "Museum",
    "location": "District Name",
    "description": "Brief description"
  }
]

Do not include any text before or after the JSON.`,
    });

    console.log('📤 Sending test command...');
    const response = await client.send(command);
    
    if (response.completion) {
      let fullResponse = '';
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          fullResponse += text;
        }
      }
      console.log('✅ SUCCESS! Agent responded:', fullResponse);
    } else {
      console.log('⚠️  No completion in response');
    }
  } catch (error) {
    console.error('❌ ERROR:', {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    
    // Common error interpretations
    if (error.name === 'ResourceNotFoundException') {
      console.log('💡 This usually means the Agent ID or Alias ID is incorrect');
    } else if (error.name === 'AccessDeniedException') {
      console.log('💡 This means your credentials lack permission to invoke Bedrock agents');
    } else if (error.name === 'ValidationException') {
      console.log('💡 This means there\'s an issue with the agent configuration');
    }
  }
}

testBedrock();