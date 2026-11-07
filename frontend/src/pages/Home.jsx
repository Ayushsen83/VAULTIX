import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Vaultix!</h1>
        <p style={styles.subtitle}>You have successfully logged in.</p>
        <button onClick={() => navigate('/Notes')} style={styles.button}>
          View Notes
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '2.5rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.75rem',
    marginBottom: '0.75rem',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '1.5rem',
  },
  button: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};