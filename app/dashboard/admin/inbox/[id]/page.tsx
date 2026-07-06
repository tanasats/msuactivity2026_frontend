'use client';

import { useParams } from 'next/navigation';
import { MessageThread } from '@/components/MessageThread';

export default function AdminThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <MessageThread
      getUrl={`/api/admin/message-threads/${id}`}
      replyUrl={`/api/admin/message-threads/${id}/messages`}
      resolveUrl={`/api/admin/message-threads/${id}/resolve`}
      backHref="/dashboard/admin/inbox"
    />
  );
}
