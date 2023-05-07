import {
    cForEach,
    toArray,
    cMap,
    cReduce,
    cFilter,
    isArray,
    ctxReduce,
    arrayJoin,
} from 'src/utils/array';
import { waitForBodyTask } from 'src/utils/dom/waitForBody';
import { memo, bindArg } from 'src/utils/function';
import { getPath, isUndefined, cKeys } from 'src/utils/object';
import { getMs, TimeOne } from 'src/utils/time';
import { PolyPromise } from 'src/utils';
import { walkTree } from 'src/utils/treeWalker';
import { CounterOptions } from 'src/utils/counterOptions';
import {
    PhoneChangeMap,
    PhoneTuple,
    ReplaceElement,
    ReplacerOptions,
    ReplaceElementLink,
    ReplaceElementText,
    ANY_PHONE,
} from './const';
import { safeDecodeURI } from '../querystring';
import { taskFork } from '../async';
import { removeNonDigits } from '../string/remove';

const phoneMask = memo((phone: string) =>
    arrayJoin('[^\\d<>]*', phone.split('')),
);

export const buildRegExp = memo(
    (phone: string) => new RegExp(phoneMask(phone), 'g'),
);

export const buildAllRegExp = (phoneChangeMap: PhoneChangeMap) =>
    new RegExp(`(?:${arrayJoin('|', cMap(phoneMask, cKeys(phoneChangeMap)))})`);

export const altPhone = (purePhone: string) => {
    const altMap: Record<string, string> = {
        '7': '8',
        '8': '7',
    };

    if (purePhone.length === 11) {
        if (altMap[purePhone[0]]) {
            return `${altMap[purePhone[0]]}${purePhone.slice(1)}`;
        }
    }
    return purePhone;
};

export const reformatPhone = (orig: string, res: string) => {
    const out = [];
    const origArr = orig.split('');
    const resArr = res.split('');
    let posRes = 0;
    for (let posOrig = 0; posOrig < orig.length; posOrig += 1) {
        if (posRes >= resArr.length) {
            break;
        }
        const origChar = origArr[posOrig];
        if (origChar >= '0' && origChar <= '9') {
            out.push(resArr[posRes]);
            posRes += 1;
        } else {
            out.push(origArr[posOrig]);
        }
    }
    return arrayJoin('', out) + res.slice(posRes + 1);
};

// стрелочка не лишняя, нужна новая мапа на каждый вызов
const genPhoneMap = () =>
    /* @__PURE__ */ ctxReduce((accum: PhoneChangeMap, tuple: PhoneTuple) => {
        const [from, replaceTo] = cMap(removeNonDigits, tuple);

        accum[from] = {
            replaceTo,
            tuple,
        };

        const altFrom = altPhone(from);

        if (altFrom !== from) {
            accum[altFrom] = {
                replaceTo: altPhone(replaceTo),
                tuple,
            };
        }
        return accum;
    }, {});

export const selectText = (
    ctx: Window,
    phoneChangeMap: PhoneChangeMap,
    rootNode: HTMLElement = ctx.document.body,
) => {
    if (!rootNode) {
        return [];
    }
    const nodes: ReplaceElement[] = [];
    const phonesRegExp = buildAllRegExp(phoneChangeMap);
    walkTree(
        ctx,
        rootNode,
        (node: Node) => {
            if (
                node === rootNode ||
                (getPath(node, 'parentNode.nodeName') || '').toLowerCase() ===
                    'script'
            ) {
                return;
            }
            const text = node.textContent || '';
            const phones = cFilter(Boolean, phonesRegExp.exec(text) || []);
            cForEach((phone) => {
                const purePhone = removeNonDigits(phone);
                if (!isUndefined(phoneChangeMap[purePhone])) {
                    nodes.push({
                        replaceElementType: 'text',
                        replaceHTMLNode: node,
                        replaceFrom: purePhone,
                        replaceTo: reformatPhone(
                            phone,
                            phoneChangeMap[purePhone].replaceTo,
                        ),
                        textOrig: node.textContent || '',
                    });
                }
            }, phones);
        },
        (node: Node) => {
            if (phonesRegExp.test(node.textContent || '')) {
                return 1;
            }
            return 0;
        },
        ctx.NodeFilter.SHOW_TEXT,
    );
    return nodes;
};

