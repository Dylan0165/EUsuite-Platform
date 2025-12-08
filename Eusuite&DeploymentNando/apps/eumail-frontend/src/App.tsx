import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Inbox } from './pages/Inbox';
import { ReadMessage } from './pages/ReadMessage';
import { Compose } from './pages/Compose';
import { Sent } from './pages/Sent';

function App() {
  const { user, loading, error } = useAuth();

  // Loading state with rose gold theme
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600">
        <img src="/eusuite-logo.png" alt="EUSuite" className="h-16 mb-4" />
        <div className="text-white text-3xl font-bold mb-6 tracking-wider drop-shadow-lg">EUMAIL</div>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        <p className="mt-4 text-white/90">Authenticatie valideren...</p>
      </div>
    );
  }

  // Show error state (backend down, network issues, etc.)
  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600">
        <img src="/eusuite-logo.png" alt="EUSuite" className="h-16 mb-4" />
        <div className="text-white text-3xl font-bold mb-6 tracking-wider drop-shadow-lg">EUMAIL</div>
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 max-w-md shadow-xl">
          <p className="text-white text-center font-medium">{error}</p>
          <p className="text-white/80 text-sm text-center mt-2">Probeer de pagina te vernieuwen</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-6 py-3 bg-white text-rose-600 font-semibold rounded-xl hover:bg-rose-50 transition-all shadow-lg hover:shadow-xl"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  // Redirect to login if not authenticated (handled by useAuth)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600">
        <p className="text-white/90">Doorsturen naar login portaal...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/mail" element={<Inbox />} />
          <Route path="/mail/read/:id" element={<ReadMessage />} />
          <Route path="/mail/new" element={<Compose />} />
          <Route path="/mail/sent" element={<Sent />} />
          <Route path="/" element={<Navigate to="/mail" replace />} />
          <Route path="*" element={<Navigate to="/mail" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
