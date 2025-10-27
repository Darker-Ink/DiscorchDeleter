import { elements } from './ui/elements';
import { logger } from './ui/logger';
import { banner } from './ui/banner';
import { status } from './ui/status';
import { intervalManager } from './ui/interval';
import { positioning } from './ui/positioning';
import { 
    setupMinimizeButton, 
    setupInputMethodToggle,
    setupJsonFileInput,
    setupJsonPasteArea,
    setupActionButtons,
    initializeUIWithSavedData
} from './ui/handlers';
import { AppSettingsStore } from './utils/stores';

/**
 * Main initialization function for the UI
 */
export const initializeUIInteractions = (container: HTMLDivElement, _initialMinimizedStateFromIndex: boolean): void => {
    elements.initialize(container);

    const actualInitialMinimizedState = AppSettingsStore.instance.isMinimized();
    if (elements.container) {
        elements.container.classList.toggle("minimized", actualInitialMinimizedState);
    }

    if (elements.bannerClose) {
        elements.bannerClose.addEventListener('click', () => banner.hide());
    }

    setupInputMethodToggle();
    if (elements.minimizeButton && elements.container) {
        setupMinimizeButton(actualInitialMinimizedState);
    }
    if (elements.intervalInput) {
        intervalManager.setup();
    }
    setupActionButtons();
    if (elements.customFileButton && elements.jsonFileInput && elements.jsonPasteArea) {
        setupJsonFileInput();
    }
    if (elements.jsonPasteArea && elements.customFileButton && elements.jsonFileInput) {
        setupJsonPasteArea();
    }
    
    positioning.initialize();
    
    initializeUIWithSavedData();

    if (elements.intervalWarning) elements.intervalWarning.classList.add('d-none');
    if (elements.banner) elements.banner.classList.add('d-none');
    if (elements.progressBarContainer) elements.progressBarContainer.classList.add('d-none');
    if (elements.etaDisplay) elements.etaDisplay.classList.add('d-none');
    if (elements.logContainer) elements.logContainer.classList.add('d-none');
    if (elements.logOutput) elements.logOutput.classList.add('d-none');
};

export const addLogEntry = (message: string, type: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO', details?: any) => {
    logger.log(message, type, details);
};

export const updateStatus = (message: string, progress?: number, eta?: string) => {
    status.update(message, progress, eta);
};

export const validateAndCorrectInterval = () => intervalManager.validateAndCorrect();
export const updateIntervalWarnings = () => intervalManager.updateWarnings();
export const clearLogEntries = () => logger.clear();
export const showBanner = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    banner.show(message, type);
};
export const hideBanner = () => banner.hide();

export {
    setupMinimizeButton,
    setupInputMethodToggle as toggleInputMethod,
    setupActionButtons,
    setupJsonFileInput,
    setupJsonPasteArea,
};
