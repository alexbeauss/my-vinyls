import { signIn } from 'next-auth/react';

const GoogleSignInButton = () => {
  return (
    <button
      onClick={() => signIn('cognito', { callbackUrl: 'http://localhost:3000/api/auth/callback/cognito' })} // Update callbackUrl
      className="button"
    >
      Sign in with Google
    </button>
  );
};

export default GoogleSignInButton;