export const selectLink = (ctx: Window, phoneChangeMap: PhoneChangeMap) => {
    const rootNode = ctx.document.body;
    if (!rootNode) {
        return [];
    }
    const phonesRegExp = buildAllRegExp(phoneChangeMap);

    return cReduce(
        (accum: ReplaceElement[], link: HTMLAnchorElement) => {
            const originalHref = getPath(link, 'href');
            const href = safeDecodeURI(originalHref || '');
            if (href.slice(0, 4) === 'tel:') {
                const [foundPhone] = phonesRegExp.exec(href) || [''];
                const purePhone = foundPhone ? removeNonDigits(foundPhone) : '';

                const phoneChangeMapItem = phoneChangeMap[purePhone];
                if (
                    !isUndefined(phoneChangeMapItem) &&
                    (purePhone || phoneChangeMapItem.tuple[0] === ANY_PHONE)
                ) {
                    accum.push({
                        replaceElementType: 'href',
                        replaceHTMLNode: link,
                        replaceFrom: purePhone,
                        replaceTo: reformatPhone(
                            foundPhone,
                            phoneChangeMap[purePhone].replaceTo,
                        ),
                        textOrig: originalHref,
                    });

                    const telFromHref = removeNonDigits(href.slice(4));
                    const textsPhoneChangeMap = genPhoneMap()([
                        purePhone
                            ? phoneChangeMapItem.tuple
                            : [telFromHref, ''],
                    ]);

                    accum.push(...selectText(ctx, textsPhoneChangeMap, link));
                }
            }

            return accum;
        },
        [],
        toArray<HTMLAnchorElement>(rootNode.querySelectorAll('a')),
    );
};

export const createPhoneDomReplacer = (
    ctx: Window,
    counterOpt: CounterOptions | null,
    replacerOptions: ReplacerOptions,
) => {
    const {
        transformer,
        needReplaceTypes = {
            [ReplaceElementLink]: true,
            [ReplaceElementText]: true,
        },
    } = replacerOptions;
    let phoneChangeMap: PhoneChangeMap;

    const replaceElContent = (item: ReplaceElement) => {
        if (transformer(ctx, counterOpt, item)) {
            return phoneChangeMap[item.replaceFrom]?.tuple;
        }
        return null;
    };

    return {
        replacePhonesDom: (substitutions: PhoneTuple[]) => {
            return new PolyPromise<{ phones: PhoneTuple[]; perf: number }>(
                (resolve, reject) => {
                    if (!substitutions || !substitutions.length) {
                        reject();
                    }
                    phoneChangeMap = genPhoneMap()(substitutions);
                    waitForBodyTask(ctx)(
                        taskFork(
                            bindArg({ phones: [], perf: 0 }, resolve),
                            () => {
                                const timer = TimeOne(ctx);
                                const startTime = timer(getMs);

                                const links = needReplaceTypes[
                                    ReplaceElementLink
                                ]
                                    ? selectLink(ctx, phoneChangeMap)
                                    : [];
                                const texts = needReplaceTypes[
                                    ReplaceElementText
                                ]
                                    ? selectText(ctx, phoneChangeMap)
                                    : [];

                                resolve({
                                    phones: cFilter(
                                        isArray,
                                        cFilter(
                                            Boolean,
                                            cMap(
                                                replaceElContent,
                                                links.concat(texts),
                                            ),
                                        ),
                                    ) as PhoneTuple[],
                                    perf: timer(getMs) - startTime,
                                });
                            },
                        ),
                    );
                },
            );
        },
    };
};
