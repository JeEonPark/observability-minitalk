import React, { useState } from 'react';
import styled from 'styled-components';
import { deleteAllUsers, deleteAllMessages } from '../services/api';

const AdminPanel = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [deleteMessagesResult, setDeleteMessagesResult] = useState(null);

  const handleDeleteAllUsers = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL USERS?\n\nThis action cannot be undone!')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAllUsers('DELETE_ALL_USERS_CONFIRM');
      setDeleteResult(result);
      alert(`Successfully deleted ${result.deletedCount} users!`);
    } catch (error) {
      console.error('Delete all users error:', error);
      alert(`Delete failed: ${error.error || 'Unknown error occurred.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL MESSAGES?\n\nThis action cannot be undone!')) {
      return;
    }

    setIsDeletingMessages(true);
    try {
      const result = await deleteAllMessages('DELETE_ALL_MESSAGES_CONFIRM');
      setDeleteMessagesResult(result);
      alert(`Successfully deleted ${result.deletedCount} messages!`);
    } catch (error) {
      console.error('Delete all messages error:', error);
      alert(`Delete failed: ${error.error || 'Unknown error occurred.'}`);
    } finally {
      setIsDeletingMessages(false);
    }
  };

  return (
    <AdminContainer>
      <AdminHeader>
        <Title>🛠️ Admin Panel (Competition)</Title>
        <Subtitle>⚠️ Warning: These features are for competition preparation. Use with caution.</Subtitle>
      </AdminHeader>

      <AdminSection>
        <SectionTitle>🚨 Danger Zone</SectionTitle>
        <DangerButtonContainer>
          <DangerButton onClick={handleDeleteAllUsers} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : '🗑️ Delete All Users'}
          </DangerButton>
          <DangerButton onClick={handleDeleteAllMessages} disabled={isDeletingMessages}>
            {isDeletingMessages ? 'Deleting...' : '💬 Delete All Messages'}
          </DangerButton>
        </DangerButtonContainer>
        <WarningText>
          ⚠️ These buttons will permanently delete all data.<br/>
          Use only for initialization before competition starts!
        </WarningText>
      </AdminSection>

      {deleteResult && (
        <ResultSection>
          <ResultTitle>✅ User Deletion Complete</ResultTitle>
          <ResultText>Deleted users: {deleteResult.deletedCount}</ResultText>
          <ResultText>Deletion time: {new Date(deleteResult.timestamp).toLocaleString()}</ResultText>
        </ResultSection>
      )}

      {deleteMessagesResult && (
        <ResultSection>
          <ResultTitle>✅ Message Deletion Complete</ResultTitle>
          <ResultText>Deleted messages: {deleteMessagesResult.deletedCount}</ResultText>
          <ResultText>Files cleared: {deleteMessagesResult.filesCleared}</ResultText>
          <ResultText>Deletion time: {new Date(deleteMessagesResult.timestamp).toLocaleString()}</ResultText>
        </ResultSection>
      )}


    </AdminContainer>
  );
};

// Styled Components
const AdminContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`;

const AdminHeader = styled.div`
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  color: #dc3545;
  margin: 0 0 10px 0;
  font-size: 2em;
`;

const Subtitle = styled.p`
  color: #6c757d;
  margin: 0;
  font-style: italic;
`;

const AdminSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #dc3545;
  margin: 0 0 15px 0;
  font-size: 1.5em;
  border-bottom: 2px solid #dc3545;
  padding-bottom: 5px;
`;

const DangerButtonContainer = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const DangerButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.1em;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  flex: 1;
  min-width: 200px;

  &:hover:not(:disabled) {
    background: #c82333;
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const WarningText = styled.p`
  color: #856404;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  margin: 0;
  font-size: 0.9em;
`;

const ResultSection = styled.div`
  background: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const ResultTitle = styled.h3`
  color: #155724;
  margin: 0 0 10px 0;
`;

const ResultText = styled.p`
  color: #155724;
  margin: 5px 0;
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
`;

const ModalTitle = styled.h2`
  color: #dc3545;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 2em;
  cursor: pointer;
  color: #6c757d;
  
  &:hover {
    color: #dc3545;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  text-align: center;
`;

const WarningIcon = styled.div`
  font-size: 4em;
  margin-bottom: 15px;
`;

const WarningMessage = styled.div`
  font-size: 1.2em;
  margin-bottom: 15px;
  color: #dc3545;
`;

const WarningDetails = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: left;
  color: #856404;
  line-height: 1.5;
`;

const ConfirmationSection = styled.div`
  margin-bottom: 20px;
`;

const ConfirmationLabel = styled.div`
  margin-bottom: 10px;
  font-weight: bold;
  
  code {
    background: #f8f9fa;
    padding: 2px 6px;
    border-radius: 3px;
    color: #dc3545;
    font-family: monospace;
  }
`;

const ConfirmationInput = styled.input`
  width: 100%;
  padding: 10px;
  border: 2px solid #dee2e6;
  border-radius: 5px;
  font-size: 1em;
  
  &:focus {
    outline: none;
    border-color: #dc3545;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 20px;
  border-top: 1px solid #dee2e6;
`;

const CancelButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  
  &:hover {
    background: #5a6268;
  }
`;

const ConfirmButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover:not(:disabled) {
    background: #c82333;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

export default AdminPanel; 
