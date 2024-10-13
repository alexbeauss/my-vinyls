// pages/api/auth/logout.js
import { handleLogout } from '@auth0/nextjs-auth0';

export default async function logout(req, res) {
  try {
    await handleLogout(req, res);
  } catch (error) {
    res.status(error.status || 400).end(error.message);
  }
}