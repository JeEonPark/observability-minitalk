const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { trace } = require('@opentelemetry/api');

console.log('🔧 Starting OpenTelemetry OTLP GRPC initialization...');

// Create OTLP GRPC exporter targeting Datadog Agent
const otlpExporter = new OTLPTraceExporter({
  url: 'http://datadog-agent.monitoring.svc.cluster.local:4317',
  headers: {},
});

console.log('🎯 OTLP GRPC Exporter created with URL: http://datadog-agent.monitoring.svc.cluster.local:4317');

// Initialize OpenTelemetry SDK with Datadog-compatible service info
const sdk = new NodeSDK({
  serviceName: 'minitalk-backend',
  serviceVersion: '1.0.1',
  traceExporter: otlpExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
    }),
  ],
});

console.log('⚙️ NodeSDK configured with GRPC OTLP exporter');

// Start the SDK
try {
  sdk.start();
  console.log('🔍 OpenTelemetry OTLP GRPC tracing initialized successfully for minitalk-backend');
  console.log(`🎯 OTLP GRPC Endpoint: http://datadog-agent.monitoring.svc.cluster.local:4317`);
  console.log(`🏷️  Service: minitalk-backend (production)`);
  console.log(`📋 Using GRPC instead of HTTP for better APM integration`);
} catch (error) {
  console.error('❌ Failed to start OpenTelemetry SDK:', error);
}

// Get tracer for custom spans
const tracer = trace.getTracer('minitalk-backend', '1.0.1');

// Create a test span with Datadog-compatible attributes
setTimeout(() => {
  console.log('🧪 Creating test span with GRPC OTLP...');
  const testSpan = tracer.startSpan('test.grpc.initialization');
  testSpan.setAttributes({
    'operation.name': 'test.grpc.initialization',
    'service.name': 'minitalk-backend',
    'env': 'production',
    'version': '1.0.1',
    'component': 'grpc_tracing_setup',
    'span.type': 'custom',
    'otlp.transport': 'grpc',
  });
  testSpan.end();
  console.log('✅ Test GRPC span created with Datadog-compatible attributes');
}, 2000);

// Helper function to properly log errors to OpenTelemetry traces
function logErrorToOTLP(error, spanName = 'error', additionalAttributes = {}) {
  const span = tracer.startSpan(spanName);
  
  try {
    // Set error status on span
    span.recordException(error);
    span.setStatus({
      code: 2, // ERROR
      message: error.message,
    });
    
    // Add Datadog-compatible error attributes
    span.setAttributes({
      'error': true,
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack,
      'service.name': 'minitalk-backend',
      'env': 'production',
      'otlp.transport': 'grpc',
      ...additionalAttributes
    });
    
    // Add system metrics
    const memUsage = process.memoryUsage();
    span.setAttributes({
      'system.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
      'system.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024),
      'system.memory.heap_total_mb': Math.round(memUsage.heapTotal / 1024 / 1024),
    });
    
    console.error('🚨 OTLP GRPC ERROR LOGGED:', {
      error_type: error.name,
      error_message: error.message,
      span_name: spanName,
      attributes: additionalAttributes
    });
    
  } catch (loggingError) {
    console.error('Failed to log error to OTLP GRPC:', loggingError);
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
  console.log('🛑 Shutting down OpenTelemetry GRPC...');
  sdk.shutdown()
    .then(() => console.log('✅ OpenTelemetry GRPC terminated'))
    .catch((error) => console.log('❌ Error terminating OpenTelemetry GRPC', error))
    .finally(() => process.exit(0));
}); 
 