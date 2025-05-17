import type { ChannelStoreType, PermissionStoreType } from "./vencord/types.js";

interface Vencord {
    Webpack: {
        findByProps: <T>(props: string) => T;
        Common: {
            PermissionStore: PermissionStoreType;
            ChannelStore: ChannelStoreType;
        }
    };
}

declare global {
    interface Window {
        Vencord: Vencord;
        GM_getValue: ((key: string, defaultValue?: any) => any) | undefined;
        GM_setValue: ((key: string, value: any) => void) | undefined;
        GM_deleteValue: ((key: string) => void) | undefined;
    }

    var Vencord: Vencord;
    var unsafeWindow: typeof window;
}

export {};