import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';
import Chat from './Chat';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Chat /> : <Auth />;
};

export default Index;
