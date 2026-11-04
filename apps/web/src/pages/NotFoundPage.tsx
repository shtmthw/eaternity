import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <div className="container" style={{ paddingTop: 64 }}>
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Link to="/" className="btn btn-primary">
            Back to the menu
          </Link>
        }
      >
        The page you are looking for does not exist or has moved.
      </EmptyState>
    </div>
  );
}
