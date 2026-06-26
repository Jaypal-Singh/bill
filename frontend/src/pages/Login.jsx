import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Hardcoded owner login bypass
    if (username === '1234567890' && password === '2005') {
      const mockOwner = {
        _id: 'owner_id',
        username: '1234567890',
        role: 'owner',
        token: 'mock-owner-token-12345'
      };
      localStorage.setItem('userInfo', JSON.stringify(mockOwner));
      localStorage.setItem('token', mockOwner.token);
      navigate('/');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#030712] text-on-surface min-h-screen flex items-center justify-center relative overflow-hidden font-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* Background Watermark Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none stock-bg"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234d8eff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {/* Abstract Chart Lines Overlay */}
        <svg className="absolute bottom-0 w-full h-1/2 opacity-20 text-primary" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polyline fill="none" points="0,100 10,80 20,85 30,60 40,75 50,40 60,65 70,30 80,45 90,20 100,25 100,100" stroke="currentColor" strokeLinejoin="round" strokeWidth="0.5"></polyline>
          <polyline fill="none" points="0,100 15,90 25,95 35,70 45,85 55,50 65,75 75,40 85,55 95,30 100,35 100,100" stroke="#424754" strokeLinejoin="round" strokeWidth="0.25"></polyline>
        </svg>
      </div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-[420px] px-container-padding">
        {/* Glassmorphic Card */}
        <main className="glass-panel rounded-xl p-8 flex flex-col items-center">
          {/* Logo area */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center mb-4 border border-outline-variant shadow-[0_0_15px_rgba(77,142,255,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#adc6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h1 className="text-on-surface-variant font-medium text-sm text-center">Secure institutional access</h1>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            {error && <div className="text-error bg-error-container p-3 rounded mb-4 text-center text-sm">{error}</div>}

            <div className="w-full space-y-4">
              {/* Username Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] tracking-wider" htmlFor="username">
                  User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-outline">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="TX-0000"
                    className="w-full bg-[#0a1017] border border-surface-variant rounded focus:border-primary focus:ring-0 text-on-surface py-2.5 pl-10 pr-3 font-data-mono text-sm placeholder-outline transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] tracking-wider" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-outline">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0a1017] border border-surface-variant rounded focus:border-primary focus:ring-0 text-on-surface py-2.5 pl-10 pr-3 font-data-mono text-sm placeholder-outline transition-colors duration-200"
                  />
                </div>
              </div>

              

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-[#4d8eff] hover:bg-[#3b82f6] text-[#002e6a] font-semibold py-2.5 px-4 rounded mt-6 transition-colors duration-200 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Authenticating...' : 'Secure Login'}
                {!isLoading && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="w-full mt-8 pt-4 border-t border-surface-variant text-center space-y-2">
            <p className="text-on-surface-variant text-sm hover:text-primary transition-colors cursor-pointer">
              Emergency Protocol Activation
            </p>
            <p className="font-data-mono text-[10px] text-outline tracking-widest uppercase">
              System V. 4.2.0 • TLS 1.3 Active
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
