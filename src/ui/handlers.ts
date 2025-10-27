/**
 * UI Event Handlers
 * Handles user interactions with file input, paste area, and action buttons
 */

import { elements } from './elements';
import { logger } from './logger';
import { banner } from './banner';
import { status } from './status';
import { AppSettingsStore, DeletionStore } from '../utils/stores';
import { isValidChannelMap } from './validation';
import { generateImportStatus, type ImportStatusInfo } from './data-import';
import type { ChannelMap } from '../types/misc';
import { ICONS } from './constants';

/**
 * Update displays based on import status info
 */
const updateDisplaysFromStatusInfo = (statusInfo: ImportStatusInfo, parsedData?: ChannelMap): void => {
    if (elements.importSummaryOutput) {
        if (statusInfo.totalMessages > 0) {
            elements.importSummaryOutput.innerHTML = statusInfo.channelListHtml + statusInfo.totalMessagesLineHtml;
        } else {
            elements.importSummaryOutput.innerHTML = statusInfo.channelListHtml;
        }
    }

    if (elements.etaDisplay) {
        if (statusInfo.totalMessages > 0) {
            elements.etaDisplay.textContent = `Initial Est. Time: ${statusInfo.etaString}`;
            elements.etaDisplay.classList.remove('d-none');
        } else {
            elements.etaDisplay.classList.add('d-none');
        }
    }

    if (elements.statusOutput) {
        if (statusInfo.totalMessages > 0) {
            elements.statusOutput.textContent = "Ready to process.";
        } else {
            elements.statusOutput.textContent = "Idle. No messages to process.";
        }
    }
}

/**
 * Setup minimize button
 */
export const setupMinimizeButton = (initialMinimizedState: boolean): void => {
    if (!elements.minimizeButton || !elements.container) return;
    
    elements.minimizeButton.innerHTML = initialMinimizedState ? ICONS.PLUS : ICONS.MINUS;

    elements.minimizeButton.addEventListener("click", () => {
        const currentlyMinimized = AppSettingsStore.instance.toggleMinimized();
        elements.container!.classList.toggle("minimized", currentlyMinimized);
        elements.minimizeButton!.innerHTML = currentlyMinimized ? ICONS.PLUS : ICONS.MINUS;
        
        if (currentlyMinimized) {
            elements.container!.style.height = '52px';
            elements.container!.style.minHeight = '';
        } else {
            const size = AppSettingsStore.instance.getSize();
            elements.container!.style.height = size.height !== 'auto' ? `${size.height}px` : 'auto';
            elements.container!.style.minHeight = '200px';
        }
    });
}

/**
 * Toggle between file and paste input methods
 */
const toggleInputMethod = (method: 'file' | 'paste'): void => {
    if (!elements.fileInputSection || !elements.pasteInputSection || 
        !elements.showFileUploadButton || !elements.showJsonPasteButton) return;
    
    if (method === 'file') {
        elements.fileInputSection.classList.remove('d-none');
        elements.pasteInputSection.classList.add('d-none');
        elements.showFileUploadButton.classList.add('active');
        elements.showJsonPasteButton.classList.remove('active');
    } else {
        elements.fileInputSection.classList.add('d-none');
        elements.pasteInputSection.classList.remove('d-none');
        elements.showFileUploadButton.classList.remove('active');
        elements.showJsonPasteButton.classList.add('active');
    }
    
    AppSettingsStore.instance.setInputMethod(method);
}

/**
 * Setup input method toggle buttons
 */
export const setupInputMethodToggle = (): void => {
    if (!elements.showFileUploadButton || !elements.showJsonPasteButton) return;

    elements.showFileUploadButton.addEventListener('click', () => toggleInputMethod('file'));
    elements.showJsonPasteButton.addEventListener('click', () => toggleInputMethod('paste'));

    const initialMethod = AppSettingsStore.instance.getInputMethod();
    toggleInputMethod(initialMethod);
}

/**
 * Setup JSON file input handler
 */
