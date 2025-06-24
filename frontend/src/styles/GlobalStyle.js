import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #0f1419;
    color: #e4e6ea;
    line-height: 1.6;
    font-size: 16px;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
    transition: all 0.2s ease;
    
    &:focus-visible {
      outline: 2px solid #4285f4;
      outline-offset: 2px;
    }
  }

  input, textarea {
    outline: none;
    font-family: inherit;
    
    &:focus {
      outline: none;
    }
    
    &:focus-visible {
      outline: 2px solid #4285f4;
      outline-offset: 2px;
    }
  }

  a {
    color: #4285f4;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1d23;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #3a3f47;
    border-radius: 4px;
    
    &:hover {
      background: #4a5058;
    }
  }

  /* Focus styles for better accessibility */
  *:focus-visible {
    outline: 2px solid #4285f4;
    outline-offset: 2px;
  }

  /* Smooth transitions for all interactive elements */
  button, input, textarea, a {
    transition: all 0.2s ease;
  }
`;

export default GlobalStyle; 
