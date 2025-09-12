// Local Alert System for Performance Monitoring
import { PerformanceAlert, PerformanceThresholds, SystemMetrics, ModelPerformanceMetrics } from '../../types/monitoring';

export class AlertSystem {
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private isRunning = false;
  private checkInterval?: NodeJS.Timeout;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private soundEnabled = false;
  private notificationEnabled = false;

  constructor(
    thresholds: PerformanceThresholds,
    private onAlert?: (alert: PerformanceAlert) => void
  ) {
    this.thresholds = thresholds;
    if (onAlert) {
      this.alertCallbacks.push(onAlert);
    }
  }

  start(checkIntervalMs = 10000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, checkIntervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.isRunning = false;
  }

  // Check system metrics for threshold violations
  checkSystemMetrics(metrics: SystemMetrics): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];

    // CPU check
    if (metrics.cpu.usage >= this.thresholds.cpu.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'system',
        'Critical CPU Usage',
        `CPU usage has reached ${metrics.cpu.usage.toFixed(1)}%, which exceeds the critical threshold of ${this.thresholds.cpu.critical}%`,
        this.thresholds.cpu.critical,
        metrics.cpu.usage
      ));
    } else if (metrics.cpu.usage >= this.thresholds.cpu.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'system',
        'High CPU Usage',
        `CPU usage is ${metrics.cpu.usage.toFixed(1)}%, which exceeds the warning threshold of ${this.thresholds.cpu.warning}%`,
        this.thresholds.cpu.warning,
        metrics.cpu.usage
      ));
    }

    // Memory check
    if (metrics.memory.percentage >= this.thresholds.memory.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'memory',
        'Critical Memory Usage',
        `Memory usage has reached ${metrics.memory.percentage.toFixed(1)}%, which exceeds the critical threshold of ${this.thresholds.memory.critical}%`,
        this.thresholds.memory.critical,
        metrics.memory.percentage
      ));
    } else if (metrics.memory.percentage >= this.thresholds.memory.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'memory',
        'High Memory Usage',
        `Memory usage is ${metrics.memory.percentage.toFixed(1)}%, which exceeds the warning threshold of ${this.thresholds.memory.warning}%`,
        this.thresholds.memory.warning,
        metrics.memory.percentage
      ));
    }

    // Disk check
    if (metrics.disk.percentage >= this.thresholds.disk.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'disk',
        'Critical Disk Usage',
        `Disk usage has reached ${metrics.disk.percentage.toFixed(1)}%, which exceeds the critical threshold of ${this.thresholds.disk.critical}%`,
        this.thresholds.disk.critical,
        metrics.disk.percentage
      ));
    } else if (metrics.disk.percentage >= this.thresholds.disk.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'disk',
        'High Disk Usage',
        `Disk usage is ${metrics.disk.percentage.toFixed(1)}%, which exceeds the warning threshold of ${this.thresholds.disk.warning}%`,
        this.thresholds.disk.warning,
        metrics.disk.percentage
      ));
    }

    // Process new alerts
    newAlerts.forEach(alert => this.processAlert(alert));
    return newAlerts;
  }

  // Check model performance metrics
  checkModelMetrics(metrics: ModelPerformanceMetrics): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];

    // Latency check
    if (metrics.metrics.latency >= this.thresholds.modelLatency.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'model',
        'Critical Model Latency',
        `Model ${metrics.modelName} ${metrics.operation} latency is ${metrics.metrics.latency.toFixed(0)}ms, exceeding critical threshold of ${this.thresholds.modelLatency.critical}ms`,
        this.thresholds.modelLatency.critical,
        metrics.metrics.latency
      ));
    } else if (metrics.metrics.latency >= this.thresholds.modelLatency.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'model',
        'High Model Latency',
        `Model ${metrics.modelName} ${metrics.operation} latency is ${metrics.metrics.latency.toFixed(0)}ms, exceeding warning threshold of ${this.thresholds.modelLatency.warning}ms`,
        this.thresholds.modelLatency.warning,
        metrics.metrics.latency
      ));
    }

    // Model memory usage check
    const modelMemoryMB = metrics.metrics.memoryUsage / (1024 * 1024);
    if (modelMemoryMB >= this.thresholds.modelMemory.critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'model',
        'Critical Model Memory Usage',
        `Model ${metrics.modelName} is using ${modelMemoryMB.toFixed(1)}MB, exceeding critical threshold of ${this.thresholds.modelMemory.critical}MB`,
        this.thresholds.modelMemory.critical,
        modelMemoryMB
      ));
    } else if (modelMemoryMB >= this.thresholds.modelMemory.warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'model',
        'High Model Memory Usage',
        `Model ${metrics.modelName} is using ${modelMemoryMB.toFixed(1)}MB, exceeding warning threshold of ${this.thresholds.modelMemory.warning}MB`,
        this.thresholds.modelMemory.warning,
        modelMemoryMB
      ));
    }

    // Error rate check
    if (metrics.metrics.errorRate && metrics.metrics.errorRate > 0) {
      const severity = metrics.metrics.errorRate > 50 ? 'critical' : 'error';
      newAlerts.push(this.createAlert(
        severity,
        'model',
        'Model Error Detected',
        `Model ${metrics.modelName} ${metrics.operation} failed with error rate of ${metrics.metrics.errorRate}%`,
        0,
        metrics.metrics.errorRate
      ));
    }

    // Process new alerts
    newAlerts.forEach(alert => this.processAlert(alert));
    return newAlerts;
  }

  // Create custom alert
  createCustomAlert(
    type: 'warning' | 'error' | 'critical',
    category: 'system' | 'model' | 'memory' | 'disk' | 'network',
    title: string,
    message: string
  ): PerformanceAlert {
    const alert = this.createAlert(type, category, title, message, 0, 0);
    this.processAlert(alert);
    return alert;
  }

  private createAlert(
    type: 'warning' | 'error' | 'critical',
    category: 'system' | 'model' | 'memory' | 'disk' | 'network',
    title: string,
    message: string,
    threshold: number,
    currentValue: number
  ): PerformanceAlert {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      category,
      title,
      message,
      threshold,
      currentValue,
      resolved: false
    };
  }

  private processAlert(alert: PerformanceAlert): void {
    // Check for duplicate alerts (same category and type within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const isDuplicate = this.alerts.some(existing => 
      existing.category === alert.category &&
      existing.type === alert.type &&
      existing.timestamp > fiveMinutesAgo &&
      !existing.resolved
    );

    if (isDuplicate) {
      return; // Skip duplicate alerts
    }

    // Add to alerts list
    this.alerts.push(alert);

    // Trigger callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback error:', error);
      }
    });

    // Play sound if enabled
    if (this.soundEnabled) {
      this.playAlertSound(alert.type);
    }

    // Show browser notification if enabled
    if (this.notificationEnabled) {
      this.showBrowserNotification(alert);
    }

    console.warn(`[ALERT] ${alert.type.toUpperCase()}: ${alert.title} - ${alert.message}`);
  }

  private performPeriodicChecks(): void {
    // Auto-resolve old alerts that may no longer be relevant
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.timestamp < oneHourAgo) {
        this.resolveAlert(alert.id, 'Auto-resolved due to age');
      }
    });

    // Clean up very old resolved alerts
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > oneDayAgo || !alert.resolved
    );
  }

  private playAlertSound(type: 'warning' | 'error' | 'critical'): void {
    try {
      // Create audio context for generating alert sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different alert types
      switch (type) {
        case 'warning':
          oscillator.frequency.value = 800;
          break;
        case 'error':
          oscillator.frequency.value = 1000;
          break;
        case 'critical':
          oscillator.frequency.value = 1200;
          break;
      }

      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Unable to play alert sound:', error);
    }
  }

  private showBrowserNotification(alert: PerformanceAlert): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: this.getAlertIcon(alert.type),
        tag: alert.category // Prevent duplicate notifications
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(alert);
        }
      });
    }
  }

  private getAlertIcon(type: string): string {
    // Return appropriate icon based on alert type
    // In a real implementation, you'd have actual icon files
    return '⚠️';
  }

  // Public API methods
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(limit = 100): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAlertsByCategory(category: string): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.category === category);
  }

  getAlertsByType(type: string): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }

  clearAllAlerts(): void {
    this.alerts = [];
  }

  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  setNotificationEnabled(enabled: boolean): void {
    this.notificationEnabled = enabled;
    
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  addAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const active = this.alerts.filter(a => !a.resolved).length;
    const resolved = this.alerts.filter(a => a.resolved).length;
    
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    this.alerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
    });

    return {
      total: this.alerts.length,
      active,
      resolved,
      byType,
      byCategory
    };
  }

  isRunning(): boolean {
    return this.isRunning;
  }
}