export const setupJsonFileInput = (): void => {
    if (!elements.customFileButton || !elements.jsonFileInput || !elements.jsonPasteArea) return;

    elements.customFileButton.addEventListener("click", () => elements.jsonFileInput!.click());

    elements.jsonFileInput.addEventListener("change", () => {
        if (!elements.jsonFileInput!.files || elements.jsonFileInput!.files.length === 0) {
            elements.customFileButton!.textContent = "Choose File";
            return;
        }

        const file = elements.jsonFileInput!.files[0];
        elements.customFileButton!.textContent = `Loading: ${file.name}...`;

        // Clear previous data
        const emptyStats = { totalDeleted: 0, deletedByChannelType: {} };
        AppSettingsStore.instance.setDeletionStats(emptyStats);
        AppSettingsStore.instance.setJsonContent("");
        AppSettingsStore.instance.resetDeletedMessagesSet();
        status.clear("Loading new file...");
        logger.clear();
        logger.log("Previous data cleared for new file upload", "INFO");
        banner.showTemporary("Clearing previous data for new file upload", "info");

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) throw new Error("File content is empty or unreadable.");
                
                const parsedContent = JSON.parse(content);
                if (!isValidChannelMap(parsedContent)) {
                    throw new Error("Invalid JSON structure. Expected ChannelMap format.");
                }

                const intervalValue = AppSettingsStore.instance.getInterval();
                const statusInfo = generateImportStatus(parsedContent, intervalValue);
                updateDisplaysFromStatusInfo(statusInfo, parsedContent);

                if (Object.keys(parsedContent).length === 0) {
                    logger.log("Warning: The loaded JSON file is a valid ChannelMap but contains no channels.", "WARN");
                    banner.showTemporary("File loaded, but no channels found.", "warning");
                } else {
                    banner.showTemporary('File loaded successfully and validated.', 'info');
                }

                elements.jsonPasteArea!.value = content;
                AppSettingsStore.instance.setJsonContent(content);
                elements.customFileButton!.textContent = `File: ${file.name}`;
                
            } catch (err) {
                const errorMessage = (err as Error).message;
                elements.customFileButton!.textContent = "Validation Failed!";
                logger.log("Invalid JSON file.", "ERROR", errorMessage);
                banner.show(`Failed to load JSON: ${errorMessage.substring(0, 50)}`, "error");

                AppSettingsStore.instance.setJsonContent("");
                elements.jsonPasteArea!.value = "";
                elements.jsonFileInput!.value = "";
                status.clear("Error loading file.");
                
                setTimeout(() => {
                    if (elements.customFileButton!.textContent === "Validation Failed!") {
                        elements.customFileButton!.textContent = "Choose File";
                    }
                }, 3000);
            }
        };
        
        reader.onerror = () => {
            elements.customFileButton!.textContent = "Error reading file.";
            logger.log("Could not read the selected file.", "ERROR");
            banner.show("Failed to read file. Check logs.", "error");
            
            AppSettingsStore.instance.setJsonContent("");
            elements.jsonPasteArea!.value = "";
            elements.jsonFileInput!.value = "";
            status.clear("Error loading file.");
            
            setTimeout(() => {
                if (elements.customFileButton!.textContent === "Error reading file.") {
                    elements.customFileButton!.textContent = "Choose File";
                }
            }, 3000);
        };
        
        reader.readAsText(file);
    });
}

/**
 * Setup JSON paste area handler
 */
export const setupJsonPasteArea = (): void => {
    if (!elements.jsonPasteArea || !elements.customFileButton || !elements.jsonFileInput) return;

    const initialJsonContent = AppSettingsStore.instance.getJsonContent();

    if (initialJsonContent && initialJsonContent.length > 0 && 
        (!elements.jsonFileInput.files || elements.jsonFileInput.files.length === 0)) {
        elements.jsonPasteArea.value = initialJsonContent;
        
        try {
            const parsed = JSON.parse(initialJsonContent);
            if (isValidChannelMap(parsed)) {
                const intervalValue = AppSettingsStore.instance.getInterval();
                const statusInfo = generateImportStatus(parsed, intervalValue);
                updateDisplaysFromStatusInfo(statusInfo, parsed);
                elements.customFileButton.textContent = Object.keys(parsed).length > 0 ? "Saved JSON active" : "Saved (empty) JSON";
            } else {
                elements.customFileButton.textContent = "Saved (invalid) JSON";
                status.clear("Error: Saved JSON is invalid.");
            }
        } catch {
            elements.customFileButton.textContent = "Saved (corrupt) JSON";
            status.clear("Error: Saved JSON is corrupt.");
        }
    }

    elements.jsonPasteArea.addEventListener("input", () => {
        const content = elements.jsonPasteArea!.value;
        AppSettingsStore.instance.setJsonContent(content);

        if (content.trim().length > 0 && (!elements.jsonFileInput!.files || elements.jsonFileInput!.files.length === 0)) {
            try {
                const parsed = JSON.parse(content);
                if (isValidChannelMap(parsed)) {
                    elements.customFileButton!.textContent = Object.keys(parsed).length > 0 ? "Pasted content active" : "Pasted (empty) JSON";
                    const intervalValue = AppSettingsStore.instance.getInterval();
                    const statusInfo = generateImportStatus(parsed, intervalValue);
                    updateDisplaysFromStatusInfo(statusInfo, parsed);
                } else {
                    elements.customFileButton!.textContent = "Pasted (invalid format)";
                    status.clear("Error: Pasted JSON is invalid.");
                }
            } catch {
                elements.customFileButton!.textContent = "Pasted (not JSON)";
                status.clear("Error: Pasted content is not valid JSON.");
            }
        } else if (content.trim().length === 0 && (!elements.jsonFileInput!.files || elements.jsonFileInput!.files.length === 0)) {
            elements.customFileButton!.textContent = "Choose File";
            AppSettingsStore.instance.setJsonContent("");
            status.clear();
        }
    });
}

/**
 * Setup action buttons (Start, Stop, Clear)
 */
