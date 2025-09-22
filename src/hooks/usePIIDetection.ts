import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PIIDetector, PIIDetectionResult, PIIMatch, PIIDetectorConfig } from '../services/pii/PIIDetector';

export interface PIIDetectionHookOptions {
  enableRealTime?: boolean;
  debounceMs?: number;
  onPIIDetected?: (result: PIIDetectionResult) => void;
  onHighRiskDetected?: (result: PIIDetectionResult) => void;
  config?: Partial<PIIDetectorConfig>;
}

export interface PIIDetectionState {
  isScanning: boolean;
  lastResult: PIIDetectionResult | null;
  hasActivePII: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warningMessage: string | null;
}

export interface PIIDetectionActions {
  scanText: (text: string) => Promise<PIIDetectionResult>;
  scanRealTime: (text: string, callback?: (matches: PIIMatch[]) => void) => PIIMatch[];
  clearWarnings: () => void;
  updateConfig: (config: Partial<PIIDetectorConfig>) => void;
  maskText: (text: string, matches: PIIMatch[]) => string;
  getAuditLog: () => PIIMatch[];
  exportAuditLog: () => string;
}

export const usePIIDetection = (options: PIIDetectionHookOptions = {}) => {
  const {
    enableRealTime = true,
    debounceMs = 300,
    onPIIDetected,
    onHighRiskDetected,
    config = {}
  } = options;

  // State
  const [state, setState] = useState<PIIDetectionState>({
    isScanning: false,
    lastResult: null,
    hasActivePII: false,
    riskLevel: 'low',
    warningMessage: null
  });

  // Refs
  const detectorRef = useRef<PIIDetector | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resolvedConfig = useMemo<Partial<PIIDetectorConfig>>(() => ({
    ...config,
    enableRealTime
  }), [config, enableRealTime]);

  const getDetector = useCallback((): PIIDetector => {
    if (!detectorRef.current) {
      detectorRef.current = new PIIDetector(resolvedConfig);
    }

    return detectorRef.current;
  }, [resolvedConfig]);

  useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.updateConfig(resolvedConfig);
    }
  }, [resolvedConfig]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      detectorRef.current = null;
    };
  }, []);

  // Scan text for PII
  const scanText = useCallback(async (text: string): Promise<PIIDetectionResult> => {
    if (!text.trim()) {
      return createEmptyResult();
    }

    setState(prev => ({ ...prev, isScanning: true }));

    try {
      const detector = getDetector();
      const result = await detector.detectPII(text);

      if (!result) {
        throw new Error('PII detector returned no result');
      }

      setState(prev => ({
        ...prev,
        isScanning: false,
        lastResult: result,
        hasActivePII: result.hasPII,
        riskLevel: result.riskLevel,
        warningMessage: result.hasPII ? generateWarningMessage(result) : null
      }));

      // Trigger callbacks
      if (result.hasPII && onPIIDetected) {
        onPIIDetected(result);
      }

      if (['high', 'critical'].includes(result.riskLevel) && onHighRiskDetected) {
        onHighRiskDetected(result);
      }

      return result;
    } catch (error) {
      console.error('PII detection error:', error);
      const fallbackResult = createEmptyResult(['Error occurred during scanning']);

      setState(prev => ({
        ...prev,
        isScanning: false,
        lastResult: fallbackResult,
        hasActivePII: false,
        riskLevel: 'low',
        warningMessage: 'Error during PII scanning'
      }));

      return fallbackResult;
    }
  }, [getDetector, onPIIDetected, onHighRiskDetected]);

  const performRealTimeScan = useCallback((text: string): PIIMatch[] => {
    const realTimeEnabled = resolvedConfig.enableRealTime ?? true;

    if (!realTimeEnabled) {
      setState(prev => ({
        ...prev,
        hasActivePII: false,
        riskLevel: 'low',
        warningMessage: null
      }));
      return [];
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setState(prev => ({
        ...prev,
        hasActivePII: false,
        riskLevel: 'low',
        warningMessage: null
      }));
      return [];
    }

    const detector = getDetector();
    const detectedMatches = detector.detectPIIRealTime(text);
    const matches = Array.isArray(detectedMatches) ? detectedMatches : [];

    setState(prev => ({
      ...prev,
      hasActivePII: matches.length > 0,
      riskLevel: matches.length > 0 ? calculateQuickRiskLevel(matches) : 'low',
      warningMessage: matches.length > 0 ? 'Potential PII detected while typing' : null
    }));

    return matches;
  }, [getDetector, resolvedConfig.enableRealTime]);

  const scanRealTime = useCallback((text: string, callback?: (matches: PIIMatch[]) => void): PIIMatch[] => {
    if (callback) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(() => {
          const matches = performRealTimeScan(text);
          callback(matches);
        }, debounceMs);
        return [];
      }

      const matches = performRealTimeScan(text);
      callback(matches);
      return matches;
    }

    return performRealTimeScan(text);
  }, [performRealTimeScan, debounceMs]);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setState(prev => ({
      ...prev,
      warningMessage: null,
      hasActivePII: false,
      riskLevel: 'low'
    }));
  }, []);

  // Update detector configuration
  const updateConfig = useCallback((newConfig: Partial<PIIDetectorConfig>) => {
    const detector = getDetector();
    detector.updateConfig(newConfig);
  }, [getDetector]);

  // Mask text with PII matches
  const maskText = useCallback((text: string, matches: PIIMatch[]): string => {
    if (!matches.length) return text;

    const detector = getDetector();

    if (typeof detector.maskText === 'function') {
      return detector.maskText(text, matches);
    }

    let maskedText = text;

    const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

    sortedMatches.forEach(match => {
      const maskLength = match.text.length;
      const mask = '*'.repeat(Math.max(3, Math.min(maskLength, 8)));

      maskedText = maskedText.slice(0, match.start) +
                   mask +
                   maskedText.slice(match.end);
    });

    return maskedText;
  }, [getDetector]);

  // Get audit log
  const getAuditLog = useCallback((): PIIMatch[] => {
    const detector = getDetector();
    const auditLog = detector.getAuditLog?.();
    return Array.isArray(auditLog) ? auditLog : [];
  }, [getDetector]);

  // Export audit log
  const exportAuditLog = useCallback((): string => {
    const auditLog = getAuditLog();
    const exportData = {
      exportDate: new Date().toISOString(),
      totalEntries: auditLog.length,
      entries: auditLog.map(entry => ({
        type: entry.type,
        hash: entry.hash,
        confidence: entry.confidence,
        isLegalPrivileged: entry.isLegalPrivileged,
        country: entry.country
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }, [getAuditLog]);

  // Actions object
  const actions: PIIDetectionActions = {
    scanText,
    scanRealTime,
    clearWarnings,
    updateConfig,
    maskText,
    getAuditLog,
    exportAuditLog
  };

  return [state, actions] as const;
};

// Helper function to generate warning messages
function generateWarningMessage(result: PIIDetectionResult): string {
  const { matches, riskLevel } = result;

  if (riskLevel === 'critical') {
    return 'CRITICAL: Attorney-client privileged content detected. Review immediately.';
  }

  if (riskLevel === 'high') {
    return `HIGH RISK: ${matches.length} PII element(s) detected. Consider removing sensitive data.`;
  }

  if (riskLevel === 'medium') {
    return `MEDIUM RISK: ${matches.length} potential PII element(s) found. Please review.`;
  }

  return `${matches.length} potential PII element(s) detected.`;
}

// Helper function for quick risk level calculation
function calculateQuickRiskLevel(matches: PIIMatch[]): 'low' | 'medium' | 'high' | 'critical' {
  if (matches.some(m => m.isLegalPrivileged)) return 'critical';
  if (matches.some(m => m.confidence > 0.9)) return 'high';
  if (matches.length > 2) return 'medium';
  return 'low';
}

function createEmptyResult(suggestions: string[] = []): PIIDetectionResult {
  return {
    hasPII: false,
    matches: [],
    riskLevel: 'low',
    suggestions,
    auditHash: ''
  };
}

// Hook for document preprocessing
export const useDocumentPIIScanning = () => {
  const [state, actions] = usePIIDetection({
    enableRealTime: false,
    config: {
      sensitivity: 'high',
      enableLegalPatterns: true,
      enableDutchCompliance: true
    }
  });

  const scanDocument = useCallback(async (
    content: string,
    metadata: { fileName: string; fileType: string; fileSize: number }
  ): Promise<PIIDetectionResult & { shouldBlock: boolean; redactedContent?: string }> => {
    const result = await actions.scanText(content);

    const shouldBlock = result.riskLevel === 'critical' ||
                       (result.riskLevel === 'high' && result.matches.length > 5);

    let redactedContent: string | undefined;
    if (result.hasPII) {
      redactedContent = actions.maskText(content, result.matches);
    }

    return {
      ...result,
      shouldBlock,
      redactedContent
    };
  }, [actions]);

  const preprocessDocument = useCallback(async (
    file: File
  ): Promise<{
    originalContent: string;
    scanResult: PIIDetectionResult;
    shouldBlock: boolean;
    redactedContent?: string;
    recommendations: string[];
  }> => {
    // Read file content
    const content = await readFileContent(file);

    // Scan for PII
    const scanResult = await scanDocument(content, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    const recommendations: string[] = [];

    if (scanResult.shouldBlock) {
      recommendations.push('Document blocked due to high PII risk');
      recommendations.push('Remove sensitive information before uploading');
    }

    if (scanResult.riskLevel === 'critical') {
      recommendations.push('Attorney-client privileged content detected');
      recommendations.push('Ensure proper authorization before processing');
    }

    recommendations.push(...scanResult.suggestions);

    return {
      originalContent: content,
      scanResult,
      shouldBlock: scanResult.shouldBlock,
      redactedContent: scanResult.redactedContent,
      recommendations
    };
  }, [scanDocument]);

  return {
    ...state,
    scanDocument,
    preprocessDocument
  };
};

// Helper function to read file content
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content || '');
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      // For binary files, convert to base64 and extract text if possible
      reader.readAsText(file); // Fallback to text reading
    }
  });
}

export default usePIIDetection;