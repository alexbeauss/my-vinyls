import { signIn } from 'next-auth/react';

const GoogleSignInButton = () => {
  return (
    <button
      onClick={() => signIn('cognito', { callbackUrl: 'https://my-vinyls.vercel.app/api/auth/callback/cognito' })} // Update callbackUrl
      className="button"
    >
      Sign in with Google
    </button>
  );
};

export default GoogleSignInButton;