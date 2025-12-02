

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Wrench, Mic, Lock, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, notify } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Name is optional for login, but used for registration fallback
      await login(name || email.split('@')[0], email, password);
      
      // Navigate based on role
      // Note: We need to check the user object in context, but since login is async and updates state,
      // it's safer to rely on the fact that if it threw error we wouldn't be here.
      // However, to know WHERE to go, we might need to check the API response or wait for context.
      // For simplicity in this structure, we default to profile, but the App header will show Admin button.
      navigate('/profile');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          notify('Error', 'Please enter your email address.');
          return;
      }
      try {
          await api.auth.resetPassword(email);