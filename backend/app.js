// Initialize OpenTelemetry BEFORE any other imports
const { tracer, logCriticalSystemError, logMemoryError } = require('./tracing');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { authenticateSocket } = require('./middleware/auth');
const { handleSocketConnection } = require('./ws/socketHandler');
const dataManager = require('/app/data/dataManager');

// FAST_HASH completely disabled for normal operation
process.env.FAST_HASH = 'false';
process.env.UV_THREADPOOL_SIZE = '128'; // Increase thread pool for better I/O performance
process.env.NODE_OPTIONS = '--max-old-space-size=8192'; // 8GB memory limit

// Increase system limits for massive concurrent connections
process.setMaxListeners(0); // Unlimited event listeners

console.log('🚀 FAST HASH MODE ACTIVATED for load testing!');
console.log('💥 INSANE PERFORMANCE MODE ACTIVATED!');
console.log(`🔥 Thread pool size: ${process.env.UV_THREADPOOL_SIZE}`);
console.log(`💪 Memory limit: 8GB`);

// ========== CRITICAL ERROR MONITORING & ALERTING SYSTEM ==========
// This is what was missing! We need to catch system-level failures!

// Catch uncaught exceptions (memory overflows, etc.)
process.on('uncaughtException', (error) => {
  console.error('🚨 CRITICAL ERROR - UNCAUGHT EXCEPTION:');
  console.error('❌ ERROR TYPE:', error.name);
  console.error('❌ ERROR MESSAGE:', error.message);
  console.error('❌ STACK TRACE:', error.stack);
  console.error('💀 PROCESS WILL EXIT - SYSTEM OVERLOAD DETECTED!');
  
  // Log memory usage at time of crash
  const memUsage = process.memoryUsage();
  console.error('📊 MEMORY AT CRASH:');
  console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.error(`   Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  console.error(`   External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  
  // Log to Datadog APM as CRITICAL ERROR
  logCriticalSystemError(error, {
    'minitalk.crash_type': 'uncaught_exception',
    'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
    'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024),
    'minitalk.process_will_exit': true
  });
  
  // Exit gracefully after logging
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Catch unhandled promise rejections (database overloads, etc.)
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 CRITICAL ERROR - UNHANDLED PROMISE REJECTION:');
  console.error('❌ REASON:', reason);
  console.error('❌ PROMISE:', promise);
  console.error('💀 POTENTIAL SYSTEM OVERLOAD - INVESTIGATE IMMEDIATELY!');
  
  // Log memory usage
  const memUsage = process.memoryUsage();
  console.error('📊 MEMORY AT REJECTION:');
  console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  
  // Create error object from reason if it's not already an error
  const error = reason instanceof Error ? reason : new Error(String(reason));
  
  // Log to Datadog APM as CRITICAL ERROR
  logCriticalSystemError(error, {
    'minitalk.crash_type': 'unhandled_rejection',
    'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
    'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024),
    'minitalk.promise_rejection': true
  });
});

// Monitor memory usage and warn before crash
let memoryWarningCount = 0;
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);
  
  // Warning thresholds
  if (heapUsedMB > 6000 || rssMB > 7000) { // 6GB heap or 7GB RSS
    memoryWarningCount++;
    console.error('🚨 MEMORY WARNING - APPROACHING LIMITS:');
    console.error(`⚠️  Heap Used: ${heapUsedMB}MB (Limit: ~8000MB)`);
    console.error(`⚠️  RSS: ${rssMB}MB`);
    console.error(`⚠️  Warning Count: ${memoryWarningCount}`);
    
    // Log to Datadog APM as MEMORY ERROR
    const memoryError = new Error(`Memory usage approaching limits: Heap ${heapUsedMB}MB, RSS ${rssMB}MB`);
    logMemoryError(memoryError, {
      'minitalk.memory.heap_used_mb': heapUsedMB,
      'minitalk.memory.rss_mb': rssMB,
      'minitalk.memory.warning_count': memoryWarningCount,
      'minitalk.memory.threshold_exceeded': true
    });
    
    if (memoryWarningCount > 5) {
      console.error('💀 CRITICAL: MEMORY WARNINGS EXCEEDED - SYSTEM UNSTABLE!');
      
      // Log CRITICAL memory error to Datadog
      const criticalMemoryError = new Error(`Critical memory warnings exceeded: ${memoryWarningCount} warnings`);
      logCriticalSystemError(criticalMemoryError, {
        'minitalk.memory.critical': true,
        'minitalk.memory.warning_count': memoryWarningCount,
        'minitalk.system_unstable': true
      });
    }
  } else {
    memoryWarningCount = 0; // Reset if memory usage drops
  }
}, 5000); // Check every 5 seconds

