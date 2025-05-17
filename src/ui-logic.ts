import { AppSettingsStore, DeletionStore } from './utils/stores';
import type { ChannelMap, Channel } from './types/misc';
import { formatTime } from './utils/formatTime.js';

const MINUS_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>';
const PLUS_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';

let uiContainerElement: HTMLDivElement | null = null;
let intervalInputElement: HTMLInputElement | null = null;
let intervalWarningElement: HTMLDivElement | null = null;
let minimizeButtonElement: HTMLButtonElement | null = null;
let jsonFileInputElement: HTMLInputElement | null = null;
let customFileButtonElement: HTMLButtonElement | null = null;
let jsonPasteAreaElement: HTMLTextAreaElement | null = null;

let uiBannerElement: HTMLDivElement | null = null;
let bannerTextElement: HTMLSpanElement | null = null;
let bannerCloseButtonElement: HTMLButtonElement | null = null;
let showFileUploadButtonElement: HTMLButtonElement | null = null;
let showJsonPasteButtonElement: HTMLButtonElement | null = null;
let fileInputSectionElement: HTMLDivElement | null = null;
let pasteInputSectionElement: HTMLDivElement | null = null;
let statusOutputElement: HTMLDivElement | null = null;
let progressBarContainerElement: HTMLDivElement | null = null;
let progressBarElement: HTMLDivElement | null = null;
let etaDisplayElement: HTMLDivElement | null = null;
let logContainerElement: HTMLDivElement | null = null;
let logOutputElement: HTMLPreElement | null = null;
let importSummaryOutputElement: HTMLDivElement | null = null;

const formatChannelType = (type: string): string => {
    return type
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const generateImportStatus = (channelMap: ChannelMap, intervalMs: number): { channelListHtml: string, totalMessagesLineHtml: string, etaString: string, totalMessages: number; } => {
    const channelTypeCounts: { [key: string]: number; } = {};
    let totalMessages = 0;

    for (const channelId in channelMap) {
        if (Object.prototype.hasOwnProperty.call(channelMap, channelId)) {
            const channel = channelMap[channelId];
            const messageCount = channel.messageIds.length;
            totalMessages += messageCount;
            channelTypeCounts[channel.channelType] = (channelTypeCounts[channel.channelType] || 0) + messageCount;
        }
    }

    const deletionStats = AppSettingsStore.instance.getDeletionStats();

    let channelListHtml = "";
    
    if (Object.keys(channelTypeCounts).length > 0) {
        channelListHtml += "Messages Pending Deletion<br><ul>";
        for (const type in channelTypeCounts) {
            const formattedType = formatChannelType(type);
            channelListHtml += `<li>${formattedType}: ${channelTypeCounts[type]}</li>`;
        }
        channelListHtml += "</ul>";
    } else {
        channelListHtml = "No messages found in the imported channels.<br>";
    }
    
    if (deletionStats.totalDeleted > 0) {
        channelListHtml += "Previously Deleted Messages<br><ul>";
        for (const type in deletionStats.deletedByChannelType) {
            const formattedType = formatChannelType(type);
            channelListHtml += `<li>${formattedType}: ${deletionStats.deletedByChannelType[type]}</li>`;
        }
        channelListHtml += `</ul><p>Total Messages Deleted: ${deletionStats.totalDeleted}</p>`;
    }
    
    const totalMessagesLineHtml = `<p>Total Messages to delete: ${totalMessages}</p>`;

    const totalTimeMs = totalMessages * intervalMs;
    const etaString = formatTime(totalTimeMs);

    return { channelListHtml, totalMessagesLineHtml, etaString, totalMessages };
}

const isChannel = (obj: any): obj is Channel => {
    if (typeof obj !== 'object' || obj === null) return false;
    if (!Array.isArray(obj.messageIds) || !obj.messageIds.every((id: any) => typeof id === 'string')) {
        return false;
    }
    if (typeof obj.displayName !== 'string') {
        return false;
    }
    if (obj.hasOwnProperty('serverName') && typeof obj.serverName !== 'string' && obj.serverName !== null) {
        return false;
    }
    if (typeof obj.channelType !== 'string') {
        return false;
    }
    return true;
}

const isValidChannelMap = (data: any): data is ChannelMap => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
    }
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (!isChannel(data[key])) {
                return false;
            }
        }
    }
    return true;
}

