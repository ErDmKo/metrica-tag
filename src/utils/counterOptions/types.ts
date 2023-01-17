import {
    DEFAULT_COUNTER_TYPE,
    RSYA_COUNTER_TYPE,
} from 'src/providers/counterOptions/const';

export type RawTrackLinkParams = string | Record<string, unknown> | boolean;

export type CounterTypeInterface =
    | typeof DEFAULT_COUNTER_TYPE
    | typeof RSYA_COUNTER_TYPE;

/**
 * Options passed for initialization
 */
export interface CounterOptions {
    /** Counter id */
    id: number;
    /** Turbo page settings */
    params?: {
        __ym?: {
            tp?: boolean;
            tpid?: number;
        };
    } & Record<string, any>;
    /** Defer hits */
    counterDefer?: boolean;
    /** Internal private option */
    ut?: boolean;
    /** Advertising network or default */
    counterType: CounterTypeInterface;
    /** Params to be sent */
    userParams?: Record<string, unknown>;
    /** Local domain cookie */
    ldc?: string;
    /** Do not set uid in cookie */
    noCookie?: boolean;
    /** URL to substitute in urlParams when tracking hash */
    forceUrl?: string;
    /** Referrer to substitute when sending hits */
    forceReferrer?: string;
    /** A way to disable counter init event */
    triggerEvent?: boolean;
    /** Send HTML page title during init */
    sendTitle?: boolean;
    /** Send URL hash changes */
    trackHash?: boolean;
    /** Advertising campaign id */
    directCampaign?: number;
    /** Allow the clicks provider to track clicks */
    trackLinks?: RawTrackLinkParams;
    /** Enable trackLinks + clickmap + notBounce */
    enableAll?: boolean;
}
