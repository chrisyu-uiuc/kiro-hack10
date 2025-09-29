import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface Spot {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  duration: string;
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

export interface SessionData {
  sessionId: string;
  city: string;
  allSpots: Spot[];
  selectedSpots: Spot[];
  itinerary: Itinerary | null;
  optimizedItinerary?: any; // For Google Maps optimized itineraries
  createdAt: Date;
  lastAccessedAt: Date;
}

// In-memory session storage (can be replaced with Redis or database in production)
class SessionStorage {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  createSession(sessionId?: string): string {
    const id = sessionId || uuidv4();
    const now = new Date();
    
    this.sessions.set(id, {
      sessionId: id,
      city: '',
      allSpots: [],
      selectedSpots: [],
      itinerary: null,
      createdAt: now,
      lastAccessedAt: now,
    });

    return id;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    if (now.getTime() - session.lastAccessedAt.getTime() > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = now;
    return session;
  }

  updateSession(sessionId: string, updates: Partial<Omit<SessionData, 'sessionId' | 'createdAt'>>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    Object.assign(session, updates, { lastAccessedAt: new Date() });
    return true;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastAccessedAt.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get session count for monitoring
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Global session storage instance
export const sessionStorage = new SessionStorage();

// Cleanup expired sessions every hour
setInterval(() => {
  sessionStorage.cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Middleware to attach session to request
export function sessionStorageMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Attach session storage to request for easy access
  (req as any).sessionStorage = sessionStorage;
  next();
}

// Export the middleware as default
export default sessionStorageMiddleware;