const validateAndCorrectInterval = (): void => {
    if (!intervalInputElement || !intervalWarningElement) {
        return;
    }
    let value = parseInt(intervalInputElement.value, 10);

    if (isNaN(value)) {
        intervalInputElement.value = "1500";
        value = 1500;
    }
    if (value < 750) {
        intervalInputElement.value = "750";
    } else if (value > 600000) {
        intervalInputElement.value = "600000";
    }
    updateIntervalWarnings();
};

const updateIntervalWarnings = (): void => {
    if (!intervalInputElement || !intervalWarningElement) {
        return;
    }

    const value = parseInt(intervalInputElement.value, 10);
    const warnings: string[] = [];

    if (isNaN(value)) {
        intervalWarningElement.textContent = "Please enter a valid number.";
        intervalWarningElement.style.display = 'block';
        return;
    }

    if (value < 1500 && value >= 750) {
        warnings.push("Warning: Intervals below 1500ms may risk your account.");
    }

    if (value > 30000) {
        warnings.push("Warning: Intervals above 30 seconds will take a long time.");
    }

    if (warnings.length > 0) {
        intervalWarningElement.textContent = warnings.join(" ");
        intervalWarningElement.style.display = 'block';
    } else {
        intervalWarningElement.textContent = '';
        intervalWarningElement.style.display = 'none';
    }
};

const setupMinimizeButton = (initialMinimizedState: boolean): void => {
    if (minimizeButtonElement && uiContainerElement) {
        const currentUiContainer = uiContainerElement;
        const currentMinimizeButton = minimizeButtonElement;
        currentMinimizeButton.innerHTML = initialMinimizedState ? PLUS_ICON_SVG : MINUS_ICON_SVG;

        minimizeButtonElement.addEventListener("click", () => {
            const currentlyMinimized = AppSettingsStore.instance.toggleMinimized();
            currentUiContainer.classList.toggle("minimized", currentlyMinimized);
            currentMinimizeButton.innerHTML = currentlyMinimized ? PLUS_ICON_SVG : MINUS_ICON_SVG;
        });
    }
};

const setupIntervalInput = (): void => {
    if (intervalInputElement) {
        const currentIntervalInput = intervalInputElement;

        currentIntervalInput.addEventListener("input", updateIntervalWarnings);

        currentIntervalInput.addEventListener("blur", () => {
            validateAndCorrectInterval();
            AppSettingsStore.instance.setInterval(currentIntervalInput.value);
        });

        const initialInterval = AppSettingsStore.instance.getInterval();
        currentIntervalInput.value = String(initialInterval);
        validateAndCorrectInterval();
    }
};

