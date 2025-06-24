const StatsD = require('node-statsd');

class DatadogMonitoring {
  constructor() {
    // Initialize StatsD client for Datadog
    this.statsd = new StatsD({
      host: process.env.DATADOG_HOST || 'localhost',
      port: process.env.DATADOG_PORT || 8125,
      prefix: 'minitalk.',
      suffix: '',
      globalize: false,
      cacheDns: true,
      mock: process.env.NODE_ENV === 'test'
    });

    this.startTime = Date.now();
    this.messageProcessingTimes = [];
    this.fileOperationCounts = {
      reads: 0,
      writes: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // Track message processing performance
  trackMessageProcessing(processingTimeMs, batchSize = 1, queueLength = 0) {
    // Processing time histogram
    this.statsd.histogram('message.processing_time', processingTimeMs, {
      batch_size: batchSize > 1 ? 'batch' : 'individual'
    });

    // Messages per second gauge
    const messagesPerSecond = batchSize / (processingTimeMs / 1000);
    this.statsd.gauge('message.throughput', messagesPerSecond);

    // Queue length monitoring
    this.statsd.gauge('message.queue_length', queueLength);

    // Batch efficiency tracking
    if (batchSize > 1) {
      this.statsd.increment('message.batch_processed', batchSize);
      this.statsd.histogram('message.batch_size', batchSize);
    } else {
      this.statsd.increment('message.individual_processed');
    }
  }

  // Track file I/O operations
  trackFileOperation(operation, duration, cacheHit = false) {
    // File operation timing
    this.statsd.timing(`file.${operation}_duration`, duration);
    
    // File operation counters
    this.fileOperationCounts[operation === 'read' ? 'reads' : 'writes']++;
    this.statsd.increment(`file.${operation}_count`);

    // Cache performance
    if (operation === 'read') {
      if (cacheHit) {
        this.fileOperationCounts.cacheHits++;
        this.statsd.increment('file.cache_hit');
      } else {
        this.fileOperationCounts.cacheMisses++;
        this.statsd.increment('file.cache_miss');
      }

      // Cache hit ratio
      const totalReads = this.fileOperationCounts.cacheHits + this.fileOperationCounts.cacheMisses;
      const hitRatio = totalReads > 0 ? (this.fileOperationCounts.cacheHits / totalReads) * 100 : 0;
      this.statsd.gauge('file.cache_hit_ratio', hitRatio);
    }
  }

  // Track system resource usage
  trackSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    // Memory metrics
    this.statsd.gauge('system.memory.heap_used', memUsage.heapUsed);
    this.statsd.gauge('system.memory.heap_total', memUsage.heapTotal);
    this.statsd.gauge('system.memory.rss', memUsage.rss);
    
    // CPU usage (requires additional monitoring)
    const cpuUsage = process.cpuUsage();
    this.statsd.gauge('system.cpu.user', cpuUsage.user);
    this.statsd.gauge('system.cpu.system', cpuUsage.system);
  }

  // Track application health
  trackHealthMetrics(activeConnections, totalMessages, errorCount = 0) {
    this.statsd.gauge('app.connections.active', activeConnections);
    this.statsd.gauge('app.messages.total', totalMessages);
    this.statsd.gauge('app.errors.count', errorCount);
    
    // Uptime
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    this.statsd.gauge('app.uptime', uptimeSeconds);
  }

  // Performance anomaly detection
  detectPerformanceAnomalies(currentThroughput, averageThroughput) {
    const performanceDrop = ((averageThroughput - currentThroughput) / averageThroughput) * 100;
    
    if (performanceDrop > 50) {
      this.statsd.increment('alert.performance_drop_critical');
      console.warn(`🚨 CRITICAL: Performance dropped by ${performanceDrop.toFixed(1)}%`);
    } else if (performanceDrop > 25) {
      this.statsd.increment('alert.performance_drop_warning');
      console.warn(`⚠️ WARNING: Performance dropped by ${performanceDrop.toFixed(1)}%`);
    }

    this.statsd.gauge('performance.drop_percentage', performanceDrop);
  }

  // Custom dashboard metrics for comparison
  trackOptimizationComparison(isOptimized, processingTime, throughput) {
    const mode = isOptimized ? 'optimized' : 'unoptimized';
    
    this.statsd.histogram(`comparison.${mode}.processing_time`, processingTime);
    this.statsd.gauge(`comparison.${mode}.throughput`, throughput);
    
    // Tag metrics for easy dashboard filtering
    this.statsd.histogram('comparison.processing_time', processingTime, {
      optimization_mode: mode
    });
  }

  // Create alerts and monitors
  createDatadogAlerts() {
    // This would typically be done via Datadog API or Terraform
    const alertConfigs = {
      high_response_time: {
        metric: 'minitalk.message.processing_time',
        threshold: 1000, // 1 second
        message: 'Message processing time is too high'
      },
      low_throughput: {
        metric: 'minitalk.message.throughput',
        threshold: 100, // messages per second
        message: 'Message throughput dropped below threshold'
      },
      high_queue_length: {
        metric: 'minitalk.message.queue_length',
        threshold: 1000,
        message: 'Message queue is backing up'
      },
      low_cache_hit_ratio: {
        metric: 'minitalk.file.cache_hit_ratio',
        threshold: 50, // 50%
        message: 'Cache hit ratio is too low'
      }
    };

    console.log('📊 Datadog Alert Configurations:', alertConfigs);
    return alertConfigs;
  }

  // Generate performance report
  generatePerformanceReport() {
    const report = {
      fileOperations: this.fileOperationCounts,
      uptime: (Date.now() - this.startTime) / 1000,
      timestamp: new Date().toISOString()
    };

    // Send as custom event to Datadog
    this.statsd.event('Performance Report Generated', JSON.stringify(report), {
      alert_type: 'info',
      source_type_name: 'minitalk'
    });

    return report;
  }

  // Cleanup
  close() {
    this.statsd.close();
  }
}

module.exports = DatadogMonitoring; 
