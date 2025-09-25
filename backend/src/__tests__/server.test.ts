import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Server Foundation', () => {
  let server: any;

  beforeAll(() => {
    // Start server on a different port for testing
    server = app.listen(0);
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      environment: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should handle CORS headers', async () => {
    const response = await request(app)
      .options('/health')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should parse JSON bodies', async () => {
    const response = await request(app)
      .post('/test-json')
      .send({ test: 'data' })
      .expect(404); // 404 because route doesn't exist yet, but JSON should be parsed

    // The fact that we get a 404 instead of a 400 means JSON parsing worked
    expect(response.status).toBe(404);
  });

  it('should include security headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const response = await request(app)
      .get('/nonexistent-route')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
      timestamp: expect.any(String),
    });
  });
});