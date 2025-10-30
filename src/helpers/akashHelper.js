export function calculateDeploymentMetrics(dseq, lastBlock, amount, escrow) {
    const depositUakt = parseFloat(escrow.amount);
    const pricePerBlockUakt = parseFloat(amount);
    const blockUsed = lastBlock - dseq;
    const uaktRemaining = depositUakt - (pricePerBlockUakt * blockUsed);
    const totalSpentUakt = depositUakt - uaktRemaining;
    const blocksRemaining = uaktRemaining / pricePerBlockUakt;
    const timeRemainingSeconds = blocksRemaining * 6;
    const timeRemainingHours = timeRemainingSeconds / 3600;
    const timeRemainingDays = timeRemainingSeconds / 86400;
    const expirationDate = new Date(Date.now() + timeRemainingSeconds * 1000);
    return {
      depositUakt,
      pricePerBlockUakt,
      blocksRemaining,
      timeRemainingSeconds,
      timeRemainingHours,
      timeRemainingDays,
      expirationDate,
      totalSpentUakt,
      uaktRemaining,
    };
  }