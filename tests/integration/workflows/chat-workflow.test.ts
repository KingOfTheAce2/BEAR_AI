import request from 'supertest';
import { app } from '../../../src/api/app';
import { mockChatService, mockModelService } from '../../mocks/apiMocks';

describe('Chat Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Chat Session Workflow', () => {
    it('should handle complete chat session from start to finish', async () => {
      // 1. Start new chat session
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Test Chat Session' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;
      expect(sessionId).toBeDefined();

      // 2. Select model for chat
      await request(app)
        .put(`/api/chat/sessions/${sessionId}/model`)
        .send({ modelId: 'gpt-4' })
        .expect(200);

      // 3. Send initial message
      const messageResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Hello, how can you help me today?',
          role: 'user'
        })
        .expect(201);

      expect(messageResponse.body.data).toHaveProperty('id');
      expect(messageResponse.body.data.content).toBe('Hello, how can you help me today?');

      // 4. Get AI response
      const responseMessage = await request(app)
        .post(`/api/chat/sessions/${sessionId}/generate`)
        .send({
          stream: false
        })
        .expect(200);

      expect(responseMessage.body.data).toHaveProperty('content');
      expect(responseMessage.body.data.role).toBe('assistant');

      // 5. Continue conversation
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Can you help me write a Python function?',
          role: 'user'
        })
        .expect(201);

      // 6. Get code generation response
      const codeResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/generate`)
        .send({
          stream: false
        })
        .expect(200);

      expect(codeResponse.body.data.content).toContain('def ');

      // 7. Get chat history
      const historyResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .expect(200);

      expect(historyResponse.body.data).toHaveLength(4); // 2 user + 2 assistant messages

      // 8. Export chat
      const exportResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/export?format=json`)
        .expect(200);

      expect(exportResponse.body.data).toHaveProperty('messages');
      expect(exportResponse.body.data.messages).toHaveLength(4);
    });

    it('should handle streaming chat responses', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Streaming Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Tell me a story',
          role: 'user'
        })
        .expect(201);

      // Test streaming response
      const streamResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/generate`)
        .send({
          stream: true
        })
        .expect(200);

      expect(streamResponse.headers['content-type']).toContain('text/plain');
      expect(streamResponse.text).toBeTruthy();
    });

    it('should handle chat session management', async () => {
      // Create multiple sessions
      const session1 = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Session 1' })
        .expect(201);

      const session2 = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Session 2' })
        .expect(201);

      // List all sessions
      const sessionsResponse = await request(app)
        .get('/api/chat/sessions')
        .expect(200);

      expect(sessionsResponse.body.data).toHaveLength(2);

      // Update session title
      await request(app)
        .put(`/api/chat/sessions/${session1.body.data.id}`)
        .send({ title: 'Updated Session 1' })
        .expect(200);

      // Delete session
      await request(app)
        .delete(`/api/chat/sessions/${session2.body.data.id}`)
        .expect(200);

      // Verify deletion
      const updatedSessionsResponse = await request(app)
        .get('/api/chat/sessions')
        .expect(200);

      expect(updatedSessionsResponse.body.data).toHaveLength(1);
      expect(updatedSessionsResponse.body.data[0].title).toBe('Updated Session 1');
    });
  });

  describe('Chat Message Handling', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Message Test Session' })
        .expect(201);
      sessionId = sessionResponse.body.data.id;
    });

    it('should handle different message types', async () => {
      // Text message
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Simple text message',
          role: 'user',
          type: 'text'
        })
        .expect(201);

      // Code message
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'def hello():\n    print("Hello, World!")',
          role: 'user',
          type: 'code',
          metadata: { language: 'python' }
        })
        .expect(201);

      // Image message (with metadata)
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'data:image/png;base64,iVBORw0KGgoAAAANSU...',
          role: 'user',
          type: 'image',
          metadata: { 
            filename: 'test.png',
            size: 1024,
            mimeType: 'image/png'
          }
        })
        .expect(201);

      const messagesResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .expect(200);

      expect(messagesResponse.body.data).toHaveLength(3);
      expect(messagesResponse.body.data[1].type).toBe('code');
      expect(messagesResponse.body.data[1].metadata.language).toBe('python');
    });

    it('should handle message editing and deletion', async () => {
      // Send original message
      const messageResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Original message',
          role: 'user'
        })
        .expect(201);

      const messageId = messageResponse.body.data.id;

      // Edit message
      await request(app)
        .put(`/api/chat/sessions/${sessionId}/messages/${messageId}`)
        .send({
          content: 'Edited message'
        })
        .expect(200);

      // Verify edit
      const editedResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages/${messageId}`)
        .expect(200);

      expect(editedResponse.body.data.content).toBe('Edited message');
      expect(editedResponse.body.data.edited).toBe(true);

      // Delete message
      await request(app)
        .delete(`/api/chat/sessions/${sessionId}/messages/${messageId}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages/${messageId}`)
        .expect(404);
    });

    it('should handle message reactions and interactions', async () => {
      const messageResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Message to react to',
          role: 'assistant'
        })
        .expect(201);

      const messageId = messageResponse.body.data.id;

      // Add thumbs up reaction
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages/${messageId}/reactions`)
        .send({
          reaction: 'thumbs_up'
        })
        .expect(201);

      // Add feedback
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages/${messageId}/feedback`)
        .send({
          rating: 5,
          comment: 'Very helpful response'
        })
        .expect(201);

      // Get message with reactions
      const messageWithReactionsResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages/${messageId}`)
        .expect(200);

      expect(messageWithReactionsResponse.body.data.reactions).toContain('thumbs_up');
      expect(messageWithReactionsResponse.body.data.feedback.rating).toBe(5);
    });
  });

  describe('Advanced Chat Features', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Advanced Features Test' })
        .expect(201);
      sessionId = sessionResponse.body.data.id;
    });

    it('should handle conversation branching', async () => {
      // Send initial message
      const message1 = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Initial message',
          role: 'user'
        })
        .expect(201);

      // Get AI response
      const response1 = await request(app)
        .post(`/api/chat/sessions/${sessionId}/generate`)
        .expect(200);

      // Create branch from first message
      const branchResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/branch`)
        .send({
          fromMessageId: message1.body.data.id,
          newContent: 'Alternative message path'
        })
        .expect(201);

      const branchId = branchResponse.body.data.branchId;

      // Get messages from specific branch
      const branchMessagesResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages?branch=${branchId}`)
        .expect(200);

      expect(branchMessagesResponse.body.data).toHaveLength(2); // Original + branch message
    });

    it('should handle conversation templates', async () => {
      // Create conversation from template
      const templateResponse = await request(app)
        .post('/api/chat/sessions/from-template')
        .send({
          templateId: 'code-review-template',
          variables: {
            language: 'Python',
            codeSnippet: 'def example(): pass'
          }
        })
        .expect(201);

      const templateSessionId = templateResponse.body.data.id;

      // Verify template was applied
      const messagesResponse = await request(app)
        .get(`/api/chat/sessions/${templateSessionId}/messages`)
        .expect(200);

      expect(messagesResponse.body.data.length).toBeGreaterThan(0);
      expect(messagesResponse.body.data[0].content).toContain('Python');
    });

    it('should handle conversation summarization', async () => {
      // Send multiple messages to create conversation
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .send({
            content: `Message ${i}`,
            role: i % 2 === 1 ? 'user' : 'assistant'
          })
          .expect(201);
      }

      // Generate summary
      const summaryResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/summarize`)
        .send({
          maxLength: 100
        })
        .expect(200);

      expect(summaryResponse.body.data.summary).toBeTruthy();
      expect(summaryResponse.body.data.summary.length).toBeLessThanOrEqual(100);
    });

    it('should handle conversation search', async () => {
      // Send messages with searchable content
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'How do I implement a binary search algorithm?',
          role: 'user'
        })
        .expect(201);

      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Here is a Python implementation of binary search...',
          role: 'assistant'
        })
        .expect(201);

      // Search within conversation
      const searchResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/search?q=binary%20search`)
        .expect(200);

      expect(searchResponse.body.data.results).toHaveLength(2);
      expect(searchResponse.body.data.results[0].content).toContain('binary search');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid session operations', async () => {
      const nonExistentSessionId = 'non-existent-session-id';

      // Try to send message to non-existent session
      await request(app)
        .post(`/api/chat/sessions/${nonExistentSessionId}/messages`)
        .send({
          content: 'Test message',
          role: 'user'
        })
        .expect(404);

      // Try to generate response for non-existent session
      await request(app)
        .post(`/api/chat/sessions/${nonExistentSessionId}/generate`)
        .expect(404);
    });

    it('should handle rate limiting', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Rate Limit Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Send many requests rapidly
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .send({
            content: 'Rapid fire message',
            role: 'user'
          })
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        response => response.status === 'fulfilled' && 
        (response.value as any).status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle large message content', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Large Content Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Test with very large message
      const largeContent = 'x'.repeat(50000); // 50KB message

      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: largeContent,
          role: 'user'
        });

      // Should either accept (200) or reject with appropriate error (413)
      expect([201, 413]).toContain(response.status);
    });

    it('should handle concurrent session access', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Concurrent Access Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Send multiple concurrent requests to same session
      const concurrentRequests = Array(5).fill(null).map((_, i) =>
        request(app)
          .post(`/api/chat/sessions/${sessionId}/messages`)
          .send({
            content: `Concurrent message ${i}`,
            role: 'user'
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all messages were saved
      const messagesResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .expect(200);

      expect(messagesResponse.body.data).toHaveLength(5);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large conversation history efficiently', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Large History Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      // Create large conversation history
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          request(app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .send({
              content: `Message ${i}`,
              role: i % 2 === 0 ? 'user' : 'assistant'
            })
        );
      }

      await Promise.all(messagePromises);

      // Test pagination
      const startTime = Date.now();
      const paginatedResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages?page=1&limit=20`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(paginatedResponse.body.data).toHaveLength(20);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should optimize generation performance', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ title: 'Performance Test' })
        .expect(201);

      const sessionId = sessionResponse.body.data.id;

      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .send({
          content: 'Generate a short response',
          role: 'user'
        })
        .expect(201);

      // Measure generation time
      const startTime = Date.now();
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/generate`)
        .send({ stream: false })
        .expect(200);
      const generationTime = Date.now() - startTime;

      expect(generationTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});