/**
 * Waits for a given amount of milliseconds
 * @param ms - The amount of milliseconds to wait
 * @returns A promise that resolves after the given amount of milliseconds
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Waits for a given value to be true
 * @param checker - A function that returns a boolean
 * @param timeout - The amount of milliseconds to wait before timing out
 * @returns A promise that resolves when the value is true
 */
export const waitForValue = async (checker: () => boolean, timeout = 10000) => {
    const startTime = Date.now();

    while (!checker()) {
        if (Date.now() - startTime > timeout) {
            return false;
        }

        await wait(100);
    }

    return true;
}

/**
 * Waits for scripts to settle
 * @param timeout - The amount of milliseconds to wait before timing out
 * @returns A promise that resolves when the scripts have settled
 */
export const waitForScriptsToSettle = (timeout = 10000) => {
    return new Promise<void>((resolve, reject) => {
        const observer = new MutationObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 500);
        });

        let timer = setTimeout(() => {
            observer.disconnect();
            resolve();
        }, timeout);

        observer.observe(document.head || document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}


