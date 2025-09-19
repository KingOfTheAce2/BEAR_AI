import {
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsDataPoint,
  AnalyticsSummary,
  KnowledgeBaseConfig,
  KnowledgeBaseStats,
  Document
} from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';

interface AnalyticsMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export class AnalyticsService {
  private vectorDb: VectorDatabaseService;
  private config: KnowledgeBaseConfig;
  private dbName = 'knowledge-analytics-db';
  private db: IDBDatabase | null = null;
  private metricsCache: Map<string, AnalyticsMetric[]> = new Map();

  constructor(config: KnowledgeBaseConfig, vectorDb: VectorDatabaseService) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error('Failed to open analytics database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.startPeriodicMetricsCollection();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('metrics')) {
          const metricsStore = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
          metricsStore.createIndex('by-name', 'name');
          metricsStore.createIndex('by-date', 'timestamp');
          metricsStore.createIndex('by-name-date', ['name', 'timestamp']);
        }
        
        if (!db.objectStoreNames.contains('user-interactions')) {
          const interactionsStore = db.createObjectStore('user-interactions', { keyPath: 'id', autoIncrement: true });
          interactionsStore.createIndex('by-type', 'type');
          interactionsStore.createIndex('by-date', 'timestamp');
          interactionsStore.createIndex('by-document', 'documentId');
        }
        
