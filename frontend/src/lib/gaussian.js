/**
 * Gaussian Math Library
 * JavaScript port of the Gaussian functions from Solidity contracts
 * Used for PMMA (Prediction Market Maker with Gaussian pricing)
 */

/**
 * Error function approximation (erf)
 * Used by CDF calculation
 */
function erf(x) {
    // Abramowitz and Stegun approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

/**
 * Gaussian Cumulative Distribution Function (CDF)
 * Returns value in 18 decimal fixed-point (WAD format)
 * @param {number} z - Input value (can be in WAD or regular number)
 * @returns {bigint} - CDF value in WAD format
 */
export function gaussianCDF(z) {
    // Convert from WAD if needed
    const zNum = typeof z === 'bigint' ? Number(z) / 1e18 : z;

    // CDF(z) = 0.5 * (1 + erf(z / sqrt(2)))
    const result = 0.5 * (1 + erf(zNum / Math.sqrt(2)));

    // Return in WAD format (18 decimals)
    return BigInt(Math.floor(result * 1e18));
}

/**
 * Gaussian Probability Density Function (PDF)  
 * Returns value in 18 decimal fixed-point (WAD format)
 * @param {number} z - Input value (can be in WAD or regular number)
 * @returns {bigint} - PDF value in WAD format
 */
export function gaussianPDF(z) {
    // Convert from WAD if needed
    const zNum = typeof z === 'bigint' ? Number(z) / 1e18 : z;

    // PDF(z) = (1 / sqrt(2π)) * exp(-z²/2)
    const result = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * zNum * zNum);

    // Return in WAD format (18 decimals)
    return BigInt(Math.floor(result * 1e18));
}

/**
 * Test Gaussian functions
 */
export function testGaussian() {
    console.log('Testing Gaussian Functions:');
    console.log('CDF(0):', Number(gaussianCDF(0)) / 1e18, 'Expected: 0.5');
    console.log('CDF(1):', Number(gaussianCDF(1)) / 1e18, 'Expected: ~0.841');
    console.log('CDF(-1):', Number(gaussianCDF(-1)) / 1e18, 'Expected: ~0.159');
    console.log('PDF(0):', Number(gaussianPDF(0)) / 1e18, 'Expected: ~0.399');
}
