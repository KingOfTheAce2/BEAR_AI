// Authentication API tests
import request from 'supertest';
import { Express } from 'express';
import { createApiRouter } from '../../src/api/routes';

describe('Authentication API', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    // Setup test app
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter());
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'attorney@lawfirm.com',
          password: 'securePassword123'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('attorney@lawfirm.com');
      expect(response.body.data.user).not.toHaveProperty('password');

      authToken = response.body.data.token;
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@email.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'securePassword123'
        })
        .expect(422);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.fields).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'securePassword123'
        })
        .expect(422);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: '123'
        })
        .expect(422);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get refresh token from login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'attorney@lawfirm.com',
          password: 'securePassword123'
        });
      
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(422);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /api/v1/auth/verify', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'attorney@lawfirm.com',
          password: 'securePassword123'
        });

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com<script>alert("xss")</script>',
          password: 'password123'
        })
        .expect(401); // Will fail auth but input should be sanitized

      // Verify XSS attempt was cleaned
      expect(response.body.error.message).not.toContain('<script>');
    });
  });
});

describe('Authentication Middleware', () => {
  let app: Express;

  beforeAll(async () => {
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter());
  });

  describe('Token Authentication', () => {
    it('should accept valid Bearer token', async () => {
      // First login to get a token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'attorney@lawfirm.com',
          password: 'securePassword123'
        });

      const token = loginResponse.body.data.token;

      // Use token to access protected endpoint
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.valid).toBe(true);
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject expired token', async () => {
      // This would require a test with an actually expired token
      // In practice, you'd mock the JWT library or use a short-lived token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
      
      const response = await request(app)
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Role-based Authorization', () => {
    it('should allow access for authorized roles', async () => {
      // This would test role-based access control
      // Implementation depends on how roles are enforced in routes
    });

    it('should deny access for unauthorized roles', async () => {
      // Test that certain endpoints are restricted by role
    });
  });
});