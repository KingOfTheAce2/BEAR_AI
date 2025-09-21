import { renderHook, act } from '@testing-library/react';
import { usePIIDetection, useDocumentPIIScanning } from '../../hooks/usePIIDetection';
import { PIIDetectionResult, PIIType } from '../../services/pii/PIIDetector';

// Mock the PIIDetector
jest.mock('../../services/pii/PIIDetector', () => ({
  PIIDetector: jest.fn().mockImplementation(() => ({
    detectPII: jest.fn(),
    detectPIIRealTime: jest.fn(),
    maskText: jest.fn(),
    getAuditLog: jest.fn(),
    clearAuditLog: jest.fn(),
    updateConfig: jest.fn(),
    getConfig: jest.fn()
  })),
  PIIType: {
    EMAIL: 'email',
    SSN: 'ssn',
    PHONE: 'phone',
    ATTORNEY_CLIENT_PRIVILEGE: 'attorney_client_privilege'
  }
}));

describe('usePIIDetection Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Hook Functionality', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => usePIIDetection());
      const [state] = result.current;

      expect(state.isScanning).toBe(false);
      expect(state.lastResult).toBeNull();
      expect(state.hasActivePII).toBe(false);
      expect(state.riskLevel).toBe('low');
      expect(state.warningMessage).toBeNull();
    });

    test('should initialize with custom options', () => {
      const options = {
        enableRealTime: false,
        debounceMs: 500,
        config: {
          sensitivity: 'low' as const,
          enableLegalPatterns: false
        }
      };

      const { result } = renderHook(() => usePIIDetection(options));
      const [state] = result.current;

      expect(state.isScanning).toBe(false);
      expect(state.hasActivePII).toBe(false);
    });
  });

  describe('PII Scanning', () => {
    test('should scan text and update state', async () => {
      const mockResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.EMAIL,
          text: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 0.95,
          hash: 'hash123'
        }],
        riskLevel: 'medium',
        suggestions: ['Consider masking email'],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      // Mock the detector's detectPII method
      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(mockResult),
        detectPIIRealTime: jest.fn(),
        maskText: jest.fn(),
        getAuditLog: jest.fn(),
        clearAuditLog: jest.fn(),
        updateConfig: jest.fn(),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        const result = await actions.scanText('Contact me at test@example.com');
        expect(result).toEqual(mockResult);
      });

      const [state] = result.current;
      expect(state.lastResult).toEqual(mockResult);
      expect(state.hasActivePII).toBe(true);
      expect(state.riskLevel).toBe('medium');
      expect(state.warningMessage).toContain('MEDIUM RISK');
    });

    test('should handle scanning errors gracefully', async () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      // Mock the detector to throw an error
      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockRejectedValue(new Error('Detection failed')),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        const result = await actions.scanText('test text');
        expect(result.hasPII).toBe(false);
        expect(result.suggestions).toContain('Error occurred during scanning');
      });

      const [state] = result.current;
      expect(state.warningMessage).toBe('Error during PII scanning');
    });

    test('should handle empty text input', async () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      await act(async () => {
        const result = await actions.scanText('');
        expect(result.hasPII).toBe(false);
        expect(result.matches).toHaveLength(0);
      });
    });
  });

  describe('Real-time Detection', () => {
    test('should perform real-time scanning', () => {
      const mockMatches = [{
        type: PIIType.EMAIL,
        text: 'test@example.com',
        start: 0,
        end: 16,
        confidence: 0.95,
        hash: 'hash123'
      }];

      const { result } = renderHook(() => usePIIDetection({ enableRealTime: true }));
      const [, actions] = result.current;

      // Mock the detector's real-time method
      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPIIRealTime: jest.fn().mockReturnValue(mockMatches),
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        const matches = actions.scanRealTime('test@example.com');
        expect(matches).toEqual(mockMatches);
      });

      const [state] = result.current;
      expect(state.hasActivePII).toBe(true);
    });

    test('should not scan real-time when disabled', () => {
      const { result } = renderHook(() => usePIIDetection({ enableRealTime: false }));
      const [, actions] = result.current;

      act(() => {
        const matches = actions.scanRealTime('test@example.com');
        expect(matches).toHaveLength(0);
      });
    });

    test('should not scan very short text', () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      act(() => {
        const matches = actions.scanRealTime('hi');
        expect(matches).toHaveLength(0);
      });
    });
  });

  describe('Text Masking', () => {
    test('should mask text with PII matches', () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      const matches = [{
        type: PIIType.EMAIL,
        text: 'test@example.com',
        start: 11,
        end: 27,
        confidence: 0.95,
        hash: 'hash123'
      }];

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        maskText: jest.fn().mockReturnValue('Contact me at *****'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        const masked = actions.maskText('Contact me at test@example.com', matches);
        expect(masked).toBe('Contact me at *****');
      });
    });

    test('should return original text when no matches', () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        maskText: jest.fn().mockReturnValue('No PII here'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        const masked = actions.maskText('No PII here', []);
        expect(masked).toBe('No PII here');
      });
    });
  });

  describe('Warning Management', () => {
    test('should clear warnings', () => {
      const { result } = renderHook(() => usePIIDetection());

      // Set some warning state first
      act(() => {
        const [, actions] = result.current;
        // Simulate real-time detection that sets warnings
        actions.scanRealTime('test@example.com');
      });

      act(() => {
        const [, actions] = result.current;
        actions.clearWarnings();
      });

      const [state] = result.current;
      expect(state.warningMessage).toBeNull();
      expect(state.hasActivePII).toBe(false);
      expect(state.riskLevel).toBe('low');
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      const mockUpdateConfig = jest.fn();
      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        updateConfig: mockUpdateConfig,
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        actions.updateConfig({ sensitivity: 'low' });
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith({ sensitivity: 'low' });
    });
  });

  describe('Audit Log Management', () => {
    test('should get audit log', () => {
      const mockAuditLog = [
        { type: PIIType.EMAIL, hash: 'hash1', confidence: 0.95 }
      ];

      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        getAuditLog: jest.fn().mockReturnValue(mockAuditLog),
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        const auditLog = actions.getAuditLog();
        expect(auditLog).toEqual(mockAuditLog);
      });
    });

    test('should export audit log as JSON', () => {
      const mockAuditLog = [
        { type: PIIType.EMAIL, hash: 'hash1', confidence: 0.95 }
      ];

      const { result } = renderHook(() => usePIIDetection());
      const [, actions] = result.current;

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        getAuditLog: jest.fn().mockReturnValue(mockAuditLog),
        getConfig: jest.fn().mockReturnValue({})
      }));

      act(() => {
        const exported = actions.exportAuditLog();
        const parsed = JSON.parse(exported);

        expect(parsed.totalEntries).toBe(1);
        expect(parsed.entries).toHaveLength(1);
        expect(parsed.exportDate).toBeDefined();
      });
    });
  });

  describe('Callback Handling', () => {
    test('should call onPIIDetected callback', async () => {
      const onPIIDetected = jest.fn();
      const mockResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.EMAIL,
          text: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 0.95,
          hash: 'hash123'
        }],
        riskLevel: 'medium',
        suggestions: [],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => usePIIDetection({ onPIIDetected }));
      const [, actions] = result.current;

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(mockResult),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        await actions.scanText('test@example.com');
      });

      expect(onPIIDetected).toHaveBeenCalledWith(mockResult);
    });

    test('should call onHighRiskDetected callback', async () => {
      const onHighRiskDetected = jest.fn();
      const mockResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.ATTORNEY_CLIENT_PRIVILEGE,
          text: 'attorney-client privilege',
          start: 0,
          end: 24,
          confidence: 0.95,
          hash: 'hash123',
          isLegalPrivileged: true
        }],
        riskLevel: 'critical',
        suggestions: [],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => usePIIDetection({ onHighRiskDetected }));
      const [, actions] = result.current;

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(mockResult),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        await actions.scanText('attorney-client privilege');
      });

      expect(onHighRiskDetected).toHaveBeenCalledWith(mockResult);
    });
  });
});

