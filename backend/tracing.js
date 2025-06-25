const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Create SDK instance with default configuration
const sdk = new NodeSDK({
  serviceName: 'minitalk-backend',
  serviceVersion: '1.0.1',
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true
      },
      '@opentelemetry/instrumentation-http': {
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
  console.log('📊 Traces will be exported via default OTLP configuration');
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
