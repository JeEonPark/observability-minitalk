import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket';
import api from '../services/api';

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  margin: 0 auto;
  background: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const RoomInfo = styled.div`
  h2 {
    margin-bottom: 5px;
  }
  
  p {
    opacity: 0.9;
    font-size: 14px;
  }
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
`;

const BackButton = styled(Button)`
  background: rgba(255, 255, 255, 0.2);
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const InviteButton = styled(Button)`
  background: white;
  color: #667eea;

  &:hover {
    background: #f8f9fa;
  }
`;

const DeleteRoomButton = styled(Button)`
  background: #ff4757;
  color: white;

  &:hover {
    background: #ff3742;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
`;

const Message = styled.div`
  margin-bottom: 15px;
  display: flex;
  width: 100%;
  ${props => props.isOwn ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
`;

const MessageBubble = styled.div`
  max-width: 400px;
  min-width: 100px;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  word-break: keep-all;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
  
  ${props => props.isOwn ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
  ` : `
    background: white;
    color: #333;
    border: 1px solid #e1e5e9;
    border-bottom-left-radius: 4px;
  `}

  @media (max-width: 768px) {
    max-width: 280px;
  }
`;

const MessageInfo = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 80%;
  ${props => props.isOwn ? 'align-items: flex-end;' : 'align-items: flex-start;'}

  @media (max-width: 768px) {
    max-width: 90%;
  }
`;

const SenderName = styled.span`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
`;

const MessageTime = styled.span`
  font-size: 11px;
  color: #999;
  margin-top: 4px;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 20px;
  background: white;
  border-top: 1px solid #e1e5e9;
  gap: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 25px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #667eea;
  }
`;

const SendButton = styled.button`
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 25px;
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

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
`;

const ModalTitle = styled.h3`
  margin-bottom: 20px;
  color: #333;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;

  &:focus {
    border-color: #667eea;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
`;

const CancelButton = styled(ModalButton)`
  background: #f1f2f6;
  color: #666;

  &:hover {
    background: #ddd;
  }
`;

const ConfirmButton = styled(ModalButton)`
  background: #667eea;
  color: white;

  &:hover {
    background: #5a6fd8;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4757;
  background: #fff5f5;
  padding: 15px;
  border-radius: 8px;
  margin: 20px;
`;

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { username, token } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRoomInfo();
    fetchMessages();
    
    // Connect to socket with current token
    if (token) {
      socketService.connect(token);
      socketService.joinRoom(roomId);
      
      // Listen for messages
      socketService.onMessage((messageData) => {
        setMessages(prev => [...prev, messageData]);
      });
    }

    return () => {
      if (token) {
        socketService.leaveRoom(roomId);
        socketService.offMessage();
      }
    };
  }, [roomId, token, username]); // Added username to dependencies

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRoomInfo = async () => {
    try {
      const response = await api.get('/chatrooms');
      const room = response.data.find(r => r.roomId === roomId);
             if (room) {
         setRoomInfo(room);
       } else {
         setError('Chat room not found.');
       }
     } catch (error) {
       setError('Failed to load chat room information.');
     }
  };

  const fetchMessages = async () => {
    try {
           const response = await api.get(`/chatrooms/${roomId}/messages`);
     setMessages(response.data);
   } catch (error) {
     setError('Failed to load messages.');
   }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketService.sendMessage(roomId, newMessage.trim());
      setNewMessage('');
    }
  };

  const handleInvite = async () => {
    if (!inviteInput.trim()) return;

    try {
      const participants = inviteInput
        .split(',')
        .map(p => p.trim())
        .filter(p => p);

      await api.post(`/chatrooms/${roomId}/invite`, { participants });
      setShowInviteModal(false);
      setInviteInput('');
      fetchRoomInfo(); // Refresh room info
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to invite users.');
    }
  };

  const handleDeleteRoom = async () => {
    if (window.confirm(`Are you sure you want to delete "${roomInfo?.name}"? This action cannot be undone and will remove all messages.`)) {
      try {
        await api.delete(`/chatrooms/${roomId}`);
        navigate('/rooms'); // Navigate back to room list
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to delete chat room.');
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <RoomInfo>
          <h2>{roomInfo?.name || 'Chat Room'}</h2>
          <p>Participants: {roomInfo?.participants.join(', ')}</p>
        </RoomInfo>
        <HeaderButtons>
          <InviteButton onClick={() => setShowInviteModal(true)}>
            Invite
          </InviteButton>
          {roomInfo?.createdBy === username && (
            <DeleteRoomButton onClick={handleDeleteRoom}>
              Delete Room
            </DeleteRoomButton>
          )}
          <BackButton onClick={() => navigate('/rooms')}>
            Back
          </BackButton>
        </HeaderButtons>
      </Header>

      <MessagesContainer>
        {messages.map((message, index) => {
          const isOwn = message.sender === username;
          return (
            <Message key={index} isOwn={isOwn}>
              <MessageInfo isOwn={isOwn}>
                {!isOwn && <SenderName>{message.sender}</SenderName>}
                <MessageBubble isOwn={isOwn}>
                  {message.content}
                </MessageBubble>
                <MessageTime>{formatTime(message.timestamp)}</MessageTime>
              </MessageInfo>
            </Message>
          );
        })}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <MessageInput
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <SendButton type="submit" disabled={!newMessage.trim()}>
            Send
          </SendButton>
        </form>
      </InputContainer>

      {showInviteModal && (
        <Modal onClick={() => setShowInviteModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Invite Users</ModalTitle>
            <ModalInput
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Enter usernames (comma separated)"
            />
            <ModalButtons>
              <CancelButton onClick={() => setShowInviteModal(false)}>
                Cancel
              </CancelButton>
              <ConfirmButton onClick={handleInvite}>
                Invite
              </ConfirmButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default ChatRoom; 
