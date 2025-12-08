import { FC } from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-9xl font-bold text-primary-600">404</p>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Pagina Niet Gevonden</h1>
        <p className="mt-2 text-lg text-gray-600">
          Sorry, de pagina die je zoekt bestaat niet.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            Terug naar Home
          </Link>
          <Link to="/contact" className="btn-secondary">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
