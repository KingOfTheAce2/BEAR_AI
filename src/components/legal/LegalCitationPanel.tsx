import React, { useState, useMemo } from 'react';
import { LegalCitation, CaseReference, StatuteReference } from '../../types/legal';
import './LegalCitationPanel.css';

interface LegalCitationPanelProps {
  citations: LegalCitation[];
  cases: CaseReference[];
  statutes: StatuteReference[];
  onCitationClick?: (citation: LegalCitation) => void;
  isCollapsed?: boolean;
  className?: string;
}

interface CitationGroup {
  type: 'citation' | 'case' | 'statute';
  title: string;
  icon: string;
  items: (LegalCitation | CaseReference | StatuteReference)[];
  color: string;
}

export const LegalCitationPanel: React.FC<LegalCitationPanelProps> = ({
  citations,
  cases,
  statutes,
  onCitationClick,
  isCollapsed = false,
  className = ''
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'type'>('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Group citations by type
  const citationGroups = useMemo((): CitationGroup[] => {
    const groups: CitationGroup[] = [];

    if (citations.length > 0) {
      groups.push({
        type: 'citation',
        title: 'Legal Citations',
        icon: '📚',
        items: citations,
        color: '#3182ce'
      });
    }

    if (cases.length > 0) {
      groups.push({
        type: 'case',
        title: 'Case Law',
        icon: '⚖️',
        items: cases,
        color: '#38a169'
      });
    }

    if (statutes.length > 0) {
      groups.push({
        type: 'statute',
        title: 'Statutes & Regulations',
        icon: '📜',
        items: statutes,
        color: '#d69e2e'
      });
    }

    return groups;
  }, [citations, cases, statutes]);

  // Filter and sort citations
  const filteredAndSortedGroups = useMemo(() => {
    return citationGroups.map(group => {
      let filteredItems = group.items;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredItems = group.items.filter(item => {
          if (group.type === 'citation') {
            const citation = item as LegalCitation;
            return citation.title.toLowerCase().includes(query) ||
                   citation.citation.toLowerCase().includes(query) ||
                   citation.excerpt?.toLowerCase().includes(query);
          } else if (group.type === 'case') {
            const caseRef = item as CaseReference;
            return caseRef.name.toLowerCase().includes(query) ||
                   caseRef.citation.toLowerCase().includes(query) ||
                   caseRef.topics.some(topic => topic.toLowerCase().includes(query));
          } else if (group.type === 'statute') {
            const statute = item as StatuteReference;
            return statute.title.toLowerCase().includes(query) ||
                   statute.code.toLowerCase().includes(query) ||
                   statute.section.toLowerCase().includes(query) ||
                   statute.text?.toLowerCase().includes(query);
          }
          return false;
        });
      }

      // Apply group filter
      if (selectedGroup !== 'all' && selectedGroup !== group.type) {
        filteredItems = [];
      }

      // Sort items
      filteredItems.sort((a, b) => {
        switch (sortBy) {
          case 'relevance':
            return b.relevance - a.relevance;
          case 'date':
            if (group.type === 'citation') {
              const citationA = a as LegalCitation;
              const citationB = b as LegalCitation;
              return (citationB.year || 0) - (citationA.year || 0);
            } else if (group.type === 'case') {
              const caseA = a as CaseReference;
              const caseB = b as CaseReference;
              return caseB.year - caseA.year;
            }
            return 0;
          case 'type':
            if (group.type === 'citation') {
              const citationA = a as LegalCitation;
              const citationB = b as LegalCitation;
              return citationA.type.localeCompare(citationB.type);
            }
            return 0;
          default:
            return 0;
        }
      });

      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);
  }, [citationGroups, searchQuery, selectedGroup, sortBy]);

  // Calculate total citations
  const totalCitations = citationGroups.reduce((sum, group) => sum + group.items.length, 0);

  // Handle citation click
  const handleItemClick = (item: LegalCitation | CaseReference | StatuteReference, type: string) => {
    if (type === 'citation' && onCitationClick) {
      onCitationClick(item as LegalCitation);
    }
    // Could handle other types differently
  };

  // Format citation for display
  const formatCitation = (citation: LegalCitation) => {
    let formatted = citation.citation;
    if (citation.pinpoint) {
      formatted += `, at ${citation.pinpoint}`;
    }
    return formatted;
  };

  // Get jurisdiction badge color
  const getJurisdictionColor = (jurisdiction: string) => {
    switch (jurisdiction.toLowerCase()) {
      case 'federal':
        return '#3182ce';
      case 'state':
        return '#38a169';
      default:
        return '#d69e2e';
    }
  };

  if (isCollapsed) {
    return (
      <div className={`legal-citation-panel collapsed ${className}`}>
        <div className=\"collapsed-indicator\">
          <span className=\"citation-count\">{totalCitations}</span>
          <span className=\"citation-icon\">📚</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`legal-citation-panel ${className}`}>
      {/* Header */}
      <div className=\"citation-panel-header\">
        <div className=\"header-title\">
          <h3>Sources & Citations</h3>
          <span className=\"citation-count-badge\">{totalCitations}</span>
        </div>
        
        <button
          className=\"filters-toggle\"
          onClick={() => setShowFilters(!showFilters)}
          title=\"Toggle filters\"
        >
          🔍
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className=\"citation-filters\">
          <div className=\"search-input-wrapper\">
            <input
              type=\"text\"
              className=\"citation-search\"
              placeholder=\"Search citations...\"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className=\"filter-controls\">
            <select
              className=\"group-filter\"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value=\"all\">All Sources</option>
              <option value=\"citation\">Legal Citations</option>
              <option value=\"case\">Case Law</option>
              <option value=\"statute\">Statutes</option>
            </select>
            
            <select
              className=\"sort-filter\"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'type')}
            >
              <option value=\"relevance\">By Relevance</option>
              <option value=\"date\">By Date</option>
              <option value=\"type\">By Type</option>
            </select>
          </div>
        </div>
      )}

      {/* Citation Groups */}
      <div className=\"citation-groups\">
        {filteredAndSortedGroups.length === 0 ? (
          <div className=\"no-citations\">
            {totalCitations === 0 ? (
              <>
                <span className=\"no-citations-icon\">📚</span>
                <p>No citations available</p>
                <span className=\"no-citations-subtitle\">Citations will appear here as they are referenced</span>
              </>
            ) : (
              <>
                <span className=\"no-citations-icon\">🔍</span>
                <p>No matches found</p>
                <span className=\"no-citations-subtitle\">Try adjusting your search or filters</span>
              </>
            )}
          </div>
        ) : (
          filteredAndSortedGroups.map((group) => (
            <div key={group.type} className=\"citation-group\">
              <div className=\"group-header\" style={{ borderLeftColor: group.color }}>
                <span className=\"group-icon\">{group.icon}</span>
                <span className=\"group-title\">{group.title}</span>
                <span className=\"group-count\">({group.items.length})</span>
              </div>
              
              <div className=\"group-items\">
                {group.items.map((item, index) => (
                  <div
                    key={`${group.type}-${index}`}
                    className={`citation-item ${group.type}`}
                    onClick={() => handleItemClick(item, group.type)}
                  >
                    {group.type === 'citation' && (
                      <div className=\"citation-content\">
                        <div className=\"citation-header\">
                          <span className=\"citation-title\">{(item as LegalCitation).title}</span>
                          <span className=\"citation-type-badge\">{(item as LegalCitation).type}</span>
                        </div>
                        <div className=\"citation-text\">{formatCitation(item as LegalCitation)}</div>
                        <div className=\"citation-meta\">
                          <span
                            className=\"jurisdiction-badge\"
                            style={{ backgroundColor: getJurisdictionColor((item as LegalCitation).jurisdiction) }}
                          >
                            {(item as LegalCitation).jurisdiction}
                          </span>
                          <span className=\"relevance-score\">
                            {Math.round((item as LegalCitation).relevance * 100)}% relevant
                          </span>
                          {(item as LegalCitation).verified && (
                            <span className=\"verified-badge\">✓ Verified</span>
                          )}
                        </div>
                        {(item as LegalCitation).excerpt && (
                          <div className=\"citation-excerpt\">
                            \"{(item as LegalCitation).excerpt}\"
                          </div>
                        )}
                      </div>
                    )}

                    {group.type === 'case' && (
                      <div className=\"case-content\">
                        <div className=\"case-header\">
                          <span className=\"case-name\">{(item as CaseReference).name}</span>
                          {(item as CaseReference).precedential && (
                            <span className=\"precedential-badge\">Precedential</span>
                          )}
                        </div>
                        <div className=\"case-citation\">{(item as CaseReference).citation}</div>
                        <div className=\"case-details\">
                          <span className=\"case-court\">{(item as CaseReference).court}</span>
                          <span className=\"case-year\">({(item as CaseReference).year})</span>
                        </div>
                        {(item as CaseReference).topics.length > 0 && (
                          <div className=\"case-topics\">
                            {(item as CaseReference).topics.slice(0, 3).map((topic, idx) => (
                              <span key={idx} className=\"topic-tag\">{topic}</span>
                            ))}
                            {(item as CaseReference).topics.length > 3 && (
                              <span className=\"topic-more\">+{(item as CaseReference).topics.length - 3} more</span>
                            )}
                          </div>
                        )}
                        <div className=\"case-meta\">
                          <span
                            className=\"jurisdiction-badge\"
                            style={{ backgroundColor: getJurisdictionColor((item as CaseReference).jurisdiction) }}
                          >
                            {(item as CaseReference).jurisdiction}
                          </span>
                          <span className=\"relevance-score\">
                            {Math.round((item as CaseReference).relevance * 100)}% relevant
                          </span>
                        </div>
                      </div>
                    )}

                    {group.type === 'statute' && (
                      <div className=\"statute-content\">
                        <div className=\"statute-header\">
                          <span className=\"statute-title\">{(item as StatuteReference).title}</span>
                        </div>
                        <div className=\"statute-citation\">
                          {(item as StatuteReference).code} § {(item as StatuteReference).section}
                          {(item as StatuteReference).subsection && `.${(item as StatuteReference).subsection}`}
                        </div>
                        {(item as StatuteReference).text && (
                          <div className=\"statute-text\">
                            {(item as StatuteReference).text!.length > 150
                              ? `${(item as StatuteReference).text!.substring(0, 150)}...`
                              : (item as StatuteReference).text
                            }
                          </div>
                        )}
                        <div className=\"statute-meta\">
                          <span
                            className=\"jurisdiction-badge\"
                            style={{ backgroundColor: getJurisdictionColor((item as StatuteReference).jurisdiction) }}
                          >
                            {(item as StatuteReference).jurisdiction}
                          </span>
                          <span className=\"relevance-score\">
                            {Math.round((item as StatuteReference).relevance * 100)}% relevant
                          </span>
                          {(item as StatuteReference).effectiveDate && (
                            <span className=\"effective-date\">
                              Effective: {(item as StatuteReference).effectiveDate!.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {totalCitations > 0 && (
        <div className=\"citation-panel-footer\">
          <button className=\"export-citations-btn\" title=\"Export citations\">
            📄 Export
          </button>
          <button className=\"print-citations-btn\" title=\"Print citations\">
            🖨️ Print
          </button>
        </div>
      )}
    </div>
  );
};

export default LegalCitationPanel;