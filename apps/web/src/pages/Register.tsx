import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Register page redirects to the unified auth page with the signup tab active.
export function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login?tab=signup', { replace: true });
  }, [navigate]);

  return null;
}
