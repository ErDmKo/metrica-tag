import { isUndefined, isNil } from 'src/utils/object';
import { bindArg, curry2, firstArg } from 'src/utils/function';

export type FlagData = Record<string, string | number | null>;
/**
 * @param {Object} [ctx]
 */
const storageFn = (
    serialize: (data: FlagData) => string,
    initialData?: FlagData | null,
) => {
    const flags = initialData || {};
    return {
        ctx: bindArg(flags, firstArg) as () => FlagData,
        getVal<E extends string | number>(flag: string, defVal?: E) {
            const out = flags[flag] as E;
            if (isUndefined(out) && !isUndefined(defVal)) {
                return defVal;
            }
            return out;
        },
        setVal(flag: string, val: string | number) {
            flags[flag] = val;
            return this;
        },
        setOrNot(flag: string, val?: string | number | null) {
            if (val === '' || isNil(val)) {
                return this;
            }
            return this.setVal(flag, val);
        },
        serialize: bindArg(flags, serialize),
    };
};

export type FlagStorage = ReturnType<typeof storageFn>;

export const flagStorage = curry2(storageFn) as any as (
    serialize: (data: FlagData) => string,
) => (initialData?: FlagData | null) => FlagStorage;
