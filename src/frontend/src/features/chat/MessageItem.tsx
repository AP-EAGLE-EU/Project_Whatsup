import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import MessageBubble from '../../components/MessageBubble';
import Notice from '../../components/Notice';
import uiStyles from '../../components/ui.module.css';
import type { Attachment, Message } from '../../types/api';
import { formatSize } from '../../utils/format';
import { isSafeDownloadHref } from '../../utils/guards';
import styles from './chat.module.css';

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const label = `${attachment.filename} (${formatSize(attachment.size_bytes)})`;
  return (
    <p className={styles.attachment} data-testid="attachment">
      {attachment.confidential && <Badge tone="danger">Confidential</Badge>}{' '}
      {isSafeDownloadHref(attachment.download_url) ? (
        <a href={attachment.download_url} download={attachment.filename} rel="noopener">
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
    </p>
  );
}

interface ReportFormProps {
  onReport(reason: string): Promise<void>;
  onCancel(): void;
}

function ReportForm({ onReport, onCancel }: ReportFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const reasonId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length === 0) return;
    setSending(true);
    setError(null);
    try {
      await onReport(reason.trim());
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'The report could not be sent.');
      setSending(false);
    }
  }

  return (
    <form className={styles.reportForm} onSubmit={(event) => void submit(event)}>
      {error && <Notice tone="error">{error}</Notice>}
      <label className={uiStyles.label} htmlFor={reasonId}>
        Why is this message suspicious?
      </label>
      <input
        id={reasonId}
        className={uiStyles.input}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className={styles.reportActions}>
        <Button type="submit" variant="danger" disabled={sending || reason.trim().length === 0}>
          Send report
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface MessageItemProps {
  message: Message;
  own: boolean;
  onReport(messageId: number, reason: string): Promise<void>;
}

export default function MessageItem({ message, own, onReport }: MessageItemProps) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  async function report(reason: string) {
    await onReport(message.id, reason);
    setReporting(false);
    setReported(true);
  }

  return (
    <MessageBubble
      authorName={message.author.display_name}
      authorAvatar={message.author.avatar_url}
      body={message.body}
      createdAt={message.created_at}
      own={own}
    >
      {message.attachment !== null && <AttachmentChip attachment={message.attachment} />}
      {!own && !reporting && !reported && (
        <button type="button" className={styles.linkButton} onClick={() => setReporting(true)}>
          Report
        </button>
      )}
      {reported && <p className={styles.reported}>Reported — the IT admin team will review it.</p>}
      {reporting && <ReportForm onReport={report} onCancel={() => setReporting(false)} />}
    </MessageBubble>
  );
}
