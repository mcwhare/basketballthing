const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');         // postgres pool (see below)
const stripe = require('../stripe');   // stripe instance (see below)

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 12);

    // Create a Stripe customer
    const customer = await stripe.customers.create({ name, email });

    // Save user to DB
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, stripe_customer_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, email, password_hash, customer.id]
    );

    res.status(201).json({ userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/create-payment-intent', async (req, res) => {
    const { email } = req.body;
  
    try {
      // Look up the Stripe customer by email
      const userResult = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE email = $1',
        [email]
      );
  
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1999,              // amount in cents, e.g. $19.99
        currency: 'aud',
        customer: userResult.rows[0].stripe_customer_id,
        metadata: { email },
      });
  
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not create payment intent' });
    }
  });


module.exports = router;