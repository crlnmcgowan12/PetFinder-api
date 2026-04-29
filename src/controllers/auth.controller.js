const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, password_hash },
      select: { id: true, name: true, email: true, created_at: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token,
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { signup, login };
