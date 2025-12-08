import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, User, Clock } from 'lucide-react';
import { getMessage, markAsRead, deleteMessage, type MailMessage } from '../api/mailApi';

export function ReadMessage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        const data = await getMessage(parseInt(id));
        setMessage(data);
        
        // Mark as read if not already
        if (!data.is_read) {
          await markAsRead(parseInt(id));
        }
      } catch (err) {
        setError('Kon bericht niet laden');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return;
    
    setDeleting(true);
    try {
      await deleteMessage(parseInt(id));
      navigate('/mail');
    } catch (err) {
      console.error(err);
      alert('Kon bericht niet verwijderen');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100 p-8 text-center">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Bericht laden...</p>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100 p-8 text-center">
        <p className="text-rose-500 font-medium mb-4">{error || 'Bericht niet gevonden'}</p>
        <button
          onClick={() => navigate('/mail')}
          className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-md"
        >
          Terug naar inbox
        </button>
      </div>
    );
  }

  const formattedDate = new Date(message.created_at).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-rose-100">
        <button
          onClick={() => navigate('/mail')}
          className="flex items-center gap-2 text-gray-600 hover:text-rose-600 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Terug</span>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
        >
          <Trash2 size={18} />
          <span>Verwijderen</span>
        </button>
      </div>

      {/* Subject */}
      <div className="p-6 border-b border-rose-100">
        <h1 className="text-2xl font-semibold text-gray-800">{message.subject}</h1>
      </div>

      {/* Sender Info */}
      <div className="p-6 border-b border-rose-100 bg-gradient-to-r from-rose-50/50 to-pink-50/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl">
            <User size={24} className="text-rose-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                {message.sender_username || message.sender_email}
              </span>
              {message.sender_username && (
                <span className="text-gray-500 text-sm">
                  &lt;{message.sender_email}&gt;
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Clock size={14} />
              <span>{formattedDate}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Aan: {message.recipient_email}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
          {message.body}
        </div>
      </div>
    </div>
  );
}
