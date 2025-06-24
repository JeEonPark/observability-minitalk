# 🚀 Observability 연수 - 대량 트래픽 대처 실습 문제집

## 📋 실습 환경 소개
- **시스템**: MiniTalk 실시간 채팅 시스템
- **로드 테스트 도구**: Python 기반 새해 축하 메시지 생성기
- **목표**: 대량 트래픽 상황에서 시스템 안정성 확보

---

## 🔥 Level 1: 기본 모니터링 구축

### 문제 1-1: 메트릭 수집 시스템 구축
**상황**: 현재 시스템에는 기본적인 로그만 있고, 성능 메트릭이 없습니다.

**과제**:
1. 다음 메트릭을 수집하는 시스템을 구축하세요:
   - 초당 메시지 처리량 (TPS)
   - 활성 사용자 수
   - 메모리 사용량
   - 응답 시간 (Latency)

**힌트**: 
- Prometheus + Grafana 또는 자체 메트릭 수집기 구현
- Node.js에서 `process.memoryUsage()` 활용

<details>
<summary>정답 보기</summary>

```javascript
// backend/middleware/metrics.js
class MetricsCollector {
  constructor() {
    this.metrics = {
      messageCount: 0,
      activeUsers: new Set(),
      startTime: Date.now(),
      responseTimes: [],
      memoryUsage: []
    };
    
    this.startMetricsCollection();
  }
  
  recordMessage() {
    this.metrics.messageCount++;
  }
  
  recordUser(userId) {
    this.metrics.activeUsers.add(userId);
  }
  
  recordResponseTime(time) {
    this.metrics.responseTimes.push(time);
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }
  
  startMetricsCollection() {
    setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.metrics.startTime) / 1000;
      const tps = this.metrics.messageCount / elapsed;
      const memory = process.memoryUsage();
      const avgResponseTime = this.metrics.responseTimes.length > 0 
        ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
        : 0;
      
      console.log(`📊 METRICS: TPS=${tps.toFixed(2)} | Users=${this.metrics.activeUsers.size} | Memory=${(memory.heapUsed/1024/1024).toFixed(1)}MB | Latency=${avgResponseTime.toFixed(2)}ms`);
    }, 5000);
  }
}

module.exports = new MetricsCollector();
```
</details>

---

### 문제 1-2: 알림 시스템 구축
**상황**: 시스템이 과부하 상태가 되어도 알 수 없습니다.

**과제**:
1. 다음 조건에서 알림을 발송하는 시스템을 구축하세요:
   - 메모리 사용량 > 80%
   - 응답 시간 > 1초
   - 에러율 > 5%
   - 큐 대기 메시지 > 10,000개

<details>
<summary>정답 보기</summary>

```javascript
// backend/monitoring/alerting.js
class AlertingSystem {
  constructor() {
    this.thresholds = {
      memoryUsage: 0.8,
      responseTime: 1000,
      errorRate: 0.05,
      queueSize: 10000
    };
    
    this.alertCooldown = new Map();
    this.cooldownPeriod = 60000; // 1분
  }
  
  checkAlerts(metrics) {
    const memory = process.memoryUsage();
    const memoryUsageRatio = memory.heapUsed / memory.heapTotal;
    
    if (memoryUsageRatio > this.thresholds.memoryUsage) {
      this.sendAlert('HIGH_MEMORY', `Memory usage: ${(memoryUsageRatio * 100).toFixed(1)}%`);
    }
    
    if (metrics.avgResponseTime > this.thresholds.responseTime) {
      this.sendAlert('HIGH_LATENCY', `Response time: ${metrics.avgResponseTime}ms`);
    }
    
    if (metrics.queueSize > this.thresholds.queueSize) {
      this.sendAlert('HIGH_QUEUE', `Queue size: ${metrics.queueSize}`);
    }
  }
  
  sendAlert(type, message) {
    const now = Date.now();
    const lastAlert = this.alertCooldown.get(type);
    
    if (!lastAlert || now - lastAlert > this.cooldownPeriod) {
      console.log(`🚨 ALERT [${type}]: ${message}`);
      // 여기에 Slack, 이메일 등 실제 알림 로직 추가
      this.alertCooldown.set(type, now);
    }
  }
}
```
</details>

---

## 🔥 Level 2: 성능 병목 해결

### 문제 2-1: Race Condition 해결
**상황**: 1000명 이상이 동시에 회원가입을 시도하면 데이터가 손실됩니다.

**재현 방법**:
```bash
cd load_test
python new_year_load_test.py
# 메뉴에서 4번 선택 (1000 users)
```

**증상**:
- `users.json` 파일이 비워짐
- 생성된 사용자 수가 요청한 수보다 적음

**과제**: Race Condition을 해결하여 데이터 무결성을 보장하세요.

<details>
<summary>정답 보기</summary>

**원인**: 동시에 여러 프로세스가 같은 파일을 읽고 쓰면서 데이터 덮어쓰기 발생

