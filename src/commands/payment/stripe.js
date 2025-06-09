import { Command } from 'commander';
import { stripePayment } from '../../service/stripeService.js';

export const stripeCommand = new Command('stripe')
  .description('Make a payment via Stripe')
  .action(async (amount) => {
    await stripePayment(amount);
  });
