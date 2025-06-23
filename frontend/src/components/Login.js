import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
`;

const LoginForm = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;

  &:focus {
    border-color: #667eea;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;

  &:hover {
    background: #667eea;
    color: white;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4757;
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  background: #fff5f5;
  border-radius: 8px;
`;

const SuccessMessage = styled.div`
  color: #2ed573;
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  background: #f0fff4;
  border-radius: 8px;
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
        setSuccess('Registration completed successfully. Please log in.');
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
      <LoginForm>
        <Title>
          {isLoginMode ? 'MiniTalk Login' : 'MiniTalk Sign Up'}
        </Title>
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Username</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
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
            />
          </FormGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isLoginMode ? 'Login' : 'Sign Up')}
          </Button>
        </form>
        
        <SecondaryButton type="button" onClick={toggleMode} disabled={loading}>
          {isLoginMode ? 'Create Account' : 'Sign In'}
        </SecondaryButton>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
      </LoginForm>
    </Container>
  );
};

export default Login; 
