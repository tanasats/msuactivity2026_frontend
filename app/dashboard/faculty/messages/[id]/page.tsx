'use client';

import { useParams } from 'next/navigation';
import { MessageThread } from '@/components/MessageThread';

export default function FacultyThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <MessageThread
      getUrl={`/api/faculty/message-threads/${id}`}
      replyUrl={`/api/faculty/message-threads/${id}/messages`}
      backHref="/dashboard/faculty/messages"
    />
  );
}
