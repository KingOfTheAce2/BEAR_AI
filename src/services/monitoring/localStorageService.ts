// Local Storage Service for Performance Monitoring
import { SystemMetrics, ModelPerformanceMetrics, PerformanceAlert, OptimizationRecommendation, PerformanceReport } from '../../types/monitoring';

interface StoredData {
  systemMetrics: SystemMetrics[];
  modelMetrics: ModelPerformanceMetrics[];
  alerts: PerformanceAlert[];
  recommendations: OptimizationRecommendation[];
  reports: PerformanceReport[];
  lastCleanup: number;
}

export class LocalStorageService {
  private dbName = 'bear-ai-performance';
  private version = 1;
  private db: IDBDatabase | null = null;
  private maxRetentionDays = 30;
  private compressionEnabled = true;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('systemMetrics')) {
          const systemStore = db.createObjectStore('systemMetrics', { keyPath: 'timestamp' });
          systemStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('modelMetrics')) {
          const modelStore = db.createObjectStore('modelMetrics', { keyPath: 'id', autoIncrement: true });
          modelStore.createIndex('timestamp', 'timestamp', { unique: false });
          modelStore.createIndex('modelId', 'modelId', { unique: false });
          modelStore.createIndex('operation', 'operation', { unique: false });
        }

        if (!db.objectStoreNames.contains('alerts')) {
          const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
          alertStore.createIndex('timestamp', 'timestamp', { unique: false });
          alertStore.createIndex('type', 'type', { unique: false });
          alertStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('recommendations')) {
          const recStore = db.createObjectStore('recommendations', { keyPath: 'id' });
          recStore.createIndex('timestamp', 'timestamp', { unique: false });
          recStore.createIndex('category', 'category', { unique: false });
          recStore.createIndex('priority', 'priority', { unique: false });
        }

        if (!db.objectStoreNames.contains('reports')) {
          const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // System Metrics Storage
  async saveSystemMetrics(metrics: SystemMetrics[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['systemMetrics'], 'readwrite');
    const store = transaction.objectStore('systemMetrics');

    const promises = metrics.map(metric => {
      const data = this.compressionEnabled ? this.compressData(metric) : metric;
      return new Promise<void>((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getSystemMetrics(startTime?: number, endTime?: number, limit = 1000): Promise<SystemMetrics[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['systemMetrics'], 'readonly');
      const store = transaction.objectStore('systemMetrics');
      const index = store.index('timestamp');

      let range: IDBKeyRange | undefined;
      if (startTime && endTime) {
        range = IDBKeyRange.bound(startTime, endTime);
      } else if (startTime) {
        range = IDBKeyRange.lowerBound(startTime);
      } else if (endTime) {
        range = IDBKeyRange.upperBound(endTime);
      }

      const request = index.openCursor(range, 'prev');
      const results: SystemMetrics[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          const data = this.compressionEnabled ? this.decompressData(cursor.value) : cursor.value;
          results.unshift(data);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Model Metrics Storage
  async saveModelMetrics(metrics: ModelPerformanceMetrics[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['modelMetrics'], 'readwrite');
    const store = transaction.objectStore('modelMetrics');

    const promises = metrics.map(metric => {
      const data = this.compressionEnabled ? this.compressData(metric) : metric;
      return new Promise<void>((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getModelMetrics(
    modelId?: string, 
    operation?: string, 
    startTime?: number, 
    endTime?: number, 
    limit = 1000
  ): Promise<ModelPerformanceMetrics[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['modelMetrics'], 'readonly');
      const store = transaction.objectStore('modelMetrics');
      
      let index: IDBIndex;
      let range: IDBKeyRange | undefined;

      if (modelId) {
        index = store.index('modelId');
        range = IDBKeyRange.only(modelId);
      } else if (operation) {
        index = store.index('operation');
        range = IDBKeyRange.only(operation);
      } else {
        index = store.index('timestamp');
        if (startTime && endTime) {
          range = IDBKeyRange.bound(startTime, endTime);
        } else if (startTime) {
          range = IDBKeyRange.lowerBound(startTime);
        } else if (endTime) {
          range = IDBKeyRange.upperBound(endTime);
        }
      }

      const request = index.openCursor(range, 'prev');
      const results: ModelPerformanceMetrics[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          const data = this.compressionEnabled ? this.decompressData(cursor.value) : cursor.value;
          
          // Additional filtering for combined criteria
          let include = true;
          if (modelId && data.modelId !== modelId) include = false;
          if (operation && data.operation !== operation) include = false;
          if (startTime && data.timestamp < startTime) include = false;
          if (endTime && data.timestamp > endTime) include = false;

          if (include) {
            results.unshift(data);
            count++;
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Alerts Storage
  async saveAlerts(alerts: PerformanceAlert[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['alerts'], 'readwrite');
    const store = transaction.objectStore('alerts');

    const promises = alerts.map(alert => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(alert);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getAlerts(resolved?: boolean, category?: string, limit = 100): Promise<PerformanceAlert[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['alerts'], 'readonly');
      const store = transaction.objectStore('alerts');
      
      const request = store.index('timestamp').openCursor(null, 'prev');
      const results: PerformanceAlert[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          const alert = cursor.value as PerformanceAlert;
          
          let include = true;
          if (resolved !== undefined && alert.resolved !== resolved) include = false;
          if (category && alert.category !== category) include = false;

          if (include) {
            results.push(alert);
            count++;
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Recommendations Storage
  async saveRecommendations(recommendations: OptimizationRecommendation[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['recommendations'], 'readwrite');
    const store = transaction.objectStore('recommendations');

    const promises = recommendations.map(rec => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(rec);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getRecommendations(applied?: boolean, category?: string, priority?: string): Promise<OptimizationRecommendation[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['recommendations'], 'readonly');
      const store = transaction.objectStore('recommendations');
      
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as OptimizationRecommendation[];
        
        // Filter results
        if (applied !== undefined) {
          results = results.filter(r => r.applied === applied);
        }
        if (category) {
          results = results.filter(r => r.category === category);
        }
        if (priority) {
          results = results.filter(r => r.priority === priority);
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Reports Storage
  async saveReport(report: PerformanceReport): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['reports'], 'readwrite');
    const store = transaction.objectStore('reports');

    return new Promise((resolve, reject) => {
      const request = store.put(report);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getReports(limit = 50): Promise<PerformanceReport[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      
      const request = store.index('timestamp').openCursor(null, 'prev');
      const results: PerformanceReport[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Data Compression
  private compressData(data: any): any {
    // Simple JSON compression by removing unnecessary whitespace
    // In a real implementation, you might use libraries like LZ-string
    return JSON.parse(JSON.stringify(data));
  }

  private decompressData(data: any): any {
    return data;
  }

  // Cleanup old data
  async cleanupOldData(): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const cutoffTime = Date.now() - (this.maxRetentionDays * 24 * 60 * 60 * 1000);
    
    const stores = ['systemMetrics', 'modelMetrics', 'alerts'];
    
    for (const storeName of stores) {
      const transaction = this.db!.beginTransaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    // Update last cleanup time
    await this.saveMetadata('lastCleanup', Date.now());
  }

  // Metadata storage
  async saveMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    const transaction = this.db!.beginTransaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.beginTransaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result?.value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Database management
  async getDatabaseSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve) => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          resolve(estimate.usage || 0);
        }).catch(() => resolve(0));
      } else {
        resolve(0);
      }
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const stores = ['systemMetrics', 'modelMetrics', 'alerts', 'recommendations', 'reports', 'metadata'];
    
    const transaction = this.db!.beginTransaction(stores, 'readwrite');
    
    const promises = stores.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  // Export/Import functionality
  async exportData(): Promise<StoredData> {
    const [systemMetrics, modelMetrics, alerts, recommendations, reports] = await Promise.all([
      this.getSystemMetrics(),
      this.getModelMetrics(),
      this.getAlerts(),
      this.getRecommendations(),
      this.getReports()
    ]);

    return {
      systemMetrics,
      modelMetrics,
      alerts,
      recommendations,
      reports,
      lastCleanup: await this.getMetadata('lastCleanup') || 0
    };
  }

  async importData(data: StoredData): Promise<void> {
    await Promise.all([
      this.saveSystemMetrics(data.systemMetrics),
      this.saveModelMetrics(data.modelMetrics),
      this.saveAlerts(data.alerts),
      this.saveRecommendations(data.recommendations),
      ...data.reports.map(report => this.saveReport(report))
    ]);

    await this.saveMetadata('lastCleanup', data.lastCleanup);
  }
}