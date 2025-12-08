import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: number;
  sender: string;
  senderType: 'admin' | 'user';
  message: string;
  timestamp: string;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const [newMessage, setNewMessage] = useState('');
  const [messages] = useState<Message[]>([
    {
      id: 1,
      sender: 'John Doe',
      senderType: 'user',
      message: 'Ik heb problemen met inloggen op mijn account.',
      timestamp: '2024-01-15 10:30',
    },
    {
      id: 2,
      sender: 'Support Team',
      senderType: 'admin',
      message: 'Bedankt voor uw bericht. Kunt u meer details geven over het probleem?',
      timestamp: '2024-01-15 11:00',
    },
  ]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Send message logic here
      setNewMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tickets"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket #{id}</h1>
          <p className="text-gray-500">Login probleem</p>
        </div>
      </div>

      {/* Ticket Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Open
            </span>
          </div>
          <div>
            <p className="text-gray-500">Prioriteit</p>
            <span className="font-medium text-gray-900">Hoog</span>
          </div>
          <div>
            <p className="text-gray-500">Aangemaakt</p>
            <span className="font-medium text-gray-900">15 jan 2024</span>
          </div>
          <div>
            <p className="text-gray-500">Company</p>
            <span className="font-medium text-gray-900">Acme Corp</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Berichten</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.senderType === 'admin' ? 'flex-row-reverse' : ''}`}
            >
              <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
              <div
                className={`flex-1 max-w-md ${
                  msg.senderType === 'admin' ? 'text-right' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{msg.sender}</span>
                  <span className="text-xs text-gray-500">{msg.timestamp}</span>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    msg.senderType === 'admin'
                      ? 'bg-primary-50 text-primary-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply */}
        <div className="mt-6 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            Verstuur
          </button>
        </div>
      </div>
    </div>
  );
}
