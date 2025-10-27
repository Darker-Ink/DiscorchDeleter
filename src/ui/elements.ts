/**
 * DOM Element References
 * Central registry for all UI element references
 */

export class UIElements {
    // Container and layout
    container: HTMLDivElement | null = null;
    header: HTMLDivElement | null = null;
    contentWrapper: HTMLElement | null = null;
    footer: HTMLElement | null = null;

    // Banner elements
    banner: HTMLDivElement | null = null;
    bannerText: HTMLSpanElement | null = null;
    bannerClose: HTMLButtonElement | null = null;

    // Header controls
    minimizeButton: HTMLButtonElement | null = null;

    // Interval input
    intervalInput: HTMLInputElement | null = null;
    intervalWarning: HTMLDivElement | null = null;

    // JSON input elements
    jsonFileInput: HTMLInputElement | null = null;
    customFileButton: HTMLButtonElement | null = null;
    jsonPasteArea: HTMLTextAreaElement | null = null;
    showFileUploadButton: HTMLButtonElement | null = null;
    showJsonPasteButton: HTMLButtonElement | null = null;
    fileInputSection: HTMLDivElement | null = null;
    pasteInputSection: HTMLDivElement | null = null;

    // Status and progress
    statusOutput: HTMLDivElement | null = null;
    importSummaryOutput: HTMLDivElement | null = null;
    progressBarContainer: HTMLDivElement | null = null;
    progressBar: HTMLDivElement | null = null;
    etaDisplay: HTMLDivElement | null = null;

    // Logs
    logContainer: HTMLDivElement | null = null;
    logOutput: HTMLPreElement | null = null;

    // Action buttons
    startButton: HTMLButtonElement | null = null;
    stopButton: HTMLButtonElement | null = null;
    clearDataButton: HTMLButtonElement | null = null;

    /**
     * Initialize all element references from the DOM
     */
    initialize(container: HTMLDivElement): void {
        this.container = container;
        this.header = document.getElementById("ui-header") as HTMLDivElement;
        
        this.intervalInput = document.getElementById("deleteInterval") as HTMLInputElement;
        this.intervalWarning = document.getElementById("intervalWarning") as HTMLDivElement;
        this.minimizeButton = document.getElementById("minimizeButton") as HTMLButtonElement;
        
        this.jsonFileInput = document.getElementById("jsonFile") as HTMLInputElement;
        this.customFileButton = document.getElementById("customFileButton") as HTMLButtonElement;
        this.jsonPasteArea = document.getElementById("jsonPaste") as HTMLTextAreaElement;

        this.banner = document.getElementById("ui-banner") as HTMLDivElement;
        this.bannerText = this.banner?.querySelector(".banner-text") as HTMLSpanElement;
        this.bannerClose = this.banner?.querySelector(".banner-close") as HTMLButtonElement;
        
        this.showFileUploadButton = document.getElementById("showFileUploadButton") as HTMLButtonElement;
        this.showJsonPasteButton = document.getElementById("showJsonPasteButton") as HTMLButtonElement;
        this.fileInputSection = document.getElementById("fileInputSection") as HTMLDivElement;
        this.pasteInputSection = document.getElementById("pasteInputSection") as HTMLDivElement;
        
        this.statusOutput = document.getElementById("statusOutput") as HTMLDivElement;
        this.progressBarContainer = document.getElementById("progressBarContainer") as HTMLDivElement;
        this.progressBar = document.getElementById("progressBar") as HTMLDivElement;
        this.etaDisplay = document.getElementById("etaDisplay") as HTMLDivElement;
        this.logContainer = document.getElementById("logContainer") as HTMLDivElement;
        this.logOutput = document.getElementById("logOutput") as HTMLPreElement;
        this.importSummaryOutput = document.getElementById("importSummaryOutput") as HTMLDivElement;

        this.startButton = document.getElementById("startButton") as HTMLButtonElement;
        this.stopButton = document.getElementById("stopButton") as HTMLButtonElement;
        this.clearDataButton = document.getElementById("clearDataButton") as HTMLButtonElement;
    }
}

export const elements = new UIElements();
