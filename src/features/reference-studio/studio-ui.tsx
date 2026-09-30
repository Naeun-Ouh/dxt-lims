import { Check, CircleAlert } from 'lucide-react';
import { titleFromId } from './authoring-model';

export type Notice = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;
export const statusTone = (status: string) =>
  status === 'ACTIVE' ? 'green' : status === 'DRAFT' ? 'amber' : 'neutral';
export const option = (id: string, label = titleFromId(id)) => (
  <option value={id} key={id}>
    {label}
  </option>
);
export function NoticeBox({ notice }: { notice: Exclude<Notice, null> }) {
  return (
    <div className={`rs-notice ${notice.tone}`}>
      {notice.tone === 'success' ? (
        <Check size={15} />
      ) : notice.tone === 'error' ? (
        <CircleAlert size={15} />
      ) : null}
      <span>{notice.text}</span>
    </div>
  );
}
