import { useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Button from '../../components/Button';
import Notice from '../../components/Notice';
import uiStyles from '../../components/ui.module.css';
import type { AttachmentInput } from '../../types/api';
import { formatSize } from '../../utils/format';
import styles from './chat.module.css';

export const MAX_MESSAGE_LENGTH = 1000;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt'];
const ATTACHMENT_ACCEPT = [...ALLOWED_EXTENSIONS, ...ALLOWED_TYPES].join(',');

interface ComposerProps {
  onSend(
    body: string,
    attachment: AttachmentInput | null,
    onProgress: (percent: number) => void,
  ): Promise<void>;
}

function fileProblem(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const allowed =
    ALLOWED_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!allowed) return 'This file type is not allowed. Use PDF, PNG, JPEG or plain text.';
  if (file.size > ATTACHMENT_MAX_BYTES) return `Attachments are limited to 5 MB (this file: ${formatSize(file.size)}).`;
  return null;
}

/** Client checks are for usability only; the back-office re-validates everything (SR-VAL-01, SR-FILE-01). */
export default function Composer({ onSend }: ComposerProps) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confidential, setConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyId = useId();
  const counterId = useId();

  const trimmed = body.trim();
  const canSend = !sending && trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;

  function clearFile() {
    setFile(null);
    setConfidential(false);
    if (fileInput.current !== null) fileInput.current.value = '';
  }

  function chooseFile(selected: File | null) {
    setError(null);
    if (selected === null) {
      clearFile();
      return;
    }
    const problem = fileProblem(selected);
    if (problem !== null) {
      setError(problem);
      clearFile();
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
      await onSend(trimmed, file === null ? null : { file, confidential }, setProgress);
      setBody('');
      clearFile();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The message could not be sent.');
    } finally {
      setSending(false);
      setProgress(null);
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
          <span className="visually-hidden">Attachment (PDF, PNG, JPEG or text, 5 MB maximum)</span>
          <input
            ref={fileInput}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            data-testid="attachment-input"
          />
        </label>
        <Button type="submit" disabled={!canSend}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {file !== null && (
        <div className={styles.fileInfo} data-testid="selected-file">
          <span>
            {file.name} — {formatSize(file.size)}
          </span>
          <label className={styles.inline}>
            <input
              type="checkbox"
              checked={confidential}
              onChange={(event) => setConfidential(event.target.checked)}
            />
            Mark as confidential
          </label>
          <Button variant="ghost" onClick={clearFile} disabled={sending}>
            Remove file
          </Button>
        </div>
      )}
      {progress !== null && (
        <p className={styles.progress} role="status">
          <progress max={100} value={progress} /> Uploading… {progress}%
        </p>
      )}
      <span className={uiStyles.hint}>Attachments: PDF, PNG, JPEG or plain text, 5 MB maximum.</span>
    </form>
  );
}