export const setupActionButtons = (): void => {
    const updateButtonStates = (isRunning: boolean) => {
        if (elements.startButton) elements.startButton.disabled = isRunning;
        if (elements.clearDataButton) elements.clearDataButton.disabled = isRunning;
        if (elements.stopButton) elements.stopButton.disabled = !isRunning;
    };

    if (elements.startButton) {
        elements.startButton.addEventListener("click", () => {
            if (DeletionStore.instance.isDeletionRunning()) {
                banner.show("Deletion is already in progress", "info");
                return;
            }

            banner.hide();
            logger.clear();

            let jsonData = elements.jsonPasteArea?.value || AppSettingsStore.instance.getJsonContent();

            if (!jsonData || !jsonData.trim()) {
                logger.log("No JSON data provided.", "ERROR", "Please upload or paste JSON data before starting.");
                banner.show("No JSON data. Check logs.", "error");
                return;
            }

            let jsonDataObject: ChannelMap;
            try {
                const parsed = JSON.parse(jsonData);
                if (!isValidChannelMap(parsed)) {
                    logger.log("Invalid JSON data format.", "ERROR", "The data does not have the correct ChannelMap structure.");
                    banner.show("Invalid JSON format. Check logs.", "error");
                    return;
                }
                if (Object.keys(parsed).length === 0) {
                    logger.log("Empty ChannelMap.", "WARN", "The JSON data is valid but contains no channels to process.");
                    banner.show("JSON data is empty. Nothing to do.", "warning");
                    return;
                }
                jsonDataObject = parsed;
            } catch (e) {
                logger.log("Invalid JSON data: Not valid JSON.", "ERROR", (e as Error).message);
                banner.show("Invalid JSON data. Check logs.", "error");
                return;
            }

            const intervalValue = parseInt(elements.intervalInput!.value, 10);
            AppSettingsStore.instance.setInterval(elements.intervalInput!.value);

            status.update("Processing...", 0, "Calculating Permissions...");
            updateButtonStates(true);
            logger.log("Starting deletion process...", "INFO", { interval: intervalValue });

            DeletionStore.instance.startDeletion(jsonDataObject).then(() => {
                updateButtonStates(false);
            });
        });
    }

    if (elements.clearDataButton) {
        elements.clearDataButton.addEventListener("click", () => {
            if (DeletionStore.instance.isDeletionRunning()) {
                banner.show('Cannot clear data while deletion is in progress.', 'warning');
                return;
            }

            if (!confirm("Are you sure you want to clear all message data and statistics?")) {
                return;
            }

            const emptyStats = { totalDeleted: 0, deletedByChannelType: {} };
            AppSettingsStore.instance.setDeletionStats(emptyStats);
            AppSettingsStore.instance.setJsonContent("");
            AppSettingsStore.instance.resetDeletedMessagesSet();
            
            if (elements.jsonPasteArea) elements.jsonPasteArea.value = "";
            if (elements.customFileButton) elements.customFileButton.textContent = "Choose File";
            if (elements.jsonFileInput) elements.jsonFileInput.value = "";
            
            status.clear("Idle. All data has been cleared.");
            logger.clear();
            logger.log("All data has been cleared", "INFO");
            banner.show("All message data and statistics have been cleared", "info");
        });
    }

    if (elements.stopButton) {
        elements.stopButton.addEventListener("click", () => {
            if (!DeletionStore.instance.isDeletionRunning()) {
                banner.show('No deletion process is running.', 'warning');
                return;
            }

            DeletionStore.instance.stopDeletion();
            updateButtonStates(false);
            banner.show('Deletion stopped by user.', 'error');
        });
    }

    updateButtonStates(DeletionStore.instance.isDeletionRunning());
}

/**
 * Initialize UI with saved data from storage
 */
export const initializeUIWithSavedData = (): void => {
    const savedJsonContent = AppSettingsStore.instance.getJsonContent();
    
    if (!savedJsonContent || !savedJsonContent.trim()) {
        status.clear();
        if (elements.customFileButton) elements.customFileButton.textContent = "Choose File";
        return;
    }
    
    try {
        const parsedData = JSON.parse(savedJsonContent);
        
        if (!isValidChannelMap(parsedData)) {
            if (elements.customFileButton) elements.customFileButton.textContent = "Saved (invalid) JSON";
            status.clear("Error: Saved JSON is invalid.");
            return;
        }
        
        const intervalValue = AppSettingsStore.instance.getInterval();
        const statusInfo = generateImportStatus(parsedData, intervalValue);
        updateDisplaysFromStatusInfo(statusInfo, parsedData);
        
        if (elements.customFileButton) {
            elements.customFileButton.textContent = Object.keys(parsedData).length > 0 
                ? "Saved JSON active" 
                : "Saved (empty) JSON";
        }
        
        if (elements.jsonPasteArea) {
            elements.jsonPasteArea.value = savedJsonContent;
        }
        
    } catch (error) {
        if (elements.customFileButton) {
            elements.customFileButton.textContent = "Saved (corrupt) JSON";
        }
        status.clear("Error: Saved JSON is corrupt.");
        console.error("Failed to parse saved JSON:", error);
    }
}