const setupJsonFileInput = (): void => {
    if (customFileButtonElement && jsonFileInputElement && jsonPasteAreaElement) {
        const currentJsonFileInput = jsonFileInputElement;
        const currentCustomFileButton = customFileButtonElement;
        const currentJsonPasteArea = jsonPasteAreaElement;

        currentCustomFileButton.addEventListener("click", () => currentJsonFileInput.click());

        currentJsonFileInput.addEventListener("change", () => {
            if (currentJsonFileInput.files && currentJsonFileInput.files.length > 0) {
                const file = currentJsonFileInput.files[0];
                currentCustomFileButton.textContent = "Loading: " + file.name + "...";

                const emptyStats = {
                    totalDeleted: 0,
                    deletedByChannelType: {}
                };
                AppSettingsStore.instance.setDeletionStats(emptyStats);
                AppSettingsStore.instance.setJsonContent("");
                AppSettingsStore.instance.setDeletedMessages({ messageIds: [] });
                clearJsonRelatedDisplays("Loading new file...");
                clearLogEntries();
                addLogEntry("Previous data cleared for new file upload", "INFO");
                showBanner("Clearing previous data for new file upload", "info");

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result as string;
                        if (!content) {
                            throw new Error("File content is empty or unreadable.");
                        }
                        const parsedContent = JSON.parse(content);

                        if (!isValidChannelMap(parsedContent)) {
                            throw new Error("Invalid JSON structure. Expected ChannelMap format.");
                        }

                        const intervalValue = AppSettingsStore.instance.getInterval();
                        const statusInfo = generateImportStatus(parsedContent, intervalValue);

                        if (importSummaryOutputElement) {
                            if (statusInfo.totalMessages > 0) {
                                importSummaryOutputElement.innerHTML = statusInfo.channelListHtml + statusInfo.totalMessagesLineHtml;
                            } else {
                                importSummaryOutputElement.innerHTML = statusInfo.channelListHtml;
                            }
                        }

                        if (etaDisplayElement) {
                            if (statusInfo.totalMessages > 0) {
                                etaDisplayElement.textContent = "Initial Est. Time: " + statusInfo.etaString;
                                etaDisplayElement.style.display = 'block';
                            } else {
                                etaDisplayElement.style.display = 'none';
                            }
                        }

                        if (statusOutputElement) {
                            statusOutputElement.textContent = statusInfo.totalMessages > 0 ? "Ready to process." : "Idle. No messages to process.";
                        }

                        if (Object.keys(parsedContent).length === 0) {
                            addLogEntry("Warning: The loaded JSON file is a valid ChannelMap but contains no channels.", "WARN");
                            showBanner("File loaded, but no channels found.", "warning");
                        } else {
                            showBanner('File loaded successfully and validated.', 'info');
                        }

                        currentJsonPasteArea.value = content;
                        AppSettingsStore.instance.setJsonContent(content);
                        currentCustomFileButton.textContent = "File: " + file.name;

                        setTimeout(hideBanner, 3000);
                    } catch (err) {
                        const errorMessage = (err as Error).message;
                        currentCustomFileButton.textContent = "Validation Failed!";
                        addLogEntry("Invalid JSON file.", "ERROR", errorMessage);
                        showBanner("Failed to load JSON: " + errorMessage.substring(0, 50), "error");

                        AppSettingsStore.instance.setJsonContent("");
                        currentJsonPasteArea.value = "";
                        currentJsonFileInput.value = "";
                        if (importSummaryOutputElement) importSummaryOutputElement.innerHTML = "";
                        if (statusOutputElement) statusOutputElement.textContent = "Error loading file.";
                        if (etaDisplayElement) etaDisplayElement.style.display = 'none';
                        setTimeout(() => {
                            if (currentCustomFileButton.textContent === "Validation Failed!") {
                                currentCustomFileButton.textContent = "Choose File";
                            }
                        }, 3000);
                    }
                };
                reader.onerror = () => {
                    currentCustomFileButton.textContent = "Error reading file.";
                    addLogEntry("Could not read the selected file.", "ERROR");
                    showBanner("Failed to read file. Check logs.", "error");
                    AppSettingsStore.instance.setJsonContent("");
                    currentJsonPasteArea.value = "";
                    currentJsonFileInput.value = "";
                    if (importSummaryOutputElement) importSummaryOutputElement.innerHTML = "";
                    if (statusOutputElement) statusOutputElement.textContent = "Error loading file.";
                    if (etaDisplayElement) etaDisplayElement.style.display = 'none';
                    setTimeout(() => {
                        if (currentCustomFileButton.textContent === "Error reading file.") {
                            currentCustomFileButton.textContent = "Choose File";
                        }
                    }, 3000);
                };
                reader.readAsText(file);
            } else {
                currentCustomFileButton.textContent = "Choose File";
            }
        });
    }
};

