const authService = require('../services/auth.service.js');

// Errors from the service carry a status (400 bad input, 429 too many attempts, 500 server).
const send = (res, err) => {
  const status = err.status || 500;
  if (status >= 500) console.error('Auth error:', err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Try again.' : err.message });
};

// The client IP, as seen behind Vercel's proxy.
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

const register = async (req, res) => {
  try {
    res.json(await authService.register(req.body));
  } catch (err) {
    send(res, err);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    res.json(await authService.login(email, password, clientIp(req)));
  } catch (err) {
    send(res, err);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    send(res, err);
  }
};

const deleteAccount = async (req, res) => {
  try {
    await authService.deleteAccount(req.user.id, req.body?.password);
    res.json({ ok: true });
  } catch (err) {
    send(res, err);
  }
};

module.exports = { register, login, changePassword, deleteAccount };
