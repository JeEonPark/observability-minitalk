const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { trace } = require('@opentelemetry/api');

// Create OTLP HTTP exporter targeting Datadog Agent
const otlpExporter = new OTLPTraceExporter({
  url: 'http://datadog-agent.monitoring.svc.cluster.local:4318/v1/traces',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize OpenTelemetry SDK with simple configuration
const sdk = new NodeSDK({
  serviceName: 'minitalk-backend',
  serviceVersion: '1.0.1',
  traceExporter: otlpExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation for performance
      },
    }),
  ],
});

// Start the SDK
sdk.start();
console.log('🔍 OpenTelemetry OTLP tracing initialized successfully for minitalk-backend');
console.log(`🎯 OTLP Endpoint: http://datadog-agent.monitoring.svc.cluster.local:4318/v1/traces`);
console.log(`🏷️  Service: minitalk-backend (production)`);

// Get tracer for custom spans
const tracer = trace.getTracer('minitalk-backend', '1.0.1');

// Helper function to properly log errors to OpenTelemetry traces
function logErrorToOTLP(error, spanName = 'error', additionalAttributes = {}) {
  const span = tracer.startSpan(spanName);
  
  try {
    // Set error status on span - this makes it show as ERROR in Datadog APM
    span.recordException(error);
    span.setStatus({
      code: 2, // ERROR
      message: error.message,
    });
    
    // Add additional attributes
    Object.keys(additionalAttributes).forEach(key => {
      span.setAttributes({ [key]: additionalAttributes[key] });
    });
    
    // Add system metrics
    const memUsage = process.memoryUsage();
    span.setAttributes({
      'system.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
      'system.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024),
      'system.memory.heap_total_mb': Math.round(memUsage.heapTotal / 1024 / 1024),
    });
    
    // Log to console with proper error level
    console.error('🚨 OTLP ERROR LOGGED:', {
      error_type: error.name,
      error_message: error.message,
      span_name: spanName,
      attributes: additionalAttributes
    });
    
  } catch (loggingError) {
    console.error('Failed to log error to OTLP:', loggingError);
  } finally {
    span.end();
  }
}

// Helper function to log critical system errors
function logCriticalSystemError(error, context = {}) {
  logErrorToOTLP(error, 'system.critical_error', {
    'minitalk.severity': 'critical',
    'minitalk.category': 'system_failure',
    ...context
  });
}

// Helper function to log memory errors
function logMemoryError(error, memoryInfo = {}) {
  logErrorToOTLP(error, 'system.memory_error', {
    'minitalk.severity': 'critical',
    'minitalk.category': 'memory_failure',
    'minitalk.memory_threshold_exceeded': true,
    ...memoryInfo
  });
}

// Helper function to log WebSocket errors
function logWebSocketError(error, socketInfo = {}) {
  logErrorToOTLP(error, 'websocket.error', {
    'minitalk.severity': 'error',
    'minitalk.category': 'websocket_failure',
    ...socketInfo
  });
}

// Export tracer and helper functions
module.exports = {
  tracer,
  logErrorToOTLP,
  logCriticalSystemError,
  logMemoryError,
  logWebSocketError
};

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.log('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
}); 
