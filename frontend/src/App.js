import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ChatRoomList from './components/ChatRoomList';
import ChatRoom from './components/ChatRoom';
import AdminPanel from './components/AdminPanel';
import GlobalStyle from './styles/GlobalStyle';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <GlobalStyle />
      <AppContainer>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/rooms" element={
              <ProtectedRoute>
                <ChatRoomList />
              </ProtectedRoute>
            } />
            <Route path="/chat/:roomId" element={
              <ProtectedRoute>
                <ChatRoom />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/rooms" />} />
          </Routes>
        </Router>
      </AppContainer>
    </AuthProvider>
  );
}

export default App; 
