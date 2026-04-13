const authRoutes = require('./routes/auth');

const stripe = require('./stripe');

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

      // Mark the user as paid in your DB
      await pool.query(
        'UPDATE users SET paid = true WHERE email = $1',
        [email]
      );
    }

    res.json({ received: true });
  }
);
app.use('/auth', authRoutes);