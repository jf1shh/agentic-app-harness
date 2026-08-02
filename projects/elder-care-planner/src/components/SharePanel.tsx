'use client';

import { useId, useState } from 'react';
import type { Plan } from '@/lib/schemas';
import { encodePlanForShare, buildShareUrl } from '@/lib/share';

interface Props {
  plan: Plan;
}

const MIN_PASSPHRASE_LENGTH = 6;

/**
 * Generates a shared family link (spec §11.6): an encrypted, gzip-compressed
 * snapshot of the current plan, carried entirely in a URL fragment so it
 * never reaches a server (spec §1.2).
 */
export function SharePanel({ plan }: Props) {
  const passphraseId = useId();
  const labelId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim().length < MIN_PASSPHRASE_LENGTH) {
      setError(`Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters — this is what protects the link.`);
      setLink(null);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fragment = await encodePlanForShare(plan, passphrase, createdBy.trim() || undefined);
      setLink(buildShareUrl(fragment));
      setCopied(false);
    } catch {
      setError('Could not create a link on this device. Try again.');
      setLink(null);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="share-panel" className="card no-print" aria-labelledby="share-heading">
      <h2 id="share-heading">Share this plan with family</h2>
      <p>
        Creates a link that opens this plan on a sibling&apos;s device.{' '}
        <strong>This is a snapshot, not sync</strong> — editing it here afterward, or editing it on
        their end, does not update the other side. Send a new link when the numbers change.
        Nothing is uploaded: the plan is encrypted on this device, and the link carries the whole
        thing in itself.
      </p>
      <p className="hint">
        Send the passphrase a different way than the link — a text, a call, in person — never in
        the same message. Anyone who has both can open it.
      </p>
      <form onSubmit={onGenerate}>
        <div className="grid">
          <div>
            <label htmlFor={passphraseId}>Passphrase</label>
            <input
              id={passphraseId}
              type="password"
              autoComplete="off"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              data-testid="sharelink-passphrase"
            />
          </div>
          <div>
            <label htmlFor={labelId}>
              Your name or label (optional)
              <span className="hint">Shown to whoever opens the link.</span>
            </label>
            <input
              id={labelId}
              type="text"
              maxLength={80}
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              data-testid="sharelink-created-by"
            />
          </div>
        </div>
        {error ? (
          <p className="callout" role="alert" data-testid="sharelink-error">
            {error}
          </p>
        ) : null}
        <p>
          <button type="submit" disabled={busy} data-testid="sharelink-generate">
            {busy ? 'Creating link…' : 'Create link'}
          </button>
        </p>
      </form>
      {link ? (
        <div data-testid="sharelink-result">
          <label htmlFor={`${passphraseId}-link`}>Link to send</label>
          <input
            id={`${passphraseId}-link`}
            type="text"
            readOnly
            value={link}
            data-testid="sharelink-url"
            onFocus={(e) => e.currentTarget.select()}
          />
          <p>
            <button type="button" className="secondary" onClick={onCopy} data-testid="sharelink-copy">
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </p>
        </div>
      ) : null}
    </section>
  );
}