describe('useDocumentPIIScanning Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Scanning', () => {
    test('should scan document content', async () => {
      const mockResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.SSN,
          text: '123-45-6789',
          start: 0,
          end: 11,
          confidence: 0.9,
          hash: 'hash123'
        }],
        riskLevel: 'high',
        suggestions: ['Remove SSN'],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => useDocumentPIIScanning());

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(mockResult),
        maskText: jest.fn().mockReturnValue('SSN: ***-**-****'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        const scanResult = await result.current.scanDocument(
          'SSN: 123-45-6789',
          { fileName: 'test.txt', fileType: 'text/plain', fileSize: 100 }
        );

        expect(scanResult.hasPII).toBe(true);
        expect(scanResult.shouldBlock).toBe(true); // High risk with multiple matches
        expect(scanResult.redactedContent).toBeDefined();
      });
    });

    test('should determine blocking based on risk assessment', async () => {
      const lowRiskResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.EMAIL,
          text: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 0.95,
          hash: 'hash123'
        }],
        riskLevel: 'low',
        suggestions: [],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => useDocumentPIIScanning());

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(lowRiskResult),
        maskText: jest.fn().mockReturnValue('Email: *****'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        const scanResult = await result.current.scanDocument(
          'Email: test@example.com',
          { fileName: 'test.txt', fileType: 'text/plain', fileSize: 100 }
        );

        expect(scanResult.shouldBlock).toBe(false); // Low risk should not block
      });
    });
  });

  describe('Document Preprocessing', () => {
    test('should preprocess file and return analysis', async () => {
      const mockFile = new File(['SSN: 123-45-6789'], 'test.txt', { type: 'text/plain' });

      const mockResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.SSN,
          text: '123-45-6789',
          start: 5,
          end: 16,
          confidence: 0.9,
          hash: 'hash123'
        }],
        riskLevel: 'critical',
        suggestions: ['Remove SSN', 'Use secure handling'],
        auditHash: 'audit123'
      };

      const { result } = renderHook(() => useDocumentPIIScanning());

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(mockResult),
        maskText: jest.fn().mockReturnValue('SSN: ***-**-****'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: 'SSN: 123-45-6789'
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      await act(async () => {
        const preprocessResult = result.current.preprocessDocument(mockFile);

        // Simulate file reading completion
        setTimeout(() => {
          mockFileReader.onload?.({ target: { result: 'SSN: 123-45-6789' } } as any);
        }, 0);

        const finalResult = await preprocessResult;

        expect(finalResult.originalContent).toBe('SSN: 123-45-6789');
        expect(finalResult.scanResult.hasPII).toBe(true);
        expect(finalResult.shouldBlock).toBe(true);
        expect(finalResult.recommendations).toContain('Remove SSN');
      });
    });

    test('should handle file reading errors', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const { result } = renderHook(() => useDocumentPIIScanning());

      // Mock FileReader that fails
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: null
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      await act(async () => {
        const preprocessPromise = result.current.preprocessDocument(mockFile);

        // Simulate file reading error
        setTimeout(() => {
          mockFileReader.onerror?.();
        }, 0);

        await expect(preprocessPromise).rejects.toThrow('Failed to read file');
      });
    });
  });

  describe('Risk Assessment Integration', () => {
    test('should generate appropriate recommendations', async () => {
      const { result } = renderHook(() => useDocumentPIIScanning());

      const criticalResult: PIIDetectionResult = {
        hasPII: true,
        matches: [{
          type: PIIType.ATTORNEY_CLIENT_PRIVILEGE,
          text: 'attorney-client privilege',
          start: 0,
          end: 24,
          confidence: 0.95,
          hash: 'hash123',
          isLegalPrivileged: true
        }],
        riskLevel: 'critical',
        suggestions: ['Attorney-client privileged content detected'],
        auditHash: 'audit123'
      };

      const mockDetector = require('../../services/pii/PIIDetector').PIIDetector;
      mockDetector.mockImplementation(() => ({
        detectPII: jest.fn().mockResolvedValue(criticalResult),
        maskText: jest.fn().mockReturnValue('****'),
        getConfig: jest.fn().mockReturnValue({})
      }));

      await act(async () => {
        const scanResult = await result.current.scanDocument(
          'attorney-client privilege',
          { fileName: 'legal.txt', fileType: 'text/plain', fileSize: 100 }
        );

        expect(scanResult.shouldBlock).toBe(true);
        expect(scanResult.recommendations).toContain('Attorney-client privileged content detected');
        expect(scanResult.recommendations).toContain('Ensure proper authorization before processing');
      });
    });
  });
});