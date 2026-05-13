const authService = require('../services/auth.service');
const db = require('../config/db');

exports.register = async (req, res) => {
  try {
    const result = await authService.register(db, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(db, email, password);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
