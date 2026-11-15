import { useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Button from '../../components/Button';
import Notice from '../../components/Notice';
import uiStyles from '../../components/ui.module.css';
import type { AttachmentInput } from '../../types/api';
import styles from './chat.module.css';

export const MAX_MESSAGE_LENGTH = 1000;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain';

interface ComposerProps {
  onSend(body: string, attachment: AttachmentInput | null): Promise<void>;
}

/** Client checks are for usability only; the back-office re-validates everything (SR-VAL-01). */
export default function Composer({ onSend }: ComposerProps) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confidential, setConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyId = useId();
  const counterId = useId();

  const trimmed = body.trim();
  const canSend = !sending && trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;

  function chooseFile(selected: File | null) {
    setError(null);
    if (selected !== null && selected.size > ATTACHMENT_MAX_BYTES) {
      setError('Attachments are limited to 5 MB.');
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed, file === null ? null : { file, confidential });
      setBody('');
      setFile(null);
      setConfidential(false);
      if (fileInput.current !== null) fileInput.current.value = '';
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className={styles.composer} onSubmit={(event) => void submit(event)} aria-label="Send a message">
      {error && <Notice tone="error">{error}</Notice>}
      <label className={uiStyles.label} htmlFor={bodyId}>
        Message
      </label>
      <textarea
        id={bodyId}
        className={`${uiStyles.input} ${styles.textarea}`}
        value={body}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={3}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-describedby={counterId}
        placeholder="Write a message — Enter to send, Shift+Enter for a new line"
      />
      <div className={styles.composerBar}>
        <span id={counterId} className={uiStyles.hint}>
          {body.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <label className={styles.inline}>
          <span className="visually-hidden">Attachment</span>
          <input
            ref={fileInput}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            data-testid="attachment-input"
          />
        </label>
        {file !== null && (
          <label className={styles.inline}>
            <input
              type="checkbox"
              checked={confidential}
              onChange={(event) => setConfidential(event.target.checked)}
            />
            Mark as confidential
          </label>
        )}
        <Button type="submit" disabled={!canSend}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
