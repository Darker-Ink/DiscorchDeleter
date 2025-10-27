/**
 * Logging System
 * Handles buffered log output with automatic flushing
 */

import { elements } from './elements';
import { LOG_CONFIG } from './constants';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
    private buffer: string[] = [];
    private flushScheduled = false;
    private flushTimerId: number | null = null;

    /**
     * Add a log entry to the buffer
     */
    log(message: string, level: LogLevel = 'INFO', details?: any): void {
        const logMsg = `[${level}] ${message}${details ? ': ' + (typeof details === 'string' ? details : JSON.stringify(details)) : ''}\n`;
        
        this.buffer.push(logMsg);
        
        if (this.buffer.length > LOG_CONFIG.MAX_ENTRIES) {
            this.buffer = this.buffer.slice(this.buffer.length - LOG_CONFIG.MAX_ENTRIES);
        }
        
        this.scheduleFlush();
    }

    /**
     * Schedule a flush of the log buffer to the DOM
     */
    private scheduleFlush(): void {
        if (this.flushScheduled) return;
        
        this.flushScheduled = true;
        this.flushTimerId = window.setTimeout(() => {
            this.flushScheduled = false;
            this.flush();
        }, LOG_CONFIG.FLUSH_DELAY_MS);
    }

    /**
     * Flush the log buffer to the DOM
     */
    private flush(): void {
        if (!elements.logOutput || !elements.logContainer) return;
        
        if (this.buffer.length > 0) {
            elements.logOutput.classList.remove('d-none');
            elements.logContainer.classList.remove('d-none');
        }
        
        elements.logOutput.textContent = this.buffer.join('');
        elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
    }

    /**
     * Clear all logs
     */
    clear(): void {
        this.buffer = [];
        
        if (this.flushTimerId !== null) {
            clearTimeout(this.flushTimerId);
            this.flushTimerId = null;
            this.flushScheduled = false;
        }
        
        if (elements.logOutput) {
            elements.logOutput.textContent = '';
            elements.logOutput.classList.add('d-none');
        }
        
        if (elements.logContainer) {
            elements.logContainer.classList.add('d-none');
        }
    }
}

export const logger = new Logger();