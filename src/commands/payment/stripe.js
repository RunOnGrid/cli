import { Command } from 'commander';
import StripePaymentManager from '../../service/stripeService.js';

const manager = new StripePaymentManager();

export const stripeCommand = new Command('stripe')
  .description('Make a payment via Stripe')
  .action(async () => {
    await manager.createCheckoutSession();
  });
