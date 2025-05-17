import { waitForScriptsToSettle, waitForValue } from "./utils/waiter.js";

await waitForScriptsToSettle();

const vencord = await waitForValue(() => "Vencord" in unsafeWindow, 10000);

if (!vencord) {
    alert("Vencord isn't installed, please head to https://vencord.dev/download to install it.");
    
    throw new Error("Vencord isn't installed, please head to https://vencord.dev/download to install it.");
}