const setupJsonPasteArea = (): void => {
    if (jsonPasteAreaElement && customFileButtonElement && jsonFileInputElement) {
        const currentJsonPasteArea = jsonPasteAreaElement;
        const currentCustomFileButton = customFileButtonElement;
        const currentJsonFileInput = jsonFileInputElement;

        const initialJsonContent = AppSettingsStore.instance.getJsonContent();

        if (initialJsonContent) {
            currentJsonPasteArea.value = initialJsonContent;
            if (initialJsonContent.length > 0 && (!currentJsonFileInput.files || currentJsonFileInput.files.length === 0)) {
                try {
                    const parsed = JSON.parse(initialJsonContent);
                    if (isValidChannelMap(parsed)) {
                        const intervalValue = AppSettingsStore.instance.getInterval();
                        const statusInfo = generateImportStatus(parsed, intervalValue);
                        updateDisplaysFromStatusInfo(statusInfo, parsed);
                        currentCustomFileButton.textContent = Object.keys(parsed).length > 0 ? "Saved JSON active" : "Saved (empty) JSON";
                    } else {
                        currentCustomFileButton.textContent = "Saved (invalid) JSON";
                        clearJsonRelatedDisplays("Error: Saved JSON is invalid.");
                    }
                } catch {
                    currentCustomFileButton.textContent = "Saved (corrupt) JSON";
                    clearJsonRelatedDisplays("Error: Saved JSON is corrupt.");
                }
            }
        }

        currentJsonPasteArea.addEventListener("input", () => {
            const content = currentJsonPasteArea.value;
            AppSettingsStore.instance.setJsonContent(content);

            if (content.trim().length > 0) {
                if ((!currentJsonFileInput.files || currentJsonFileInput.files.length === 0)) {
                    try {
                        const parsed = JSON.parse(content);
                        if (isValidChannelMap(parsed)) {
                            currentCustomFileButton.textContent = Object.keys(parsed).length > 0 ? "Pasted content active" : "Pasted (empty) JSON";
                            const intervalValue = AppSettingsStore.instance.getInterval();
                            const statusInfo = generateImportStatus(parsed, intervalValue);
                            
                            if (importSummaryOutputElement) {
                                if (statusInfo.totalMessages > 0) {
                                    importSummaryOutputElement.innerHTML = statusInfo.channelListHtml + statusInfo.totalMessagesLineHtml;
                                } else {
                                    importSummaryOutputElement.innerHTML = statusInfo.channelListHtml;
                                }
                            }
                            if (etaDisplayElement) {
                                if (statusInfo.totalMessages > 0) {
                                    etaDisplayElement.textContent = "Initial Est. Time: " + statusInfo.etaString;
                                    etaDisplayElement.style.display = 'block';
                                } else {
                                    etaDisplayElement.style.display = 'none';
                                }
                            }
                            if (statusOutputElement) {
                                statusOutputElement.textContent = statusInfo.totalMessages > 0 ? "Ready to process." : "Idle. No messages to process.";
                            }
                            updateDisplaysFromStatusInfo(statusInfo, parsed);
                        } else {
                            currentCustomFileButton.textContent = "Pasted (invalid format)";
                            clearJsonRelatedDisplays("Error: Pasted JSON is invalid.");
                        }
                    } catch {
                        currentCustomFileButton.textContent = "Pasted (not JSON)";
                        if (importSummaryOutputElement) importSummaryOutputElement.innerHTML = "";
                        if (statusOutputElement) statusOutputElement.textContent = "Error processing pasted JSON.";
                        if (etaDisplayElement) etaDisplayElement.style.display = 'none';
                        clearJsonRelatedDisplays("Error: Pasted content is not valid JSON.");
                    }
                }
            } else {
                if ((!currentJsonFileInput.files || currentJsonFileInput.files.length === 0)) {
                    currentCustomFileButton.textContent = "Choose File";
                    AppSettingsStore.instance.setJsonContent("");
                    clearJsonRelatedDisplays();
                }
            }
        });
    }
};

