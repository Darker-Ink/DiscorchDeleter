/**
 * UI Constants and Configuration
 */

export const ICONS = {
    MINUS: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>',
    PLUS: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
} as const;

export const LOG_CONFIG = {
    MAX_ENTRIES: 250,
    FLUSH_DELAY_MS: 100,
} as const;

export const INTERVAL_CONFIG = {
    MIN: 750,
    MAX: 600000,
    DEFAULT: 1500,
    WARNING_THRESHOLD_LOW: 1500,
    WARNING_THRESHOLD_HIGH: 30000,
} as const;

