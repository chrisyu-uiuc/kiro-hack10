import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip: string;
  sessionId?: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Get client IP address
  const ip = req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress || 
    (req.connection as any)?.socket?.remoteAddress ||
    'unknown';

  // Create log entry
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip,
    sessionId: req.headers['x-session-id'] as string,
  };

  // Log request
  console.log(`📥 ${logEntry.method} ${logEntry.url} - ${ip}`);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - startTime;
    
    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = responseTime;

    // Log response
    const statusEmoji = getStatusEmoji(res.statusCode);
    console.log(
      `📤 ${statusEmoji} ${logEntry.method} ${logEntry.url} - ${res.statusCode} - ${responseTime}ms`
    );

    // Log detailed info for errors
    if (res.statusCode >= 400) {
      console.error('Error details:', {
        ...logEntry,
        body: req.body,
        query: req.query,
        params: req.params,
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

function getStatusEmoji(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '↩️';
  if (statusCode >= 400 && statusCode < 500) return '❌';
  if (statusCode >= 500) return '💥';
  return '❓';
}

// Enhanced logging for development
export function developmentLogger(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n--- Request Details ---');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    console.log('----------------------\n');
  }
  next();
}

export default requestLogger;