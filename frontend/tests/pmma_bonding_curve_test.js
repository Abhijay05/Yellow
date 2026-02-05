/**
 * PMMA Bonding Curve Test
 * Demonstrates that successive buys get fewer tokens (bonding curve working)
 */

import { getSwapAmount } from '../src/lib/swapMath.js';

console.log('🧪 PMMA Bonding Curve Test\n');
console.log('='.repeat(60));

// Initial market state (fresh market with 1000 liquidity)
let yesReserve = BigInt('500000000000000000000'); // 500 YES
let noReserve = BigInt('500000000000000000000');  // 500 NO
let liquidity = BigInt('1000000000000000000000'); // 1000 total

const buyAmount = BigInt('10000000000000000000'); // 10 mUSD

console.log('\n📊 INITIAL MARKET STATE:');
console.log(`YES Reserve: ${Number(yesReserve) / 1e18} tokens`);
console.log(`NO Reserve:  ${Number(noReserve) / 1e18} tokens`);
console.log(`Liquidity:   ${Number(liquidity) / 1e18} mUSD`);
console.log(`Price (YES): ~0.50 (50%)`);

// ========== FIRST BUY ==========
console.log('\n' + '='.repeat(60));
console.log('🛒 FIRST BUY: $10 YES\n');

// Calculate tokens for first buy
const swapAmount1 = getSwapAmount(
    false,  // Buying YES = swapping NO → YES
    yesReserve,
    noReserve,
    liquidity,
    buyAmount
);

const totalTokens1 = buyAmount + swapAmount1;

console.log(`💰 Investment:     ${Number(buyAmount) / 1e18} mUSD`);
console.log(`🔄 Swap Amount:    ${Number(swapAmount1) / 1e18} tokens`);
console.log(`✅ TOTAL TOKENS:   ${Number(totalTokens1) / 1e18} YES tokens`);
console.log(`📈 Effective Price: $${(Number(buyAmount) / Number(totalTokens1)).toFixed(4)} per token`);

// Update reserves after first buy
yesReserve = yesReserve - swapAmount1;  // YES decreases
noReserve = noReserve + buyAmount;       // NO increases

console.log(`\n📊 MARKET STATE AFTER FIRST BUY:`);
console.log(`YES Reserve: ${Number(yesReserve) / 1e18} tokens (decreased)`);
console.log(`NO Reserve:  ${Number(noReserve) / 1e18} tokens (increased)`);
console.log(`New Price:   ~${(Number(noReserve) / Number(liquidity)).toFixed(3)} (YES getting expensive)`);

// ========== SECOND BUY ==========
console.log('\n' + '='.repeat(60));
console.log('🛒 SECOND BUY: $10 YES\n');

// Calculate tokens for second buy (with updated reserves)
const swapAmount2 = getSwapAmount(
    false,  // Buying YES
    yesReserve,
    noReserve,
    liquidity,
    buyAmount
);

const totalTokens2 = buyAmount + swapAmount2;

console.log(`💰 Investment:     ${Number(buyAmount) / 1e18} mUSD`);
console.log(`🔄 Swap Amount:    ${Number(swapAmount2) / 1e18} tokens`);
console.log(`✅ TOTAL TOKENS:   ${Number(totalTokens2) / 1e18} YES tokens`);
console.log(`📈 Effective Price: $${(Number(buyAmount) / Number(totalTokens2)).toFixed(4)} per token`);

// Update reserves after second buy
yesReserve = yesReserve - swapAmount2;
noReserve = noReserve + buyAmount;

console.log(`\n📊 FINAL MARKET STATE:`);
console.log(`YES Reserve: ${Number(yesReserve) / 1e18} tokens`);
console.log(`NO Reserve:  ${Number(noReserve) / 1e18} tokens`);
console.log(`Final Price: ~${(Number(noReserve) / Number(liquidity)).toFixed(3)}`);

// ========== SUMMARY ==========
console.log('\n' + '='.repeat(60));
console.log('📊 BONDING CURVE VERIFICATION:\n');

const difference = totalTokens1 - totalTokens2;
const percentageDiff = (Number(difference) / Number(totalTokens1)) * 100;

console.log(`First Buy:  ${Number(totalTokens1) / 1e18} YES tokens`);
console.log(`Second Buy: ${Number(totalTokens2) / 1e18} YES tokens`);
console.log(`Difference: ${Number(difference) / 1e18} tokens (${percentageDiff.toFixed(2)}% fewer)`);

if (totalTokens2 < totalTokens1) {
    console.log('\n✅ BONDING CURVE WORKING! Second buy got fewer tokens.');
    console.log('   As demand increases, price goes up (PMMA correctly implemented)');
} else {
    console.log('\n❌ ERROR! Second buy should get fewer tokens!');
    process.exit(1);
}

console.log('\n' + '='.repeat(60));
