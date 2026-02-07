/**
 * Formatting utilities for ChainBet
 * Safely handles BigInt, Number, and String values
 */

/**
 * Safely convert wei values to USD display format
 * Handles BigInt, Number, and String inputs
 * @param {BigInt|number|string} weiValue - Value in wei (1e18 = $1)
 * @returns {string} Formatted USD string (e.g., "1,234.56")
 */
export function formatWeiToUSD(weiValue) {
    if (weiValue === undefined || weiValue === null || weiValue === '') {
        return '0.00';
    }

    try {
        // Convert to BigInt if not already
        let weiBigInt;
        if (typeof weiValue === 'bigint') {
            weiBigInt = weiValue;
        } else if (typeof weiValue === 'string') {
            weiBigInt = BigInt(weiValue || '0');
        } else if (typeof weiValue === 'number') {
            // Avoid precision issues with large numbers
            if (!isFinite(weiValue) || isNaN(weiValue)) {
                return '0.00';
            }
            weiBigInt = BigInt(Math.floor(weiValue));
        } else {
            return '0.00';
        }

        // Handle negative values
        const isNegative = weiBigInt < 0n;
        const absValue = isNegative ? -weiBigInt : weiBigInt;

        // Convert to string
        const weiStr = absValue.toString();

        // If value is less than 1e18, it's less than $1
        if (weiStr.length <= 18) {
            const padded = weiStr.padStart(18, '0');
            const cents = padded.substring(0, 2);
            const result = `0.${cents}`;
            return isNegative ? `-${result}` : result;
        }

        // Split into dollars and cents
        const dollarsStr = weiStr.slice(0, -18) || '0';
        const centsStr = weiStr.slice(-18, -16).padStart(2, '0');

        // Format with commas
        const formatted = Number(dollarsStr).toLocaleString('en-US');
        const result = `${formatted}.${centsStr}`;
        return isNegative ? `-${result}` : result;
    } catch (error) {
        console.error('Error formatting wei to USD:', error, weiValue);
        return '0.00';
    }
}

/**
 * Format token amount with proper decimals
 * @param {BigInt|number|string} amount - Token amount in wei
 * @returns {string} Formatted token string
 */
export function formatTokenAmount(amount) {
    if (amount === undefined || amount === null || amount === '') {
        return '0.00';
    }

    try {
        let value;
        if (typeof amount === 'bigint') {
            value = Number(amount) / 1e18;
        } else if (typeof amount === 'string') {
            value = Number(BigInt(amount)) / 1e18;
        } else if (typeof amount === 'number') {
            value = amount / 1e18;
        } else {
            return '0.00';
        }

        if (!isFinite(value) || isNaN(value)) {
            return '0.00';
        }

        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    } catch (error) {
        console.error('Error formatting token amount:', error);
        return '0.00';
    }
}

/**
 * Safely convert any value to BigInt
 * @param {BigInt|number|string} value - Value to convert
 * @returns {BigInt} BigInt value (0n if conversion fails)
 */
export function toBigInt(value) {
    if (value === undefined || value === null || value === '') {
        return 0n;
    }

    try {
        if (typeof value === 'bigint') {
            return value;
        }
        if (typeof value === 'string') {
            return BigInt(value);
        }
        if (typeof value === 'number') {
            if (!isFinite(value) || isNaN(value)) {
                return 0n;
            }
            return BigInt(Math.floor(value));
        }
        return 0n;
    } catch (error) {
        console.error('Error converting to BigInt:', error);
        return 0n;
    }
}

/**
 * Format short address
 * @param {string} address - Ethereum address
 * @returns {string} Shortened address (e.g., "0x1234...5678")
 */
export function shortenAddress(address) {
    if (!address || address.length < 10) return address || '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