// Monitor event loop lag (CPU overload detection) - More accurate method
let eventLoopWarningCount = 0;
let lastEventLoopLogTime = 0;

function measureEventLoopLag() {
  const start = process.hrtime.bigint();
  
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert nanoseconds to milliseconds
    
    // If event loop lag is over 100ms, we have a problem
    if (lag > 100) {
      eventLoopWarningCount++;
      const now = Date.now();
      
      // 10초마다 한 번씩만 로깅 (스팸 방지)
      if (now - lastEventLoopLogTime > 10000) {
        console.error('🚨 EVENT LOOP LAG WARNING:');
        console.error(`⚠️  Lag: ${Math.round(lag)}ms (Normal: <10ms)`);
        console.error(`⚠️  Warning Count: ${eventLoopWarningCount}`);
        
        // Log to Datadog APM as PERFORMANCE ERROR
        const lagError = new Error(`Event loop lag detected: ${Math.round(lag)}ms`);
        logCriticalSystemError(lagError, {
          'minitalk.performance.event_loop_lag_ms': Math.round(lag),
          'minitalk.performance.cpu_overload': lag > 1000,
          'minitalk.performance.warning_count': eventLoopWarningCount,
          'minitalk.category': 'performance_issue'
        });
        
        if (lag > 1000) {
          console.error('💀 CRITICAL: EVENT LOOP BLOCKED - CPU OVERLOAD!');
        }
        
        lastEventLoopLogTime = now;
      }
    } else {
      // Reset warning count if lag is normal
      if (eventLoopWarningCount > 0 && lag < 50) {
        eventLoopWarningCount = 0;
      }
    }
    
    // Schedule next measurement
    setTimeout(measureEventLoopLag, 5000); // Check every 5 seconds
  });
}

// Start event loop monitoring
measureEventLoopLag();

// ========== END CRITICAL ERROR MONITORING ==========

const app = express();
const server = http.createServer(app);

// INSANE PERFORMANCE Socket.IO configuration! 🚀💥
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"]
  },
  // MEGA PERFORMANCE optimizations for massive concurrent connections! 💪
  maxHttpBufferSize: 1e8, // 100MB buffer for huge messages
  pingTimeout: 60000, // 60 seconds ping timeout
  pingInterval: 25000, // 25 seconds ping interval
  upgradeTimeout: 30000, // 30 seconds upgrade timeout
  allowEIO3: true, // Support older clients
  transports: ['websocket', 'polling'], // Both transports for maximum compatibility
  // INSANE connection limits!
  maxConnections: 100000, // Support up to 100K concurrent connections!
  perMessageDeflate: false, // Disable compression for speed
  httpCompression: false, // Disable HTTP compression for speed
  // Ultra fast message processing
  allowRequest: (req, callback) => {
    // Always allow for maximum speed
    callback(null, true);
  }
});

// Middleware with MEGA PAYLOAD support for massive load testing! 🚀💥
app.use(cors());