**해결책**: 큐 기반 원자적 파일 작업
```javascript
class FileDataManager {
  constructor() {
    this.fileQueues = new Map();
  }

  async queueFileOperation(filePath, operation) {
    if (!this.fileQueues.has(filePath)) {
      this.fileQueues.set(filePath, Promise.resolve());
    }
    
    const currentQueue = this.fileQueues.get(filePath);
    const newQueue = currentQueue.then(() => operation());
    this.fileQueues.set(filePath, newQueue);
    
    return newQueue;
  }

  async createUser(userData) {
    return this.queueFileOperation(this.usersFile, async () => {
      const users = await this.readFile(this.usersFile);
      users.push(newUser);
      await this.writeFile(this.usersFile, users);
      return newUser;
    });
  }
}
```
</details>

---

### 문제 2-2: 메모리 누수 해결
**상황**: 시간이 지날수록 메모리 사용량이 계속 증가합니다.

**재현 방법**:
```bash
# 장시간 메시지 폭탄 테스트 실행
python new_year_load_test.py
# 메뉴에서 6번 선택 (Ultra Test)
```

**과제**: 메모리 누수를 찾아 해결하세요.

<details>
<summary>정답 보기</summary>

**원인들**:
1. 캐시 데이터 무한 누적
2. 이벤트 리스너 정리 안됨
3. 타이머 정리 안됨

**해결책**:
```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = new Map();
    this.cacheTimeout = 5000;
    
    // 주기적 캐시 정리
    this.cleanupInterval = setInterval(() => {
      this.clearExpiredCache();
    }, this.cacheTimeout);
  }
  
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.lastUpdate.entries()) {
      if (now - timestamp > this.cacheTimeout * 2) {
        this.cache.delete(key);
        this.lastUpdate.delete(key);
      }
    }
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    this.lastUpdate.clear();
  }
}
```
</details>

---

## 🔥 Level 3: 확장성 설계

### 문제 3-1: 파일 크기 무한 증가 해결
**상황**: 메시지가 계속 누적되어 JSON 파일이 GB 단위로 증가합니다.

**재현 방법**:
```bash
# 대량 메시지 생성 후 messages.json 크기 확인
python new_year_load_test.py
# 메뉴에서 5번 선택하고 10분간 실행
ls -lh backend/data/storage/
```

**과제**: 파일 분할 시스템을 구현하여 성능을 유지하세요.

<details>
<summary>정답 보기</summary>

```javascript
class MessageFileManager {
  constructor() {
    this.maxMessagesPerFile = 100000;
    this.currentFileIndex = 1;
    this.messageFilePrefix = 'messages_';
  }
  
  async shouldCreateNewFile() {
    const currentFile = this.getCurrentMessageFile();
    const messages = await this.readFile(currentFile);
    return messages.length >= this.maxMessagesPerFile;
  }
  
  async createNewMessageFile() {
    this.currentFileIndex++;
    const newFile = this.getCurrentMessageFile();
    await this.initializeFile(newFile, []);
    console.log(`📂 Created new message file: ${newFile}`);
    return newFile;
  }
  
  getCurrentMessageFile() {
    return `${this.messageFilePrefix}${this.currentFileIndex}.json`;
  }
  
  async getAllMessageFiles() {
    const files = await fs.readdir(this.dataDir);
    return files
      .filter(file => file.startsWith('messages_') && file.endsWith('.json'))
      .sort((a, b) => {
        const aIndex = parseInt(a.match(/messages_(\d+)\.json/)[1]);
        const bIndex = parseInt(b.match(/messages_(\d+)\.json/)[1]);
        return aIndex - bIndex;
      });
  }
}
```
</details>

---

### 문제 3-2: 데이터베이스 도입
**상황**: 파일 기반 저장소의 한계에 도달했습니다.

**과제**: MongoDB 또는 PostgreSQL을 도입하여 확장성을 확보하세요.

<details>
<summary>정답 보기</summary>

```javascript
// MongoDB 예시
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

// 복합 인덱스로 쿼리 성능 최적화
messageSchema.index({ roomId: 1, timestamp: -1 });

class DatabaseManager {
  async createMessagesBatch(messagesData) {
    return await Message.insertMany(messagesData, { ordered: false });
  }
  
  async findMessagesByRoomId(roomId, options = {}) {
    let query = Message.find({ roomId });
    
    if (options.since) {
      query = query.where('timestamp').gt(new Date(options.since));
    }
    
    return await query
      .sort({ timestamp: 1 })
      .limit(options.limit || 100)
      .lean(); // 성능 최적화
  }
}
```
</details>

---

## 🔥 Level 4: 고급 최적화

### 문제 4-1: Redis 캐싱 도입
**상황**: 자주 조회되는 데이터 때문에 DB 부하가 심합니다.

**과제**: Redis를 도입하여 캐싱 시스템을 구축하세요.

<details>
<summary>정답 보기</summary>

