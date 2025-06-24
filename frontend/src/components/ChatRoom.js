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
  max-width: 1200px;
  margin: 0 auto;
  background: #1a1d23;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: #242830;
  border-bottom: 2px solid #2d3748;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const RoomInfo = styled.div`
  h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 700;
    color: #e4e6ea;
    letter-spacing: -0.5px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #a0a3a7;
    font-weight: 500;
  }
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const BackButton = styled(Button)`
  background: #2d3748;
  color: #a0a3a7;
  border-color: #4a5568;

  &:hover {
    background: #4a5568;
    color: #e4e6ea;
  }
`;

const InviteButton = styled(Button)`
  background: #4285f4;
  color: white;

  &:hover {
    background: #3367d6;
  }
`;

const LeaveRoomButton = styled(Button)`
  background: #dc3545;
  color: white;

  &:hover {
    background: #c82333;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  background: #0f1419;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #1a1d23;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #3a3f47;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #4a5058;
  }
`;

const MessageGroup = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOwn',
})`
  margin-bottom: 24px;
  display: flex;
  width: 100%;
  ${props => props.isOwn ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
`;

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOwn',
})`
  display: flex;
  flex-direction: column;
  max-width: 60%;
  ${props => props.isOwn ? 'align-items: flex-end;' : 'align-items: flex-start;'}

  @media (max-width: 768px) {
    max-width: 85%;
  }
`;

const MessageBubble = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOwn',
})`
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  word-break: keep-all;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 15px;
  position: relative;
  
  ${props => props.isOwn ? `
    background: #4285f4;
    color: white;
    border-bottom-right-radius: 4px;
    margin-left: 40px;
  ` : `
    background: #242830;
    color: #e4e6ea;
    border: 1px solid #2d3748;
    border-bottom-left-radius: 4px;
    margin-right: 40px;
  `}
`;

const SenderName = styled.div`
  font-size: 13px;
  color: #a0a3a7;
  margin-bottom: 6px;
  font-weight: 600;
  padding-left: 4px;
`;

const MessageTime = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  padding: 0 4px;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 20px 32px 24px;
  background: #1a1d23;
  border-top: 2px solid #2d3748;
  gap: 12px;
  align-items: flex-end;
`;

const MessageInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const MessageInput = styled.textarea`
  width: 100%;
  min-height: 44px;
  max-height: 120px;
  padding: 12px 16px;
  border: 2px solid #2d3748;
  border-radius: 22px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  resize: none;
  background: #242830;
  transition: all 0.2s ease;
  color: #e4e6ea;

  &:focus {
    border-color: #4285f4;
    background: #2d3748;
  }

  &::placeholder {
    color: #6b7280;
  }
`;

const SendButton = styled.button`
  padding: 12px 20px;
  background: #4285f4;
  color: white;
  border-radius: 22px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  height: 44px;

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

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: #1a1d23;
  padding: 32px;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border: 1px solid #2d3748;
`;

const ModalTitle = styled.h3`
  margin: 0 0 24px 0;
  color: #e4e6ea;
  font-size: 20px;
  font-weight: 700;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #2d3748;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 15px;
  background: #242830;
  transition: all 0.2s ease;
  color: #e4e6ea;

  &:focus {
    border-color: #4285f4;
    background: #2d3748;
    outline: none;
  }

  &::placeholder {
    color: #6b7280;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
`;

const CancelButton = styled(ModalButton)`
  background: #2d3748;
  color: #a0a3a7;
  border: 2px solid #4a5568;

  &:hover {
    background: #4a5568;
    color: #e4e6ea;
  }
`;

const ConfirmButton = styled(ModalButton)`
  background: #4285f4;
  color: white;
  border: 2px solid #4285f4;

  &:hover {
    background: #3367d6;
    border-color: #3367d6;
  }
`;

const ErrorMessage = styled.div`
  color: #f56565;
  background: #2d1b1b;
  padding: 16px 20px;
  border-radius: 12px;
  margin: 20px 32px;
  border-left: 4px solid #f56565;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 18px;
    color: #a0a3a7;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
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
  }, [roomId, token]); // Removed username from dependencies

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
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

  const handleLeaveRoom = async () => {
    if (window.confirm(`Are you sure you want to leave "${roomInfo?.name}"?`)) {
      try {
        await api.post(`/chatrooms/${roomId}/leave`);
        navigate('/rooms'); // Navigate back to room list
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to leave chat room.');
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
          <LeaveRoomButton onClick={handleLeaveRoom}>
            Leave Room
          </LeaveRoomButton>
          <BackButton onClick={() => navigate('/rooms')}>
            Back
          </BackButton>
        </HeaderButtons>
      </Header>

      <MessagesContainer>
        {messages.length === 0 ? (
          <EmptyState>
            <h3>Welcome to {roomInfo?.name || 'the chat room'}!</h3>
            <p>Start the conversation by sending your first message.</p>
          </EmptyState>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender === username;
            return (
              <MessageGroup key={index} isOwn={isOwn}>
                <MessageContent isOwn={isOwn}>
                  {!isOwn && <SenderName>{message.sender}</SenderName>}
                  <MessageBubble isOwn={isOwn}>
                    {message.content}
                  </MessageBubble>
                  <MessageTime>{formatTime(message.timestamp)}</MessageTime>
                </MessageContent>
              </MessageGroup>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <MessageInputWrapper>
          <MessageInput
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
            rows="1"
          />
        </MessageInputWrapper>
        <SendButton type="button" onClick={handleSendMessage} disabled={!newMessage.trim()}>
          Send
        </SendButton>
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