const setupActionButtons = (): void => {
    const startButton = document.getElementById("startButton") as HTMLButtonElement;
    const clearDataButton = document.getElementById("clearDataButton") as HTMLButtonElement;
    const stopButton = document.getElementById("stopButton") as HTMLButtonElement;

    const updateButtonStates = (isRunning: boolean) => {
        if (startButton) startButton.disabled = isRunning;
        if (clearDataButton) clearDataButton.disabled = isRunning;
        if (stopButton) stopButton.disabled = !isRunning;
    };

    if (startButton && jsonPasteAreaElement && intervalInputElement) {
        const currentJsonPasteArea = jsonPasteAreaElement;
        const currentIntervalInput = intervalInputElement;

        startButton.addEventListener("click", () => {
            if (DeletionStore.instance.isDeletionRunning()) {
                showBanner("Deletion is already in progress", "info");
                return;
            }

            hideBanner();
            clearLogEntries();

            let jsonData = currentJsonPasteArea.value;
            if (!jsonData.trim()) {
                jsonData = AppSettingsStore.instance.getJsonContent();
            }

            if (!jsonData || !jsonData.trim()) {
                addLogEntry("No JSON data provided.", "ERROR", "Please upload or paste JSON data before starting.");
                showBanner("No JSON data. Check logs.", "error");
                return;
            }

            let jsonDataObject: ChannelMap;
            try {
                const parsed = JSON.parse(jsonData);
                if (!isValidChannelMap(parsed)) {
                    addLogEntry("Invalid JSON data format.", "ERROR", "The data does not have the correct ChannelMap structure.");
                    showBanner("Invalid JSON format. Check logs.", "error");
                    return;
                }
                if (Object.keys(parsed).length === 0) {
                    addLogEntry("Empty ChannelMap.", "WARN", "The JSON data is valid but contains no channels to process.");
                    showBanner("JSON data is empty. Nothing to do.", "warning");
                    return;
                }
                jsonDataObject = parsed;
            } catch (e) {
                addLogEntry("Invalid JSON data: Not valid JSON.", "ERROR", (e as Error).message);
                showBanner("Invalid JSON data. Check logs.", "error");
                return;
            }

            const intervalValue = parseInt(currentIntervalInput.value, 10);
            AppSettingsStore.instance.setInterval(currentIntervalInput.value);

            updateStatus("Processing...", 0, "Calculating Permissions...");
            updateButtonStates(true);

            addLogEntry("Starting deletion process...", "INFO", { interval: intervalValue });

            DeletionStore.instance.startDeletion(jsonDataObject).then(() => {
                updateButtonStates(false);
            });
        });
    }

    if (clearDataButton) {
        clearDataButton.addEventListener("click", () => {
            if (DeletionStore.instance.isDeletionRunning()) {
                showBanner('Cannot clear data while deletion is in progress.', 'warning');
                return;
            }

            if (!confirm("Are you sure you want to clear all message data and statistics?")) {
                return;
            }

            const emptyStats = {
                totalDeleted: 0,
                deletedByChannelType: {}
            };
            AppSettingsStore.instance.setDeletionStats(emptyStats);
            AppSettingsStore.instance.setJsonContent("");
            AppSettingsStore.instance.setDeletedMessages({ messageIds: [] });
            
            if (jsonPasteAreaElement) {
                jsonPasteAreaElement.value = "";
            }
            if (customFileButtonElement) {
                customFileButtonElement.textContent = "Choose File";
            }
            if (jsonFileInputElement) {
                jsonFileInputElement.value = "";
            }
            
            clearJsonRelatedDisplays("Idle. All data has been cleared.");
            clearLogEntries();
            
            addLogEntry("All data has been cleared", "INFO");
            showBanner("All message data and statistics have been cleared", "info");
        });
    }

    if (stopButton) {
        stopButton.addEventListener("click", () => {
            if (!DeletionStore.instance.isDeletionRunning()) {
                showBanner('No deletion process is running.', 'warning');
                return;
            }

            DeletionStore.instance.stopDeletion();
            updateButtonStates(false);
            showBanner('Deletion stopped by user.', 'error');
        });
    }

    updateButtonStates(DeletionStore.instance.isDeletionRunning());
};

const setupInputMethodToggle = (): void => {
    if (!showFileUploadButtonElement || !showJsonPasteButtonElement) return;

    showFileUploadButtonElement.addEventListener('click', () => toggleInputMethod('file'));
    showJsonPasteButtonElement.addEventListener('click', () => toggleInputMethod('paste'));

    const initialMethod = AppSettingsStore.instance.getInputMethod();
    toggleInputMethod(initialMethod);
};

const showBanner = (message: string, type: 'info' | 'warning' | 'error' = 'info'): void => {
    if (!uiBannerElement || !bannerTextElement) return;
    bannerTextElement.textContent = message;
    uiBannerElement.className = 'banner';
    if (type === 'info') uiBannerElement.classList.add('info-banner');
    else if (type === 'warning') uiBannerElement.classList.add('warning-banner');
    else if (type === 'error') uiBannerElement.classList.add('error-banner');
    uiBannerElement.style.display = 'flex';
};

const hideBanner = (): void => {
    if (uiBannerElement) uiBannerElement.style.display = 'none';
};

const updateStatus = (message: string, progress?: number, eta?: string): void => {
    if (statusOutputElement) {
        statusOutputElement.innerHTML = message;
    }
    
    if (progressBarContainerElement && progressBarElement) {
        progressBarContainerElement.style.display = 'block';
        const currentWidth = progressBarElement.style.width;
        const newWidth = typeof progress === 'number' 
            ? String(Math.max(0, Math.min(100, progress))) + '%'
            : currentWidth;
        progressBarElement.style.width = newWidth;
    }
    
    if (etaDisplayElement && eta) {
        etaDisplayElement.textContent = "Current ETA: " + eta;
        etaDisplayElement.style.display = 'block';
    }
};

