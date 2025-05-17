export const formatTime = (totalMilliseconds: number): string => {
    if (totalMilliseconds < 0) {
        return "N/A";
    }
    if (totalMilliseconds === 0) {
        return "Instantly";
    }

    let
        seconds = Math.floor(totalMilliseconds / 1000),
        minutes = Math.floor(seconds / 60),
        hours = Math.floor(minutes / 60),
        days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

    return parts.join(', ');
}