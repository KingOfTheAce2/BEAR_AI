/**
 * BEAR AI Plugin Developer Tools
 * Development environment for creating and debugging plugins
 */

import { EventEmitter } from 'events';
import { PluginManifest, PluginPackage, PluginDevelopmentConfig, PluginInstance, ValidationResult } from '../core/types';
import { PluginManager } from '../core/PluginManager';

export class PluginDeveloper extends EventEmitter {
  private manager: PluginManager;
  private devProjects: Map<string, DevProject> = new Map();
  private activeProject: string | null = null;
  private debugSessions: Map<string, DebugSession> = new Map();
  private hotReloadEnabled: boolean = true;
  private initialized: boolean = false;

  constructor(manager: PluginManager) {
    super();
    this.manager = manager;
    this.setupManagerListeners();
  }

  /**
   * Initialize developer tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load development projects
      await this.loadDevProjects();
      
      // Setup hot reload if enabled
      if (this.hotReloadEnabled) {
        this.setupHotReload();
      }
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Create a new plugin project
   */
  async createProject(config: ProjectConfig): Promise<string> {
    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const manifest: PluginManifest = {
        id: config.id,
        name: config.name,
        version: config.version || '1.0.0',
        author: config.author,
        description: config.description,
        category: config.category,
        tags: config.tags || [],
        permissions: config.permissions || [],
        minBearVersion: '1.0.0',
        entry: 'index.js',
        sandboxType: config.sandboxType || 'worker',
        license: config.license || 'MIT'
      };

      const project: DevProject = {
        id: projectId,
        manifest,
        files: new Map(),
        config: {
          hotReload: true,
          debugMode: true,
          mockAPI: false,
          testData: {}
        },
        buildConfig: {
          target: 'es2020',
          minify: false,
          sourceMaps: true,
          typeCheck: true
        },
        createdAt: new Date(),
        lastModified: new Date()
      };

      // Create default files
      await this.generateDefaultFiles(project);
      
      this.devProjects.set(projectId, project);
      await this.saveDevProjects();
      
      this.emit('project:created', { projectId, project });
      return projectId;
    } catch (error) {
      this.emit('error', { type: 'project_create', error });
      throw error;
    }
  }

  /**
   * Open a project for development
   */
  async openProject(projectId: string): Promise<void> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      this.activeProject = projectId;
      
      // Start debug session if debug mode enabled
      if (project.config.debugMode) {
        await this.startDebugSession(projectId);
      }
      
      this.emit('project:opened', { projectId, project });
    } catch (error) {
      this.emit('error', { type: 'project_open', projectId, error });
      throw error;
    }
  }

  /**
   * Save project file
   */
  async saveFile(projectId: string, filename: string, content: string): Promise<void> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      project.files.set(filename, content);
      project.lastModified = new Date();
      
      await this.saveDevProjects();
      
      // Trigger hot reload if enabled and project is active
      if (this.hotReloadEnabled && this.activeProject === projectId) {
        await this.triggerHotReload(projectId, filename);
      }
      
      this.emit('file:saved', { projectId, filename, content });
    } catch (error) {
      this.emit('error', { type: 'file_save', projectId, filename, error });
      throw error;
    }
  }

  /**
   * Build project
   */
  async buildProject(projectId: string): Promise<BuildResult> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      const buildResult: BuildResult = {
        success: false,
        errors: [],
        warnings: [],
        assets: new Map(),
        buildTime: 0
      };

      const startTime = Date.now();
      
      // Validate manifest
      const manifestValidation = await this.validateManifest(project.manifest);
      if (!manifestValidation.valid) {
        buildResult.errors.push(...manifestValidation.errors);
        return buildResult;
      }

      // Type check if enabled
      if (project.buildConfig.typeCheck) {
        const typeErrors = await this.typeCheckProject(project);
        buildResult.errors.push(...typeErrors);
      }

      // Process files
      for (const [filename, content] of project.files.entries()) {
        try {
          const processed = await this.processFile(filename, content, project.buildConfig);
          buildResult.assets.set(filename, processed);
        } catch (error) {
          buildResult.errors.push(`Error processing ${filename}: ${error.message}`);
        }
      }

      buildResult.success = buildResult.errors.length === 0;
      buildResult.buildTime = Date.now() - startTime;
      
      // Create plugin package if build successful
      if (buildResult.success) {
        const pluginPackage = await this.createPluginPackage(project, buildResult.assets);
        buildResult.package = pluginPackage;
      }

      this.emit('project:built', { projectId, result: buildResult });
      return buildResult;
    } catch (error) {
      this.emit('error', { type: 'project_build', projectId, error });
      throw error;
    }
  }

  /**
   * Test project
   */
  async testProject(projectId: string): Promise<TestResult> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      const testResult: TestResult = {
        success: false,
        tests: [],
        coverage: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        duration: 0
      };

      const startTime = Date.now();
      
      // Build project first
      const buildResult = await this.buildProject(projectId);
      if (!buildResult.success) {
        testResult.tests.push({
          name: 'Build',
          status: 'failed',
          error: 'Project build failed'
        });
        return testResult;
      }

      // Run tests
      await this.runProjectTests(project, testResult);
      
      testResult.duration = Date.now() - startTime;
      testResult.success = testResult.tests.every(test => test.status === 'passed');

      this.emit('project:tested', { projectId, result: testResult });
      return testResult;
    } catch (error) {
      this.emit('error', { type: 'project_test', projectId, error });
      throw error;
    }
  }

  /**
   * Install project as plugin for testing
   */
  async installForTesting(projectId: string): Promise<string> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      // Build project
      const buildResult = await this.buildProject(projectId);
      if (!buildResult.success || !buildResult.package) {
        throw new Error('Build failed');
      }

      // Install as development plugin
      const pluginId = await this.manager.installPlugin(buildResult.package, {
        enableImmediately: true,
        skipValidation: true // Skip validation for development plugins
      });

      this.emit('project:installed', { projectId, pluginId });
      return pluginId;
    } catch (error) {
      this.emit('error', { type: 'project_install', projectId, error });
      throw error;
    }
  }

  /**
   * Start debug session
   */
  async startDebugSession(projectId: string): Promise<string> {
    const project = this.devProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: DebugSession = {
        id: sessionId,
        projectId,
        startedAt: new Date(),
        breakpoints: new Map(),
        logs: [],
        state: 'active'
      };

      this.debugSessions.set(sessionId, session);
      
      // Setup debug hooks
      this.setupDebugHooks(sessionId);
      
      this.emit('debug:session_started', { sessionId, projectId });
      return sessionId;
    } catch (error) {
      this.emit('error', { type: 'debug_start', projectId, error });
      throw error;
    }
  }

  /**
   * Stop debug session
   */
  async stopDebugSession(sessionId: string): Promise<void> {
    const session = this.debugSessions.get(sessionId);
    if (!session) return;

    try {
      session.state = 'stopped';
      session.endedAt = new Date();
      
      // Cleanup debug hooks
      this.cleanupDebugHooks(sessionId);
      
      this.emit('debug:session_stopped', { sessionId });
    } catch (error) {
      this.emit('error', { type: 'debug_stop', sessionId, error });
    }
  }

  /**
   * Set breakpoint
   */
  setBreakpoint(sessionId: string, file: string, line: number): void {
    const session = this.debugSessions.get(sessionId);
    if (!session || session.state !== 'active') return;

    const breakpointId = `${file}:${line}`;
    session.breakpoints.set(breakpointId, {
      id: breakpointId,
      file,
      line,
      enabled: true,
      createdAt: new Date()
    });

    this.emit('debug:breakpoint_set', { sessionId, breakpointId, file, line });
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(sessionId: string, breakpointId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) return;

    session.breakpoints.delete(breakpointId);
    this.emit('debug:breakpoint_removed', { sessionId, breakpointId });
  }

  /**
   * Get debug logs
   */
  getDebugLogs(sessionId: string): DebugLog[] {
    const session = this.debugSessions.get(sessionId);
    return session ? session.logs : [];
  }

  /**
   * Generate plugin template
   */
  generateTemplate(type: PluginTemplateType): ProjectTemplate {
    const templates: Record<PluginTemplateType, ProjectTemplate> = {
      'basic': {
        manifest: {
          id: 'my-plugin',
          name: 'My Plugin',
          version: '1.0.0',
          author: 'Your Name',
          description: 'A basic BEAR AI plugin',
          category: 'utility',
          tags: [],
          permissions: [],
          minBearVersion: '1.0.0',
          entry: 'index.js',
          sandboxType: 'worker',
          license: 'MIT'
        },
        files: new Map([
          ['index.js', this.getBasicPluginTemplate()],
          ['README.md', this.getReadmeTemplate()],
          ['package.json', this.getPackageJsonTemplate()]
        ])
      },
      'ui': {
        manifest: {
          id: 'my-ui-plugin',
          name: 'My UI Plugin',
          version: '1.0.0',
          author: 'Your Name',
          description: 'A UI plugin for BEAR AI',
          category: 'ui',
          tags: ['ui', 'interface'],
          permissions: [{ type: 'ui', scope: 'all', description: 'UI access for interface', required: true }],
          minBearVersion: '1.0.0',
          entry: 'index.js',
          sandboxType: 'iframe',
          license: 'MIT'
        },
        files: new Map([
          ['index.js', this.getUIPluginTemplate()],
          ['styles.css', this.getUIStylesTemplate()],
          ['README.md', this.getReadmeTemplate()]
        ])
      },
      'data': {
        manifest: {
          id: 'my-data-plugin',
          name: 'My Data Plugin',
          version: '1.0.0',
          author: 'Your Name',
          description: 'A data processing plugin for BEAR AI',
          category: 'data',
          tags: ['data', 'processing'],
          permissions: [
            { type: 'storage', scope: 'all', description: 'Data storage access', required: true }
          ],
          minBearVersion: '1.0.0',
          entry: 'index.js',
          sandboxType: 'worker',
          license: 'MIT'
        },
        files: new Map([
          ['index.js', this.getDataPluginTemplate()],
          ['README.md', this.getReadmeTemplate()]
        ])
      }
    };

    return templates[type];
  }

  /**
   * Shutdown developer tools
   */
  async shutdown(): Promise<void> {
    // Stop all debug sessions
    for (const sessionId of this.debugSessions.keys()) {
      await this.stopDebugSession(sessionId);
    }

    // Save projects
    await this.saveDevProjects();
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private async loadDevProjects(): Promise<void> {
    try {
      const stored = localStorage.getItem('bear_dev_projects');
      if (stored) {
        const projects = JSON.parse(stored);
        for (const [id, projectData] of Object.entries(projects)) {
          const project = projectData as DevProject;
          project.files = new Map(project.files as any);
          this.devProjects.set(id, project);
        }
      }
    } catch (error) {
      console.warn('Failed to load dev projects:', error);
    }
  }

  private async saveDevProjects(): Promise<void> {
    try {
      const projects: Record<string, any> = {};
      for (const [id, project] of this.devProjects.entries()) {
        projects[id] = {
          ...project,
          files: Array.from(project.files.entries())
        };
      }
      localStorage.setItem('bear_dev_projects', JSON.stringify(projects));
    } catch (error) {
      this.emit('error', { type: 'save_projects', error });
    }
  }

  private setupManagerListeners(): void {
    this.manager.on('plugin:loaded', (data) => {
      this.emit('plugin:loaded', data);
    });

    this.manager.on('error', (data) => {
      this.emit('manager:error', data);
    });
  }

  private setupHotReload(): void {
    // Implementation would setup file watchers for hot reload
  }

  private async triggerHotReload(projectId: string, filename: string): Promise<void> {
    // Implementation would trigger hot reload for the changed file
    this.emit('hot_reload', { projectId, filename });
  }

  private async generateDefaultFiles(project: DevProject): Promise<void> {
    const template = this.generateTemplate('basic');
    project.files = new Map(template.files);
    
    // Update manifest in index file
    const indexContent = template.files.get('index.js') || '';
    project.files.set('index.js', indexContent.replace('{{PLUGIN_NAME}}', project.manifest.name));
  }

  private async validateManifest(manifest: PluginManifest): Promise<ValidationResult> {
    const errors: string[] = [];
    
    if (!manifest.id || !/^[a-z0-9-_.]+$/.test(manifest.id)) {
      errors.push('Invalid plugin ID');
    }
    
    if (!manifest.name || manifest.name.trim().length === 0) {
      errors.push('Plugin name is required');
    }
    
    if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Invalid version format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async typeCheckProject(project: DevProject): Promise<string[]> {
    // Mock type checking - in a real implementation, this would use TypeScript compiler
    return [];
  }

  private async processFile(filename: string, content: string, buildConfig: BuildConfig): Promise<string> {
    let processed = content;
    
    // Minify if enabled
    if (buildConfig.minify && filename.endsWith('.js')) {
      // Mock minification
      processed = processed.replace(/\s+/g, ' ').trim();
    }
    
    return processed;
  }

  private async createPluginPackage(project: DevProject, assets: Map<string, string>): Promise<PluginPackage> {
    return {
      manifest: project.manifest,
      files: assets,
      signature: undefined,
      integrity: undefined
    };
  }

  private async runProjectTests(project: DevProject, testResult: TestResult): Promise<void> {
    // Mock test running
    testResult.tests.push({
      name: 'Plugin loads correctly',
      status: 'passed'
    });

    testResult.tests.push({
      name: 'API integration works',
      status: 'passed'
    });
  }

  private setupDebugHooks(sessionId: string): void {
    // Implementation would setup debugging hooks
  }

  private cleanupDebugHooks(sessionId: string): void {
    // Implementation would cleanup debugging hooks
  }

  private getBasicPluginTemplate(): string {
    return `
// BEAR AI Plugin: {{PLUGIN_NAME}}
class Plugin {
  constructor(api, config) {
    this.api = api;
    this.config = config;
  }

  initialize() {
    console.log('Plugin initialized');
    
    // Setup your plugin here
    this.api.events.on('app:ready', () => {
      console.log('BEAR AI is ready!');
    });
  }

  destroy() {
    console.log('Plugin destroyed');
    // Cleanup your plugin here
  }

  onConfigUpdate(newConfig) {
    this.config = newConfig;
    console.log('Configuration updated', newConfig);
  }
}

// Export the plugin class
return Plugin;
`.trim();
  }

  private getUIPluginTemplate(): string {
    return `
// BEAR AI UI Plugin: {{PLUGIN_NAME}}
class UIPlugin {
  constructor(api, config, container) {
    this.api = api;
    this.config = config;
    this.container = container;
  }

  initialize() {
    this.render();
  }

  render() {
    this.container.innerHTML = \`
      <div class="plugin-ui">
        <h2>My UI Plugin</h2>
        <button id="action-btn">Click Me</button>
      </div>
    \`;

    const button = this.container.querySelector('#action-btn');
    button.addEventListener('click', () => {
      this.api.ui.showNotification('Button clicked!', 'success');
    });
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

return UIPlugin;
`.trim();
  }

  private getDataPluginTemplate(): string {
    return `
// BEAR AI Data Plugin: {{PLUGIN_NAME}}
class DataPlugin {
  constructor(api, config) {
    this.api = api;
    this.config = config;
  }

  async initialize() {
    // Load saved data
    this.data = await this.api.storage.get('plugin_data') || [];
    console.log('Data plugin initialized with', this.data.length, 'items');
  }

  async processData(input) {
    // Process the input data
    const processed = {
      timestamp: new Date().toISOString(),
      data: input,
      processed: true
    };

    // Save to storage
    this.data.push(processed);
    await this.api.storage.set('plugin_data', this.data);

    return processed;
  }

  async getData() {
    return this.data;
  }

  destroy() {
    console.log('Data plugin destroyed');
  }
}

return DataPlugin;
`.trim();
  }

  private getUIStylesTemplate(): string {
    return `
.plugin-ui {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.plugin-ui h2 {
  color: #333;
  margin-bottom: 16px;
}

.plugin-ui button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.plugin-ui button:hover {
  background: #0056b3;
}
`.trim();
  }

  private getReadmeTemplate(): string {
    return `
# My Plugin

Description of what this plugin does.

## Installation

1. Build the plugin
2. Install in BEAR AI

## Configuration

Describe configuration options here.

## Usage

Describe how to use the plugin.

## Development

Instructions for developers.
`.trim();
  }

  private getPackageJsonTemplate(): string {
    return `
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A BEAR AI plugin",
  "main": "index.js",
  "scripts": {
    "build": "echo 'Build script here'",
    "test": "echo 'Test script here'"
  },
  "keywords": ["bear-ai", "plugin"],
  "license": "MIT"
}
`.trim();
  }
}

// Type definitions
interface ProjectConfig {
  id: string;
  name: string;
  version?: string;
  author: string;
  description: string;
  category: 'ui' | 'data' | 'integration' | 'utility' | 'ai' | 'analysis';
  tags?: string[];
  permissions?: any[];
  sandboxType?: 'worker' | 'iframe' | 'isolated';
  license?: string;
}

interface DevProject {
  id: string;
  manifest: PluginManifest;
  files: Map<string, string>;
  config: PluginDevelopmentConfig;
  buildConfig: BuildConfig;
  createdAt: Date;
  lastModified: Date;
}

interface BuildConfig {
  target: string;
  minify: boolean;
  sourceMaps: boolean;
  typeCheck: boolean;
}

interface BuildResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  assets: Map<string, string>;
  buildTime: number;
  package?: PluginPackage;
}

interface TestResult {
  success: boolean;
  tests: TestCase[];
  coverage: CoverageInfo;
  duration: number;
}

interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

interface CoverageInfo {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface DebugSession {
  id: string;
  projectId: string;
  startedAt: Date;
  endedAt?: Date;
  breakpoints: Map<string, Breakpoint>;
  logs: DebugLog[];
  state: 'active' | 'paused' | 'stopped';
}

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  createdAt: Date;
}

interface DebugLog {
  timestamp: Date;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  source: string;
}

interface ProjectTemplate {
  manifest: PluginManifest;
  files: Map<string, string>;
}

type PluginTemplateType = 'basic' | 'ui' | 'data';
