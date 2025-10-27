/**
 * Interval Input Management
 */

import { elements } from './elements';
import { AppSettingsStore } from '../utils/stores';
import { INTERVAL_CONFIG } from './constants';

class IntervalManager {
    /**
     * Validate and correct the interval value
     */
    validateAndCorrect(): void {
        if (!elements.intervalInput || !elements.intervalWarning) return;
        
        let value = parseInt(elements.intervalInput.value, 10);

        if (isNaN(value)) {
            elements.intervalInput.value = String(INTERVAL_CONFIG.DEFAULT);
            value = INTERVAL_CONFIG.DEFAULT;
        }
        
        if (value < INTERVAL_CONFIG.MIN) {
            elements.intervalInput.value = String(INTERVAL_CONFIG.MIN);
        } else if (value > INTERVAL_CONFIG.MAX) {
            elements.intervalInput.value = String(INTERVAL_CONFIG.MAX);
        }
        
        this.updateWarnings();
    }

    /**
     * Update warning messages based on interval value
     */
    updateWarnings(): void {
        if (!elements.intervalInput || !elements.intervalWarning) return;

        const value = parseInt(elements.intervalInput.value, 10);
        const warnings: string[] = [];

        if (isNaN(value)) {
            elements.intervalWarning.textContent = "Please enter a valid number.";
            elements.intervalWarning.classList.remove('d-none');
            return;
        }

        if (value < INTERVAL_CONFIG.WARNING_THRESHOLD_LOW && value >= INTERVAL_CONFIG.MIN) {
            warnings.push("Warning: Intervals below 1500ms may risk your account.");
        }

        if (value > INTERVAL_CONFIG.WARNING_THRESHOLD_HIGH) {
            warnings.push("Warning: Intervals above 30 seconds will take a long time.");
        }

        if (warnings.length > 0) {
            elements.intervalWarning.textContent = warnings.join(" ");
            elements.intervalWarning.classList.remove('d-none');
        } else {
            elements.intervalWarning.textContent = '';
            elements.intervalWarning.classList.add('d-none');
        }
    }

    /**
     * Setup interval input event listeners
     */
    setup(): void {
        if (!elements.intervalInput) return;

        elements.intervalInput.addEventListener("input", () => this.updateWarnings());
        elements.intervalInput.addEventListener("blur", () => {
            this.validateAndCorrect();
            AppSettingsStore.instance.setInterval(elements.intervalInput!.value);
        });

        const initialInterval = AppSettingsStore.instance.getInterval();
        elements.intervalInput.value = String(initialInterval);
        this.validateAndCorrect();
    }
}

export const intervalManager = new IntervalManager();