// ULTRA LARGE payload limits for MEGA BATCH operations! 💪
app.use(express.json({ 
  limit: '100mb',  // 100MB limit for massive batch requests!
  parameterLimit: 100000,  // Support for massive parameter counts
  extended: true 
}));

app.use(express.urlencoded({ 
  limit: '100mb',  // 100MB limit for URL encoded data too
  parameterLimit: 100000,
  extended: true 
}));

// Initialize file storage (replaces MongoDB connection)
console.log('Initializing file-based storage...');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MiniTalk Backend is running' });
});

app.get('/ready', (req, res) => {
  // Simple readiness check - if server is running, it's ready
    res.json({ status: 'OK', message: 'MiniTalk Backend is ready' });
});

// Socket.IO connection handling
io.use(authenticateSocket);
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

// Add Socket.IO server-level error handling
io.engine.on('connection_error', (err) => {
  console.error('🚨 SOCKET.IO ENGINE CONNECTION ERROR:');
  console.error('❌ Error Code:', err.code);
  console.error('❌ Error Message:', err.message);
  console.error('❌ Error Context:', err.context);
  
  // Log memory usage during engine error
  const memUsage = process.memoryUsage();
  console.error('📊 Memory Usage at Engine Error:');
  console.error(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.error(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  
  // Create error object for Datadog logging
  const engineError = new Error(`Socket.IO Engine Error: ${err.message || err.code}`);
  engineError.name = 'SocketIOEngineError';
  
  // Log to OpenTelemetry as ERROR
  logCriticalSystemError(engineError, {
    'minitalk.operation': 'socketio_engine',
    'minitalk.error_code': err.code,
    'minitalk.error_context': JSON.stringify(err.context),
    'minitalk.memory.rss_mb': Math.round(memUsage.rss / 1024 / 1024),
    'minitalk.memory.heap_used_mb': Math.round(memUsage.heapUsed / 1024 / 1024)
  });
  
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    console.error('💀 CRITICAL: NETWORK OVERLOAD DETECTED!');
    
    // Log network overload as CRITICAL
    const networkError = new Error(`Network overload detected: ${err.code}`);
    logCriticalSystemError(networkError, {
      'minitalk.operation': 'socketio_engine',
      'minitalk.network_overload': true,
      'minitalk.error_code': err.code,
      'minitalk.system_unstable': true
    });
  }
});

// Monitor Socket.IO connection count and warn on overload
setInterval(() => {
  const connectedSockets = io.engine.clientsCount;
  
  if (connectedSockets > 80000) { // 80% of our 100K limit
    console.error('🚨 SOCKET CONNECTION WARNING:');
    console.error(`⚠️  Connected Sockets: ${connectedSockets} (Limit: 100,000)`);
    
    // Log socket overload warning to Datadog
    const socketWarning = new Error(`Socket connection approaching limit: ${connectedSockets}/100,000`);
    logCriticalSystemError(socketWarning, {
      'minitalk.operation': 'socket_monitoring',
      'minitalk.connected_sockets': connectedSockets,
      'minitalk.socket_limit': 100000,
      'minitalk.socket_warning': true,
      'minitalk.category': 'capacity_issue'
    });
    
    if (connectedSockets > 95000) {
      console.error('💀 CRITICAL: SOCKET CONNECTION LIMIT APPROACHING!');
      
      // Log critical socket overload to Datadog
      const criticalSocketError = new Error(`CRITICAL: Socket connection limit approaching: ${connectedSockets}/100,000`);
      logCriticalSystemError(criticalSocketError, {
        'minitalk.operation': 'socket_monitoring',
        'minitalk.connected_sockets': connectedSockets,
        'minitalk.socket_limit': 100000,
        'minitalk.socket_critical': true,
        'minitalk.system_unstable': true
      });
    }
  }
  
  // Also log current stats every 30 seconds if we have connections
  if (connectedSockets > 0) {
    console.log(`📊 Active Connections: ${connectedSockets}`);
  }
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
