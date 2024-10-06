import React from 'react';

const CognitoRedirectButton = () => {
  const handleRedirect = () => {
    // Replace with your Cognito User Pool Domain and App Client ID
    const cognitoDomain = 'my-vinyls.auth.eu-west-3.amazoncognito.com';
    const clientId = process.env.COGNITO_CLIENT_ID; // Ensure this is set in your .env file
    const redirectUri = 'https://my-vinyls.vercel.app/api/auth/callback/cognito'; // Your callback URL
    const scope = 'openid profile email'; // Scopes to request

    const signInUrl = `https://${cognitoDomain}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    window.location.href = signInUrl; // Redirect to Cognito
  };

  return (
    <button onClick={handleRedirect} className="button">
      Sign in with Cognito
    </button>
  );
};

export default CognitoRedirectButton;