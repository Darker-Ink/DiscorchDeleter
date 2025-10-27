/**
 * UI Positioning, Dragging, and Resizing
 */

import { elements } from './elements';
import { AppSettingsStore } from '../utils/stores';

class PositioningManager {
    private isDragging = false;
    private startDragX = 0;
    private startDragY = 0;
    private startDragLeft = 0;
    private startDragTop = 0;

    /**
     * Apply saved position and size from storage
     */
    applyPositionAndSize(): void {
        if (!elements.container) return;
        
        const position = AppSettingsStore.instance.getPosition();
        elements.container.style.top = `${position.top}px`;
        elements.container.style.left = `${position.left}px`;
        
        const size = AppSettingsStore.instance.getSize();
        elements.container.style.width = `${size.width}px`;
        elements.container.style.height = size.height !== 'auto' ? `${size.height}px` : '600px';
    }

    /**
     * Initialize dragging functionality
     */
    initializeDragging(): void {
        if (!elements.container || !elements.header) return;
        
        elements.header.style.cursor = 'move';
        
        const isDraggableTarget = (target: EventTarget | null): boolean => {
            if (!target) return false;
            return target === elements.header || 
                   target === document.querySelector('.header-left') || 
                   target === document.querySelector('.header-icon') || 
                   target === document.querySelector('#ui-header h1');
        };
        
        elements.header.addEventListener('mousedown', (e) => {
            if (isDraggableTarget(e.target)) {
                this.isDragging = true;
                this.startDragX = e.clientX;
                this.startDragY = e.clientY;
                this.startDragLeft = parseInt(elements.container!.style.left || '0', 10);
                this.startDragTop = parseInt(elements.container!.style.top || '0', 10);
                
                document.body.style.userSelect = 'none';
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !elements.container) return;
            
            const newLeft = this.startDragLeft + (e.clientX - this.startDragX);
            const newTop = this.startDragTop + (e.clientY - this.startDragY);
            const containerWidth = parseInt(elements.container.style.width || '400', 10);
            
            const finalLeft = Math.max(0, Math.min(newLeft, window.innerWidth - containerWidth));
            const finalTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));
            
            elements.container.style.left = `${finalLeft}px`;
            elements.container.style.top = `${finalTop}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging && elements.container) {
                this.isDragging = false;
                document.body.style.userSelect = '';
                
                const position = {
                    top: parseInt(elements.container.style.top || '0', 10),
                    left: parseInt(elements.container.style.left || '0', 10)
                };
                AppSettingsStore.instance.setPosition(position);
            }
        });
    }

    /**
     * Initialize resizing functionality
     */
    initializeResizing(): void {
        if (!elements.container) return;
        
        elements.container.style.resize = 'both';
        elements.container.style.overflow = 'hidden';
        elements.container.style.minWidth = '320px';
        elements.container.style.minHeight = '200px';
        
        const initialWidth = elements.container.offsetWidth;
        const initialHeight = elements.container.offsetHeight || 600;
        
        AppSettingsStore.instance.setSize({ width: initialWidth, height: initialHeight });
        
        const resizeObserver = new ResizeObserver(() => {
            if (!elements.container || this.isDragging || elements.container.classList.contains('minimized')) return;
            
            const width = elements.container.offsetWidth;
            const height = elements.container.offsetHeight;
            
            AppSettingsStore.instance.setSize({ width, height });
            
            const contentWrapper = elements.container.querySelector('.ui-content-wrapper') as HTMLElement;
            if (contentWrapper) {
                contentWrapper.style.maxHeight = `calc(${height}px - 96px)`;
            }
        });
        
        resizeObserver.observe(elements.container);
        
        const updateResizeState = () => {
            if (!elements.container) return;
            elements.container.style.resize = elements.container.classList.contains('minimized') ? 'none' : 'both';
        };
        
        if (elements.minimizeButton) {
            elements.minimizeButton.addEventListener('click', () => setTimeout(updateResizeState, 0));
        }
        
        updateResizeState();
    }

    /**
     * Initialize all positioning features
     */
    initialize(): void {
        this.applyPositionAndSize();
        this.initializeDragging();
        this.initializeResizing();
    }
}

export const positioning = new PositioningManager();
