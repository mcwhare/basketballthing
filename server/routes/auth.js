const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const stripe = require('../stripe');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const customer = await stripe.customers.create({ name, email });

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, stripe_customer_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, email, password_hash, customer.id]
    );

    res.status(201).json({ userId: result.rows[0].id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/create-payment-intent', async (req, res) => {
  const { email } = req.body;
  console.log('create-payment-intent called for:', email);

  try {
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE email = $1',
      [email]
    );

    console.log('User lookup result:', userResult.rows);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999,
      currency: 'aud',
      customer: userResult.rows[0].stripe_customer_id,
      automatic_payment_methods: { enabled: true },
      metadata: { email },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).json({ error: 'Could not create payment intent' });
  }
});

module.exports = router;