```javascript
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
  }
  
  async getCachedMessages(roomId, options = {}) {
    const cacheKey = `messages:${roomId}:${JSON.stringify(options)}`;
    const cached = await this.client.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 캐시 미스 시 DB에서 조회
    const messages = await this.dbManager.findMessagesByRoomId(roomId, options);
    
    // 5분간 캐시
    await this.client.setex(cacheKey, 300, JSON.stringify(messages));
    
    return messages;
  }
  
  async invalidateRoomCache(roomId) {
    const pattern = `messages:${roomId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
```
</details>

---

### 문제 4-2: 로드 밸런싱 구현
**상황**: 단일 서버로는 대량 트래픽을 감당할 수 없습니다.

**과제**: 여러 인스턴스로 부하를 분산하는 시스템을 구축하세요.

<details>
<summary>정답 보기</summary>

```yaml
# docker-compose.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app1
      - app2
      - app3

  app1:
    build: .
    environment:
      - PORT=4001
      - INSTANCE_ID=app1
    
  app2:
    build: .
    environment:
      - PORT=4002
      - INSTANCE_ID=app2
      
  app3:
    build: .
    environment:
      - PORT=4003
      - INSTANCE_ID=app3

  redis:
    image: redis:alpine
    
  mongodb:
    image: mongo:latest
```

```nginx
# nginx.conf
upstream backend {
    least_conn;
    server app1:4001;
    server app2:4002;
    server app3:4003;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
</details>

---

## 🔥 Level 5: 실전 장애 대응

### 문제 5-1: 서킷 브레이커 구현
**상황**: 외부 API 호출 실패로 전체 시스템이 다운됩니다.

**과제**: 서킷 브레이커 패턴을 구현하여 장애 전파를 방지하세요.

<details>
<summary>정답 보기</summary>

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```
</details>

---

### 문제 5-2: 그레이스풀 셧다운 구현
**상황**: 서버 재시작 시 진행 중인 요청들이 손실됩니다.

**과제**: 안전한 서버 종료 시스템을 구현하세요.

<details>
<summary>정답 보기</summary>

```javascript
class GracefulShutdown {
  constructor(server, options = {}) {
    this.server = server;
    this.shutdownTimeout = options.timeout || 30000;
    this.isShuttingDown = false;
    this.activeConnections = new Set();
    
    this.setupSignalHandlers();
  }
  
  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }
  
  async shutdown(signal) {
    if (this.isShuttingDown) return;
    
    console.log(`🛑 Received ${signal}, starting graceful shutdown...`);
    this.isShuttingDown = true;
    
    // 새로운 연결 거부
    this.server.close(() => {
      console.log('✅ Server stopped accepting new connections');
    });
    
    // 진행 중인 작업 완료 대기
    const shutdownPromise = this.waitForActiveConnections();
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⏰ Shutdown timeout reached, forcing exit');
        resolve();
      }, this.shutdownTimeout);
    });
    
    await Promise.race([shutdownPromise, timeoutPromise]);
    
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  }
  
  async waitForActiveConnections() {
    while (this.activeConnections.size > 0) {
      console.log(`⏳ Waiting for ${this.activeConnections.size} active connections...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```
</details>

---

## 📊 실습 평가 기준

### 🏆 성능 지표
1. **처리량**: 초당 메시지 처리 개수
2. **응답 시간**: 평균/95퍼센타일 응답 시간
3. **가용성**: 시스템 다운타임
4. **확장성**: 동시 사용자 수 처리 능력

### 🎯 평가 레벨
- **Bronze**: 1,000 TPS, 100ms 응답시간
- **Silver**: 5,000 TPS, 50ms 응답시간  
- **Gold**: 10,000 TPS, 20ms 응답시간
- **Platinum**: 50,000 TPS, 10ms 응답시간

### 🧪 테스트 시나리오
```bash
# 기본 성능 테스트
python new_year_load_test.py
# 메뉴에서 4번 선택 (1000 users, 25 rooms, 180s)

# 극한 성능 테스트  
python new_year_load_test.py
# 메뉴에서 6번 선택 (10000 users, 35 rooms, 600s)

# 장애 상황 테스트
# 1. 메모리 부족 상황 시뮬레이션
# 2. 네트워크 지연 시뮬레이션  
# 3. 데이터베이스 연결 끊김 시뮬레이션
```

---

## 🎓 학습 목표

### 이론 학습
- [ ] Race Condition과 동시성 제어
- [ ] 캐싱 전략과 무효화
- [ ] 로드 밸런싱과 서킷 브레이커
- [ ] 모니터링과 알림 시스템

### 실무 경험
- [ ] 실제 성능 병목 진단
- [ ] 대량 트래픽 상황 대응
- [ ] 장애 상황 복구
- [ ] 확장성 있는 아키텍처 설계

### 도구 활용
- [ ] 성능 모니터링 도구
- [ ] 로드 테스트 도구
- [ ] 프로파일링 도구
- [ ] 인프라 관리 도구

---

*"이론으로 배운 것을 실제 상황에서 적용해보는 것이 진정한 학습입니다!" 🚀* 
