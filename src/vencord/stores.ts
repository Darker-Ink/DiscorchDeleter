import type { MessageStoreType } from "./types.js";

export const MessageStore = Vencord.Webpack.findByProps<MessageStoreType>("deleteMessage");