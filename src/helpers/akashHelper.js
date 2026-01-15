const SECONDS_PER_BLOCK = 6.098;

export function calculateDeploymentMetrics(dseq, lastBlock, amount, escrow) {
    const depositUakt = parseFloat(escrow.amount);
    const pricePerBlockUakt = parseFloat(amount);
    const blockUsed = lastBlock - dseq;
    const uaktRemaining = depositUakt - (pricePerBlockUakt * blockUsed);
    const totalSpentUakt = depositUakt - uaktRemaining;
    const blocksRemaining = uaktRemaining / pricePerBlockUakt;
    const timeRemainingSeconds = blocksRemaining * SECONDS_PER_BLOCK;
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

export function calculateTimeLeft(dseq, lastBlock, amount, escrow) {
  const depositUakt = parseFloat(escrow?.amount || "0");
  const pricePerBlockUakt = parseFloat(amount || "0");

  if (pricePerBlockUakt === 0 || depositUakt === 0) {
    return {
      timeRemainingSeconds: 0,
      timeRemainingHours: 0,
      timeRemainingDays: 0,
      timeRemainingMonths: 0,
      timeRemainingFormatted: "N/A",
      expirationDate: null,
    };
  }

  const blockUsed = lastBlock - dseq;
  const uaktRemaining = depositUakt - pricePerBlockUakt * blockUsed;
  const blocksRemaining = uaktRemaining / pricePerBlockUakt;
  const timeRemainingSeconds = blocksRemaining * SECONDS_PER_BLOCK;
  const timeRemainingHours = timeRemainingSeconds / 3600;
  const timeRemainingDays = timeRemainingSeconds / 86400;
  const timeRemainingMonths = timeRemainingDays / 30;
  const expirationDate = new Date(Date.now() + timeRemainingSeconds * 1000);

  // Format time remaining
  let timeRemainingFormatted;
  if (timeRemainingDays >= 30) {
    const months = Math.floor(timeRemainingMonths);
    const days = Math.floor(timeRemainingDays % 30);
    timeRemainingFormatted = `${months}mo ${days}d`;
  } else if (timeRemainingDays >= 1) {
    const days = Math.floor(timeRemainingDays);
    const hours = Math.floor(timeRemainingHours % 24);
    timeRemainingFormatted = `${days}d ${hours}h`;
  } else if (timeRemainingHours >= 1) {
    const hours = Math.floor(timeRemainingHours);
    const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
    timeRemainingFormatted = `${hours}h ${minutes}m`;
  } else {
    const minutes = Math.floor(timeRemainingSeconds / 60);
    timeRemainingFormatted = `${minutes}m`;
  }

  return {
    timeRemainingSeconds,
    timeRemainingHours,
    timeRemainingDays,
    timeRemainingMonths,
    timeRemainingFormatted,
    expirationDate,
  };
}