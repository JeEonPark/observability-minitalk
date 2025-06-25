import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Container = styled.div`
  min-height: 100vh;
  background: #0f1419;
  padding: 24px;
`;

const MaxWidthWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: #1a1d23;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  border: 1px solid #2d3748;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Title = styled.h1`
  color: #e4e6ea;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  color: #a0a3a7;
  font-size: 16px;
  margin: 0;
  font-weight: 400;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #242830;
  border-radius: 12px;
  border: 1px solid #2d3748;
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  background: #4285f4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
`;

const Username = styled.span`
  color: #e4e6ea;
  font-weight: 600;
  font-size: 14px;
`;

const AdminButton = styled.button`
  padding: 12px 20px;
  background: #ff9500;
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #e6850e;
    transform: translateY(-1px);
  }
`;

const LogoutButton = styled.button`
  padding: 12px 20px;
  background: #dc3545;
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #c82333;
    transform: translateY(-1px);
  }
`;

const CreateRoomSection = styled.div`
  background: #1a1d23;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  margin-bottom: 32px;
  border: 1px solid #2d3748;
`;

const SectionTitle = styled.h2`
  color: #e4e6ea;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 24px 0;
`;

const CreateRoomForm = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: #e4e6ea;
  font-size: 14px;
  font-weight: 600;
  margin-left: 4px;
`;

const Input = styled.input`
  padding: 14px 16px;
  border: 2px solid #2d3748;
  border-radius: 12px;
  font-size: 15px;
  background: #242830;
  transition: all 0.2s ease;
  font-family: inherit;
  color: #e4e6ea;

  &:focus {
    border-color: #4285f4;
    background: #2d3748;
    outline: none;
  }

  &::placeholder {
    color: #6b7280;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CreateButton = styled.button`
  padding: 14px 24px;
  background: #4285f4;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s ease;
  cursor: pointer;
  height: fit-content;

  &:hover {
    background: #3367d6;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: #4a5568;
  }
`;

const RoomListSection = styled.div`
  background: #1a1d23;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  border: 1px solid #2d3748;
`;

const RoomListHeader = styled.div`
  padding: 24px 32px;
  border-bottom: 2px solid #2d3748;
  background: #242830;
`;

const RoomListTitle = styled.h2`
  color: #e4e6ea;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #2d3748;
  transition: all 0.2s ease;

  &:hover {
    background: #242830;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const RoomInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RoomName = styled.h3`
  color: #e4e6ea;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const RoomDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ParticipantsList = styled.div`
  color: #a0a3a7;
  font-size: 14px;
  font-weight: 500;
`;

const RoomMeta = styled.div`
  color: #6b7280;
  font-size: 13px;
  display: flex;
  gap: 16px;
`;

const RoomActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
  }
`;

const JoinButton = styled(ActionButton)`
  background: #4285f4;
  color: white;
  border: 2px solid #4285f4;

  &:hover {
    background: #3367d6;
    border-color: #3367d6;
  }
`;

const LeaveButton = styled(ActionButton)`
  background: transparent;
  color: #dc3545;
  border: 2px solid #dc3545;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 32px;
  color: #6b7280;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: #a0a3a7;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
  }
`;

const ErrorMessage = styled.div`
  color: #f56565;
  background: #2d1b1b;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border-left: 4px solid #f56565;
  font-weight: 500;
`;

const StatsCard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatItem = styled.div`
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e4e6ea;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #1877f2;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #65676b;
  font-weight: 500;
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

  const handleLeaveRoom = async (roomId, roomName) => {
    if (window.confirm(`Are you sure you want to leave "${roomName}"?`)) {
      try {
        await api.post(`/chatrooms/${roomId}/leave`);
        fetchRooms(); // Refresh the room list
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to leave chat room.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container>
      <MaxWidthWrapper>
        <Header>
          <HeaderLeft>
            <Title>Chat Rooms</Title>
            <Subtitle>Manage your chat rooms efficiently</Subtitle>
          </HeaderLeft>
          <UserInfo>
            <UserBadge>
              <UserAvatar>
                {username.substring(0, 2).toUpperCase()}
              </UserAvatar>
              <Username>{username}</Username>
            </UserBadge>
            <AdminButton onClick={() => navigate('/admin')}>🛠️ Admin</AdminButton>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </UserInfo>
        </Header>

        <CreateRoomSection>
          <SectionTitle>Create New Chat Room</SectionTitle>
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
              <Label>Invite Users (optional)</Label>
              <Input
                type="text"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="e.g. user1, user2, user3"
                disabled={loading}
              />
            </FormGroup>
            <CreateButton type="submit" disabled={loading || !roomName.trim()}>
              {loading ? 'Creating...' : 'Create Room'}
            </CreateButton>
          </CreateRoomForm>
        </CreateRoomSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <RoomListSection>
          <RoomListHeader>
            <RoomListTitle>Your Chat Rooms ({rooms.length})</RoomListTitle>
          </RoomListHeader>
          {rooms.length === 0 ? (
            <EmptyState>
              <h3>No chat rooms yet</h3>
              <p>Create your first chat room to start conversations with your team.</p>
            </EmptyState>
          ) : (
            rooms.map((room) => (
              <RoomItem key={room.roomId}>
                <RoomInfo>
                  <RoomName>{room.name}</RoomName>
                  <RoomDetails>
                    <ParticipantsList>
                      {room.participants.length} member{room.participants.length !== 1 ? 's' : ''}: {room.participants.join(', ')}
                    </ParticipantsList>
                    {room.createdBy && (
                      <RoomMeta>
                        <span>Created by {room.createdBy}</span>
                        {room.createdAt && <span>• {new Date(room.createdAt).toLocaleDateString()}</span>}
                      </RoomMeta>
                    )}
                  </RoomDetails>
                </RoomInfo>
                <RoomActions>
                  <JoinButton onClick={() => handleJoinRoom(room.roomId)}>
                    Join Chat
                  </JoinButton>
                  <LeaveButton onClick={() => handleLeaveRoom(room.roomId, room.name)}>
                    Leave
                  </LeaveButton>
                </RoomActions>
              </RoomItem>
            ))
          )}
        </RoomListSection>
      </MaxWidthWrapper>
    </Container>
  );
};

export default ChatRoomList; 
