import React, { useState } from 'react';
import './SettingsPanel.css';
import { ModelConfiguration } from '../../types/settings';
import { useModelSettings } from '../../contexts/SettingsContext';
import FormField from './FormField';

const ModelSettingsPanel: React.FC = () => {
  const { models, updateModels } = useModelSettings();
  const [editingModel, setEditingModel] = useState<ModelConfiguration | null>(null);
  const [showModelForm, setShowModelForm] = useState(false);

  const defaultModels = [
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  const imageModels = [
    { value: 'dall-e-3', label: 'DALL-E 3' },
    { value: 'dall-e-2', label: 'DALL-E 2' },
    { value: 'stable-diffusion', label: 'Stable Diffusion' },
    { value: 'midjourney', label: 'Midjourney' },
  ];

  const createNewModel = () => {
    const newModel: ModelConfiguration = {
      id: `custom-${Date.now()}`,
      name: 'New Custom Model',
      provider: 'custom',
      endpoint: '',
      apiKey: '',
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
      },
      enabled: true,
      custom: true,
    };
    setEditingModel(newModel);
    setShowModelForm(true);
  };

  const saveModel = () => {
    if (!editingModel) return;
    
    const updatedConfigurations = {
      ...models.modelConfigurations,
      [editingModel.id]: editingModel,
    };

    updateModels({ modelConfigurations: updatedConfigurations });
    setEditingModel(null);
    setShowModelForm(false);
  };

  const deleteModel = (modelId: string) => {
    if (window.window.confirm('Are you sure you want to delete this model configuration?')) {
      const updatedConfigurations = { ...models.modelConfigurations };
      delete updatedConfigurations[modelId];
      updateModels({ modelConfigurations: updatedConfigurations });
    }
  };

  const duplicateModel = (modelId: string) => {
    const originalModel = models.modelConfigurations[modelId];
    if (originalModel) {
      const duplicatedModel: ModelConfiguration = {
        ...originalModel,
        id: `${originalModel.id}-copy-${Date.now()}`,
        name: `${originalModel.name} (Copy)`,
        custom: true,
      };
      setEditingModel(duplicatedModel);
      setShowModelForm(true);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>AI Model Settings</h3>
        <p>Configure AI models, parameters, and usage preferences</p>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <h4>Default Model Selection</h4>
          
          <FormField
            label="Default Model"
            type="select"
            value={models.defaultModel}
            onChange={(value) => updateModels({ defaultModel: value })}
            options={defaultModels}
            description="Default model for new conversations"
          />
        </div>

        <div className="form-group">
          <h4>Chat Settings</h4>
          
          <FormField
            label="Temperature"
            type="slider"
            value={models.chatSettings.temperature}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, temperature: Number(value) }
            })}
            min={0}
            max={2}
            step={0.1}
            description="Controls randomness in responses (0 = deterministic, 2 = very creative)"
          />

          <FormField
            label="Max Tokens"
            type="number"
            value={models.chatSettings.maxTokens}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, maxTokens: Number(value) }
            })}
            min={1}
            max={32768}
            description="Maximum number of tokens in response"
          />

          <FormField
            label="Top P"
            type="slider"
            value={models.chatSettings.topP}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, topP: Number(value) }
            })}
            min={0}
            max={1}
            step={0.05}
            description="Nucleus sampling parameter"
          />

          <FormField
            label="Top K"
            type="number"
            value={models.chatSettings.topK}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, topK: Number(value) }
            })}
            min={1}
            max={100}
            description="Limits vocabulary to top K tokens"
          />

          <FormField
            label="Frequency Penalty"
            type="slider"
            value={models.chatSettings.frequencyPenalty}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, frequencyPenalty: Number(value) }
            })}
            min={-2}
            max={2}
            step={0.1}
            description="Penalizes frequently used tokens"
          />

          <FormField
            label="Presence Penalty"
            type="slider"
            value={models.chatSettings.presencePenalty}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, presencePenalty: Number(value) }
            })}
            min={-2}
            max={2}
            step={0.1}
            description="Penalizes tokens that have appeared in the text"
          />

          <FormField
            label="Enable Streaming"
            type="switch"
            value={models.chatSettings.streamingEnabled}
            onChange={(value) => updateModels({
              chatSettings: { ...models.chatSettings, streamingEnabled: value }
            })}
            description="Stream responses as they are generated"
          />

          <FormField
            label="Stop Sequences"
            type="textarea"
            value={models.chatSettings.stopSequences.join('\n')}
            onChange={(value) => updateModels({
              chatSettings: { 
                ...models.chatSettings, 
                stopSequences: value.split('\n').filter(s => s.trim())
              }
            })}
            placeholder="Enter stop sequences (one per line)"
            description="Sequences that will stop text generation"
          />
        </div>

        <div className="form-group">
          <h4>Code Generation Settings</h4>
          
          <FormField
            label="Code Model"
            type="select"
            value={models.codeSettings.model}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, model: value }
            })}
            options={defaultModels}
            description="Model specifically for code generation tasks"
          />

          <FormField
            label="Code Temperature"
            type="slider"
            value={models.codeSettings.temperature}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, temperature: Number(value) }
            })}
            min={0}
            max={1}
            step={0.1}
            description="Lower values for more deterministic code"
          />

          <FormField
            label="Code Max Tokens"
            type="number"
            value={models.codeSettings.maxTokens}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, maxTokens: Number(value) }
            })}
            min={1}
            max={32768}
            description="Maximum tokens for code generation"
          />

          <FormField
            label="Context Window"
            type="number"
            value={models.codeSettings.contextWindow}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, contextWindow: Number(value) }
            })}
            min={1024}
            max={128000}
            description="Context window size for code understanding"
          />

          <FormField
            label="Enable Code Completion"
            type="switch"
            value={models.codeSettings.enableCodeCompletion}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, enableCodeCompletion: value }
            })}
            description="Auto-complete code as you type"
          />

          <FormField
            label="Enable Refactoring"
            type="switch"
            value={models.codeSettings.enableRefactoring}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, enableRefactoring: value }
            })}
            description="Suggest code improvements and refactoring"
          />

          <FormField
            label="Enable Documentation Generation"
            type="switch"
            value={models.codeSettings.enableDocGeneration}
            onChange={(value) => updateModels({
              codeSettings: { ...models.codeSettings, enableDocGeneration: value }
            })}
            description="Automatically generate code documentation"
          />
        </div>

        <div className="form-group">
          <h4>Image Generation Settings</h4>
          
          <FormField
            label="Image Model"
            type="select"
            value={models.imageSettings.model}
            onChange={(value) => updateModels({
              imageSettings: { ...models.imageSettings, model: value }
            })}
            options={imageModels}
            description="Model for image generation tasks"
          />

          <FormField
            label="Image Quality"
            type="select"
            value={models.imageSettings.quality}
            onChange={(value) => updateModels({
              imageSettings: { ...models.imageSettings, quality: value as any }
            })}
            options={[
              { value: 'low', label: 'Low (Fast)' },
              { value: 'medium', label: 'Medium (Balanced)' },
              { value: 'high', label: 'High (Slow)' },
            ]}
            description="Image generation quality vs speed tradeoff"
          />

          <FormField
            label="Image Size"
            type="select"
            value={models.imageSettings.size}
            onChange={(value) => updateModels({
              imageSettings: { ...models.imageSettings, size: value }
            })}
            options={[
              { value: '256x256', label: '256×256' },
              { value: '512x512', label: '512×512' },
              { value: '1024x1024', label: '1024×1024' },
              { value: '1152x896', label: '1152×896' },
              { value: '1216x832', label: '1216×832' },
            ]}
            description="Generated image dimensions"
          />

          <FormField
            label="Image Style"
            type="select"
            value={models.imageSettings.style}
            onChange={(value) => updateModels({
              imageSettings: { ...models.imageSettings, style: value }
            })}
            options={[
              { value: 'natural', label: 'Natural' },
              { value: 'vivid', label: 'Vivid' },
              { value: 'artistic', label: 'Artistic' },
              { value: 'photographic', label: 'Photographic' },
            ]}
            description="Style preference for generated images"
          />
        </div>

        <div className="form-group">
          <h4>Custom Model Configurations</h4>
          <p>Add and manage custom AI model configurations</p>
          
          <div className="model-configurations-list">
            {Object.values(models.modelConfigurations).map((modelConfig) => (
              <div key={modelConfig.id} className="model-config-item">
                <div className="model-info">
                  <h5>{modelConfig.name}</h5>
                  <p>
                    Provider: {modelConfig.provider} | 
                    Temperature: {modelConfig.parameters.temperature} | 
                    Max Tokens: {modelConfig.parameters.maxTokens}
                  </p>
                  <span className={`status-badge ${modelConfig.enabled ? 'enabled' : 'disabled'}`}>
                    {modelConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="model-actions">
                  <button
                    className="action-button"
                    onClick={() => {
                      setEditingModel(modelConfig);
                      setShowModelForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="action-button"
                    onClick={() => duplicateModel(modelConfig.id)}
                  >
                    Duplicate
                  </button>
                  {modelConfig.custom && (
                    <button
                      className="action-button danger"
                      onClick={() => deleteModel(modelConfig.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="create-model-button" onClick={createNewModel}>
            Add Custom Model
          </button>
        </div>

        {showModelForm && editingModel && (
          <div className="model-editor">
            <h4>Editing: {editingModel.name}</h4>
            
            <FormField
              label="Model Name"
              type="text"
              value={editingModel.name}
              onChange={(value) => setEditingModel({ ...editingModel, name: value })}
              description="Display name for this model"
            />

            <FormField
              label="Provider"
              type="text"
              value={editingModel.provider}
              onChange={(value) => setEditingModel({ ...editingModel, provider: value })}
              description="Model provider (e.g., openai, anthropic, custom)"
            />

            <FormField
              label="API Endpoint"
              type="text"
              value={editingModel.endpoint || ''}
              onChange={(value) => setEditingModel({ ...editingModel, endpoint: value })}
              placeholder="https://api.provider.com/v1"
              description="API endpoint URL (optional for standard providers)"
            />

            <FormField
              label="API Key"
              type="text"
              value={editingModel.apiKey || ''}
              onChange={(value) => setEditingModel({ ...editingModel, apiKey: value })}
              placeholder="Enter API key"
              description="API key for authentication (stored locally)"
            />

            <div className="model-parameters">
              <h5>Model Parameters</h5>
              
              <FormField
                label="Temperature"
                type="slider"
                value={editingModel.parameters.temperature}
                onChange={(value) => setEditingModel({
                  ...editingModel,
                  parameters: { ...editingModel.parameters, temperature: Number(value) }
                })}
                min={0}
                max={2}
                step={0.1}
                description="Default temperature for this model"
              />

              <FormField
                label="Max Tokens"
                type="number"
                value={editingModel.parameters.maxTokens}
                onChange={(value) => setEditingModel({
                  ...editingModel,
                  parameters: { ...editingModel.parameters, maxTokens: Number(value) }
                })}
                min={1}
                max={32768}
                description="Default max tokens for this model"
              />

              <FormField
                label="Top P"
                type="slider"
                value={editingModel.parameters.topP}
                onChange={(value) => setEditingModel({
                  ...editingModel,
                  parameters: { ...editingModel.parameters, topP: Number(value) }
                })}
                min={0}
                max={1}
                step={0.05}
                description="Default top-p for this model"
              />
            </div>

            <FormField
              label="Enable Model"
              type="switch"
              value={editingModel.enabled}
              onChange={(value) => setEditingModel({ ...editingModel, enabled: value })}
              description="Enable this model for use"
            />

            <div className="model-editor-actions">
              <button className="save-button" onClick={saveModel}>
                Save Model
              </button>
              <button 
                className="cancel-button" 
                onClick={() => {
                  setEditingModel(null);
                  setShowModelForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="settings-info">
          <h4>Model Settings Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Default Model:</label>
              <span>{models.defaultModel}</span>
            </div>
            <div className="info-item">
              <label>Custom Models:</label>
              <span>{Object.keys(models.modelConfigurations).length}</span>
            </div>
            <div className="info-item">
              <label>Streaming Enabled:</label>
              <span>{models.chatSettings.streamingEnabled ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSettingsPanel;