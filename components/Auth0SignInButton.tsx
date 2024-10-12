import { signIn } from 'next-auth/react';

const Auth0SignInButton = () => {
  return (
    <button
      onClick={() => signIn('auth0', { callbackUrl: 'https://my-vinyls.vercel.app/api/auth/callback/auth0' })} // Update callbackUrl
      className="button"
    >
      Sign in with Auth0
    </button>
  );
};

export default Auth0SignInButton;