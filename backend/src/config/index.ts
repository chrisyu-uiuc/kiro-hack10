import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

interface Config {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  bedrock: {
    agentId: string;
    agentAliasId: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  bedrock: {
    agentId: process.env.BEDROCK_AGENT_ID || 'BTATPBP5VG',
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'JFTVDFJYFF',
  },
};

// Validate required configuration
const requiredEnvVars = ['BEDROCK_AGENT_ID', 'BEDROCK_AGENT_ALIAS_ID'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
}

export default config;