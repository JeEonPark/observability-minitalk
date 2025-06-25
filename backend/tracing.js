const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Create OTLP exporter specifically for Datadog Agent
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://datadog-agent.monitoring.svc.cluster.local:4318/v1/traces',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create SDK instance with Datadog-optimized configuration
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'minitalk-backend',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.1',
  traceExporter: otlpExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, request) => {
          // Add custom attributes for HTTP requests
          span.setAttributes({
            'minitalk.http.user_agent': request.headers['user-agent'] || 'unknown',
            'minitalk.http.method': request.method,
            'dd.service': process.env.DD_SERVICE || 'minitalk-backend',
            'dd.env': process.env.DD_ENV || 'production',
            'dd.version': process.env.DD_VERSION || '1.0.1',
          });
        }
      },
      // Enable WebSocket instrumentation if available
      '@opentelemetry/instrumentation-socket.io': {
        enabled: true
      },
      // Disable some instrumentations that might cause issues
      '@opentelemetry/instrumentation-fs': {
        enabled: false
      }
    })
  ]
});

// Initialize the SDK
try {
  sdk.start();
  console.log('🔍 OpenTelemetry tracing initialized successfully for minitalk-backend');
  console.log('📊 Traces will be exported to Datadog Agent via OTLP');
  console.log(`🎯 OTLP Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://datadog-agent.monitoring.svc.cluster.local:4318/v1/traces'}`);
  console.log(`🏷️  Service: ${process.env.DD_SERVICE || 'minitalk-backend'} (${process.env.DD_ENV || 'production'})`);
} catch (error) {
  console.error('❌ Error initializing OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('🔍 OpenTelemetry terminated'))
    .catch((error) => console.log('❌ Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

module.exports = sdk; 
