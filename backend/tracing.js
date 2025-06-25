// Use Datadog native tracing instead of OTLP for better compatibility
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'minitalk-backend',
  env: process.env.DD_ENV || 'production',
  version: process.env.DD_VERSION || '1.0.1',
  hostname: process.env.DD_TRACE_AGENT_HOSTNAME || 'datadog-agent.monitoring.svc.cluster.local',
  port: process.env.DD_TRACE_AGENT_PORT || 8126,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
  debug: false
});

// Helper function to properly log errors to Datadog APM
function logErrorToDatadog(error, spanName = 'error', additionalTags = {}) {
  const span = tracer.startSpan(spanName);
  
  try {
    // Set error status on span - this makes it show as ERROR in Datadog APM
    span.setTag('error', true);
    span.setTag('error.type', error.name);
    span.setTag('error.message', error.message);
    span.setTag('error.stack', error.stack);
    
    // Add additional tags
    Object.keys(additionalTags).forEach(key => {
      span.setTag(key, additionalTags[key]);
    });
    
    // Add system metrics
    const memUsage = process.memoryUsage();
    span.setTag('system.memory.rss_mb', Math.round(memUsage.rss / 1024 / 1024));
    span.setTag('system.memory.heap_used_mb', Math.round(memUsage.heapUsed / 1024 / 1024));
    span.setTag('system.memory.heap_total_mb', Math.round(memUsage.heapTotal / 1024 / 1024));
    
    // Log to console with proper error level
    console.error('🚨 DATADOG ERROR LOGGED:', {
      error_type: error.name,
      error_message: error.message,
      span_name: spanName,
      tags: additionalTags
    });
    
    // Finish span with error status
    span.finish(error);
    
  } catch (loggingError) {
    console.error('Failed to log error to Datadog:', loggingError);
    span.finish();
  }
}

// Helper function to log critical system errors
function logCriticalSystemError(error, context = {}) {
  logErrorToDatadog(error, 'system.critical_error', {
    'minitalk.severity': 'critical',
    'minitalk.category': 'system_failure',
    ...context
  });
}

// Helper function to log memory errors
function logMemoryError(error, memoryInfo = {}) {
  logErrorToDatadog(error, 'system.memory_error', {
    'minitalk.severity': 'critical',
    'minitalk.category': 'memory_failure',
    'minitalk.memory_threshold_exceeded': true,
    ...memoryInfo
  });
}

// Helper function to log WebSocket errors
function logWebSocketError(error, socketInfo = {}) {
  logErrorToDatadog(error, 'websocket.error', {
    'minitalk.severity': 'error',
    'minitalk.category': 'websocket_failure',
    ...socketInfo
  });
}

console.log('🔍 Datadog native tracing initialized successfully for minitalk-backend');
console.log(`🎯 Datadog Agent: ${process.env.DD_TRACE_AGENT_HOSTNAME || 'datadog-agent.monitoring.svc.cluster.local'}:${process.env.DD_TRACE_AGENT_PORT || 8126}`);
console.log(`🏷️  Service: ${process.env.DD_SERVICE || 'minitalk-backend'} (${process.env.DD_ENV || 'production'})`);

// Export tracer and helper functions
module.exports = {
  tracer,
  logErrorToDatadog,
  logCriticalSystemError,
  logMemoryError,
  logWebSocketError
}; 
