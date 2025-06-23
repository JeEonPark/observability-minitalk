import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #333;
  font-size: 24px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Username = styled.span`
  color: #667eea;
  font-weight: 600;
`;

const LogoutButton = styled.button`
  padding: 8px 16px;
  background: #ff4757;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.3s;

  &:hover {
    background: #ff3742;
  }
`;

const CreateRoomSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
`;

const CreateRoomForm = styled.form`
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const FormGroup = styled.div`
  flex: 1;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    border-color: #667eea;
  }
`;

const CreateButton = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const RoomList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const RoomInfo = styled.div`
  flex: 1;
`;

const RoomName = styled.h3`
  color: #333;
  margin-bottom: 5px;
`;

const RoomDetails = styled.p`
  color: #666;
  font-size: 14px;
`;

const JoinButton = styled.button`
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: #5a6fd8;
  }
`;

const DeleteButton = styled.button`
  padding: 8px 16px;
  background: #ff4757;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  margin-left: 10px;

  &:hover {
    background: #ff3742;
  }
`;

const RoomActions = styled.div`
  display: flex;
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ErrorMessage = styled.div`
  color: #ff4757;
  background: #fff5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const ChatRoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [participants, setParticipants] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await api.get('/chatrooms');
      setRooms(response.data);
    } catch (error) {
      setError('Failed to load chat room list.');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const participantList = participants
        .split(',')
        .map(p => p.trim())
        .filter(p => p && p !== username);

      await api.post('/chatrooms', {
        name: roomName,
        participants: participantList
      });

      setRoomName('');
      setParticipants('');
      fetchRooms();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create chat room.');
    }

    setLoading(false);
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (window.confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/chatrooms/${roomId}`);
        fetchRooms(); // Refresh the room list
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to delete chat room.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container>
      <Header>
        <Title>Chat Rooms</Title>
        <UserInfo>
          <Username>{username}</Username>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </UserInfo>
      </Header>

      <CreateRoomSection>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>Create New Chat Room</h3>
        <CreateRoomForm onSubmit={handleCreateRoom}>
          <FormGroup>
            <Label>Room Name</Label>
            <Input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              disabled={loading}
            />
          </FormGroup>
          <FormGroup>
            <Label>Invite Users (comma separated)</Label>
            <Input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="e.g. user1, user2, user3"
              disabled={loading}
            />
          </FormGroup>
          <CreateButton type="submit" disabled={loading || !roomName.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </CreateButton>
        </CreateRoomForm>
      </CreateRoomSection>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <RoomList>
        {rooms.length === 0 ? (
          <EmptyState>
            No chat rooms found.<br />
            Create a new chat room to get started!
          </EmptyState>
        ) : (
          rooms.map((room) => (
            <RoomItem key={room.roomId}>
              <RoomInfo>
                <RoomName>{room.name}</RoomName>
                <RoomDetails>
                  Participants: {room.participants.join(', ')} ({room.participants.length} members)
                  {room.createdBy && <span> • Created by: {room.createdBy}</span>}
                </RoomDetails>
              </RoomInfo>
              <RoomActions>
                <JoinButton onClick={() => handleJoinRoom(room.roomId)}>
                  Join
                </JoinButton>
                {room.createdBy === username && (
                  <DeleteButton onClick={() => handleDeleteRoom(room.roomId, room.name)}>
                    Delete
                  </DeleteButton>
                )}
              </RoomActions>
            </RoomItem>
          ))
        )}
      </RoomList>
    </Container>
  );
};

export default ChatRoomList; 
