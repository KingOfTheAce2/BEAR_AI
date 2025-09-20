import React, { useState } from 'react';
import './LegalContextPanel.css';
import { LegalContext, LegalEvent, LegalParty, PracticeArea, Jurisdiction } from '../../types/legal';

interface LegalContextPanelProps {
  context: LegalContext;
  onUpdateContext: (updates: Partial<LegalContext>) => void;
  isCollapsed?: boolean;
  className?: string;
}

export const LegalContextPanel: React.FC<LegalContextPanelProps> = ({
  context,
  onUpdateContext,
  isCollapsed = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'parties' | 'documents'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editingContext, setEditingContext] = useState<LegalContext>(context);

  // Handle save changes
  const handleSave = () => {
    onUpdateContext(editingContext);
    setIsEditing(false);
  };

  // Handle cancel changes
  const handleCancel = () => {
    setEditingContext(context);
    setIsEditing(false);
  };

  // Add new timeline event
  const addTimelineEvent = () => {
    const newEvent: LegalEvent = {
      date: new Date(),
      event: 'New Event',
      significance: 'medium',
      documents: [],
      responsible: '',
      status: 'pending'
    };

    setEditingContext({
      ...editingContext,
      timeline: [...editingContext.timeline, newEvent]
    });
  };

  // Add new party
  const addParty = () => {
    const newParty: LegalParty = {
      name: 'New Party',
      type: 'third-party',
      role: '',
      counsel: '',
      status: 'active'
    };

    setEditingContext({
      ...editingContext,
      parties: [...editingContext.parties, newParty]
    });
  };

  // Remove timeline event
  const removeTimelineEvent = (index: number) => {
    const updatedTimeline = editingContext.timeline.filter((_, i) => i !== index);
    setEditingContext({
      ...editingContext,
      timeline: updatedTimeline
    });
  };

  // Remove party
  const removeParty = (index: number) => {
    const updatedParties = editingContext.parties.filter((_, i) => i !== index);
    setEditingContext({
      ...editingContext,
      parties: updatedParties
    });
  };

  // Update timeline event
  const updateTimelineEvent = (index: number, updates: Partial<LegalEvent>) => {
    const updatedTimeline = editingContext.timeline.map((event, i) =>
      i === index ? { ...event, ...updates } : event
    );
    setEditingContext({
      ...editingContext,
      timeline: updatedTimeline
    });
  };

  // Update party
  const updateParty = (index: number, updates: Partial<LegalParty>) => {
    const updatedParties = editingContext.parties.map((party, i) =>
      i === index ? { ...party, ...updates } : party
    );
    setEditingContext({
      ...editingContext,
      parties: updatedParties
    });
  };

  // Get significance color
  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'critical': return '#e53e3e';
      case 'high': return '#d69e2e';
      case 'medium': return '#3182ce';
      case 'low': return '#38a169';
      default: return '#718096';
    }
  };

  // Get party type color
  const getPartyTypeColor = (type: string) => {
    switch (type) {
      case 'client': return '#38a169';
      case 'opposing': return '#e53e3e';
      case 'plaintiff': return '#3182ce';
      case 'defendant': return '#d69e2e';
      default: return '#718096';
    }
  };

  if (isCollapsed) {
    return (
      <div className={`legal-context-panel collapsed ${className}`}>
        <div className="collapsed-indicator">
          <span className="context-icon">📋</span>
          <span className="matter-name">{context.matter}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`legal-context-panel ${className}`}>
      {/* Header */}
      <div className="context-panel-header">
        <div className="header-title">
          <h3>Legal Context</h3>
          <span className="practice-area-badge">{context.practiceArea}</span>
        </div>

        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="save-btn" onClick={handleSave}>
                ✓ Save
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                ✕ Cancel
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📅 Timeline
        </button>
        <button
          className={`tab-button ${activeTab === 'parties' ? 'active' : ''}`}
          onClick={() => setActiveTab('parties')}
        >
          👥 Parties
        </button>
        <button
          className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📄 Documents
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="field-group">
              <label className="field-label">Matter</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={editingContext.matter}
                  onChange={(e) => setEditingContext({
                    ...editingContext,
                    matter: e.target.value
                  })}
                />
              ) : (
                <div className="field-value">{context.matter}</div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">Practice Area</label>
              {isEditing ? (
                <select
                  className="field-select"
                  value={editingContext.practiceArea}
                  onChange={(e) => setEditingContext({
                    ...editingContext,
                    practiceArea: e.target.value as PracticeArea
                  })}
                >
                  <option value="corporate">Corporate</option>
                  <option value="litigation">Litigation</option>
                  <option value="criminal">Criminal</option>
                  <option value="family">Family</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="intellectual-property">IP</option>
                  <option value="employment">Employment</option>
                  <option value="general">General</option>
                </select>
              ) : (
                <div className="field-value practice-area">{context.practiceArea}</div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">Jurisdiction</label>
              {isEditing ? (
                <select
                  className="field-select"
                  value={editingContext.jurisdiction}
                  onChange={(e) => setEditingContext({
                    ...editingContext,
                    jurisdiction: e.target.value as Jurisdiction
                  })}
                >
                  <option value="federal">Federal</option>
                  <option value="state">State</option>
                  <option value="california">California</option>
                  <option value="new-york">New York</option>
                  <option value="texas">Texas</option>
                  {/* Add more states as needed */}
                </select>
              ) : (
                <div className="field-value jurisdiction">{context.jurisdiction}</div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">Key Issues</label>
              {isEditing ? (
                <textarea
                  className="field-textarea"
                  value={editingContext.keyIssues.join('\n')}
                  onChange={(e) => setEditingContext({
                    ...editingContext,
                    keyIssues: e.target.value.split('\n').filter(issue => issue.trim())
                  })}
                  placeholder="Enter key issues, one per line"
                />
              ) : (
                <div className="field-value">
                  {context.keyIssues.length > 0 ? (
                    <ul className="issues-list">
                      {context.keyIssues.map((issue, index) => (
                        <li key={index} className="issue-item">{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="no-data">No key issues defined</span>
                  )}
                </div>
              )}
            </div>

            {context.ethicalConsiderations && context.ethicalConsiderations.length > 0 && (
              <div className="field-group">
                <label className="field-label">Ethical Considerations</label>
                <div className="ethical-considerations">
                  {context.ethicalConsiderations.map((consideration, index) => (
                    <div key={index} className="ethical-item">
                      ⚠️ {consideration}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="timeline-content">
            <div className="timeline-header">
              <h4>Case Timeline</h4>
              {isEditing && (
                <button className="add-event-btn" onClick={addTimelineEvent}>
                  + Add Event
                </button>
              )}
            </div>

            <div className="timeline-list">
              {editingContext.timeline.length > 0 ? (
                editingContext.timeline
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div
                        className="timeline-marker"
                        style={{ backgroundColor: getSignificanceColor(event.significance) }}
                      />

                      <div className="timeline-content-item">
                        <div className="timeline-header-item">
                          {isEditing ? (
                            <input
                              type="text"
                              className="timeline-event-input"
                              value={event.event}
                              onChange={(e) => updateTimelineEvent(index, { event: e.target.value })}
                            />
                          ) : (
                            <span className="timeline-event">{event.event}</span>
                          )}

                          <div className="timeline-actions">
                            {isEditing && (
                              <button
                                className="remove-event-btn"
                                onClick={() => removeTimelineEvent(index)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="timeline-meta">
                          {isEditing ? (
                            <>
                              <input
                                type="date"
                                className="timeline-date-input"
                                value={event.date.toISOString().split('T')[0]}
                                onChange={(e) => updateTimelineEvent(index, {
                                  date: new Date(e.target.value)
                                })}
                              />
                              <select
                                className="timeline-significance-select"
                                value={event.significance}
                                onChange={(e) => updateTimelineEvent(index, {
                                  significance: e.target.value as any
                                })}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </>
                          ) : (
                            <>
                              <span className="timeline-date">
                                {event.date.toLocaleDateString()}
                              </span>
                              <span
                                className="timeline-significance"
                                style={{ color: getSignificanceColor(event.significance) }}
                              >
                                {event.significance}
                              </span>
                              {event.status && (
                                <span className={`timeline-status ${event.status}`}>
                                  {event.status}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {event.deadlines && event.deadlines.length > 0 && (
                          <div className="timeline-deadlines">
                            <strong>Deadlines:</strong>
                            {event.deadlines.map((deadline, idx) => (
                              <span key={idx} className="deadline-item">
                                {deadline.toLocaleDateString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-timeline">
                  <span className="no-data-icon">📅</span>
                  <p>No timeline events</p>
                  {isEditing && (
                    <button className="add-first-event-btn" onClick={addTimelineEvent}>
                      Add First Event
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parties Tab */}
        {activeTab === 'parties' && (
          <div className="parties-content">
            <div className="parties-header">
              <h4>Parties Involved</h4>
              {isEditing && (
                <button className="add-party-btn" onClick={addParty}>
                  + Add Party
                </button>
              )}
            </div>

            <div className="parties-list">
              {editingContext.parties.length > 0 ? (
                editingContext.parties.map((party, index) => (
                  <div key={index} className="party-item">
                    <div className="party-header">
                      <div
                        className="party-type-indicator"
                        style={{ backgroundColor: getPartyTypeColor(party.type) }}
                      />

                      {isEditing ? (
                        <input
                          type="text"
                          className="party-name-input"
                          value={party.name}
                          onChange={(e) => updateParty(index, { name: e.target.value })}
                        />
                      ) : (
                        <span className="party-name">{party.name}</span>
                      )}

                      {isEditing && (
                        <button
                          className="remove-party-btn"
                          onClick={() => removeParty(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="party-details">
                      {isEditing ? (
                        <>
                          <select
                            className="party-type-select"
                            value={party.type}
                            onChange={(e) => updateParty(index, { type: e.target.value as any })}
                          >
                            <option value="client">Client</option>
                            <option value="opposing">Opposing</option>
                            <option value="plaintiff">Plaintiff</option>
                            <option value="defendant">Defendant</option>
                            <option value="third-party">Third Party</option>
                            <option value="witness">Witness</option>
                            <option value="expert">Expert</option>
                          </select>
                          <input
                            type="text"
                            className="party-role-input"
                            placeholder="Role"
                            value={party.role || ''}
                            onChange={(e) => updateParty(index, { role: e.target.value })}
                          />
                          <input
                            type="text"
                            className="party-counsel-input"
                            placeholder="Counsel"
                            value={party.counsel || ''}
                            onChange={(e) => updateParty(index, { counsel: e.target.value })}
                          />
                        </>
                      ) : (
                        <>
                          <span className="party-type">{party.type}</span>
                          {party.role && <span className="party-role">{party.role}</span>}
                          {party.counsel && <span className="party-counsel">{party.counsel}</span>}
                          {party.status && (
                            <span className={`party-status ${party.status}`}>
                              {party.status}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-parties">
                  <span className="no-data-icon">👥</span>
                  <p>No parties defined</p>
                  {isEditing && (
                    <button className="add-first-party-btn" onClick={addParty}>
                      Add First Party
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="documents-content">
            <div className="documents-header">
              <h4>Relevant Documents</h4>
            </div>

            <div className="documents-list">
              {context.relevantDocuments.length > 0 ? (
                context.relevantDocuments.map((docId, index) => (
                  <div key={index} className="document-item">
                    <span className="document-icon">📄</span>
                    <span className="document-name">{docId}</span>
                    <button className="view-document-btn">View</button>
                  </div>
                ))
              ) : (
                <div className="no-documents">
                  <span className="no-data-icon">📄</span>
                  <p>No documents linked</p>
                  <button className="link-documents-btn">Link Documents</button>
                </div>
              )}
            </div>

            {/* Precedent Cases */}
            {context.precedentCases.length > 0 && (
              <div className="precedent-section">
                <h5>Precedent Cases</h5>
                <div className="precedent-list">
                  {context.precedentCases.map((caseId, index) => (
                    <div key={index} className="precedent-item">
                      <span className="precedent-icon">⚖️</span>
                      <span className="precedent-name">{caseId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applicable Statutes */}
            {context.applicableStatutes.length > 0 && (
              <div className="statutes-section">
                <h5>Applicable Statutes</h5>
                <div className="statutes-list">
                  {context.applicableStatutes.map((statuteId, index) => (
                    <div key={index} className="statute-item">
                      <span className="statute-icon">📜</span>
                      <span className="statute-name">{statuteId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalContextPanel;