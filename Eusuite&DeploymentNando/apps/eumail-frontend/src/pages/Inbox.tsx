import { useState, useEffect } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { MessageListItem } from '../components/MessageListItem';
import { getInbox, type MailPreview } from '../api/mailApi';

export function Inbox() {
  const [messages, setMessages] = useState<MailPreview[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInbox();
      setMessages(data.messages);
      setTotal(data.total);
      setUnread(data.unread);
    } catch (err) {
      setError('Kon inbox niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl">
            <Mail className="text-rose-500" size={24} />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Inbox</h1>
          {unread > 0 && (
            <span className="px-3 py-1 text-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-medium shadow-sm">
              {unread} nieuw
            </span>
          )}
        </div>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="p-2.5 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={`text-rose-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="divide-y divide-rose-100">
        {loading && messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw size={32} className="mx-auto mb-4 animate-spin text-rose-500" />
            <p>Inbox laden...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-rose-500 font-medium">{error}</p>
            <button
              onClick={fetchInbox}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
            >
              Opnieuw proberen
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center">
              <Mail size={40} className="text-rose-300" />
            </div>
            <p className="text-lg font-medium text-gray-700">Geen berichten</p>
            <p className="text-sm text-gray-500 mt-1">Je inbox is leeg</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageListItem key={message.id} message={message} type="inbox" />
          ))
        )}
      </div>

      {/* Footer */}
      {total > 0 && (
        <div className="p-4 border-t border-rose-100 text-sm text-gray-500 text-center bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-b-2xl">
          {total} berichten in totaal
        </div>
      )}
    </div>
  );
}
