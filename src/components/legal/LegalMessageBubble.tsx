import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { LegalCitation, CaseReference, StatuteReference } from '../../types/legal';
import './LegalMessageBubble.css';

interface LegalMessageBubbleProps {
  message: Message;
  onCitationClick?: (citation: LegalCitation) => void;
  showTimestamp?: boolean;
  isStreaming?: boolean;
  confidentialityLevel?: 'public' | 'attorney-client' | 'work-product' | 'confidential';
  className?: string;
}

export const LegalMessageBubble: React.FC<LegalMessageBubbleProps> = ({
  message,
  onCitationClick,
  showTimestamp = true,
  isStreaming = false,
  confidentialityLevel = 'attorney-client',
  className = ''
}) => {
  const [showCitations, setShowCitations] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';
  
  // Extract legal metadata
  const citations = message.metadata?.citations as LegalCitation[] || [];
  const caseReferences = message.metadata?.caseReferences as CaseReference[] || [];
  const statutes = message.metadata?.statutes as StatuteReference[] || [];
  const confidence = message.metadata?.confidence;
  const practiceArea = message.metadata?.practiceArea;
  const jurisdiction = message.metadata?.jurisdiction;
  const legalConcepts = message.metadata?.legalConcepts || [];

  // Check if content is long and should be collapsible
  const isLongContent = message.content.length > 500;
  const shouldShowExpand = isLongContent && !isExpanded;

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Render citation inline
  const renderCitationInline = (citation: LegalCitation, index: number) => (
    <button
      key={`cite-${index}`}
      className=\"inline-citation\"
      onClick={() => onCitationClick?.(citation)}
      title={citation.title}
    >
      [{index + 1}]
    </button>
  );

  // Enhanced content rendering with legal formatting
  const renderEnhancedContent = (content: string) => {
    let enhancedContent = content;
    
    // Highlight legal concepts
    legalConcepts.forEach((concept, index) => {
      const regex = new RegExp(`\\b${concept}\\b`, 'gi');
      enhancedContent = enhancedContent.replace(
        regex, 
        `<span class=\"legal-concept\" title=\"Legal concept: ${concept}\">$&</span>`
      );
    });

    // Add citation markers
    citations.forEach((citation, index) => {
      // Simple heuristic to find citation positions
      const keywords = citation.title.split(' ').slice(0, 3).join(' ');
      const regex = new RegExp(`\\b${keywords}\\b`, 'gi');
      enhancedContent = enhancedContent.replace(
        regex,
        `$&<sup class=\"citation-marker\" data-citation-index=\"${index}\">[${index + 1}]</sup>`
      );
    });

    return { __html: enhancedContent };
  };

  // Handle citation marker clicks
  useEffect(() => {
    const handleCitationMarkerClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-marker')) {
        const index = parseInt(target.dataset.citationIndex || '0');
        const citation = citations[index];
        if (citation) {
          onCitationClick?.(citation);
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleCitationMarkerClick);
      return () => contentElement.removeEventListener('click', handleCitationMarkerClick);
    }
  }, [citations, onCitationClick]);

  return (
    <div className={`legal-message-bubble ${isUser ? 'user' : 'ai'} ${isStreaming ? 'streaming' : ''} ${className}`}>
      {/* Message header */}
      <div className=\"message-header\">
        <div className=\"sender-info\">
          <div className=\"sender-avatar\">
            {isUser ? '👤' : '⚖️'}
          </div>
          <div className=\"sender-details\">
            <span className=\"sender-name\">
              {isUser ? 'You' : 'BEAR AI Legal'}
            </span>
            {showTimestamp && (
              <span className=\"message-timestamp\">
                {formatTimestamp(message.timestamp)}
              </span>
            )}
          </div>
        </div>
        
        {/* Message type indicator */}
        {message.type !== 'text' && (
          <div className=\"message-type-badge\">
            {message.type === 'legal-query' && '📋 Legal Query'}
            {message.type === 'case-law' && '📚 Case Law'}
            {message.type === 'statute' && '📜 Statute'}
            {message.type === 'contract-review' && '📄 Contract Review'}
            {message.type === 'analysis' && '🔍 Analysis'}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className=\"message-content-wrapper\">
        <div 
          ref={contentRef}
          className={`message-content ${shouldShowExpand ? 'collapsed' : ''}`}
          dangerouslySetInnerHTML={
            isAI && legalConcepts.length > 0 
              ? renderEnhancedContent(message.content)
              : { __html: message.content.replace(/\\n/g, '<br>') }
          }
        />
        
        {/* Expand/Collapse button for long content */}
        {isLongContent && (
          <button 
            className=\"expand-toggle\"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className=\"streaming-indicator\">
            <div className=\"typing-dots\">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Legal metadata panel */}
      {isAI && (confidence || practiceArea || jurisdiction) && (
        <div className=\"legal-metadata\">
          <button 
            className=\"metadata-toggle\"
            onClick={() => setShowMetadata(!showMetadata)}
          >
            Legal Details {showMetadata ? '▼' : '▶'}
          </button>
          
          {showMetadata && (
            <div className=\"metadata-content\">
              {confidence && (
                <div className=\"metadata-item\">
                  <span className=\"metadata-label\">Confidence:</span>
                  <div className=\"confidence-bar\">
                    <div 
                      className=\"confidence-fill\" 
                      style={{ width: `${confidence * 100}%` }}
                    />
                    <span className=\"confidence-text\">{Math.round(confidence * 100)}%</span>
                  </div>
                </div>
              )}
              
              {practiceArea && (
                <div className=\"metadata-item\">
                  <span className=\"metadata-label\">Practice Area:</span>
                  <span className=\"metadata-value practice-area\">{practiceArea}</span>
                </div>
              )}
              
              {jurisdiction && (
                <div className=\"metadata-item\">
                  <span className=\"metadata-label\">Jurisdiction:</span>
                  <span className=\"metadata-value jurisdiction\">{jurisdiction}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Citations panel */}
      {(citations.length > 0 || caseReferences.length > 0 || statutes.length > 0) && (
        <div className=\"citations-section\">
          <button 
            className=\"citations-toggle\"
            onClick={() => setShowCitations(!showCitations)}
          >
            Sources & Citations ({citations.length + caseReferences.length + statutes.length}) 
            {showCitations ? '▼' : '▶'}
          </button>
          
          {showCitations && (
            <div className=\"citations-content\">
              {/* Legal Citations */}
              {citations.length > 0 && (
                <div className=\"citation-group\">
                  <h4 className=\"citation-group-title\">Legal Citations</h4>
                  {citations.map((citation, index) => (
                    <div 
                      key={citation.id}
                      className=\"citation-item\"
                      onClick={() => onCitationClick?.(citation)}
                    >
                      <div className=\"citation-header\">
                        <span className=\"citation-number\">[{index + 1}]</span>
                        <span className=\"citation-title\">{citation.title}</span>
                        <span className=\"citation-type\">{citation.type}</span>
                      </div>
                      <div className=\"citation-details\">
                        <span className=\"citation-text\">{citation.citation}</span>
                        {citation.jurisdiction && (
                          <span className=\"citation-jurisdiction\">({citation.jurisdiction})</span>
                        )}
                        {citation.year && (
                          <span className=\"citation-year\">{citation.year}</span>
                        )}
                      </div>
                      {citation.excerpt && (
                        <div className=\"citation-excerpt\">
                          \"{citation.excerpt}\"
                        </div>
                      )}
                      <div className=\"citation-meta\">
                        <span className=\"relevance-score\">
                          Relevance: {Math.round(citation.relevance * 100)}%
                        </span>
                        {citation.verified && (
                          <span className=\"verified-badge\">✓ Verified</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Case References */}
              {caseReferences.length > 0 && (
                <div className=\"citation-group\">
                  <h4 className=\"citation-group-title\">Case Law</h4>
                  {caseReferences.map((caseRef, index) => (
                    <div key={caseRef.id} className=\"citation-item case-reference\">
                      <div className=\"citation-header\">
                        <span className=\"citation-number\">[C{index + 1}]</span>
                        <span className=\"citation-title\">{caseRef.name}</span>
                        {caseRef.precedential && (
                          <span className=\"precedential-badge\">Precedential</span>
                        )}
                      </div>
                      <div className=\"citation-details\">
                        <span className=\"citation-text\">{caseRef.citation}</span>
                        <span className=\"citation-court\">({caseRef.court}, {caseRef.year})</span>
                      </div>
                      {caseRef.topics.length > 0 && (
                        <div className=\"case-topics\">
                          Topics: {caseRef.topics.join(', ')}
                        </div>
                      )}
                      <div className=\"citation-meta\">
                        <span className=\"relevance-score\">
                          Relevance: {Math.round(caseRef.relevance * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Statute References */}
              {statutes.length > 0 && (
                <div className=\"citation-group\">
                  <h4 className=\"citation-group-title\">Statutes & Regulations</h4>
                  {statutes.map((statute, index) => (
                    <div key={statute.id} className=\"citation-item statute-reference\">
                      <div className=\"citation-header\">
                        <span className=\"citation-number\">[S{index + 1}]</span>
                        <span className=\"citation-title\">{statute.title}</span>
                      </div>
                      <div className=\"citation-details\">
                        <span className=\"citation-text\">{statute.code} § {statute.section}</span>
                        <span className=\"citation-jurisdiction\">({statute.jurisdiction})</span>
                      </div>
                      {statute.text && (
                        <div className=\"statute-text\">
                          {statute.text.length > 200 
                            ? `${statute.text.substring(0, 200)}...` 
                            : statute.text
                          }
                        </div>
                      )}
                      <div className=\"citation-meta\">
                        <span className=\"relevance-score\">
                          Relevance: {Math.round(statute.relevance * 100)}%
                        </span>
                        {statute.effectiveDate && (
                          <span className=\"effective-date\">
                            Effective: {statute.effectiveDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Message status */}
      <div className=\"message-status\">
        {message.status === 'sending' && (
          <span className=\"status-indicator sending\">Sending...</span>
        )}
        {message.status === 'sent' && (
          <span className=\"status-indicator sent\">✓</span>
        )}
        {message.status === 'delivered' && (
          <span className=\"status-indicator delivered\">✓✓</span>
        )}
        {message.status === 'error' && (
          <span className=\"status-indicator error\">⚠ Error</span>
        )}
      </div>

      {/* Confidentiality marker */}
      {confidentialityLevel !== 'public' && (
        <div className=\"confidentiality-marker\">
          <span className=\"confidentiality-icon\">🔒</span>
          <span className=\"confidentiality-text\">
            {confidentialityLevel === 'attorney-client' && 'Privileged'}
            {confidentialityLevel === 'work-product' && 'Work Product'}
            {confidentialityLevel === 'confidential' && 'Confidential'}
          </span>
        </div>
      )}
    </div>
  );
};

export default LegalMessageBubble;