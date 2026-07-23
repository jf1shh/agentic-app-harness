import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert } from 'lucide-react';
import { deriveKeyFromPassphrase } from '../lib/security/encryption';

interface VaultLockModalProps {
  isLocked: boolean;
  onUnlockSuccess: (key: CryptoKey, passphrase: string) => void;
}

export const VaultLockModal: React.FC<VaultLockModalProps> = ({
  isLocked,
  onUnlockSuccess,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!isLocked) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMsg('Please enter your Vault Passphrase / PIN.');
      return;
    }

    setIsUnlocking(true);
    setErrorMsg('');

    try {
      // Derive 256-bit AES-GCM Key using PBKDF2 with 100,000 iterations
      const { key } = await deriveKeyFromPassphrase(passphrase);
      onUnlockSuccess(key, passphrase);
      setPassphrase('');
    } catch (err) {
      console.error('PBKDF2 key derivation error:', err);
      setErrorMsg('Failed to unlock vault. Check passphrase.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      id="vault-lock-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(11, 15, 23, 0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '1px solid rgba(217, 119, 6, 0.3)',
          }}
        >
          <Lock size={32} aria-hidden="true" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          LexiVault is Locked
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Workstation auto-locked due to inactivity. Enter your Vault Passphrase to derive your AES-256 decryption key.
        </p>

        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
              id="input-vault-passphrase"
              type="password"
              placeholder="Vault Passphrase / PIN..."
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1rem',
                padding: '0.75rem',
                textAlign: 'center',
                letterSpacing: '0.1em',
              }}
              autoFocus
              required
              aria-label="Vault Passphrase Input"
            />
          </div>

          {errorMsg && (
            <div
              style={{
                fontSize: '0.8rem',
                color: '#fda4af',
                background: 'rgba(190, 18, 60, 0.2)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <ShieldAlert size={14} aria-hidden="true" /> {errorMsg}
            </div>
          )}

          <button
            id="btn-unlock-vault"
            type="submit"
            className="btn-primary"
            disabled={isUnlocking}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            <KeyRound size={18} aria-hidden="true" /> {isUnlocking ? 'Deriving PBKDF2 Key...' : 'Unlock Legal Vault'}
          </button>
        </form>
      </div>
    </div>
  );
};
