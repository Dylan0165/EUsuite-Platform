import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Pagina niet gevonden</p>
        <p className="mt-2 text-gray-500">De pagina die je zoekt bestaat niet.</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <HomeIcon className="h-5 w-5" />
          Terug naar Dashboard
        </Link>
      </div>
    </div>
  );
}
