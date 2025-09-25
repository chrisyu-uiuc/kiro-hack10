import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS configuration
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  // Bedrock Agent configuration
  bedrock: {
    agentId: process.env.BEDROCK_AGENT_ID || 'BTATPBP5VG',
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'JFTVDFJYFF',
  },
};

export default config;