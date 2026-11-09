// frontend/src/pages/AuthCallback.jsx
// Página de retorno tras OAuth con Google o GitHub.
// Supabase redirige aquí con los tokens en la URL (#access_token=...).
// El cliente de Supabase los detecta automáticamente (detectSessionInUrl: true)
// y dispara onAuthStateChange → AppContext se actualiza → redirigimos al dashboard.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { Spinner } from '../components/common.jsx';

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Supabase ya procesó los tokens de la URL gracias a detectSessionInUrl: true.
    // Solo esperamos a que la sesión esté disponible y redirigimos.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        subscription.unsubscribe();
        navigate('/login', { replace: true });
      }
    });

    // Fallback: si en 5 segundos no hay evento, redirigimos al login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate('/login', { replace: true });
    }, 5000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
    >
      <Spinner />
    </div>
  );
}
