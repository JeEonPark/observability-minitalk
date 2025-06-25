// Use Datadog native tracing instead of OTLP for better compatibility
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'minitalk-backend',
  env: process.env.DD_ENV || 'production',
  version: process.env.DD_VERSION || '1.0.1',
  hostname: process.env.DD_TRACE_AGENT_HOSTNAME || 'datadog-agent.monitoring.svc.cluster.local',
  port: process.env.DD_TRACE_AGENT_PORT || 8126,
  logInjection: true,
  debug: false
});

console.log('🔍 Datadog native tracing initialized successfully for minitalk-backend');
console.log(`🎯 Datadog Agent: ${process.env.DD_TRACE_AGENT_HOSTNAME || 'datadog-agent.monitoring.svc.cluster.local'}:${process.env.DD_TRACE_AGENT_PORT || 8126}`);
console.log(`🏷️  Service: ${process.env.DD_SERVICE || 'minitalk-backend'} (${process.env.DD_ENV || 'production'})`);

module.exports = tracer; 
