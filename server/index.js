const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stripe = require('./stripe');
const pool = require('./db');
const authRoutes = require('./routes/auth');

const app = express();  // ← app must be defined first

// Webhook route BEFORE express.json() middleware
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const { email } = event.data.object.metadata;
      await pool.query('UPDATE users SET paid = true WHERE email = $1', [email]);
    }

    res.json({ received: true });
  }
);

// General middleware AFTER webhook route
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));