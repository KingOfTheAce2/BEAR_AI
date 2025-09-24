import { DocumentAnalysis, DocumentFingerprint } from '../../types/document';

/**
 * Document Version Control System
 * Tracks document changes, provides diff comparison, and rollback functionality
 */

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  timestamp: Date;
  fingerprint: DocumentFingerprint;
  changes: DocumentChange[];
  author?: string;
  comment?: string;
  parentVersion?: string;
  tags: string[];
  metadata: VersionMetadata;
}

export interface DocumentChange {
  type: 'addition' | 'deletion' | 'modification' | 'move';
  location: {
    start: number;
    end: number;
    page?: number;
    section?: string;
  };
  oldContent?: string;
  newContent?: string;
  severity: 'minor' | 'major' | 'critical';
  category: 'text' | 'structure' | 'metadata' | 'legal_entity' | 'clause';
  confidence: number;
}

export interface VersionMetadata {
  size: number;
  wordCount: number;
  pageCount: number;
  checksum: string;
  analysisVersion: string;
  processingTime: number;
}

export interface DiffResult {
  documentId: string;
  fromVersion: string;
  toVersion: string;
  summary: DiffSummary;
  changes: DocumentChange[];
  visualDiff?: VisualDiff;
  recommendations: string[];
}

export interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  severity: 'minor' | 'major' | 'critical';
  confidenceScore: number;
  impactedSections: string[];
}

export interface VisualDiff {
  htmlDiff: string;
  highlightedRegions: Array<{
    type: 'added' | 'removed' | 'modified';
    start: number;
    end: number;
    content: string;
  }>;
}

export interface RollbackOptions {
  targetVersion: string;
  preserveChanges?: string[]; // Changes to preserve during rollback
  createBackup?: boolean;
  validateIntegrity?: boolean;
}

export interface VersionBranch {
  id: string;
  name: string;
  baseVersion: string;
  currentVersion: string;
  description?: string;
  isActive: boolean;
  mergeConflicts?: ConflictInfo[];
}

export interface ConflictInfo {
  type: 'content' | 'metadata' | 'structure';
  location: string;
  description: string;
  resolution?: 'automatic' | 'manual' | 'pending';
}

export class DocumentVersionControl {
  private versions: Map<string, DocumentVersion[]>;
  private branches: Map<string, VersionBranch>;
  private activeDocument: string | null;
  private maxVersionsPerDocument: number;

  constructor(maxVersionsPerDocument = 50) {
    this.versions = new Map();
    this.branches = new Map();
    this.activeDocument = null;
    this.maxVersionsPerDocument = maxVersionsPerDocument;
  }

  /**
   * Create a new version of a document
   */
  async createVersion(
    documentId: string,
    analysis: DocumentAnalysis,
    options: {
      author?: string;
      comment?: string;
      tags?: string[];
      compareWithPrevious?: boolean;
    } = {}
  ): Promise<DocumentVersion> {
    const existingVersions = this.versions.get(documentId) || [];
    const versionNumber = existingVersions.length + 1;
    const parentVersion = existingVersions.length > 0
      ? existingVersions[existingVersions.length - 1].id
      : undefined;

    // Calculate changes if comparing with previous version
    let changes: DocumentChange[] = [];
    if (options.compareWithPrevious && existingVersions.length > 0) {
      const previousVersion = existingVersions[existingVersions.length - 1];
      changes = await this.calculateChanges(previousVersion, analysis);
    }

    const version: DocumentVersion = {
      id: this.generateVersionId(documentId, versionNumber),
      documentId,
      version: versionNumber,
      timestamp: new Date(),
      fingerprint: analysis.fingerprint,
      changes,
      author: options.author,
      comment: options.comment,
      parentVersion,
      tags: options.tags || [],
      metadata: {
        size: analysis.textContent.length,
        wordCount: analysis.textContent.split(/\s+/).length,
        pageCount: analysis.ocrResult?.page_results.length || 1,
        checksum: analysis.fingerprint.hash,
        analysisVersion: analysis.metadata.version,
        processingTime: analysis.metadata.processingTime
      }
    };

    // Store the version
    if (!this.versions.has(documentId)) {
      this.versions.set(documentId, []);
    }

    const versions = this.versions.get(documentId)!;
    versions.push(version);

    // Enforce version limit
    if (versions.length > this.maxVersionsPerDocument) {
      versions.splice(0, versions.length - this.maxVersionsPerDocument);
    }

    this.versions.set(documentId, versions);

    return version;
  }