        if (!db.objectStoreNames.contains('search-analytics')) {
          const searchStore = db.createObjectStore('search-analytics', { keyPath: 'id', autoIncrement: true });
          searchStore.createIndex('by-query', 'query');
          searchStore.createIndex('by-date', 'timestamp');
          searchStore.createIndex('by-results-count', 'resultsCount');
        }
      };
    });
  }

  private startPeriodicMetricsCollection(): void {
    // Collect basic metrics every 5 minutes
    setInterval(async () => {
      await this.collectSystemMetrics();
    }, 5 * 60 * 1000);

    // Collect comprehensive metrics every hour
    setInterval(async () => {
      await this.collectComprehensiveMetrics();
    }, 60 * 60 * 1000);
  }

  async runQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();

    try {
      let data: AnalyticsDataPoint[] = [];
      
      switch (query.type) {
        case 'trend':
          data = await this.getTrendData(query);
          break;
        case 'distribution':
          data = await this.getDistributionData(query);
          break;
        case 'correlation':
          data = await this.getCorrelationData(query);
          break;
        case 'summary':
          data = await this.getSummaryData(query);
          break;
        default:
          throw new Error(`Unknown query type: ${query.type}`);
      }

      const summary = this.generateSummary(data, query);
      
      return {
        query,
        data,
        summary,
        generatedAt: new Date()
      };
    } catch (error: unknown) {
      console.error('Analytics query error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Analytics query failed: ${message}`);
    }
  }

  private async getTrendData(query: AnalyticsQuery): Promise<AnalyticsDataPoint[]> {
    const timeRange = query.timeRange || this.getDefaultTimeRange();
    const groupBy = query.groupBy || 'day';
    
    const metrics = await this.getMetricsByTimeRange(query.field, timeRange);
    const groupedData = this.groupMetricsByTime(metrics, groupBy);
    
    return groupedData.map(group => ({
      label: group.period,
      value: group.average,
      metadata: {
        count: group.count,
        min: group.min,
        max: group.max,
        change: group.change,
        changePercent: group.changePercent
      }
    }));
  }

  private async getDistributionData(query: AnalyticsQuery): Promise<AnalyticsDataPoint[]> {
    const timeRange = query.timeRange || this.getDefaultTimeRange();
    
    switch (query.field) {
      case 'document-categories':
        return await this.getDocumentCategoriesDistribution();
      case 'document-languages':
        return await this.getDocumentLanguagesDistribution();
      case 'document-sizes':
        return await this.getDocumentSizesDistribution();
      case 'search-queries':
        return await this.getSearchQueriesDistribution(timeRange);
      case 'user-activity':
        return await this.getUserActivityDistribution(timeRange);
      default:
        throw new Error(`Unsupported distribution field: ${query.field}`);
    }
  }

  private async getCorrelationData(query: AnalyticsQuery): Promise<AnalyticsDataPoint[]> {
    // Analyze correlations between different metrics
    const correlations = await this.calculateCorrelations(query.field);
    
    return correlations.map(corr => ({
      label: corr.metric,
      value: corr.correlation,
      metadata: {
        strength: this.getCorrelationStrength(corr.correlation),
        significance: corr.pValue < 0.05 ? 'significant' : 'not significant',
        dataPoints: corr.dataPoints
      }
    }));
  }

  private async getSummaryData(query: AnalyticsQuery): Promise<AnalyticsDataPoint[]> {
    const timeRange = query.timeRange || this.getDefaultTimeRange();
    
    const summaryMetrics = [
      'total-documents',
      'total-searches',
      'avg-search-time',
      'user-engagement',
      'content-growth',
      'search-success-rate'
    ];

    const data: AnalyticsDataPoint[] = [];
    
    for (const metric of summaryMetrics) {
      const value = await this.calculateSummaryMetric(metric, timeRange);
      data.push({
        label: this.formatMetricLabel(metric),
        value,
        metadata: { metric, timeRange }
      });
    }
    
    return data;
  }

  private async getDocumentCategoriesDistribution(): Promise<AnalyticsDataPoint[]> {
    const documents = await this.vectorDb.getAllDocuments();
    const categories = new Map<string, number>();
    
    for (const doc of documents) {
      const category = doc.category || 'Uncategorized';
      categories.set(category, (categories.get(category) || 0) + 1);
    }
    
    return Array.from(categories.entries()).map(([category, count]) => ({
      label: category,
      value: count,
      metadata: { percentage: (count / documents.length) * 100 }
    })).sort((a, b) => b.value - a.value);
  }

  private async getDocumentLanguagesDistribution(): Promise<AnalyticsDataPoint[]> {
    const documents = await this.vectorDb.getAllDocuments();
    const languages = new Map<string, number>();
    
    for (const doc of documents) {
      const language = doc.language || 'Unknown';
      languages.set(language, (languages.get(language) || 0) + 1);
    }
    
    return Array.from(languages.entries()).map(([language, count]) => ({
      label: language,
      value: count,
      metadata: { percentage: (count / documents.length) * 100 }
    })).sort((a, b) => b.value - a.value);
  }

  private async getDocumentSizesDistribution(): Promise<AnalyticsDataPoint[]> {
    const documents = await this.vectorDb.getAllDocuments();
    const sizeRanges = [
      { label: 'Small (< 1KB)', min: 0, max: 1024 },
      { label: 'Medium (1KB - 10KB)', min: 1024, max: 10240 },
      { label: 'Large (10KB - 100KB)', min: 10240, max: 102400 },
      { label: 'Very Large (> 100KB)', min: 102400, max: Infinity }
    ];
    
    const distribution = sizeRanges.map(range => ({
      label: range.label,
      value: 0,
      metadata: { range }
    }));
    
    for (const doc of documents) {
      const size = doc.size || doc.content.length;
      for (const item of distribution) {
        const range = item.metadata.range;
        if (size >= range.min && size < range.max) {
          item.value++;
          break;
        }
      }
    }
    
    return distribution;
  }

  private async getSearchQueriesDistribution(timeRange: { start: Date; end: Date }): Promise<AnalyticsDataPoint[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['search-analytics'], 'readonly');
    const store = transaction.objectStore('search-analytics');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const searchData = await this.promisifyRequest(index.getAll(range)) as any[];
    
    const queryFrequency = new Map<string, number>();
    
    for (const search of searchData) {
      const query = search.query.toLowerCase().trim();
      queryFrequency.set(query, (queryFrequency.get(query) || 0) + 1);
    }
    
    return Array.from(queryFrequency.entries())
      .map(([query, count]) => ({
        label: query,
        value: count,
        metadata: { percentage: (count / searchData.length) * 100 }
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // Top 20 queries
  }

  private async getUserActivityDistribution(timeRange: { start: Date; end: Date }): Promise<AnalyticsDataPoint[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['user-interactions'], 'readonly');
    const store = transaction.objectStore('user-interactions');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const interactions = await this.promisifyRequest(index.getAll(range)) as any[];
    
    const activityTypes = new Map<string, number>();
    
    for (const interaction of interactions) {
      const type = interaction.type;
      activityTypes.set(type, (activityTypes.get(type) || 0) + 1);
    }
    
    return Array.from(activityTypes.entries()).map(([type, count]) => ({
      label: type,
      value: count,
      metadata: { percentage: (count / interactions.length) * 100 }
    })).sort((a, b) => b.value - a.value);
  }

  private async calculateCorrelations(field: string): Promise<Array<{
    metric: string;
    correlation: number;
    pValue: number;
    dataPoints: number;
  }>> {
    // Simplified correlation calculation
    const correlationPairs = [
      ['document-count', 'search-volume'],
      ['document-size', 'search-time'],
      ['user-activity', 'search-success'],
      ['content-freshness', 'user-engagement']
    ];
    
    const results: Array<{
      metric: string;
      correlation: number;
      pValue: number;
      dataPoints: number;
    }> = [];
    
    for (const [metric1, metric2] of correlationPairs) {
      if (field === metric1 || field === metric2) {
        const data1 = await this.getMetricData(metric1);
        const data2 = await this.getMetricData(metric2);
        
        const correlation = this.calculatePearsonCorrelation(data1, data2);
        const pValue = this.calculateSignificance(correlation, Math.min(data1.length, data2.length));
        
        results.push({
          metric: field === metric1 ? metric2 : metric1,
          correlation,
          pValue,
          dataPoints: Math.min(data1.length, data2.length)
        });
      }
    }
    
    return results;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSignificance(correlation: number, n: number): number {
    // Simplified p-value calculation for correlation
    if (n < 3) return 1.0;
    
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const df = n - 2;
    
    // Rough approximation of t-distribution p-value
    const absT = Math.abs(t);
    if (absT < 1.96) return 0.05; // Not significant
    if (absT < 2.58) return 0.01; // Significant
    return 0.001; // Highly significant
  }

  private getCorrelationStrength(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs < 0.3) return 'weak';
    if (abs < 0.7) return 'moderate';
    return 'strong';
  }

  private async calculateSummaryMetric(metric: string, timeRange: { start: Date; end: Date }): Promise<number> {
    switch (metric) {
      case 'total-documents':
        return (await this.vectorDb.getAllDocuments()).length;
      
      case 'total-searches':
        return await this.getSearchCount(timeRange);
      
      case 'avg-search-time':
        return await this.getAverageSearchTime(timeRange);
      
      case 'user-engagement':
        return await this.getUserEngagementScore(timeRange);
      
      case 'content-growth':
        return await this.getContentGrowthRate(timeRange);
      
      case 'search-success-rate':
        return await this.getSearchSuccessRate(timeRange);
      
      default:
        return 0;
    }
  }

  private async getSearchCount(timeRange: { start: Date; end: Date }): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(['search-analytics'], 'readonly');
    const store = transaction.objectStore('search-analytics');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const searches = await this.promisifyRequest(index.getAll(range)) as any[];
    
    return searches.length;
  }

  private async getAverageSearchTime(timeRange: { start: Date; end: Date }): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(['search-analytics'], 'readonly');
    const store = transaction.objectStore('search-analytics');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const searches = await this.promisifyRequest(index.getAll(range)) as any[];
    
    if (searches.length === 0) return 0;
    
    const totalTime = searches.reduce((sum, search) => sum + (search.queryTime || 0), 0);
    return totalTime / searches.length;
  }

  private async getUserEngagementScore(timeRange: { start: Date; end: Date }): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(['user-interactions'], 'readonly');
    const store = transaction.objectStore('user-interactions');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const interactions = await this.promisifyRequest(index.getAll(range)) as any[];
    
    if (interactions.length === 0) return 0;
    
    // Calculate engagement based on interaction types and frequency
    const weights = {
      'search': 1,
      'document-view': 2,
      'document-edit': 3,
      'citation-create': 4
    };
    
    const totalWeight = interactions.reduce((sum, interaction) => {
      return sum + (weights[interaction.type as keyof typeof weights] || 1);
    }, 0);
    
    const timeSpanDays = (timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000);
    return totalWeight / Math.max(1, timeSpanDays);
  }

  private async getContentGrowthRate(timeRange: { start: Date; end: Date }): Promise<number> {
    const documents = await this.vectorDb.getAllDocuments();
    const documentsInRange = documents.filter(doc => 
      doc.createdAt >= timeRange.start && doc.createdAt <= timeRange.end
    );
    
    const timeSpanDays = (timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000);
    return documentsInRange.length / Math.max(1, timeSpanDays);
  }

  private async getSearchSuccessRate(timeRange: { start: Date; end: Date }): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction(['search-analytics'], 'readonly');
    const store = transaction.objectStore('search-analytics');
    const index = store.index('by-date');
    
    const range = IDBKeyRange.bound(timeRange.start, timeRange.end);
    const searches = await this.promisifyRequest(index.getAll(range)) as any[];
    
    if (searches.length === 0) return 0;
    
    const successfulSearches = searches.filter(search => search.resultsCount > 0);
    return (successfulSearches.length / searches.length) * 100;
  }

  private async getMetricsByTimeRange(metric: string, timeRange: { start: Date; end: Date }): Promise<AnalyticsMetric[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['metrics'], 'readonly');
    const store = transaction.objectStore('metrics');
    const index = store.index('by-name-date');
    
    const range = IDBKeyRange.bound([metric, timeRange.start], [metric, timeRange.end]);
    const metrics = await this.promisifyRequest(index.getAll(range)) as any[];
    
    return metrics.map(m => ({
      name: m.name,
      value: m.value,
      timestamp: m.timestamp,
      metadata: m.metadata
    }));
  }

  private async getMetricData(metric: string): Promise<number[]> {
    const timeRange = this.getDefaultTimeRange();
    const metrics = await this.getMetricsByTimeRange(metric, timeRange);
    return metrics.map(m => m.value);
  }

  private groupMetricsByTime(
    metrics: AnalyticsMetric[], 
    groupBy: string
  ): Array<{
    period: string;
    average: number;
    count: number;
    min: number;
    max: number;
    change: number;
    changePercent: number;
  }> {
    const groups = new Map();
    
    for (const metric of metrics) {
      const period = this.getPeriodKey(metric.timestamp, groupBy);
      
      if (!groups.has(period)) {
        groups.set(period, []);
      }
      groups.get(period).push(metric.value);
    }
    
    const result = Array.from(groups.entries()).map(([period, values]) => {
      const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      return {
        period,
        average,
        count: values.length,
        min,
        max,
        change: 0, // Will be calculated below
        changePercent: 0
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
    
    // Calculate period-over-period changes
    for (let i = 1; i < result.length; i++) {
      const current = result[i];
      const previous = result[i - 1];
      
      current.change = current.average - previous.average;
      current.changePercent = previous.average !== 0 
        ? (current.change / previous.average) * 100 
        : 0;
    }
    
    return result;
  }

  private getPeriodKey(date: Date, groupBy: string): string {
    switch (groupBy) {
      case 'hour':
        return date.toISOString().substring(0, 13) + ':00:00';
      case 'day':
        return date.toISOString().substring(0, 10);
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().substring(0, 10);
      case 'month':
        return date.toISOString().substring(0, 7);
      case 'year':
        return date.toISOString().substring(0, 4);
      default:
        return date.toISOString().substring(0, 10);
    }
  }

  private generateSummary(data: AnalyticsDataPoint[], query: AnalyticsQuery): AnalyticsSummary {
    if (data.length === 0) {
      return {
        total: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        insights: ['No data available for the specified query.']
      };
    }

    const values = data.map(d => d.value);
    const total = values.reduce((a, b) => a + b, 0);
    const average = total / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const insights = this.generateInsights(data, query, { total, average, median, min, max });
    const trend = this.detectTrend(data);
    
    return {
      total,
      average,
      median,
      min,
      max,
      trend,
      insights
    };
  }

  private generateInsights(
    data: AnalyticsDataPoint[], 
    query: AnalyticsQuery,
    stats: { total: number; average: number; median: number; min: number; max: number }
  ): string[] {
    const insights: string[] = [];
    
    // Data volume insights
    if (data.length > 0) {
      insights.push(`Analysis based on ${data.length} data points.`);
    }
    
    // Trend insights
    const trend = this.detectTrend(data);
    if (trend === 'increasing') {
      insights.push('The data shows an upward trend over the analyzed period.');
    } else if (trend === 'decreasing') {
      insights.push('The data shows a downward trend over the analyzed period.');
    } else {
      insights.push('The data appears to be relatively stable over the analyzed period.');
    }
    
    // Distribution insights
    const range = stats.max - stats.min;
    const cv = stats.average !== 0 ? (Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.value - stats.average, 2), 0) / data.length) / stats.average) : 0;
    
    if (cv < 0.1) {
      insights.push('The data shows low variability, indicating consistent values.');
    } else if (cv > 0.5) {
      insights.push('The data shows high variability, indicating significant fluctuations.');
    }
    
    // Query-specific insights
    switch (query.type) {
      case 'distribution':
        const topItem = data.reduce((max, item) => item.value > max.value ? item : max, data[0]);
        insights.push(`"${topItem.label}" represents the highest value with ${topItem.value}.`);
        break;
        
      case 'trend':
        if (data.length >= 2) {
          const firstValue = data[0].value;
          const lastValue = data[data.length - 1].value;
          const change = ((lastValue - firstValue) / firstValue) * 100;
          insights.push(`Overall change from start to end: ${change.toFixed(1)}%`);
        }
        break;
    }
    
    return insights;
  }

  private detectTrend(data: AnalyticsDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i].value > data[i - 1].value) {
        increasing++;
      } else if (data[i].value < data[i - 1].value) {
        decreasing++;
      }
    }
    
    const threshold = data.length * 0.6; // 60% majority
    
    if (increasing >= threshold) {
      return 'increasing';
    } else if (decreasing >= threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private formatMetricLabel(metric: string): string {
    return metric.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getDefaultTimeRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Last 30 days
    
    return { start, end };
  }

  // Event tracking methods
  async trackDocumentAdded(document: Document): Promise<void> {
    await this.recordMetric('documents-added', 1, { documentId: document.id });
    await this.recordUserInteraction('document-create', document.id);
  }

  async trackDocumentUpdated(document: Document): Promise<void> {
    await this.recordMetric('documents-updated', 1, { documentId: document.id });
    await this.recordUserInteraction('document-edit', document.id);
  }

  async trackDocumentDeleted(document: Document): Promise<void> {
    await this.recordMetric('documents-deleted', 1, { documentId: document.id });
    await this.recordUserInteraction('document-delete', document.id);
  }

  async trackSearch(query: string, resultsCount: number, queryTime: number): Promise<void> {
    await this.recordSearchAnalytics(query, resultsCount, queryTime);
    await this.recordUserInteraction('search', undefined, { query, resultsCount });
  }

  private async recordMetric(name: string, value: number, metadata?: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['metrics'], 'readwrite');
    const store = transaction.objectStore('metrics');
    
    const metric = {
      name,
      value,
      timestamp: new Date(),
      metadata
    };
    
    await this.promisifyRequest(store.add(metric));
  }

  private async recordUserInteraction(type: string, documentId?: string, metadata?: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['user-interactions'], 'readwrite');
    const store = transaction.objectStore('user-interactions');
    
    const interaction = {
      type,
      documentId,
      timestamp: new Date(),
      metadata
    };
    
    await this.promisifyRequest(store.add(interaction));
  }

  private async recordSearchAnalytics(query: string, resultsCount: number, queryTime: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['search-analytics'], 'readwrite');
    const store = transaction.objectStore('search-analytics');
    
    const searchRecord = {
      query,
      resultsCount,
      queryTime,
      timestamp: new Date()
    };
    
    await this.promisifyRequest(store.add(searchRecord));
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const stats = await this.vectorDb.getStats();
      
      await this.recordMetric('total-documents', stats.totalDocuments);
      await this.recordMetric('total-chunks', stats.totalChunks);
      await this.recordMetric('total-embeddings', stats.totalEmbeddings);
      await this.recordMetric('storage-size', stats.storage.totalSize);
      
      // Memory usage (approximate)
      const memoryUsage = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      await this.recordMetric('memory-usage', memoryUsage);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  private async collectComprehensiveMetrics(): Promise<void> {
    try {
      // Collect detailed analytics
      await this.collectSystemMetrics();
      
      // Calculate derived metrics
      const searchCount = await this.getSearchCount(this.getDefaultTimeRange());
      const avgSearchTime = await this.getAverageSearchTime(this.getDefaultTimeRange());
      const engagementScore = await this.getUserEngagementScore(this.getDefaultTimeRange());
      
      await this.recordMetric('search-volume', searchCount);
      await this.recordMetric('avg-search-time', avgSearchTime);
      await this.recordMetric('user-engagement', engagementScore);
      
      console.log('Comprehensive metrics collected');
    } catch (error) {
      console.error('Error collecting comprehensive metrics:', error);
    }
  }

  async getOverallStats(): Promise<Partial<KnowledgeBaseStats>> {
    const timeRange = this.getDefaultTimeRange();
    
    return {
      searchPerformance: {
        avgQueryTime: await this.getAverageSearchTime(timeRange),
        totalQueries: await this.getSearchCount(timeRange),
        successRate: (await this.getSearchSuccessRate(timeRange)) / 100
      }
    };
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.metricsCache.clear();
  }
}

export default AnalyticsService;
