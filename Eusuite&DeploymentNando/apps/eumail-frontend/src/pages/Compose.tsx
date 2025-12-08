import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { sendMessage } from '../api/mailApi';

export function Compose() {
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipient || !subject || !body) {
      setError('Vul alle velden in');
      return;
    }

    setSending(true);
    setError(null);

    try {
      await sendMessage({
        recipient_email: recipient,
        subject,
        body,
      });
      navigate('/mail/sent');
    } catch (err) {
      setError('Kon bericht niet verzenden');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-rose-100">
        <h1 className="text-xl font-semibold text-gray-800">Nieuw Bericht</h1>
        <button
          onClick={() => navigate('/mail')}
          className="p-2.5 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aan
          </label>
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="email@voorbeeld.nl"
            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all bg-white/50"
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Onderwerp
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Onderwerp van je bericht"
            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all bg-white/50"
            required
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bericht
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Typ je bericht hier..."
            rows={12}
            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none bg-white/50"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/mail')}
            className="px-6 py-3 border border-rose-200 text-gray-700 rounded-xl hover:bg-rose-50 transition-colors font-medium"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 font-medium shadow-md hover:shadow-lg"
          >
            <Send size={18} />
            {sending ? 'Verzenden...' : 'Verzenden'}
          </button>
        </div>
      </form>
    </div>
  );
}