const addLogEntry = (message: string, type: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO', details?: any): void => {
    if (!logContainerElement || !logOutputElement) return;
    const logMsg = "[" + type + "] " + message + (details ? ': ' + (typeof details === 'string' ? details : JSON.stringify(details)) : '') + '\n';
    logOutputElement.textContent += logMsg;
    logOutputElement.style.display = 'block';
    logContainerElement.style.display = 'block';
    logOutputElement.scrollTop = logOutputElement.scrollHeight;
};

const clearLogEntries = (): void => {
    if (logOutputElement) {
        logOutputElement.textContent = '';
        logOutputElement.style.display = 'none';
    }
    if (logContainerElement) logContainerElement.style.display = 'none';
};

const toggleInputMethod = (method: 'file' | 'paste'): void => {
    if (!fileInputSectionElement || !pasteInputSectionElement || !showFileUploadButtonElement || !showJsonPasteButtonElement) return;
    if (method === 'file') {
        fileInputSectionElement.style.display = 'block';
        pasteInputSectionElement.style.display = 'none';
        showFileUploadButtonElement.classList.add('active');
        showJsonPasteButtonElement.classList.remove('active');
    } else {
        fileInputSectionElement.style.display = 'none';
        pasteInputSectionElement.style.display = 'block';
        showFileUploadButtonElement.classList.remove('active');
        showJsonPasteButtonElement.classList.add('active');
    }
    AppSettingsStore.instance.setInputMethod(method);
};

const updateDisplaysFromStatusInfo = (statusInfo: { channelListHtml: string, totalMessagesLineHtml: string, etaString: string, totalMessages: number; }, parsedDataForContext?: ChannelMap): void => {
    if (importSummaryOutputElement) {
        if (statusInfo.totalMessages > 0) {
            importSummaryOutputElement.innerHTML = statusInfo.channelListHtml + statusInfo.totalMessagesLineHtml;
        } else {
            importSummaryOutputElement.innerHTML = statusInfo.channelListHtml;
        }
    }

    if (etaDisplayElement) {
        if (statusInfo.totalMessages > 0) {
            etaDisplayElement.textContent = "Initial Est. Time: " + statusInfo.etaString;
            etaDisplayElement.style.display = 'block';
        } else {
            etaDisplayElement.style.display = 'none';
        }
    }

    if (statusOutputElement) {
        const isDataTrulyEmpty = parsedDataForContext && Object.keys(parsedDataForContext).length === 0;
        if (statusInfo.totalMessages > 0) {
            statusOutputElement.textContent = "Ready to process.";
        } else if (isDataTrulyEmpty) {
            statusOutputElement.textContent = "Idle. No messages to process.";
        } else {
            statusOutputElement.textContent = "Idle. No messages to process.";
        }
    }
};

const clearJsonRelatedDisplays = (defaultStatusText: string = "Idle. Ready to begin."): void => {
    if (importSummaryOutputElement) importSummaryOutputElement.innerHTML = "";
    if (statusOutputElement) statusOutputElement.textContent = defaultStatusText;
    if (etaDisplayElement) etaDisplayElement.style.display = 'none';
};

