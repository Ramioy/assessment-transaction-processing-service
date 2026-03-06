// @ts-nocheck
/* eslint-disable */
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { bootstrapTestApp } from './app-bootstrap';

describe('HealthController (e2e)', () => {
  describe('when ENABLE_HEALTH_CHECK is true', () => {
    let app: NestFastifyApplication;

    beforeAll(async () => {
      ({ app } = await bootstrapTestApp());
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health returns 200 with status ok and a timestamp', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ status: string; timestamp: string }>();
      expect(body.status).toBe('ok');
      expect(typeof body.timestamp).toBe('string');
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe('when ENABLE_HEALTH_CHECK is false', () => {
    let app: NestFastifyApplication;

    beforeAll(async () => {
      ({ app } = await bootstrapTestApp({ enableHealthCheck: false }));
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /health returns 404', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(404);
    });
  });
});
