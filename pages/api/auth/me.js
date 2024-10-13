// pages/api/auth/me.js
import { handleProfile } from '@auth0/nextjs-auth0';

export default async function me(req, res) {
  try {
    await handleProfile(req, res);
  } catch (error) {
    res.status(error.status || 400).end(error.message);
  }
}