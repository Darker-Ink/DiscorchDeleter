/**
 * Banner Notification System
 */

import { elements } from './elements';

type BannerType = 'info' | 'warning' | 'error';

class BannerManager {
    /**
     * Show a banner notification
     */
    show(message: string, type: BannerType = 'info'): void {
        if (!elements.banner || !elements.bannerText) return;
        
        elements.bannerText.textContent = message;
        elements.banner.className = 'banner';
        
        if (type === 'info') elements.banner.classList.add('info-banner');
        else if (type === 'warning') elements.banner.classList.add('warning-banner');
        else if (type === 'error') elements.banner.classList.add('error-banner');
        
        elements.banner.classList.remove('d-none');
        elements.banner.classList.add('d-flex');
    }

    /**
     * Hide the banner
     */
    hide(): void {
        if (elements.banner) {
            elements.banner.classList.add('d-none');
            elements.banner.classList.remove('d-flex');
        }
    }

    /**
     * Show a banner that auto-hides after a delay
     */
    showTemporary(message: string, type: BannerType = 'info', delayMs: number = 3000): void {
        this.show(message, type);
        setTimeout(() => this.hide(), delayMs);
    }
}

export const banner = new BannerManager();
