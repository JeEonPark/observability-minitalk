# MiniTalk - Real-time Group Chat Service

A high-performance web-based chat application with real-time messaging, observability features, and Kubernetes deployment support.

## 🚀 Key Features

- 🔐 User registration and login with JWT authentication
- 💬 Real-time chat room creation and participation
- 👥 Multi-user group chat with WebSocket
- 📨 Real-time message sending and receiving
- 👋 Chat room invitation feature
- 📜 Message history viewing
- 📊 Observability with OpenTelemetry tracing
- 🐳 Docker & Kubernetes deployment ready
- 🧪 Comprehensive load testing suite
- ⚡ High-performance batch message processing

## 🏗️ Tech Stack

### Backend
- **Node.js 18+** with Express
- **Socket.IO 4.7.2** (WebSocket)
- **File-based storage** with JSON files
- **JWT Authentication** with bcryptjs
- **OpenTelemetry** for distributed tracing
- **DataDog APM** integration

### Frontend
- **React 18.2.0**
- **Socket.IO Client 4.7.2**
- **Styled Components 6.0.7**
- **React Router DOM 6.14.2**
- **Axios 1.4.0**

### DevOps & Infrastructure
- **Docker & Docker Compose**
- **Kubernetes** deployment manifests
- **ArgoCD** for GitOps
- **Load Testing** with Python
- **Performance Monitoring**

## 🐳 Quick Start with Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd minitalk

# Run all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

**Service Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (local or cloud)
- kubectl configured
- ArgoCD (optional, for GitOps)

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy load test (optional)
kubectl apply -f k8s/loadtest-deployment.yaml
```

### AWS Deployment
```bash
# Use AWS-specific manifests
kubectl apply -f k8s/backend-deployment-aws.yaml
kubectl apply -f k8s/frontend-deployment-aws.yaml
kubectl apply -f k8s/loadtest-deployment-aws.yaml
```

### ArgoCD GitOps
```bash
# Apply ArgoCD application
kubectl apply -f argocd-app.yaml
```

## 🧪 Load Testing

### Python Load Test Suite

```bash
cd load_test

# Install dependencies
pip install -r requirements.txt

