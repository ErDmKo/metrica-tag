import { cReduce, includes } from 'src/utils/array';
import { ctxPath, getPath } from 'src/utils/object';
import { equal, memo, pipe } from 'src/utils/function';

const props = [
    'hash',
    'host',
    'hostname',
    'href',
    'pathname',
    'port',
    'protocol',
    'search',
] as const;

type PropsList = typeof props[number];

export type Props = {
    [prop in PropsList]: string;
};

export const getLocation = (ctx: Window): Props => {
    return cReduce(
        (out, prop) => {
            const result = out;
            const loc = getPath(ctx, `location.${prop}`);
            result[prop] = loc ? `${loc}` : '';
            return result;
        },
        {} as Props,
        props as any as PropsList[],
    );
};

export const YANDEX_WHITE_LIST_TLD = [
    'ru',
    'ua',
    'by',
    'kz',
    'az',
    'kg',
    'lv',
    'md',
    'tj',
    'tm',
    'uz',
    'ee',
    'fr',
    'lt',
    'com',
    'co.il',
    'com.ge',
    'com.am',
    'com.tr',
    'com.ua',
    'com.ru',
];

export const YA_RU_DOMAIN = 'ya.ru';
export const YANDEX_RU_DOMAIN = 'yandex.ru';
const YANDEX_DOMAIN_REGEX = /(?:^|\.)(?:(ya\.ru)|(?:yandex)\.(\w+|com?\.\w+))$/;

/**
 * Check if the url belongs to Yandex Search. Return the matched tld.
 */
export const isYandexSearchDomain = (host: string): string | false => {
    const match = host.match(YANDEX_DOMAIN_REGEX);
    if (match) {
        const [, matchedYaRu, matchedYandexTld] = match;

        if (matchedYandexTld) {
            return includes(matchedYandexTld, YANDEX_WHITE_LIST_TLD)
                ? matchedYandexTld
                : false;
        }

        if (matchedYaRu) {
            return YANDEX_WHITE_LIST_TLD[0];
        }
    }
    return false;
};

export const delWWW = memo((domain: string) => {
    return (domain ? domain.replace(/^www\./, '') : '').toLowerCase();
});

export const isSameDomain = (domain1: string, domain2: string) => {
    return delWWW(domain1) === delWWW(domain2);
};

export const isYandexDomain = memo((ctx: Window): boolean => {
    const { hostname } = getLocation(ctx);
    let result = false;
    if (hostname) {
        result = hostname.search(YANDEX_DOMAIN_REGEX) !== -1;
    }
    return result;
});

export const isHttps = pipe(getLocation, ctxPath('protocol'), equal('https:'));