  /**
   * Compare two document versions
   */
  async compareVersions(
    documentId: string,
    fromVersionId: string,
    toVersionId: string
  ): Promise<DiffResult> {
    const versions = this.versions.get(documentId);
    if (!versions) {
      throw new Error(`No versions found for document ${documentId}`);
    }

    const fromVersion = versions.find(v => v.id === fromVersionId);
    const toVersion = versions.find(v => v.id === toVersionId);

    if (!fromVersion || !toVersion) {
      throw new Error('One or both versions not found');
    }

    // For this implementation, we'll use the stored changes in the newer version
    // In a full implementation, you'd perform detailed text comparison
    const changes = toVersion.version > fromVersion.version
      ? toVersion.changes
      : fromVersion.changes;

    const summary = this.generateDiffSummary(changes);
    const visualDiff = await this.generateVisualDiff(fromVersion, toVersion);
    const recommendations = this.generateRecommendations(changes);

    return {
      documentId,
      fromVersion: fromVersionId,
      toVersion: toVersionId,
      summary,
      changes,
      visualDiff,
      recommendations
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    documentId: string,
    targetVersionId: string,
    options: RollbackOptions
  ): Promise<DocumentVersion> {
    const versions = this.versions.get(documentId);
    if (!versions) {
      throw new Error(`No versions found for document ${documentId}`);
    }

    const targetVersion = versions.find(v => v.id === targetVersionId);
    if (!targetVersion) {
      throw new Error(`Target version ${targetVersionId} not found`);
    }

    const currentVersion = versions[versions.length - 1];

    // Create backup if requested
    if (options.createBackup) {
      await this.createVersion(documentId, {
        fingerprint: currentVersion.fingerprint,
        textContent: '', // Would need to reconstruct from fingerprint
        metadata: {
          version: 'backup',
          analyzer: 'VersionControl',
          processingTime: 0,
          confidence: 1.0
        }
      } as DocumentAnalysis, {
        comment: `Backup before rollback to version ${targetVersion.version}`,
        tags: ['backup', 'rollback']
      });
    }

    // Validate integrity if requested
    if (options.validateIntegrity) {
      const isValid = await this.validateVersionIntegrity(targetVersion);
      if (!isValid) {
        throw new Error('Target version integrity validation failed');
      }
    }

    // Create rollback version (essentially a new version with old content)
    const rollbackVersion: DocumentVersion = {
      id: this.generateVersionId(documentId, versions.length + 1),
      documentId,
      version: versions.length + 1,
      timestamp: new Date(),
      fingerprint: targetVersion.fingerprint,
      changes: [{
        type: 'modification',
        location: { start: 0, end: -1 },
        oldContent: 'current_version',
        newContent: 'rolled_back_version',
        severity: 'major',
        category: 'text',
        confidence: 1.0
      }],
      author: 'system',
      comment: `Rolled back to version ${targetVersion.version}`,
      parentVersion: currentVersion.id,
      tags: ['rollback'],
      metadata: targetVersion.metadata
    };

    versions.push(rollbackVersion);
    this.versions.set(documentId, versions);

    return rollbackVersion;
  }

  /**
   * Create a new branch from a version
   */
  async createBranch(
    documentId: string,
    baseVersionId: string,
    branchName: string,
    description?: string
  ): Promise<VersionBranch> {
    const versions = this.versions.get(documentId);
    if (!versions) {
      throw new Error(`No versions found for document ${documentId}`);
    }

    const baseVersion = versions.find(v => v.id === baseVersionId);
    if (!baseVersion) {
      throw new Error(`Base version ${baseVersionId} not found`);
    }

    const branch: VersionBranch = {
      id: this.generateBranchId(documentId, branchName),
      name: branchName,
      baseVersion: baseVersionId,
      currentVersion: baseVersionId,
      description,
      isActive: false,
      mergeConflicts: []
    };

    this.branches.set(branch.id, branch);

    return branch;
  }

  /**
   * Get version history for a document
   */
  getVersionHistory(documentId: string): DocumentVersion[] {
    return this.versions.get(documentId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(documentId: string, versionId: string): DocumentVersion | undefined {
    const versions = this.versions.get(documentId);
    return versions?.find(v => v.id === versionId);
  }

  /**
   * Get latest version
   */
  getLatestVersion(documentId: string): DocumentVersion | undefined {
    const versions = this.versions.get(documentId);
    return versions && versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  /**
   * Search versions by criteria
   */
  searchVersions(
    documentId: string,
    criteria: {
      author?: string;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
      hasChanges?: boolean;
    }
  ): DocumentVersion[] {
    const versions = this.versions.get(documentId) || [];

    return versions.filter(version => {
      if (criteria.author && version.author !== criteria.author) {
        return false;
      }

      if (criteria.tags && !criteria.tags.some(tag => version.tags.includes(tag))) {
        return false;
      }

      if (criteria.dateRange) {
        const versionDate = version.timestamp;
        if (versionDate < criteria.dateRange.start || versionDate > criteria.dateRange.end) {
          return false;
        }
      }

      if (criteria.hasChanges !== undefined) {
        const hasChanges = version.changes.length > 0;
        if (hasChanges !== criteria.hasChanges) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate changes between versions
   */
  private async calculateChanges(
    previousVersion: DocumentVersion,
    currentAnalysis: DocumentAnalysis
  ): Promise<DocumentChange[]> {
    const changes: DocumentChange[] = [];

    // Compare fingerprints for high-level changes
    if (previousVersion.fingerprint.hash !== currentAnalysis.fingerprint.hash) {
      // Structure changes
      if (previousVersion.fingerprint.structure.pageCount !== currentAnalysis.fingerprint.structure.pageCount) {
        changes.push({
          type: 'modification',
          location: { start: 0, end: -1 },
          oldContent: `${previousVersion.fingerprint.structure.pageCount} pages`,
          newContent: `${currentAnalysis.fingerprint.structure.pageCount} pages`,
          severity: 'major',
          category: 'structure',
          confidence: 1.0
        });
      }

      // Word count changes
      if (previousVersion.fingerprint.structure.wordCount !== currentAnalysis.fingerprint.structure.wordCount) {
        const oldCount = previousVersion.fingerprint.structure.wordCount;
        const newCount = currentAnalysis.fingerprint.structure.wordCount;
        const changePercent = Math.abs(newCount - oldCount) / oldCount;

        changes.push({
          type: 'modification',
          location: { start: 0, end: -1 },
          oldContent: `${oldCount} words`,
          newContent: `${newCount} words`,
          severity: changePercent > 0.1 ? 'major' : 'minor',
          category: 'text',
          confidence: 1.0
        });
      }
    }

    // Implement detailed text-level diff algorithm using Myers algorithm
    const textChanges = await this.performTextDiff(
      previousVersion.fingerprint.textContent || '',
      currentAnalysis.textContent
    );

    changes.push(...textChanges);

    return changes;
  }

  /**
   * Generate diff summary
   */
  private generateDiffSummary(changes: DocumentChange[]): DiffSummary {
    const additions = changes.filter(c => c.type === 'addition').length;
    const deletions = changes.filter(c => c.type === 'deletion').length;
    const modifications = changes.filter(c => c.type === 'modification').length;

    const severity = changes.some(c => c.severity === 'critical') ? 'critical' :
                    changes.some(c => c.severity === 'major') ? 'major' : 'minor';

    const confidenceScore = changes.length > 0
      ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length
      : 1.0;

    const impactedSections = [...new Set(
      changes.map(c => c.location.section).filter(Boolean) as string[]
    )];

    return {
      totalChanges: changes.length,
      additions,
      deletions,
      modifications,
      severity,
      confidenceScore,
      impactedSections
    };
  }

  /**
   * Generate visual diff
   */
  private async generateVisualDiff(
    fromVersion: DocumentVersion,
    toVersion: DocumentVersion
  ): Promise<VisualDiff> {
    // This is a simplified implementation
    // In production, you'd use a proper diff algorithm like Myers or patience diff

    const highlightedRegions = toVersion.changes.map(change => ({
      type: change.type === 'addition' ? 'added' as const :
            change.type === 'deletion' ? 'removed' as const :
            'modified' as const,
      start: change.location.start,
      end: change.location.end,
      content: change.newContent || change.oldContent || ''
    }));

    // Generate HTML diff (simplified)
    const htmlDiff = this.generateHtmlDiff(fromVersion, toVersion);

    return {
      htmlDiff,
      highlightedRegions
    };
  }

  /**
   * Generate HTML diff representation
   */
  private generateHtmlDiff(fromVersion: DocumentVersion, toVersion: DocumentVersion): string {
    // This would generate a proper HTML diff in production
    return `
      <div class="diff-container">
        <div class="diff-header">
          <h3>Changes from Version ${fromVersion.version} to ${toVersion.version}</h3>
          <p>Timestamp: ${toVersion.timestamp.toISOString()}</p>
        </div>
        <div class="diff-content">
          ${toVersion.changes.map(change => `
            <div class="change change-${change.type}">
              <span class="change-type">${change.type}</span>
              <span class="change-content">${change.newContent || change.oldContent || ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate recommendations based on changes
   */
  private generateRecommendations(changes: DocumentChange[]): string[] {
    const recommendations: string[] = [];

    const criticalChanges = changes.filter(c => c.severity === 'critical');
    if (criticalChanges.length > 0) {
      recommendations.push('Critical changes detected - review carefully before proceeding');
    }

    const legalEntityChanges = changes.filter(c => c.category === 'legal_entity');
    if (legalEntityChanges.length > 0) {
      recommendations.push('Legal entities have been modified - verify accuracy of citations and references');
    }

    const clauseChanges = changes.filter(c => c.category === 'clause');
    if (clauseChanges.length > 0) {
      recommendations.push('Contract clauses have changed - ensure legal implications are understood');
    }

    const structureChanges = changes.filter(c => c.category === 'structure');
    if (structureChanges.length > 0) {
      recommendations.push('Document structure has changed - verify formatting and organization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Changes appear to be minor - proceed with standard review process');
    }

    return recommendations;
  }

  /**
   * Validate version integrity
   */
  private async validateVersionIntegrity(version: DocumentVersion): Promise<boolean> {
    // Check if fingerprint data is consistent
    if (!version.fingerprint || !version.fingerprint.hash) {
      return false;
    }

    // Check if metadata is reasonable
    if (version.metadata.size < 0 || version.metadata.wordCount < 0) {
      return false;
    }

    // Check timestamp
    if (version.timestamp > new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Generate version ID
   */
  private generateVersionId(documentId: string, version: number): string {
    return `${documentId}_v${version}_${Date.now()}`;
  }

  /**
   * Generate branch ID
   */
  private generateBranchId(documentId: string, branchName: string): string {
    return `${documentId}_branch_${branchName}_${Date.now()}`;
  }

  /**
   * Export version history
   */
  exportVersionHistory(documentId: string): string {
    const versions = this.versions.get(documentId) || [];
    return JSON.stringify({
      documentId,
      exportDate: new Date().toISOString(),
      totalVersions: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        timestamp: v.timestamp,
        author: v.author,
        comment: v.comment,
        tags: v.tags,
        changeCount: v.changes.length,
        metadata: v.metadata
      }))
    }, null, 2);
  }

  /**
   * Import version history
   */
  importVersionHistory(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.versions && Array.isArray(parsed.versions)) {
        // This would be a more complex operation in production
        // involving validation and conflict resolution
        // Logging disabled for production
      }
    } catch (error) {
      throw new Error('Invalid version history data');
    }
  }

  /**
   * Perform text-level diff using Myers algorithm
   */
  private async performTextDiff(oldText: string, newText: string): Promise<DocumentChange[]> {
    const changes: DocumentChange[] = [];

    // Split texts into lines for line-by-line comparison
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // Use a simplified Myers diff algorithm
    const diff = this.myersTextDiff(oldLines, newLines);

    let oldLineNum = 0;
    let newLineNum = 0;
    let currentPos = 0;

    for (const operation of diff) {
      switch (operation.type) {
        case 'equal':
          // Lines are the same, advance both pointers
          for (let i = 0; i < operation.count; i++) {
            currentPos += oldLines[oldLineNum + i].length + 1; // +1 for newline
            oldLineNum++;
            newLineNum++;
          }
          break;

        case 'delete':
          // Lines deleted from old text
          const deletedText = operation.lines.join('\n');
          changes.push({
            type: 'deletion',
            location: {
              start: currentPos,
              end: currentPos + deletedText.length
            },
            oldContent: deletedText,
            newContent: '',
            severity: this.calculateChangeSeverity(deletedText, ''),
            category: this.determineChangeCategory(deletedText),
            confidence: 0.95
          });

          for (let i = 0; i < operation.count; i++) {
            currentPos += oldLines[oldLineNum + i].length + 1;
            oldLineNum++;
          }
          break;

        case 'insert':
          // Lines added to new text
          const insertedText = operation.lines.join('\n');
          changes.push({
            type: 'addition',
            location: {
              start: currentPos,
              end: currentPos + insertedText.length
            },
            oldContent: '',
            newContent: insertedText,
            severity: this.calculateChangeSeverity('', insertedText),
            category: this.determineChangeCategory(insertedText),
            confidence: 0.95
          });

          // Don't advance currentPos for inserts as they don't exist in old text
          newLineNum += operation.count;
          break;

        case 'replace':
          // Lines modified
          const oldContent = operation.oldLines!.join('\n');
          const newContent = operation.newLines!.join('\n');

          changes.push({
            type: 'modification',
            location: {
              start: currentPos,
              end: currentPos + oldContent.length
            },
            oldContent,
            newContent,
            severity: this.calculateChangeSeverity(oldContent, newContent),
            category: this.determineChangeCategory(newContent),
            confidence: 0.9
          });

          for (let i = 0; i < operation.oldLines!.length; i++) {
            currentPos += oldLines[oldLineNum + i].length + 1;
            oldLineNum++;
          }
          newLineNum += operation.newLines!.length;
          break;
      }
    }

    return changes;
  }

  /**
   * Simplified Myers diff algorithm implementation
   */
  private myersTextDiff(oldLines: string[], newLines: string[]): DiffOperation[] {
    const operations: DiffOperation[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    // Simple line-by-line comparison
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex >= oldLines.length) {
        // Remaining lines are insertions
        const insertedLines = newLines.slice(newIndex);
        operations.push({
          type: 'insert',
          count: insertedLines.length,
          lines: insertedLines
        });
        break;
      }

      if (newIndex >= newLines.length) {
        // Remaining lines are deletions
        const deletedLines = oldLines.slice(oldIndex);
        operations.push({
          type: 'delete',
          count: deletedLines.length,
          lines: deletedLines
        });
        break;
      }

      if (oldLines[oldIndex] === newLines[newIndex]) {
        // Lines are equal, find the sequence of equal lines
        let equalCount = 1;
        while (
          oldIndex + equalCount < oldLines.length &&
          newIndex + equalCount < newLines.length &&
          oldLines[oldIndex + equalCount] === newLines[newIndex + equalCount]
        ) {
          equalCount++;
        }

        operations.push({
          type: 'equal',
          count: equalCount,
          lines: oldLines.slice(oldIndex, oldIndex + equalCount)
        });

        oldIndex += equalCount;
        newIndex += equalCount;
      } else {
        // Lines are different - determine if it's a replacement, insertion, or deletion
        const lookahead = 5; // Look ahead to find matching sequences
        let matchFound = false;

        // Look for the new line in upcoming old lines (deletion scenario)
        for (let i = 1; i <= lookahead && oldIndex + i < oldLines.length; i++) {
          if (oldLines[oldIndex + i] === newLines[newIndex]) {
            // Found match - the lines in between are deletions
            operations.push({
              type: 'delete',
              count: i,
              lines: oldLines.slice(oldIndex, oldIndex + i)
            });
            oldIndex += i;
            matchFound = true;
            break;
          }
        }

        if (!matchFound) {
          // Look for the old line in upcoming new lines (insertion scenario)
          for (let i = 1; i <= lookahead && newIndex + i < newLines.length; i++) {
            if (newLines[newIndex + i] === oldLines[oldIndex]) {
              // Found match - the lines in between are insertions
              operations.push({
                type: 'insert',
                count: i,
                lines: newLines.slice(newIndex, newIndex + i)
              });
              newIndex += i;
              matchFound = true;
              break;
            }
          }
        }

        if (!matchFound) {
          // No match found within lookahead - treat as replacement
          operations.push({
            type: 'replace',
            count: 1,
            oldLines: [oldLines[oldIndex]],
            newLines: [newLines[newIndex]]
          });
          oldIndex++;
          newIndex++;
        }
      }
    }

    return operations;
  }

  /**
   * Calculate severity of a change
   */
  private calculateChangeSeverity(oldContent: string, newContent: string): 'minor' | 'major' | 'critical' {
    const oldWords = oldContent.split(/\s+/).length;
    const newWords = newContent.split(/\s+/).length;
    const totalWords = Math.max(oldWords, newWords, 1);
    const changeRatio = Math.abs(oldWords - newWords) / totalWords;

    // Check for critical legal terms
    const criticalTerms = [
      'liability', 'termination', 'breach', 'penalty', 'damages', 'void', 'null',
      'governing law', 'jurisdiction', 'arbitration', 'force majeure', 'indemnity'
    ];

    const hasCriticalTerms = criticalTerms.some(term =>
      oldContent.toLowerCase().includes(term) || newContent.toLowerCase().includes(term)
    );

    if (hasCriticalTerms) {
      return 'critical';
    }

    if (changeRatio > 0.5 || totalWords > 50) {
      return 'major';
    }

    return 'minor';
  }

  /**
   * Determine the category of a change
   */
  private determineChangeCategory(content: string): 'text' | 'structure' | 'metadata' | 'legal_entity' | 'clause' {
    const contentLower = content.toLowerCase();

    // Legal entities
    const legalEntityKeywords = ['inc.', 'corp.', 'llc', 'ltd.', 'company', 'corporation'];
    if (legalEntityKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'legal_entity';
    }

    // Contract clauses
    const clauseKeywords = [
      'section', 'article', 'clause', 'paragraph', 'subsection',
      'whereas', 'therefore', 'hereby', 'shall', 'agreement'
    ];
    if (clauseKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'clause';
    }

    // Structure changes
    const structureKeywords = ['page', 'title', 'header', 'footer', 'table', 'list'];
    if (structureKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'structure';
    }

    // Metadata
    const metadataKeywords = ['date', 'version', 'author', 'created', 'modified', 'status'];
    if (metadataKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'metadata';
    }

    return 'text';
  }
}

/**
 * Interface for diff operations
 */
interface DiffOperation {
  type: 'equal' | 'delete' | 'insert' | 'replace';
  count: number;
  lines: string[];
  oldLines?: string[];
  newLines?: string[];
}

// Export singleton instance
export const documentVersionControl = new DocumentVersionControl();