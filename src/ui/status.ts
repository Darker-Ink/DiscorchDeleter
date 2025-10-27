/**
 * Status and Progress Display
 */

import { elements } from './elements';

class StatusManager {
    /**
     * Update the status display with optional progress and ETA
     */
    update(message: string, progress?: number, eta?: string): void {
        if (elements.statusOutput) {
            elements.statusOutput.innerHTML = message;
        }
        
        if (elements.progressBarContainer && elements.progressBar) {
            elements.progressBarContainer.classList.remove('d-none');
            
            if (typeof progress === 'number') {
                const clampedProgress = Math.max(0, Math.min(100, progress));
                elements.progressBar.style.width = `${clampedProgress}%`;
            }
        }
        
        if (elements.etaDisplay && eta) {
            elements.etaDisplay.textContent = `Current ETA: ${eta}`;
            elements.etaDisplay.classList.remove('d-none');
        }
    }

    /**
     * Clear all status displays
     */
    clear(defaultText: string = "Idle. Ready to begin."): void {
        if (elements.importSummaryOutput) elements.importSummaryOutput.innerHTML = "";
        if (elements.statusOutput) elements.statusOutput.textContent = defaultText;
        if (elements.etaDisplay) elements.etaDisplay.classList.add('d-none');
    }
}

export const status = new StatusManager();
