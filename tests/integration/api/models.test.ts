import request from 'supertest';
import { app } from '../../../src/api/app';
import { mockModels } from '../../mocks/apiMocks';

describe('Models API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/models', () => {
    it('should return all available models', async () => {
      const response = await request(app)
        .get('/api/models')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter models by provider', async () => {
      const response = await request(app)
        .get('/api/models?provider=openai')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((model: any) => model.provider === 'openai')).toBe(true);
    });

    it('should filter models by type', async () => {
      const response = await request(app)
        .get('/api/models?type=language')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((model: any) => model.type === 'language')).toBe(true);
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/models?invalid=param')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/models/:id', () => {
    it('should return specific model by ID', async () => {
      const response = await request(app)
        .get('/api/models/gpt-4')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'gpt-4');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('provider');
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/api/models/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Model not found');
    });

    it('should handle malformed model IDs', async () => {
      const response = await request(app)
        .get('/api/models/../../etc/passwd')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid model ID');
    });
  });

  describe('POST /api/models', () => {
    it('should create new custom model', async () => {
      const newModel = {
        id: 'custom-model',
        name: 'Custom Model',
        provider: 'custom',
        type: 'language',
        capabilities: ['text-generation'],
        parameters: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      };

      const response = await request(app)
        .post('/api/models')
        .send(newModel)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(newModel);
    });

    it('should validate required fields', async () => {
      const invalidModel = {
        name: 'Invalid Model',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/models')
        .send(invalidModel)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should prevent duplicate model IDs', async () => {
      const duplicateModel = {
        id: 'gpt-4', // Existing model ID
        name: 'Duplicate Model',
        provider: 'custom',
        type: 'language',
        capabilities: ['text-generation'],
      };

      const response = await request(app)
        .post('/api/models')
        .send(duplicateModel)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate model parameters', async () => {
      const invalidParameters = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'custom',
        type: 'language',
        capabilities: ['text-generation'],
        parameters: {
          maxTokens: -1, // Invalid value
          temperature: 2.0, // Out of range
        },
      };

      const response = await request(app)
        .post('/api/models')
        .send(invalidParameters)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('parameters');
    });
  });

  describe('PUT /api/models/:id', () => {
    it('should update existing model', async () => {
      const updates = {
        name: 'Updated Model Name',
        parameters: {
          maxTokens: 4096,
          temperature: 0.8,
        },
      };

      const response = await request(app)
        .put('/api/models/gpt-4')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.parameters.maxTokens).toBe(updates.parameters.maxTokens);
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .put('/api/models/non-existent')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent updating system models', async () => {
      const response = await request(app)
        .put('/api/models/gpt-4')
        .send({ provider: 'different-provider' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('system model');
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        parameters: {
          temperature: 'invalid', // Should be number
        },
      };

      const response = await request(app)
        .put('/api/models/gpt-4')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/models/:id', () => {
    it('should delete custom model', async () => {
      // First create a custom model
      const customModel = {
        id: 'deletable-model',
        name: 'Deletable Model',
        provider: 'custom',
        type: 'language',
        capabilities: ['text-generation'],
      };

      await request(app)
        .post('/api/models')
        .send(customModel)
        .expect(201);

      // Then delete it
      const response = await request(app)
        .delete('/api/models/deletable-model')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's deleted
      await request(app)
        .get('/api/models/deletable-model')
        .expect(404);
    });

    it('should prevent deleting system models', async () => {
      const response = await request(app)
        .delete('/api/models/gpt-4')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('system model');
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .delete('/api/models/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Model capabilities', () => {
    it('should return model capabilities', async () => {
      const response = await request(app)
        .get('/api/models/gpt-4/capabilities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('text-generation');
    });

    it('should validate model for specific capability', async () => {
      const response = await request(app)
        .get('/api/models/gpt-4/capabilities/text-generation')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.supported).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/models')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid JSON');
    });

    it('should handle large payloads', async () => {
      const largeModel = {
        id: 'large-model',
        name: 'Large Model',
        provider: 'custom',
        type: 'language',
        capabilities: ['text-generation'],
        metadata: {
          description: 'x'.repeat(10000), // Large description
        },
      };

      const response = await request(app)
        .post('/api/models')
        .send(largeModel)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payload too large');
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        request(app)
          .get('/api/models')
          .expect(200)
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });
});