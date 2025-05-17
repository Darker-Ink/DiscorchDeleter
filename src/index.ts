import "./assets/style.css";
import uiHtmlContent from "./assets/index.html";
import { initializeUIInteractions } from "./ui-logic";
import { MINIMIZED_STATE_KEY } from "./utils/stores.js";

const createDeleterUI = (): void => {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'deleter-ui';

    const initialMinimizedState = GM_getValue ? GM_getValue(MINIMIZED_STATE_KEY, false) : false;
    
    if (initialMinimizedState) {
        uiContainer.classList.add('minimized');
    }

    uiContainer.innerHTML = uiHtmlContent;
    document.body.appendChild(uiContainer);

    const footerVersion = document.getElementById('footerVersion');
    
    if (footerVersion) {
        footerVersion.textContent = `v${GM_info.script.version}`;
    }

    initializeUIInteractions(uiContainer, initialMinimizedState);
}

createDeleterUI();
