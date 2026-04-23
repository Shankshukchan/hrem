/**
 * Calculates coins based on the top-up amount with bonuses
 * - 500rs top-up: 600 coins (20% bonus)
 * - 1000rs top-up: 1200 coins (20% bonus)
 * - Custom amounts: 1rs = 1coin (no bonus)
 *
 * @param {number} amountInPaise - Amount in paise (smallest currency unit)
 * @returns {object} Object with coins and bonus details
 */
export const calculateCoins = (amountInPaise) => {
  const amountInRupees = Math.floor(amountInPaise / 100);

  let coins = 0;
  let bonus = 0;
  let baseCoins = 0;
  let isBonusPackage = false;

  if (amountInRupees === 500) {
    // 500rs package: 600 coins
    baseCoins = 500;
    bonus = 100;
    coins = 600;
    isBonusPackage = true;
  } else if (amountInRupees === 1000) {
    // 1000rs package: 1200 coins
    baseCoins = 1000;
    bonus = 200;
    coins = 1200;
    isBonusPackage = true;
  } else {
    // Custom amount: 1rs = 1coin
    coins = amountInRupees;
    baseCoins = amountInRupees;
    bonus = 0;
    isBonusPackage = false;
  }

  return {
    coins,
    baseCoins,
    bonus,
    isBonusPackage,
    amountInRupees,
  };
};
