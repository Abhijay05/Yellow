// Utility function to safely convert BigInt wei values to USD display format
// Prevents overflow when converting very large BigInt values
export function formatWeiToUSD(weiValue) {
    if (!weiValue) return '0.00';

    try {
        // Convert BigInt to string first, then manually handle decimals
        const weiStr = weiValue.toString();

        // If value is less than 1e18, it's less than $1
        if (weiStr.length <= 18) {
            const padded = weiStr.padStart(18, '0');
            const dollars = '0';
            const cents = padded.substring(0, 2);
            return `${dollars}.${cents}`;
        }

        // Split into dollars and cents
        const dollarsStr = weiStr.slice(0, -18) || '0';
        const centsStr = weiStr.slice(-18, -16).padStart(2, '0');

        // Format with commas
        const formatted = Number(dollarsStr).toLocaleString('en-US');
        return `${formatted}.${centsStr}`;
    } catch (error) {
        console.error('Error formatting wei to USD:', error);
        return '0.00';
    }
}
