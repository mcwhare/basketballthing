import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function RegisterForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      // 1. Register the user
      await axios.post(`${API}/auth/register`, form);

      // 2. Get a PaymentIntent client secret
      const { data } = await axios.post(`${API}/auth/create-payment-intent`, {
        email: form.email,
      });

      // 3. Confirm the card payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: form.name, email: form.email },
          },
        }
      );

      if (error) {
        setStatus(`Payment failed: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        setStatus('Registration and payment successful!');
      }
    } catch (err) {
      setStatus(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>Create Account</h2>

      <input name="name"     placeholder="Full name"      value={form.name}     onChange={handleChange} required />
      <input name="email"    placeholder="Email"  type="email"    value={form.email}    onChange={handleChange} required />
      <input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required />

      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: 4, margin: '12px 0' }}>
        <CardElement />
      </div>

      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Register & Pay'}
      </button>

      {status && <p>{status}</p>}
    </form>
  );
}