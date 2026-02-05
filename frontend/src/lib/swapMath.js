/**
 * SwapMath Library
 * JavaScript port of SwapMath.sol for PMMA pricing
 * Implements the Gaussian CDF-based AMM invariant with Newton-Raphson solving
 */

import { gaussianCDF, gaussianPDF } from './gaussian.js';

// Constants from SwapMath.sol
const APPROX = 1e15; // Convergence threshold
const MAX_ITERS = 50; // Maximum Newton-Raphson iterations
const MIN_RESERVE = 1e15; // Minimum reserve (in wei)
const MIN_DERIVATIVE = 1e14; // Floor for derivative

/**
 * Fixed-point multiplication (WAD format: 18 decimals)
 */
function mulWad(a, b) {
    return (BigInt(a) * BigInt(b)) / BigInt(1e18);
}

/**
 * Fixed-point division (WAD format: 18 decimals)
 */
function divWad(a, b) {
    return (BigInt(a) * BigInt(1e18)) / BigInt(b);
}

/**
 * Absolute value for BigInt
 */
function abs(x) {
    return x < 0n ? -x : x;
}

/**
 * AMM Invariant Function
 * f(x, y, L) = (y-x) * CDF((y-x)/L) + L * PDF((y-x)/L) - y
 * @param {bigint} x - Token reserve (in wei)
 * @param {bigint} y - Other token reserve (in wei)
 * @param {bigint} l - Liquidity (in wei)
 * @returns {bigint} - Function value
 */
export function ammFunc(x, y, l) {
    const delta = y - x; // y - x
    const z = divWad(delta, l); // (y-x) / L

    const cdf = gaussianCDF(Number(z) / 1e18);
    const pdf = gaussianPDF(Number(z) / 1e18);

    // (y-x) * CDF(z) + L * PDF(z) - y
    const term1 = mulWad(delta, cdf);
    const term2 = mulWad(l, pdf);

    return term1 + term2 - y;
}

/**
 * Derivative of AMM Function
 * f'(x) = -CDF(z) where z = (y-x)/L
 * @param {bigint} x - Token reserve (in wei)
 * @param {bigint} y - Other token reserve (in wei)
 * @param {bigint} l - Liquidity (in wei)
 * @returns {bigint} - Derivative value
 */
export function funcDerivative(x, y, l) {
    const delta = y - x;
    const z = divWad(delta, l);

    let deriv = -BigInt(gaussianCDF(Number(z) / 1e18));

    // Apply floor to prevent division by near-zero
    if (abs(deriv) < BigInt(MIN_DERIVATIVE)) {
        return deriv < 0n ? -BigInt(MIN_DERIVATIVE) : BigInt(MIN_DERIVATIVE);
    }

    return deriv;
}

/**
 * Newton-Raphson solver to find new reserve
 * Solves: ammFunc(x, y, L) = 0
 * @param {bigint} x - Initial guess for token reserve
 * @param {bigint} y - Other token reserve (fixed)
 * @param {bigint} l - Liquidity
 * @returns {bigint} - Solved reserve value
 */
export function getNewReserve(x, y, l) {
    // Better initial guess
    let t = x;
    if (abs(x) < BigInt(MIN_RESERVE)) {
        t = y / 2n;
    }

    for (let i = 0; i < MAX_ITERS; i++) {
        const f = ammFunc(t, y, l);

        if (abs(f) < BigInt(APPROX)) {
            // Converged!
            const result = abs(t);
            return result < BigInt(MIN_RESERVE) ? BigInt(MIN_RESERVE) : result;
        }

        const deriv = funcDerivative(t, y, l);
        t = t - divWad(f, deriv);
    }

    // Return result even if not fully converged
    const result = abs(t);
    return result < BigInt(MIN_RESERVE) ? BigInt(MIN_RESERVE) : result;
}

/**
 * Calculate swap amount using PMMA
 * This is the main function that matches SwapMath.sol:getSwapAmount
 * 
 * @param {boolean} yesToNo - true if swapping YES → NO, false if NO → YES
 * @param {bigint|number} currentReserveYes - Current YES token reserve
 * @param {bigint|number} currentReserveNo - Current NO token reserve
 * @param {bigint|number} initialLiquidity - Market liquidity
 * @param {bigint|number} amountIn - Amount to swap
 * @returns {bigint} - Amount out (in wei)
 */
export function getSwapAmount(yesToNo, currentReserveYes, currentReserveNo, initialLiquidity, amountIn) {
    // Convert to BigInt
    let reserveYes = BigInt(currentReserveYes);
    let reserveNo = BigInt(currentReserveNo);
    const liq = BigInt(initialLiquidity);
    const amtIn = BigInt(amountIn);

    // Apply minimum reserve floor
    reserveYes = reserveYes < BigInt(MIN_RESERVE) ? BigInt(MIN_RESERVE) : reserveYes;
    reserveNo = reserveNo < BigInt(MIN_RESERVE) ? BigInt(MIN_RESERVE) : reserveNo;

    if (yesToNo) {
        // Swapping YES for NO
        // New YES reserve = current + amountIn
        // Solve for new NO reserve
        const newReserveNo = getNewReserve(reserveNo, reserveYes + amtIn, liq);
        return abs(reserveNo - newReserveNo);
    } else {
        // Swapping NO for YES
        // New NO reserve = current + amountIn
        // Solve for new YES reserve
        const newReserveYes = getNewReserve(reserveYes, reserveNo + amtIn, liq);
        return abs(reserveYes - newReserveYes);
    }
}

/**
 * Calculate price using Gaussian CDF
 * price_yes = CDF((reserveNo - reserveYes) / liquidity)
 * @param {bigint} reserveYes - YES token reserve
 * @param {bigint} reserveNo - NO token reserve
 * @param {bigint} liquidity - Market liquidity
 * @returns {number} - Price as decimal (0-1)
 */
export function calcPrice(reserveYes, reserveNo, liquidity) {
    const delta = BigInt(reserveNo) - BigInt(reserveYes);
    const z = divWad(delta, BigInt(liquidity));
    const price = gaussianCDF(Number(z) / 1e18);
    return Number(price) / 1e18;
}