export const initializeUIInteractions = (container: HTMLDivElement, _initialMinimizedStateFromIndex: boolean): void => {
    uiContainerElement = container;
    intervalInputElement = document.getElementById("deleteInterval") as HTMLInputElement;
    intervalWarningElement = document.getElementById("intervalWarning") as HTMLDivElement;
    minimizeButtonElement = document.getElementById("minimizeButton") as HTMLButtonElement;
    jsonFileInputElement = document.getElementById("jsonFile") as HTMLInputElement;
    customFileButtonElement = document.getElementById("customFileButton") as HTMLButtonElement;
    jsonPasteAreaElement = document.getElementById("jsonPaste") as HTMLTextAreaElement;

    uiBannerElement = document.getElementById("ui-banner") as HTMLDivElement;
    bannerTextElement = uiBannerElement?.querySelector(".banner-text") as HTMLSpanElement;
    bannerCloseButtonElement = uiBannerElement?.querySelector(".banner-close") as HTMLButtonElement;
    showFileUploadButtonElement = document.getElementById("showFileUploadButton") as HTMLButtonElement;
    showJsonPasteButtonElement = document.getElementById("showJsonPasteButton") as HTMLButtonElement;
    fileInputSectionElement = document.getElementById("fileInputSection") as HTMLDivElement;
    pasteInputSectionElement = document.getElementById("pasteInputSection") as HTMLDivElement;
    statusOutputElement = document.getElementById("statusOutput") as HTMLDivElement;
    progressBarContainerElement = document.getElementById("progressBarContainer") as HTMLDivElement;
    progressBarElement = document.getElementById("progressBar") as HTMLDivElement;
    etaDisplayElement = document.getElementById("etaDisplay") as HTMLDivElement;
    logContainerElement = document.getElementById("logContainer") as HTMLDivElement;
    logOutputElement = document.getElementById("logOutput") as HTMLPreElement;
    importSummaryOutputElement = document.getElementById("importSummaryOutput") as HTMLDivElement;

    const styleElement = document.createElement('style');
    styleElement.textContent = `
        #importSummaryOutput ul {
            list-style-type: disc !important;
            margin-top: 5px !important;
            margin-bottom: 5px !important;
            margin-left: 0px !important;
            padding-left: 25px !important;
        }
        #importSummaryOutput li {
            list-style-type: disc !important;
            margin-bottom: 3px !important;
        }
    `;
    document.head.appendChild(styleElement);

    const actualInitialMinimizedState = AppSettingsStore.instance.isMinimized();
    if (uiContainerElement) {
        uiContainerElement.classList.toggle("minimized", actualInitialMinimizedState);
    }

    if (bannerCloseButtonElement) bannerCloseButtonElement.addEventListener('click', hideBanner);

    setupInputMethodToggle();
    if (minimizeButtonElement && uiContainerElement) setupMinimizeButton(actualInitialMinimizedState);
    if (intervalInputElement) setupIntervalInput();
    setupActionButtons();
    
    if (customFileButtonElement && jsonFileInputElement && jsonPasteAreaElement) setupJsonFileInput();
    if (jsonPasteAreaElement && customFileButtonElement && jsonFileInputElement) setupJsonPasteArea();
    
    initializeUIWithSavedData();
};

const initializeUIWithSavedData = (): void => {
    const savedJsonContent = AppSettingsStore.instance.getJsonContent();
    
    if (savedJsonContent && savedJsonContent.trim().length > 0) {
        try {
            const parsedData = JSON.parse(savedJsonContent);
            if (isValidChannelMap(parsedData)) {
                const intervalValue = AppSettingsStore.instance.getInterval();
                const statusInfo = generateImportStatus(parsedData, intervalValue);
                
                updateDisplaysFromStatusInfo(statusInfo, parsedData);
                
                if (customFileButtonElement) {
                    customFileButtonElement.textContent = Object.keys(parsedData).length > 0 
                        ? "Saved JSON active" 
                        : "Saved (empty) JSON";
                }
                
                if (jsonPasteAreaElement) {
                    jsonPasteAreaElement.value = savedJsonContent;
                }
                
                if (statusOutputElement) {
                    const totalMessages = Object.values(parsedData)
                        .reduce((sum, channel) => sum + channel.messageIds.length, 0);
                    statusOutputElement.textContent = totalMessages > 0 
                        ? "Ready to process." 
                        : "Idle. No messages to process.";
                }
                
                return;
            }
        } catch (error) {
            if (customFileButtonElement) {
                customFileButtonElement.textContent = "Saved (corrupt) JSON";
            }
            clearJsonRelatedDisplays("Error: Saved JSON is corrupt.");
            console.error("Failed to parse saved JSON:", error);
            return;
        }
    }
    
    clearJsonRelatedDisplays();

    if (customFileButtonElement) {
        customFileButtonElement.textContent = "Choose File";
    }
};

export {
    validateAndCorrectInterval,
    updateIntervalWarnings,
    setupMinimizeButton,
    setupIntervalInput,
    setupJsonFileInput,
    setupJsonPasteArea,
    setupActionButtons,
    showBanner,
    hideBanner,
    updateStatus,
    addLogEntry,
    clearLogEntries,
    toggleInputMethod
};