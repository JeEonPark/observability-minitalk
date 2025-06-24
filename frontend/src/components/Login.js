import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
  background: #0f1419;
`;

const LoginCard = styled.div`
  background: #1a1d23;
  padding: 48px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 480px;
  border: 1px solid #2d3748;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  margin: 0 0 12px 0;
  color: #e4e6ea;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #a0a3a7;
  font-size: 16px;
  font-weight: 400;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #2d3748;
  border-radius: 12px;
  font-size: 16px;
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

const Button = styled.button`
  width: 100%;
  padding: 16px 24px;
  background: #4285f4;
  color: white;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 2px solid #4285f4;

  &:hover {
    background: #3367d6;
    border-color: #3367d6;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: #4a5568;
    border-color: #4a5568;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: #4285f4;
  border-color: #2d3748;
  margin-top: 16px;

  &:hover {
    background: #242830;
    border-color: #4285f4;
    color: #4285f4;
    transform: translateY(-1px);
  }

  &:disabled {
    background: transparent;
    color: #6b7280;
    border-color: #2d3748;
  }
`;

const MessageContainer = styled.div`
  margin-top: 24px;
`;

const ErrorMessage = styled.div`
  color: #f56565;
  background: #2d1b1b;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid #f56565;
  font-weight: 500;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  color: #48bb78;
  background: #1a2e1a;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid #48bb78;
  font-weight: 500;
  font-size: 14px;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 32px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #2d3748;
  }
  
  span {
    padding: 0 16px;
    color: #a0a3a7;
    font-size: 14px;
    font-weight: 500;
  }
`;

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      setLoading(false);
      return;
    }

    if (isLoginMode) {
      const result = await login(username, password);
      if (result.success) {
        navigate('/rooms');
      } else {
        setError(result.error);
      }
    } else {
      const result = await signup(username, password);
      if (result.success) {
        setSuccess('Registration completed successfully! Please log in.');
        setIsLoginMode(true);
        setPassword('');
      } else {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setSuccess('');
    setPassword('');
  };

  return (
    <Container>
      <LoginCard>
        <Header>
          <Title>MiniTalk</Title>
          <Subtitle>
            {isLoginMode ? 'Welcome back! Sign in to your account.' : 'Create a new account to get started.'}
          </Subtitle>
        </Header>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Username</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoComplete="username"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </FormGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
          </Button>
        </Form>
        
        <Divider>
          <span>or</span>
        </Divider>
        
        <SecondaryButton type="button" onClick={toggleMode} disabled={loading}>
          {isLoginMode ? 'Create New Account' : 'Sign In Instead'}
        </SecondaryButton>
        
        {(error || success) && (
          <MessageContainer>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
          </MessageContainer>
        )}
      </LoginCard>
    </Container>
  );
};

export default Login; 