# Run interactive load test
python new_year_load_test.py
```

### Test Scenarios
1. **🚀 Quick Test** - 30 users, 10 rooms, 30 seconds
2. **🏃 Medium Test** - 100 users, 15 rooms, 60 seconds
3. **💪 Strong Test** - 500 users, 20 rooms, 120 seconds
4. **🔥 Extreme Test** - 1000 users, 25 rooms, 180 seconds
5. **🌟 Mega Test** - 5000 users, 30 rooms, 300 seconds
6. **🚀 Ultra Test** - 10000 users, 35 rooms, 600 seconds

### Performance Features
- **Batch Processing**: 100 messages per batch
- **Concurrent Connections**: Up to 1000 parallel operations
- **Memory Optimization**: Configurable heap size (8GB-32GB)
- **Race Condition Prevention**: Queue-based file operations

## 📊 Observability

### OpenTelemetry Integration
- **Distributed Tracing** across services
- **OTLP HTTP Exporter** for trace collection
- **Auto-instrumentation** for Node.js
- **Semantic Conventions** for standardized attributes

### DataDog APM
- **dd-trace** integration for APM
- **Performance monitoring** and alerting
- **Custom metrics** and dashboards

## 📋 API Specification

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Chat Rooms
- `POST /api/chatrooms` - Create chat room
- `GET /api/chatrooms` - Get joined chat rooms
- `POST /api/chatrooms/:roomId/invite` - Invite users
- `GET /api/chatrooms/:roomId/messages` - Get message history

### WebSocket Events
- `send_message` - Send message (batch processed)
- `join_room` - Join chat room
- `leave_room` - Leave chat room
- `message` - Receive message (broadcast)

## 🔧 Environment Variables

### Backend (.env)
```env
JWT_SECRET=your-secret-key-change-in-production
PORT=4000
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
DD_SERVICE=minitalk-backend
DD_ENV=production
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:4000
```

## 📁 Project Structure

```
minitalk/
├── backend/                    # Node.js backend
│   ├── models/                # Data models
│   ├── routes/                # API routes
│   ├── middleware/            # Authentication middleware
│   ├── ws/                    # WebSocket handlers
│   ├── data/                  # File-based storage
│   │   ├── dataManager.js     # Data management with batch processing
│   │   └── storage/           # JSON data files
│   ├── tracing.js             # OpenTelemetry setup
│   ├── app.js                 # Main server file
│   └── Dockerfile
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # Context API
│   │   ├── services/          # API & Socket services
│   │   └── styles/            # Styled components
│   └── Dockerfile
├── k8s/                       # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── loadtest-deployment.yaml
│   └── *-aws.yaml            # AWS-specific configs
├── load_test/                 # Load testing suite
│   ├── new_year_load_test.py  # Main load test script
│   ├── requirements.txt
│   └── README.md
├── docker-compose.yml         # Docker Compose configuration
├── argocd-app.yaml           # ArgoCD application
└── README.md
```

## ⚡ Performance Optimizations

### Batch Message Processing
- **Message Queue**: Accumulates messages for batch processing
- **Batch Size**: 100 messages per batch
- **Flush Interval**: 50ms processing cycle
- **File I/O Reduction**: Single write per batch instead of per message

### Memory Management
- **Heap Size**: Configurable from 8GB to 32GB
- **Garbage Collection**: Optimized for high-throughput scenarios
- **Connection Pooling**: Efficient WebSocket connection management

### Scalability Features
- **Horizontal Scaling**: Kubernetes-ready deployment
- **Load Balancing**: Multiple backend instances
- **Stateless Design**: File-based storage for easy scaling

## 🚨 Important Notes

- **JWT_SECRET**: Change in production environment
- **File Storage**: Data stored in Docker volumes or persistent volumes
- **CORS**: Configured for development; adjust for production
- **Memory Limits**: Adjust Node.js heap size based on load requirements

## 🐛 Troubleshooting

### Docker Issues
```bash
# Check container logs
docker-compose logs [service-name]

# Restart containers
docker-compose restart [service-name]

# Complete cleanup
docker-compose down -v
docker-compose up --build
```

### Kubernetes Issues
```bash
# Check pod status
kubectl get pods -n minitalk

# View logs
kubectl logs -f deployment/backend -n minitalk

# Port forward for debugging
kubectl port-forward svc/backend 4000:4000 -n minitalk
```

### Performance Issues
```bash
# Check memory usage
kubectl top pods -n minitalk

# Scale backend for more capacity
kubectl scale deployment backend --replicas=3 -n minitalk
```

### Load Test Issues
```bash
# Check load test pod
kubectl exec -it deployment/loadtest -n minitalk -- python new_year_load_test.py

# Monitor backend performance during load test
kubectl logs -f deployment/backend -n minitalk
```

## 📞 Support

For issues, questions, or contributions:
- Create an issue in the repository
- Review performance solutions in `FINAL_PERFORMANCE_SOLUTION.md`

## 📈 Performance Metrics

### Current Capabilities
- **Concurrent Users**: 10,000+ simultaneous connections
- **Message Throughput**: 25+ messages/second per user
- **Response Time**: <100ms for message delivery
- **Uptime**: 99.9% availability with proper configuration

### Load Test Results
- **Quick Test**: 30 users, 10 rooms - ✅ Pass
- **Medium Test**: 100 users, 15 rooms - ✅ Pass
- **Strong Test**: 500 users, 20 rooms - ✅ Pass
- **Extreme Test**: 1000 users, 25 rooms - ✅ Pass
- **Mega Test**: 5000 users, 30 rooms - ✅ Pass
- **Ultra Test**: 10000 users, 35 rooms - ✅ Pass
