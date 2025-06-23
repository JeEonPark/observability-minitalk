# MiniTalk - Real-time Group Chat Service

A web-based chat application providing real-time messaging functionality.

## 🚀 Key Features

- 🔐 User registration and login
- 💬 Real-time chat room creation and participation
- 👥 Multi-user group chat
- 📨 Real-time message sending and receiving (WebSocket)
- 👋 Chat room invitation feature
- 📜 Message history viewing

## 🏗️ Tech Stack

### Backend
- Node.js + Express
- Socket.IO (WebSocket)
- MongoDB + Mongoose
- JWT Authentication
- bcrypt Encryption

### Frontend
- React 18
- Socket.IO Client
- Styled Components
- React Router
- Axios

### DevOps
- Docker & Docker Compose
- MongoDB Container

## 🐳 Installation & Setup

### Run with Docker Compose (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd minitalk

# Run all services with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d --build
```

Service Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MongoDB: localhost:27017

### Run in Development Environment

#### 1. Run MongoDB
```bash
# Install MongoDB locally or run with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### 2. Run Backend
```bash
cd backend
npm install
npm run dev
```

#### 3. Run Frontend
```bash
cd frontend
npm install
npm start
```

## 📋 API Specification

### Authentication
- `POST /api/auth/signup`: User registration
- `POST /api/auth/login`: User login

### Chat Rooms
- `POST /api/chatrooms`: Create chat room
- `GET /api/chatrooms`: Get list of joined chat rooms
- `POST /api/chatrooms/:roomId/invite`: Invite users
- `GET /api/chatrooms/:roomId/messages`: Get message history

### WebSocket Events
- `send_message`: Send message
- `join_room`: Join chat room
- `leave_room`: Leave chat room
- `message`: Receive message (broadcast)

## 🧪 Test Scenarios

1. **Registration and Login**
   - Create new account
   - Login to obtain token

2. **Chat Room Creation**
   - Enter chat room name
   - Invite other users

3. **Real-time Chatting**
   - Send messages
   - Verify real-time message reception

4. **User Invitation**
   - Invite new users to existing chat room
   - Verify invited user's message history access

## 🔧 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/chatapp
JWT_SECRET=your-secret-key-change-in-production
PORT=4000
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:4000
```

## 📁 Project Structure

```
minitalk/
├── backend/                 # Node.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── ws/                 # WebSocket handlers
│   ├── app.js              # Main server file
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Context API
│   │   ├── services/       # API & Socket services
│   │   └── styles/         # Styled components
│   └── Dockerfile
├── docker-compose.yml      # Docker Compose configuration
└── README.md
```

## 🚨 Important Notes

- Make sure to change JWT_SECRET in production environment
- MongoDB data is stored in Docker Volume
- CORS settings are relaxed for development environment

## 🐛 Troubleshooting

### Docker Related
```bash
# Check container logs
docker-compose logs [service-name]

# Restart containers
docker-compose restart [service-name]

# Complete cleanup including volumes and restart
docker-compose down -v
docker-compose up --build
```

### Port Conflicts
- If port 3000 (Frontend) or 4000 (Backend) is already in use
- Change port numbers in docker-compose.yml

## 📞 Support

Please create an issue if you encounter any problems or have suggestions for improvements. 
