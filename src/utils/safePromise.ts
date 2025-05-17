/**
 * Run a promise and return a tuple of [result, error].
 * @param promise - The promise to run.
 * @returns A tuple of [result, error].
 */
const safePromise = async <T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> => {
    try {
        const res = await promise;
        return [res, null];
    } catch (e) {
        return [null, e as Error];
    }
}

export default safePromise;