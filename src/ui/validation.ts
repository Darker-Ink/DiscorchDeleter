/**
 * Validation and Formatting Utilities
 */

import type { ChannelMap, Channel } from '../types/misc';

/**
 * Format channel type string for display
 */
export const formatChannelType = (type: string): string => {
    return type
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Type guard to check if an object is a valid Channel
 */
export const isChannel = (obj: any): obj is Channel => {
    if (typeof obj !== 'object' || obj === null) return false;
    if (!Array.isArray(obj.messageIds) || !obj.messageIds.every((id: any) => typeof id === 'string')) return false;
    if (typeof obj.displayName !== 'string') return false;
    if (obj.hasOwnProperty('serverName') && typeof obj.serverName !== 'string' && obj.serverName !== null) return false;
    if (typeof obj.channelType !== 'string') return false;
    
    return true;
}

/**
 * Type guard to check if an object is a valid ChannelMap
 */
export const isValidChannelMap = (data: any): data is ChannelMap => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
    
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (!isChannel(data[key])) return false;
        }
    }
    
    return true;
}

