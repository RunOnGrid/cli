// En stripePayment.js

// import inquirer from 'inquirer';
// import { render } from 'ink';
// import React from 'react';
// import { StripePaymentForm } from '../components/StripePaymentForm.js';
// import { getToken } from '../utils/keyChain.js';
import open from 'open';


export const stripePayment = async (amount) => {
try {
  const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRhY2ZlNTA4LTU2YTgtNDAyMC1iYjgzLWIxNjViMjM5OWM0MyIsImVtYWlsIjoiYmVuamFtaW5Ab25ncmlkLnJ1biIsImlhdCI6MTc0OTA3MDcyOSwiZXhwIjoxNzQ5MDc0MzI5fQ.fcq9M83LyaEURIZIlARuUHFgPGX3pEND9J1RucQFZuQ"
  const response = await fetch(`https://backend-dev.ongrid.run/payment/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount,
      currency: "USD"
    }),
  });
  
  const data = await response.json();
  console.log(data);
  await open(data.url);
} catch (error) {
  console.error('Error:', error);
}
};


