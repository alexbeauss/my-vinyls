// pages/api/auth/callback.js
import { handleCallback } from '@auth0/nextjs-auth0';

export default async function callback(req, res) {
  try {
    await handleCallback(req, res);
  } catch (error) {
    res.status(error.status || 400).end(error.message);
  }
}