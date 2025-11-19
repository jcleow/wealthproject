(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/providers/QueryProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryProvider",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$queryClient$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/queryClient.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$lib$2f$QueryClientProvider$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/lib/QueryClientProvider.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function QueryProvider({ children }) {
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$queryClient$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 5,
                        refetchOnWindowFocus: false
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$lib$2f$QueryClientProvider$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/providers/QueryProvider.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(QueryProvider, "gA+4GENx42HUkjoYpB626eV3ZI4=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TYPES
// UTILS
__turbopack_context__.s([
    "difference",
    ()=>difference,
    "functionalUpdate",
    ()=>functionalUpdate,
    "getAbortController",
    ()=>getAbortController,
    "hashQueryKey",
    ()=>hashQueryKey,
    "hashQueryKeyByOptions",
    ()=>hashQueryKeyByOptions,
    "isError",
    ()=>isError,
    "isPlainArray",
    ()=>isPlainArray,
    "isPlainObject",
    ()=>isPlainObject,
    "isQueryKey",
    ()=>isQueryKey,
    "isServer",
    ()=>isServer,
    "isValidTimeout",
    ()=>isValidTimeout,
    "matchMutation",
    ()=>matchMutation,
    "matchQuery",
    ()=>matchQuery,
    "noop",
    ()=>noop,
    "parseFilterArgs",
    ()=>parseFilterArgs,
    "parseMutationArgs",
    ()=>parseMutationArgs,
    "parseMutationFilterArgs",
    ()=>parseMutationFilterArgs,
    "parseQueryArgs",
    ()=>parseQueryArgs,
    "partialDeepEqual",
    ()=>partialDeepEqual,
    "partialMatchKey",
    ()=>partialMatchKey,
    "replaceAt",
    ()=>replaceAt,
    "replaceData",
    ()=>replaceData,
    "replaceEqualDeep",
    ()=>replaceEqualDeep,
    "scheduleMicrotask",
    ()=>scheduleMicrotask,
    "shallowEqualObjects",
    ()=>shallowEqualObjects,
    "sleep",
    ()=>sleep,
    "timeUntilStale",
    ()=>timeUntilStale
]);
const isServer = typeof window === 'undefined' || 'Deno' in window;
function noop() {
    return undefined;
}
function functionalUpdate(updater, input) {
    return typeof updater === 'function' ? updater(input) : updater;
}
function isValidTimeout(value) {
    return typeof value === 'number' && value >= 0 && value !== Infinity;
}
function difference(array1, array2) {
    return array1.filter((x)=>!array2.includes(x));
}
function replaceAt(array, index, value) {
    const copy = array.slice(0);
    copy[index] = value;
    return copy;
}
function timeUntilStale(updatedAt, staleTime) {
    return Math.max(updatedAt + (staleTime || 0) - Date.now(), 0);
}
function parseQueryArgs(arg1, arg2, arg3) {
    if (!isQueryKey(arg1)) {
        return arg1;
    }
    if (typeof arg2 === 'function') {
        return {
            ...arg3,
            queryKey: arg1,
            queryFn: arg2
        };
    }
    return {
        ...arg2,
        queryKey: arg1
    };
}
function parseMutationArgs(arg1, arg2, arg3) {
    if (isQueryKey(arg1)) {
        if (typeof arg2 === 'function') {
            return {
                ...arg3,
                mutationKey: arg1,
                mutationFn: arg2
            };
        }
        return {
            ...arg2,
            mutationKey: arg1
        };
    }
    if (typeof arg1 === 'function') {
        return {
            ...arg2,
            mutationFn: arg1
        };
    }
    return {
        ...arg1
    };
}
function parseFilterArgs(arg1, arg2, arg3) {
    return isQueryKey(arg1) ? [
        {
            ...arg2,
            queryKey: arg1
        },
        arg3
    ] : [
        arg1 || {},
        arg2
    ];
}
function parseMutationFilterArgs(arg1, arg2, arg3) {
    return isQueryKey(arg1) ? [
        {
            ...arg2,
            mutationKey: arg1
        },
        arg3
    ] : [
        arg1 || {},
        arg2
    ];
}
function matchQuery(filters, query) {
    const { type = 'all', exact, fetchStatus, predicate, queryKey, stale } = filters;
    if (isQueryKey(queryKey)) {
        if (exact) {
            if (query.queryHash !== hashQueryKeyByOptions(queryKey, query.options)) {
                return false;
            }
        } else if (!partialMatchKey(query.queryKey, queryKey)) {
            return false;
        }
    }
    if (type !== 'all') {
        const isActive = query.isActive();
        if (type === 'active' && !isActive) {
            return false;
        }
        if (type === 'inactive' && isActive) {
            return false;
        }
    }
    if (typeof stale === 'boolean' && query.isStale() !== stale) {
        return false;
    }
    if (typeof fetchStatus !== 'undefined' && fetchStatus !== query.state.fetchStatus) {
        return false;
    }
    if (predicate && !predicate(query)) {
        return false;
    }
    return true;
}
function matchMutation(filters, mutation) {
    const { exact, fetching, predicate, mutationKey } = filters;
    if (isQueryKey(mutationKey)) {
        if (!mutation.options.mutationKey) {
            return false;
        }
        if (exact) {
            if (hashQueryKey(mutation.options.mutationKey) !== hashQueryKey(mutationKey)) {
                return false;
            }
        } else if (!partialMatchKey(mutation.options.mutationKey, mutationKey)) {
            return false;
        }
    }
    if (typeof fetching === 'boolean' && mutation.state.status === 'loading' !== fetching) {
        return false;
    }
    if (predicate && !predicate(mutation)) {
        return false;
    }
    return true;
}
function hashQueryKeyByOptions(queryKey, options) {
    const hashFn = (options == null ? void 0 : options.queryKeyHashFn) || hashQueryKey;
    return hashFn(queryKey);
}
/**
 * Default query keys hash function.
 * Hashes the value into a stable hash.
 */ function hashQueryKey(queryKey) {
    return JSON.stringify(queryKey, (_, val)=>isPlainObject(val) ? Object.keys(val).sort().reduce((result, key)=>{
            result[key] = val[key];
            return result;
        }, {}) : val);
}
/**
 * Checks if key `b` partially matches with key `a`.
 */ function partialMatchKey(a, b) {
    return partialDeepEqual(a, b);
}
/**
 * Checks if `b` partially matches with `a`.
 */ function partialDeepEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b) {
        return false;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        return !Object.keys(b).some((key)=>!partialDeepEqual(a[key], b[key]));
    }
    return false;
}
/**
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 */ function replaceEqualDeep(a, b) {
    if (a === b) {
        return a;
    }
    const array = isPlainArray(a) && isPlainArray(b);
    if (array || isPlainObject(a) && isPlainObject(b)) {
        const aSize = array ? a.length : Object.keys(a).length;
        const bItems = array ? b : Object.keys(b);
        const bSize = bItems.length;
        const copy = array ? [] : {};
        let equalItems = 0;
        for(let i = 0; i < bSize; i++){
            const key = array ? i : bItems[i];
            copy[key] = replaceEqualDeep(a[key], b[key]);
            if (copy[key] === a[key]) {
                equalItems++;
            }
        }
        return aSize === bSize && equalItems === aSize ? a : copy;
    }
    return b;
}
/**
 * Shallow compare objects. Only works with objects that always have the same properties.
 */ function shallowEqualObjects(a, b) {
    if (a && !b || b && !a) {
        return false;
    }
    for(const key in a){
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}
function isPlainArray(value) {
    return Array.isArray(value) && value.length === Object.keys(value).length;
} // Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o) {
    if (!hasObjectPrototype(o)) {
        return false;
    } // If has modified constructor
    const ctor = o.constructor;
    if (typeof ctor === 'undefined') {
        return true;
    } // If has modified prototype
    const prot = ctor.prototype;
    if (!hasObjectPrototype(prot)) {
        return false;
    } // If constructor does not have an Object-specific method
    if (!prot.hasOwnProperty('isPrototypeOf')) {
        return false;
    } // Most likely a plain Object
    return true;
}
function hasObjectPrototype(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}
function isQueryKey(value) {
    return Array.isArray(value);
}
function isError(value) {
    return value instanceof Error;
}
function sleep(timeout) {
    return new Promise((resolve)=>{
        setTimeout(resolve, timeout);
    });
}
/**
 * Schedules a microtask.
 * This can be useful to schedule state updates after rendering.
 */ function scheduleMicrotask(callback) {
    sleep(0).then(callback);
}
function getAbortController() {
    if (typeof AbortController === 'function') {
        return new AbortController();
    }
    return;
}
function replaceData(prevData, data, options) {
    // Use prev data if an isDataEqual function is defined and returns `true`
    if (options.isDataEqual != null && options.isDataEqual(prevData, data)) {
        return prevData;
    } else if (typeof options.structuralSharing === 'function') {
        return options.structuralSharing(prevData, data);
    } else if (options.structuralSharing !== false) {
        // Structurally share data between prev and new data if needed
        return replaceEqualDeep(prevData, data);
    }
    return data;
}
;
 //# sourceMappingURL=utils.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/logger.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultLogger",
    ()=>defaultLogger
]);
const defaultLogger = console;
;
 //# sourceMappingURL=logger.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createNotifyManager",
    ()=>createNotifyManager,
    "notifyManager",
    ()=>notifyManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
;
function createNotifyManager() {
    let queue = [];
    let transactions = 0;
    let notifyFn = (callback)=>{
        callback();
    };
    let batchNotifyFn = (callback)=>{
        callback();
    };
    const batch = (callback)=>{
        let result;
        transactions++;
        try {
            result = callback();
        } finally{
            transactions--;
            if (!transactions) {
                flush();
            }
        }
        return result;
    };
    const schedule = (callback)=>{
        if (transactions) {
            queue.push(callback);
        } else {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scheduleMicrotask"])(()=>{
                notifyFn(callback);
            });
        }
    };
    /**
   * All calls to the wrapped function will be batched.
   */ const batchCalls = (callback)=>{
        return (...args)=>{
            schedule(()=>{
                callback(...args);
            });
        };
    };
    const flush = ()=>{
        const originalQueue = queue;
        queue = [];
        if (originalQueue.length) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scheduleMicrotask"])(()=>{
                batchNotifyFn(()=>{
                    originalQueue.forEach((callback)=>{
                        notifyFn(callback);
                    });
                });
            });
        }
    };
    /**
   * Use this method to set a custom notify function.
   * This can be used to for example wrap notifications with `React.act` while running tests.
   */ const setNotifyFunction = (fn)=>{
        notifyFn = fn;
    };
    /**
   * Use this method to set a custom function to batch notifications together into a single tick.
   * By default React Query will use the batch function provided by ReactDOM or React Native.
   */ const setBatchNotifyFunction = (fn)=>{
        batchNotifyFn = fn;
    };
    return {
        batch,
        batchCalls,
        schedule,
        setNotifyFunction,
        setBatchNotifyFunction
    };
} // SINGLETON
const notifyManager = createNotifyManager();
;
 //# sourceMappingURL=notifyManager.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/subscribable.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Subscribable",
    ()=>Subscribable
]);
class Subscribable {
    constructor(){
        this.listeners = new Set();
        this.subscribe = this.subscribe.bind(this);
    }
    subscribe(listener) {
        const identity = {
            listener
        };
        this.listeners.add(identity);
        this.onSubscribe();
        return ()=>{
            this.listeners.delete(identity);
            this.onUnsubscribe();
        };
    }
    hasListeners() {
        return this.listeners.size > 0;
    }
    onSubscribe() {}
    onUnsubscribe() {}
}
;
 //# sourceMappingURL=subscribable.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/focusManager.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FocusManager",
    ()=>FocusManager,
    "focusManager",
    ()=>focusManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/subscribable.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
;
;
class FocusManager extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(){
        super();
        this.setup = (onFocus)=>{
            // addEventListener does not exist in React Native, but window does
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] && window.addEventListener) {
                const listener = ()=>onFocus(); // Listen to visibillitychange and focus
                window.addEventListener('visibilitychange', listener, false);
                window.addEventListener('focus', listener, false);
                return ()=>{
                    // Be sure to unsubscribe if a new handler is set
                    window.removeEventListener('visibilitychange', listener);
                    window.removeEventListener('focus', listener);
                };
            }
            return;
        };
    }
    onSubscribe() {
        if (!this.cleanup) {
            this.setEventListener(this.setup);
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            var _this$cleanup;
            (_this$cleanup = this.cleanup) == null ? void 0 : _this$cleanup.call(this);
            this.cleanup = undefined;
        }
    }
    setEventListener(setup) {
        var _this$cleanup2;
        this.setup = setup;
        (_this$cleanup2 = this.cleanup) == null ? void 0 : _this$cleanup2.call(this);
        this.cleanup = setup((focused)=>{
            if (typeof focused === 'boolean') {
                this.setFocused(focused);
            } else {
                this.onFocus();
            }
        });
    }
    setFocused(focused) {
        const changed = this.focused !== focused;
        if (changed) {
            this.focused = focused;
            this.onFocus();
        }
    }
    onFocus() {
        this.listeners.forEach(({ listener })=>{
            listener();
        });
    }
    isFocused() {
        if (typeof this.focused === 'boolean') {
            return this.focused;
        } // document global can be unavailable in react native
        if (typeof document === 'undefined') {
            return true;
        }
        return [
            undefined,
            'visible',
            'prerender'
        ].includes(document.visibilityState);
    }
}
const focusManager = new FocusManager();
;
 //# sourceMappingURL=focusManager.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/onlineManager.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OnlineManager",
    ()=>OnlineManager,
    "onlineManager",
    ()=>onlineManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/subscribable.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
;
;
const onlineEvents = [
    'online',
    'offline'
];
class OnlineManager extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(){
        super();
        this.setup = (onOnline)=>{
            // addEventListener does not exist in React Native, but window does
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] && window.addEventListener) {
                const listener = ()=>onOnline(); // Listen to online
                onlineEvents.forEach((event)=>{
                    window.addEventListener(event, listener, false);
                });
                return ()=>{
                    // Be sure to unsubscribe if a new handler is set
                    onlineEvents.forEach((event)=>{
                        window.removeEventListener(event, listener);
                    });
                };
            }
            return;
        };
    }
    onSubscribe() {
        if (!this.cleanup) {
            this.setEventListener(this.setup);
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            var _this$cleanup;
            (_this$cleanup = this.cleanup) == null ? void 0 : _this$cleanup.call(this);
            this.cleanup = undefined;
        }
    }
    setEventListener(setup) {
        var _this$cleanup2;
        this.setup = setup;
        (_this$cleanup2 = this.cleanup) == null ? void 0 : _this$cleanup2.call(this);
        this.cleanup = setup((online)=>{
            if (typeof online === 'boolean') {
                this.setOnline(online);
            } else {
                this.onOnline();
            }
        });
    }
    setOnline(online) {
        const changed = this.online !== online;
        if (changed) {
            this.online = online;
            this.onOnline();
        }
    }
    onOnline() {
        this.listeners.forEach(({ listener })=>{
            listener();
        });
    }
    isOnline() {
        if (typeof this.online === 'boolean') {
            return this.online;
        }
        if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
            return true;
        }
        return navigator.onLine;
    }
}
const onlineManager = new OnlineManager();
;
 //# sourceMappingURL=onlineManager.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/retryer.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CancelledError",
    ()=>CancelledError,
    "canFetch",
    ()=>canFetch,
    "createRetryer",
    ()=>createRetryer,
    "isCancelledError",
    ()=>isCancelledError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$focusManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/focusManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/onlineManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
;
;
;
function defaultRetryDelay(failureCount) {
    return Math.min(1000 * 2 ** failureCount, 30000);
}
function canFetch(networkMode) {
    return (networkMode != null ? networkMode : 'online') === 'online' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline() : true;
}
class CancelledError {
    constructor(options){
        this.revert = options == null ? void 0 : options.revert;
        this.silent = options == null ? void 0 : options.silent;
    }
}
function isCancelledError(value) {
    return value instanceof CancelledError;
}
function createRetryer(config) {
    let isRetryCancelled = false;
    let failureCount = 0;
    let isResolved = false;
    let continueFn;
    let promiseResolve;
    let promiseReject;
    const promise = new Promise((outerResolve, outerReject)=>{
        promiseResolve = outerResolve;
        promiseReject = outerReject;
    });
    const cancel = (cancelOptions)=>{
        if (!isResolved) {
            reject(new CancelledError(cancelOptions));
            config.abort == null ? void 0 : config.abort();
        }
    };
    const cancelRetry = ()=>{
        isRetryCancelled = true;
    };
    const continueRetry = ()=>{
        isRetryCancelled = false;
    };
    const shouldPause = ()=>!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$focusManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].isFocused() || config.networkMode !== 'always' && !__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline();
    const resolve = (value)=>{
        if (!isResolved) {
            isResolved = true;
            config.onSuccess == null ? void 0 : config.onSuccess(value);
            continueFn == null ? void 0 : continueFn();
            promiseResolve(value);
        }
    };
    const reject = (value)=>{
        if (!isResolved) {
            isResolved = true;
            config.onError == null ? void 0 : config.onError(value);
            continueFn == null ? void 0 : continueFn();
            promiseReject(value);
        }
    };
    const pause = ()=>{
        return new Promise((continueResolve)=>{
            continueFn = (value)=>{
                const canContinue = isResolved || !shouldPause();
                if (canContinue) {
                    continueResolve(value);
                }
                return canContinue;
            };
            config.onPause == null ? void 0 : config.onPause();
        }).then(()=>{
            continueFn = undefined;
            if (!isResolved) {
                config.onContinue == null ? void 0 : config.onContinue();
            }
        });
    }; // Create loop function
    const run = ()=>{
        // Do nothing if already resolved
        if (isResolved) {
            return;
        }
        let promiseOrValue; // Execute query
        try {
            promiseOrValue = config.fn();
        } catch (error) {
            promiseOrValue = Promise.reject(error);
        }
        Promise.resolve(promiseOrValue).then(resolve).catch((error)=>{
            var _config$retry, _config$retryDelay;
            // Stop if the fetch is already resolved
            if (isResolved) {
                return;
            } // Do we need to retry the request?
            const retry = (_config$retry = config.retry) != null ? _config$retry : 3;
            const retryDelay = (_config$retryDelay = config.retryDelay) != null ? _config$retryDelay : defaultRetryDelay;
            const delay = typeof retryDelay === 'function' ? retryDelay(failureCount, error) : retryDelay;
            const shouldRetry = retry === true || typeof retry === 'number' && failureCount < retry || typeof retry === 'function' && retry(failureCount, error);
            if (isRetryCancelled || !shouldRetry) {
                // We are done if the query does not need to be retried
                reject(error);
                return;
            }
            failureCount++; // Notify on fail
            config.onFail == null ? void 0 : config.onFail(failureCount, error); // Delay
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sleep"])(delay) // Pause if the document is not visible or when the device is offline
            .then(()=>{
                if (shouldPause()) {
                    return pause();
                }
                return;
            }).then(()=>{
                if (isRetryCancelled) {
                    reject(error);
                } else {
                    run();
                }
            });
        });
    }; // Start loop
    if (canFetch(config.networkMode)) {
        run();
    } else {
        pause().then(run);
    }
    return {
        promise,
        cancel,
        continue: ()=>{
            const didContinue = continueFn == null ? void 0 : continueFn();
            return didContinue ? promise : Promise.resolve();
        },
        cancelRetry,
        continueRetry
    };
}
;
 //# sourceMappingURL=retryer.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/removable.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Removable",
    ()=>Removable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
;
class Removable {
    destroy() {
        this.clearGcTimeout();
    }
    scheduleGc() {
        this.clearGcTimeout();
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidTimeout"])(this.cacheTime)) {
            this.gcTimeout = setTimeout(()=>{
                this.optionalRemove();
            }, this.cacheTime);
        }
    }
    updateCacheTime(newCacheTime) {
        // Default to 5 minutes (Infinity for server-side) if no cache time is set
        this.cacheTime = Math.max(this.cacheTime || 0, newCacheTime != null ? newCacheTime : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] ? Infinity : 5 * 60 * 1000);
    }
    clearGcTimeout() {
        if (this.gcTimeout) {
            clearTimeout(this.gcTimeout);
            this.gcTimeout = undefined;
        }
    }
}
;
 //# sourceMappingURL=removable.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/query.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Query",
    ()=>Query
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/logger.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/retryer.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$removable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/removable.mjs [app-client] (ecmascript)");
;
;
;
;
;
// CLASS
class Query extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$removable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Removable"] {
    constructor(config){
        super();
        this.abortSignalConsumed = false;
        this.defaultOptions = config.defaultOptions;
        this.setOptions(config.options);
        this.observers = [];
        this.cache = config.cache;
        this.logger = config.logger || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultLogger"];
        this.queryKey = config.queryKey;
        this.queryHash = config.queryHash;
        this.initialState = config.state || getDefaultState(this.options);
        this.state = this.initialState;
        this.scheduleGc();
    }
    get meta() {
        return this.options.meta;
    }
    setOptions(options) {
        this.options = {
            ...this.defaultOptions,
            ...options
        };
        this.updateCacheTime(this.options.cacheTime);
    }
    optionalRemove() {
        if (!this.observers.length && this.state.fetchStatus === 'idle') {
            this.cache.remove(this);
        }
    }
    setData(newData, options) {
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["replaceData"])(this.state.data, newData, this.options); // Set data and mark it as cached
        this.dispatch({
            data,
            type: 'success',
            dataUpdatedAt: options == null ? void 0 : options.updatedAt,
            manual: options == null ? void 0 : options.manual
        });
        return data;
    }
    setState(state, setStateOptions) {
        this.dispatch({
            type: 'setState',
            state,
            setStateOptions
        });
    }
    cancel(options) {
        var _this$retryer;
        const promise = this.promise;
        (_this$retryer = this.retryer) == null ? void 0 : _this$retryer.cancel(options);
        return promise ? promise.then(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]) : Promise.resolve();
    }
    destroy() {
        super.destroy();
        this.cancel({
            silent: true
        });
    }
    reset() {
        this.destroy();
        this.setState(this.initialState);
    }
    isActive() {
        return this.observers.some((observer)=>observer.options.enabled !== false);
    }
    isDisabled() {
        return this.getObserversCount() > 0 && !this.isActive();
    }
    isStale() {
        return this.state.isInvalidated || !this.state.dataUpdatedAt || this.observers.some((observer)=>observer.getCurrentResult().isStale);
    }
    isStaleByTime(staleTime = 0) {
        return this.state.isInvalidated || !this.state.dataUpdatedAt || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeUntilStale"])(this.state.dataUpdatedAt, staleTime);
    }
    onFocus() {
        var _this$retryer2;
        const observer = this.observers.find((x)=>x.shouldFetchOnWindowFocus());
        if (observer) {
            observer.refetch({
                cancelRefetch: false
            });
        } // Continue fetch if currently paused
        (_this$retryer2 = this.retryer) == null ? void 0 : _this$retryer2.continue();
    }
    onOnline() {
        var _this$retryer3;
        const observer = this.observers.find((x)=>x.shouldFetchOnReconnect());
        if (observer) {
            observer.refetch({
                cancelRefetch: false
            });
        } // Continue fetch if currently paused
        (_this$retryer3 = this.retryer) == null ? void 0 : _this$retryer3.continue();
    }
    addObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer); // Stop the query from being garbage collected
            this.clearGcTimeout();
            this.cache.notify({
                type: 'observerAdded',
                query: this,
                observer
            });
        }
    }
    removeObserver(observer) {
        if (this.observers.includes(observer)) {
            this.observers = this.observers.filter((x)=>x !== observer);
            if (!this.observers.length) {
                // If the transport layer does not support cancellation
                // we'll let the query continue so the result can be cached
                if (this.retryer) {
                    if (this.abortSignalConsumed) {
                        this.retryer.cancel({
                            revert: true
                        });
                    } else {
                        this.retryer.cancelRetry();
                    }
                }
                this.scheduleGc();
            }
            this.cache.notify({
                type: 'observerRemoved',
                query: this,
                observer
            });
        }
    }
    getObserversCount() {
        return this.observers.length;
    }
    invalidate() {
        if (!this.state.isInvalidated) {
            this.dispatch({
                type: 'invalidate'
            });
        }
    }
    fetch(options, fetchOptions) {
        var _this$options$behavio, _context$fetchOptions;
        if (this.state.fetchStatus !== 'idle') {
            if (this.state.dataUpdatedAt && fetchOptions != null && fetchOptions.cancelRefetch) {
                // Silently cancel current fetch if the user wants to cancel refetches
                this.cancel({
                    silent: true
                });
            } else if (this.promise) {
                var _this$retryer4;
                // make sure that retries that were potentially cancelled due to unmounts can continue
                (_this$retryer4 = this.retryer) == null ? void 0 : _this$retryer4.continueRetry(); // Return current promise if we are already fetching
                return this.promise;
            }
        } // Update config if passed, otherwise the config from the last execution is used
        if (options) {
            this.setOptions(options);
        } // Use the options from the first observer with a query function if no function is found.
        // This can happen when the query is hydrated or created with setQueryData.
        if (!this.options.queryFn) {
            const observer = this.observers.find((x)=>x.options.queryFn);
            if (observer) {
                this.setOptions(observer.options);
            }
        }
        if ("TURBOPACK compile-time truthy", 1) {
            if (!Array.isArray(this.options.queryKey)) {
                this.logger.error("As of v4, queryKey needs to be an Array. If you are using a string like 'repoData', please change it to an Array, e.g. ['repoData']");
            }
        }
        const abortController = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAbortController"])(); // Create query function context
        const queryFnContext = {
            queryKey: this.queryKey,
            pageParam: undefined,
            meta: this.meta
        }; // Adds an enumerable signal property to the object that
        // which sets abortSignalConsumed to true when the signal
        // is read.
        const addSignalProperty = (object)=>{
            Object.defineProperty(object, 'signal', {
                enumerable: true,
                get: ()=>{
                    if (abortController) {
                        this.abortSignalConsumed = true;
                        return abortController.signal;
                    }
                    return undefined;
                }
            });
        };
        addSignalProperty(queryFnContext); // Create fetch function
        const fetchFn = ()=>{
            if (!this.options.queryFn) {
                return Promise.reject("Missing queryFn for queryKey '" + this.options.queryHash + "'");
            }
            this.abortSignalConsumed = false;
            return this.options.queryFn(queryFnContext);
        }; // Trigger behavior hook
        const context = {
            fetchOptions,
            options: this.options,
            queryKey: this.queryKey,
            state: this.state,
            fetchFn
        };
        addSignalProperty(context);
        (_this$options$behavio = this.options.behavior) == null ? void 0 : _this$options$behavio.onFetch(context); // Store state in case the current fetch needs to be reverted
        this.revertState = this.state; // Set to fetching state if not already in it
        if (this.state.fetchStatus === 'idle' || this.state.fetchMeta !== ((_context$fetchOptions = context.fetchOptions) == null ? void 0 : _context$fetchOptions.meta)) {
            var _context$fetchOptions2;
            this.dispatch({
                type: 'fetch',
                meta: (_context$fetchOptions2 = context.fetchOptions) == null ? void 0 : _context$fetchOptions2.meta
            });
        }
        const onError = (error)=>{
            // Optimistically update state if needed
            if (!((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isCancelledError"])(error) && error.silent)) {
                this.dispatch({
                    type: 'error',
                    error: error
                });
            }
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isCancelledError"])(error)) {
                var _this$cache$config$on, _this$cache$config, _this$cache$config$on2, _this$cache$config2;
                // Notify cache callback
                (_this$cache$config$on = (_this$cache$config = this.cache.config).onError) == null ? void 0 : _this$cache$config$on.call(_this$cache$config, error, this);
                (_this$cache$config$on2 = (_this$cache$config2 = this.cache.config).onSettled) == null ? void 0 : _this$cache$config$on2.call(_this$cache$config2, this.state.data, error, this);
                if ("TURBOPACK compile-time truthy", 1) {
                    this.logger.error(error);
                }
            }
            if (!this.isFetchingOptimistic) {
                // Schedule query gc after fetching
                this.scheduleGc();
            }
            this.isFetchingOptimistic = false;
        }; // Try to fetch the data
        this.retryer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createRetryer"])({
            fn: context.fetchFn,
            abort: abortController == null ? void 0 : abortController.abort.bind(abortController),
            onSuccess: (data)=>{
                var _this$cache$config$on3, _this$cache$config3, _this$cache$config$on4, _this$cache$config4;
                if (typeof data === 'undefined') {
                    if ("TURBOPACK compile-time truthy", 1) {
                        this.logger.error("Query data cannot be undefined. Please make sure to return a value other than undefined from your query function. Affected query key: " + this.queryHash);
                    }
                    onError(new Error(this.queryHash + " data is undefined"));
                    return;
                }
                this.setData(data); // Notify cache callback
                (_this$cache$config$on3 = (_this$cache$config3 = this.cache.config).onSuccess) == null ? void 0 : _this$cache$config$on3.call(_this$cache$config3, data, this);
                (_this$cache$config$on4 = (_this$cache$config4 = this.cache.config).onSettled) == null ? void 0 : _this$cache$config$on4.call(_this$cache$config4, data, this.state.error, this);
                if (!this.isFetchingOptimistic) {
                    // Schedule query gc after fetching
                    this.scheduleGc();
                }
                this.isFetchingOptimistic = false;
            },
            onError,
            onFail: (failureCount, error)=>{
                this.dispatch({
                    type: 'failed',
                    failureCount,
                    error
                });
            },
            onPause: ()=>{
                this.dispatch({
                    type: 'pause'
                });
            },
            onContinue: ()=>{
                this.dispatch({
                    type: 'continue'
                });
            },
            retry: context.options.retry,
            retryDelay: context.options.retryDelay,
            networkMode: context.options.networkMode
        });
        this.promise = this.retryer.promise;
        return this.promise;
    }
    dispatch(action) {
        const reducer = (state)=>{
            var _action$meta, _action$dataUpdatedAt;
            switch(action.type){
                case 'failed':
                    return {
                        ...state,
                        fetchFailureCount: action.failureCount,
                        fetchFailureReason: action.error
                    };
                case 'pause':
                    return {
                        ...state,
                        fetchStatus: 'paused'
                    };
                case 'continue':
                    return {
                        ...state,
                        fetchStatus: 'fetching'
                    };
                case 'fetch':
                    return {
                        ...state,
                        fetchFailureCount: 0,
                        fetchFailureReason: null,
                        fetchMeta: (_action$meta = action.meta) != null ? _action$meta : null,
                        fetchStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canFetch"])(this.options.networkMode) ? 'fetching' : 'paused',
                        ...!state.dataUpdatedAt && {
                            error: null,
                            status: 'loading'
                        }
                    };
                case 'success':
                    return {
                        ...state,
                        data: action.data,
                        dataUpdateCount: state.dataUpdateCount + 1,
                        dataUpdatedAt: (_action$dataUpdatedAt = action.dataUpdatedAt) != null ? _action$dataUpdatedAt : Date.now(),
                        error: null,
                        isInvalidated: false,
                        status: 'success',
                        ...!action.manual && {
                            fetchStatus: 'idle',
                            fetchFailureCount: 0,
                            fetchFailureReason: null
                        }
                    };
                case 'error':
                    const error = action.error;
                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isCancelledError"])(error) && error.revert && this.revertState) {
                        return {
                            ...this.revertState,
                            fetchStatus: 'idle'
                        };
                    }
                    return {
                        ...state,
                        error: error,
                        errorUpdateCount: state.errorUpdateCount + 1,
                        errorUpdatedAt: Date.now(),
                        fetchFailureCount: state.fetchFailureCount + 1,
                        fetchFailureReason: error,
                        fetchStatus: 'idle',
                        status: 'error'
                    };
                case 'invalidate':
                    return {
                        ...state,
                        isInvalidated: true
                    };
                case 'setState':
                    return {
                        ...state,
                        ...action.state
                    };
            }
        };
        this.state = reducer(this.state);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.observers.forEach((observer)=>{
                observer.onQueryUpdate(action);
            });
            this.cache.notify({
                query: this,
                type: 'updated',
                action
            });
        });
    }
}
function getDefaultState(options) {
    const data = typeof options.initialData === 'function' ? options.initialData() : options.initialData;
    const hasData = typeof data !== 'undefined';
    const initialDataUpdatedAt = hasData ? typeof options.initialDataUpdatedAt === 'function' ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt : 0;
    return {
        data,
        dataUpdateCount: 0,
        dataUpdatedAt: hasData ? initialDataUpdatedAt != null ? initialDataUpdatedAt : Date.now() : 0,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
        status: hasData ? 'success' : 'loading',
        fetchStatus: 'idle'
    };
}
;
 //# sourceMappingURL=query.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/queryCache.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryCache",
    ()=>QueryCache
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$query$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/query.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/subscribable.mjs [app-client] (ecmascript)");
;
;
;
;
// CLASS
class QueryCache extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(config){
        super();
        this.config = config || {};
        this.queries = [];
        this.queriesMap = {};
    }
    build(client, options, state) {
        var _options$queryHash;
        const queryKey = options.queryKey;
        const queryHash = (_options$queryHash = options.queryHash) != null ? _options$queryHash : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKeyByOptions"])(queryKey, options);
        let query = this.get(queryHash);
        if (!query) {
            query = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$query$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Query"]({
                cache: this,
                logger: client.getLogger(),
                queryKey,
                queryHash,
                options: client.defaultQueryOptions(options),
                state,
                defaultOptions: client.getQueryDefaults(queryKey)
            });
            this.add(query);
        }
        return query;
    }
    add(query) {
        if (!this.queriesMap[query.queryHash]) {
            this.queriesMap[query.queryHash] = query;
            this.queries.push(query);
            this.notify({
                type: 'added',
                query
            });
        }
    }
    remove(query) {
        const queryInMap = this.queriesMap[query.queryHash];
        if (queryInMap) {
            query.destroy();
            this.queries = this.queries.filter((x)=>x !== query);
            if (queryInMap === query) {
                delete this.queriesMap[query.queryHash];
            }
            this.notify({
                type: 'removed',
                query
            });
        }
    }
    clear() {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.queries.forEach((query)=>{
                this.remove(query);
            });
        });
    }
    get(queryHash) {
        return this.queriesMap[queryHash];
    }
    getAll() {
        return this.queries;
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ find(arg1, arg2) {
        const [filters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2);
        if (typeof filters.exact === 'undefined') {
            filters.exact = true;
        }
        return this.queries.find((query)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchQuery"])(filters, query));
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ findAll(arg1, arg2) {
        const [filters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2);
        return Object.keys(filters).length > 0 ? this.queries.filter((query)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchQuery"])(filters, query)) : this.queries;
    }
    notify(event) {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.listeners.forEach(({ listener })=>{
                listener(event);
            });
        });
    }
    onFocus() {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.queries.forEach((query)=>{
                query.onFocus();
            });
        });
    }
    onOnline() {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.queries.forEach((query)=>{
                query.onOnline();
            });
        });
    }
}
;
 //# sourceMappingURL=queryCache.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/mutation.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Mutation",
    ()=>Mutation,
    "getDefaultState",
    ()=>getDefaultState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/logger.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$removable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/removable.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/retryer.mjs [app-client] (ecmascript)");
;
;
;
;
// CLASS
class Mutation extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$removable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Removable"] {
    constructor(config){
        super();
        this.defaultOptions = config.defaultOptions;
        this.mutationId = config.mutationId;
        this.mutationCache = config.mutationCache;
        this.logger = config.logger || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultLogger"];
        this.observers = [];
        this.state = config.state || getDefaultState();
        this.setOptions(config.options);
        this.scheduleGc();
    }
    setOptions(options) {
        this.options = {
            ...this.defaultOptions,
            ...options
        };
        this.updateCacheTime(this.options.cacheTime);
    }
    get meta() {
        return this.options.meta;
    }
    setState(state) {
        this.dispatch({
            type: 'setState',
            state
        });
    }
    addObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer); // Stop the mutation from being garbage collected
            this.clearGcTimeout();
            this.mutationCache.notify({
                type: 'observerAdded',
                mutation: this,
                observer
            });
        }
    }
    removeObserver(observer) {
        this.observers = this.observers.filter((x)=>x !== observer);
        this.scheduleGc();
        this.mutationCache.notify({
            type: 'observerRemoved',
            mutation: this,
            observer
        });
    }
    optionalRemove() {
        if (!this.observers.length) {
            if (this.state.status === 'loading') {
                this.scheduleGc();
            } else {
                this.mutationCache.remove(this);
            }
        }
    }
    continue() {
        var _this$retryer$continu, _this$retryer;
        return (_this$retryer$continu = (_this$retryer = this.retryer) == null ? void 0 : _this$retryer.continue()) != null ? _this$retryer$continu : this.execute();
    }
    async execute() {
        const executeMutation = ()=>{
            var _this$options$retry;
            this.retryer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createRetryer"])({
                fn: ()=>{
                    if (!this.options.mutationFn) {
                        return Promise.reject('No mutationFn found');
                    }
                    return this.options.mutationFn(this.state.variables);
                },
                onFail: (failureCount, error)=>{
                    this.dispatch({
                        type: 'failed',
                        failureCount,
                        error
                    });
                },
                onPause: ()=>{
                    this.dispatch({
                        type: 'pause'
                    });
                },
                onContinue: ()=>{
                    this.dispatch({
                        type: 'continue'
                    });
                },
                retry: (_this$options$retry = this.options.retry) != null ? _this$options$retry : 0,
                retryDelay: this.options.retryDelay,
                networkMode: this.options.networkMode
            });
            return this.retryer.promise;
        };
        const restored = this.state.status === 'loading';
        try {
            var _this$mutationCache$c3, _this$mutationCache$c4, _this$options$onSucce, _this$options2, _this$mutationCache$c5, _this$mutationCache$c6, _this$options$onSettl, _this$options3;
            if (!restored) {
                var _this$mutationCache$c, _this$mutationCache$c2, _this$options$onMutat, _this$options;
                this.dispatch({
                    type: 'loading',
                    variables: this.options.variables
                }); // Notify cache callback
                await ((_this$mutationCache$c = (_this$mutationCache$c2 = this.mutationCache.config).onMutate) == null ? void 0 : _this$mutationCache$c.call(_this$mutationCache$c2, this.state.variables, this));
                const context = await ((_this$options$onMutat = (_this$options = this.options).onMutate) == null ? void 0 : _this$options$onMutat.call(_this$options, this.state.variables));
                if (context !== this.state.context) {
                    this.dispatch({
                        type: 'loading',
                        context,
                        variables: this.state.variables
                    });
                }
            }
            const data = await executeMutation(); // Notify cache callback
            await ((_this$mutationCache$c3 = (_this$mutationCache$c4 = this.mutationCache.config).onSuccess) == null ? void 0 : _this$mutationCache$c3.call(_this$mutationCache$c4, data, this.state.variables, this.state.context, this));
            await ((_this$options$onSucce = (_this$options2 = this.options).onSuccess) == null ? void 0 : _this$options$onSucce.call(_this$options2, data, this.state.variables, this.state.context)); // Notify cache callback
            await ((_this$mutationCache$c5 = (_this$mutationCache$c6 = this.mutationCache.config).onSettled) == null ? void 0 : _this$mutationCache$c5.call(_this$mutationCache$c6, data, null, this.state.variables, this.state.context, this));
            await ((_this$options$onSettl = (_this$options3 = this.options).onSettled) == null ? void 0 : _this$options$onSettl.call(_this$options3, data, null, this.state.variables, this.state.context));
            this.dispatch({
                type: 'success',
                data
            });
            return data;
        } catch (error) {
            try {
                var _this$mutationCache$c7, _this$mutationCache$c8, _this$options$onError, _this$options4, _this$mutationCache$c9, _this$mutationCache$c10, _this$options$onSettl2, _this$options5;
                // Notify cache callback
                await ((_this$mutationCache$c7 = (_this$mutationCache$c8 = this.mutationCache.config).onError) == null ? void 0 : _this$mutationCache$c7.call(_this$mutationCache$c8, error, this.state.variables, this.state.context, this));
                if ("TURBOPACK compile-time truthy", 1) {
                    this.logger.error(error);
                }
                await ((_this$options$onError = (_this$options4 = this.options).onError) == null ? void 0 : _this$options$onError.call(_this$options4, error, this.state.variables, this.state.context)); // Notify cache callback
                await ((_this$mutationCache$c9 = (_this$mutationCache$c10 = this.mutationCache.config).onSettled) == null ? void 0 : _this$mutationCache$c9.call(_this$mutationCache$c10, undefined, error, this.state.variables, this.state.context, this));
                await ((_this$options$onSettl2 = (_this$options5 = this.options).onSettled) == null ? void 0 : _this$options$onSettl2.call(_this$options5, undefined, error, this.state.variables, this.state.context));
                throw error;
            } finally{
                this.dispatch({
                    type: 'error',
                    error: error
                });
            }
        }
    }
    dispatch(action) {
        const reducer = (state)=>{
            switch(action.type){
                case 'failed':
                    return {
                        ...state,
                        failureCount: action.failureCount,
                        failureReason: action.error
                    };
                case 'pause':
                    return {
                        ...state,
                        isPaused: true
                    };
                case 'continue':
                    return {
                        ...state,
                        isPaused: false
                    };
                case 'loading':
                    return {
                        ...state,
                        context: action.context,
                        data: undefined,
                        failureCount: 0,
                        failureReason: null,
                        error: null,
                        isPaused: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$retryer$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canFetch"])(this.options.networkMode),
                        status: 'loading',
                        variables: action.variables
                    };
                case 'success':
                    return {
                        ...state,
                        data: action.data,
                        failureCount: 0,
                        failureReason: null,
                        error: null,
                        status: 'success',
                        isPaused: false
                    };
                case 'error':
                    return {
                        ...state,
                        data: undefined,
                        error: action.error,
                        failureCount: state.failureCount + 1,
                        failureReason: action.error,
                        isPaused: false,
                        status: 'error'
                    };
                case 'setState':
                    return {
                        ...state,
                        ...action.state
                    };
            }
        };
        this.state = reducer(this.state);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.observers.forEach((observer)=>{
                observer.onMutationUpdate(action);
            });
            this.mutationCache.notify({
                mutation: this,
                type: 'updated',
                action
            });
        });
    }
}
function getDefaultState() {
    return {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: 'idle',
        variables: undefined
    };
}
;
 //# sourceMappingURL=mutation.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/mutationCache.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MutationCache",
    ()=>MutationCache
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$mutation$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/mutation.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/subscribable.mjs [app-client] (ecmascript)");
;
;
;
;
// CLASS
class MutationCache extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$subscribable$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(config){
        super();
        this.config = config || {};
        this.mutations = [];
        this.mutationId = 0;
    }
    build(client, options, state) {
        const mutation = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$mutation$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mutation"]({
            mutationCache: this,
            logger: client.getLogger(),
            mutationId: ++this.mutationId,
            options: client.defaultMutationOptions(options),
            state,
            defaultOptions: options.mutationKey ? client.getMutationDefaults(options.mutationKey) : undefined
        });
        this.add(mutation);
        return mutation;
    }
    add(mutation) {
        this.mutations.push(mutation);
        this.notify({
            type: 'added',
            mutation
        });
    }
    remove(mutation) {
        this.mutations = this.mutations.filter((x)=>x !== mutation);
        this.notify({
            type: 'removed',
            mutation
        });
    }
    clear() {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.mutations.forEach((mutation)=>{
                this.remove(mutation);
            });
        });
    }
    getAll() {
        return this.mutations;
    }
    find(filters) {
        if (typeof filters.exact === 'undefined') {
            filters.exact = true;
        }
        return this.mutations.find((mutation)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchMutation"])(filters, mutation));
    }
    findAll(filters) {
        return this.mutations.filter((mutation)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchMutation"])(filters, mutation));
    }
    notify(event) {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.listeners.forEach(({ listener })=>{
                listener(event);
            });
        });
    }
    resumePausedMutations() {
        var _this$resuming;
        this.resuming = ((_this$resuming = this.resuming) != null ? _this$resuming : Promise.resolve()).then(()=>{
            const pausedMutations = this.mutations.filter((x)=>x.state.isPaused);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>pausedMutations.reduce((promise, mutation)=>promise.then(()=>mutation.continue().catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"])), Promise.resolve()));
        }).then(()=>{
            this.resuming = undefined;
        });
        return this.resuming;
    }
}
;
 //# sourceMappingURL=mutationCache.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/infiniteQueryBehavior.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getNextPageParam",
    ()=>getNextPageParam,
    "getPreviousPageParam",
    ()=>getPreviousPageParam,
    "hasNextPage",
    ()=>hasNextPage,
    "hasPreviousPage",
    ()=>hasPreviousPage,
    "infiniteQueryBehavior",
    ()=>infiniteQueryBehavior
]);
function infiniteQueryBehavior() {
    return {
        onFetch: (context)=>{
            context.fetchFn = ()=>{
                var _context$fetchOptions, _context$fetchOptions2, _context$fetchOptions3, _context$fetchOptions4, _context$state$data, _context$state$data2;
                const refetchPage = (_context$fetchOptions = context.fetchOptions) == null ? void 0 : (_context$fetchOptions2 = _context$fetchOptions.meta) == null ? void 0 : _context$fetchOptions2.refetchPage;
                const fetchMore = (_context$fetchOptions3 = context.fetchOptions) == null ? void 0 : (_context$fetchOptions4 = _context$fetchOptions3.meta) == null ? void 0 : _context$fetchOptions4.fetchMore;
                const pageParam = fetchMore == null ? void 0 : fetchMore.pageParam;
                const isFetchingNextPage = (fetchMore == null ? void 0 : fetchMore.direction) === 'forward';
                const isFetchingPreviousPage = (fetchMore == null ? void 0 : fetchMore.direction) === 'backward';
                const oldPages = ((_context$state$data = context.state.data) == null ? void 0 : _context$state$data.pages) || [];
                const oldPageParams = ((_context$state$data2 = context.state.data) == null ? void 0 : _context$state$data2.pageParams) || [];
                let newPageParams = oldPageParams;
                let cancelled = false;
                const addSignalProperty = (object)=>{
                    Object.defineProperty(object, 'signal', {
                        enumerable: true,
                        get: ()=>{
                            var _context$signal;
                            if ((_context$signal = context.signal) != null && _context$signal.aborted) {
                                cancelled = true;
                            } else {
                                var _context$signal2;
                                (_context$signal2 = context.signal) == null ? void 0 : _context$signal2.addEventListener('abort', ()=>{
                                    cancelled = true;
                                });
                            }
                            return context.signal;
                        }
                    });
                }; // Get query function
                const queryFn = context.options.queryFn || (()=>Promise.reject("Missing queryFn for queryKey '" + context.options.queryHash + "'"));
                const buildNewPages = (pages, param, page, previous)=>{
                    newPageParams = previous ? [
                        param,
                        ...newPageParams
                    ] : [
                        ...newPageParams,
                        param
                    ];
                    return previous ? [
                        page,
                        ...pages
                    ] : [
                        ...pages,
                        page
                    ];
                }; // Create function to fetch a page
                const fetchPage = (pages, manual, param, previous)=>{
                    if (cancelled) {
                        return Promise.reject('Cancelled');
                    }
                    if (typeof param === 'undefined' && !manual && pages.length) {
                        return Promise.resolve(pages);
                    }
                    const queryFnContext = {
                        queryKey: context.queryKey,
                        pageParam: param,
                        meta: context.options.meta
                    };
                    addSignalProperty(queryFnContext);
                    const queryFnResult = queryFn(queryFnContext);
                    const promise = Promise.resolve(queryFnResult).then((page)=>buildNewPages(pages, param, page, previous));
                    return promise;
                };
                let promise; // Fetch first page?
                if (!oldPages.length) {
                    promise = fetchPage([]);
                } else if (isFetchingNextPage) {
                    const manual = typeof pageParam !== 'undefined';
                    const param = manual ? pageParam : getNextPageParam(context.options, oldPages);
                    promise = fetchPage(oldPages, manual, param);
                } else if (isFetchingPreviousPage) {
                    const manual = typeof pageParam !== 'undefined';
                    const param = manual ? pageParam : getPreviousPageParam(context.options, oldPages);
                    promise = fetchPage(oldPages, manual, param, true);
                } else {
                    newPageParams = [];
                    const manual = typeof context.options.getNextPageParam === 'undefined';
                    const shouldFetchFirstPage = refetchPage && oldPages[0] ? refetchPage(oldPages[0], 0, oldPages) : true; // Fetch first page
                    promise = shouldFetchFirstPage ? fetchPage([], manual, oldPageParams[0]) : Promise.resolve(buildNewPages([], oldPageParams[0], oldPages[0])); // Fetch remaining pages
                    for(let i = 1; i < oldPages.length; i++){
                        promise = promise.then((pages)=>{
                            const shouldFetchNextPage = refetchPage && oldPages[i] ? refetchPage(oldPages[i], i, oldPages) : true;
                            if (shouldFetchNextPage) {
                                const param = manual ? oldPageParams[i] : getNextPageParam(context.options, pages);
                                return fetchPage(pages, manual, param);
                            }
                            return Promise.resolve(buildNewPages(pages, oldPageParams[i], oldPages[i]));
                        });
                    }
                }
                const finalPromise = promise.then((pages)=>({
                        pages,
                        pageParams: newPageParams
                    }));
                return finalPromise;
            };
        }
    };
}
function getNextPageParam(options, pages) {
    return options.getNextPageParam == null ? void 0 : options.getNextPageParam(pages[pages.length - 1], pages);
}
function getPreviousPageParam(options, pages) {
    return options.getPreviousPageParam == null ? void 0 : options.getPreviousPageParam(pages[0], pages);
}
/**
 * Checks if there is a next page.
 * Returns `undefined` if it cannot be determined.
 */ function hasNextPage(options, pages) {
    if (options.getNextPageParam && Array.isArray(pages)) {
        const nextPageParam = getNextPageParam(options, pages);
        return typeof nextPageParam !== 'undefined' && nextPageParam !== null && nextPageParam !== false;
    }
    return;
}
/**
 * Checks if there is a previous page.
 * Returns `undefined` if it cannot be determined.
 */ function hasPreviousPage(options, pages) {
    if (options.getPreviousPageParam && Array.isArray(pages)) {
        const previousPageParam = getPreviousPageParam(options, pages);
        return typeof previousPageParam !== 'undefined' && previousPageParam !== null && previousPageParam !== false;
    }
    return;
}
;
 //# sourceMappingURL=infiniteQueryBehavior.mjs.map
}),
"[project]/node_modules/@tanstack/query-core/build/lib/queryClient.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryClient",
    ()=>QueryClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$queryCache$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/queryCache.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$mutationCache$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/mutationCache.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$focusManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/focusManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/onlineManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/notifyManager.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$infiniteQueryBehavior$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/infiniteQueryBehavior.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/lib/logger.mjs [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
// CLASS
class QueryClient {
    constructor(config = {}){
        this.queryCache = config.queryCache || new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$queryCache$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryCache"]();
        this.mutationCache = config.mutationCache || new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$mutationCache$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MutationCache"]();
        this.logger = config.logger || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultLogger"];
        this.defaultOptions = config.defaultOptions || {};
        this.queryDefaults = [];
        this.mutationDefaults = [];
        this.mountCount = 0;
        if (("TURBOPACK compile-time value", "development") !== 'production' && config.logger) {
            this.logger.error("Passing a custom logger has been deprecated and will be removed in the next major version.");
        }
    }
    mount() {
        this.mountCount++;
        if (this.mountCount !== 1) return;
        this.unsubscribeFocus = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$focusManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].subscribe(()=>{
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$focusManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].isFocused()) {
                this.resumePausedMutations();
                this.queryCache.onFocus();
            }
        });
        this.unsubscribeOnline = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].subscribe(()=>{
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$onlineManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline()) {
                this.resumePausedMutations();
                this.queryCache.onOnline();
            }
        });
    }
    unmount() {
        var _this$unsubscribeFocu, _this$unsubscribeOnli;
        this.mountCount--;
        if (this.mountCount !== 0) return;
        (_this$unsubscribeFocu = this.unsubscribeFocus) == null ? void 0 : _this$unsubscribeFocu.call(this);
        this.unsubscribeFocus = undefined;
        (_this$unsubscribeOnli = this.unsubscribeOnline) == null ? void 0 : _this$unsubscribeOnli.call(this);
        this.unsubscribeOnline = undefined;
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ isFetching(arg1, arg2) {
        const [filters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2);
        filters.fetchStatus = 'fetching';
        return this.queryCache.findAll(filters).length;
    }
    isMutating(filters) {
        return this.mutationCache.findAll({
            ...filters,
            fetching: true
        }).length;
    }
    /**
   * @deprecated This method will accept only queryKey in the next major version.
   */ getQueryData(queryKey, filters) {
        var _this$queryCache$find;
        return (_this$queryCache$find = this.queryCache.find(queryKey, filters)) == null ? void 0 : _this$queryCache$find.state.data;
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ ensureQueryData(arg1, arg2, arg3) {
        const parsedOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseQueryArgs"])(arg1, arg2, arg3);
        const cachedData = this.getQueryData(parsedOptions.queryKey);
        return cachedData ? Promise.resolve(cachedData) : this.fetchQuery(parsedOptions);
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ getQueriesData(queryKeyOrFilters) {
        return this.getQueryCache().findAll(queryKeyOrFilters).map(({ queryKey, state })=>{
            const data = state.data;
            return [
                queryKey,
                data
            ];
        });
    }
    setQueryData(queryKey, updater, options) {
        const query = this.queryCache.find(queryKey);
        const prevData = query == null ? void 0 : query.state.data;
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["functionalUpdate"])(updater, prevData);
        if (typeof data === 'undefined') {
            return undefined;
        }
        const parsedOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseQueryArgs"])(queryKey);
        const defaultedOptions = this.defaultQueryOptions(parsedOptions);
        return this.queryCache.build(this, defaultedOptions).setData(data, {
            ...options,
            manual: true
        });
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ setQueriesData(queryKeyOrFilters, updater, options) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.getQueryCache().findAll(queryKeyOrFilters).map(({ queryKey })=>[
                    queryKey,
                    this.setQueryData(queryKey, updater, options)
                ]));
    }
    getQueryState(queryKey, /**
   * @deprecated This filters will be removed in the next major version.
   */ filters) {
        var _this$queryCache$find2;
        return (_this$queryCache$find2 = this.queryCache.find(queryKey, filters)) == null ? void 0 : _this$queryCache$find2.state;
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ removeQueries(arg1, arg2) {
        const [filters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2);
        const queryCache = this.queryCache;
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            queryCache.findAll(filters).forEach((query)=>{
                queryCache.remove(query);
            });
        });
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ resetQueries(arg1, arg2, arg3) {
        const [filters, options] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2, arg3);
        const queryCache = this.queryCache;
        const refetchFilters = {
            type: 'active',
            ...filters
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            queryCache.findAll(filters).forEach((query)=>{
                query.reset();
            });
            return this.refetchQueries(refetchFilters, options);
        });
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ cancelQueries(arg1, arg2, arg3) {
        const [filters, cancelOptions = {}] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2, arg3);
        if (typeof cancelOptions.revert === 'undefined') {
            cancelOptions.revert = true;
        }
        const promises = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.queryCache.findAll(filters).map((query)=>query.cancel(cancelOptions)));
        return Promise.all(promises).then(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ invalidateQueries(arg1, arg2, arg3) {
        const [filters, options] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2, arg3);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            var _ref, _filters$refetchType;
            this.queryCache.findAll(filters).forEach((query)=>{
                query.invalidate();
            });
            if (filters.refetchType === 'none') {
                return Promise.resolve();
            }
            const refetchFilters = {
                ...filters,
                type: (_ref = (_filters$refetchType = filters.refetchType) != null ? _filters$refetchType : filters.type) != null ? _ref : 'active'
            };
            return this.refetchQueries(refetchFilters, options);
        });
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ refetchQueries(arg1, arg2, arg3) {
        const [filters, options] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseFilterArgs"])(arg1, arg2, arg3);
        const promises = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$notifyManager$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.queryCache.findAll(filters).filter((query)=>!query.isDisabled()).map((query)=>{
                var _options$cancelRefetc;
                return query.fetch(undefined, {
                    ...options,
                    cancelRefetch: (_options$cancelRefetc = options == null ? void 0 : options.cancelRefetch) != null ? _options$cancelRefetc : true,
                    meta: {
                        refetchPage: filters.refetchPage
                    }
                });
            }));
        let promise = Promise.all(promises).then(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
        if (!(options != null && options.throwOnError)) {
            promise = promise.catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
        }
        return promise;
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ fetchQuery(arg1, arg2, arg3) {
        const parsedOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseQueryArgs"])(arg1, arg2, arg3);
        const defaultedOptions = this.defaultQueryOptions(parsedOptions); // https://github.com/tannerlinsley/react-query/issues/652
        if (typeof defaultedOptions.retry === 'undefined') {
            defaultedOptions.retry = false;
        }
        const query = this.queryCache.build(this, defaultedOptions);
        return query.isStaleByTime(defaultedOptions.staleTime) ? query.fetch(defaultedOptions) : Promise.resolve(query.state.data);
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ prefetchQuery(arg1, arg2, arg3) {
        return this.fetchQuery(arg1, arg2, arg3).then(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ fetchInfiniteQuery(arg1, arg2, arg3) {
        const parsedOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseQueryArgs"])(arg1, arg2, arg3);
        parsedOptions.behavior = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$infiniteQueryBehavior$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["infiniteQueryBehavior"])();
        return this.fetchQuery(parsedOptions);
    }
    /**
   * @deprecated This method should be used with only one object argument.
   */ prefetchInfiniteQuery(arg1, arg2, arg3) {
        return this.fetchInfiniteQuery(arg1, arg2, arg3).then(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    resumePausedMutations() {
        return this.mutationCache.resumePausedMutations();
    }
    getQueryCache() {
        return this.queryCache;
    }
    getMutationCache() {
        return this.mutationCache;
    }
    getLogger() {
        return this.logger;
    }
    getDefaultOptions() {
        return this.defaultOptions;
    }
    setDefaultOptions(options) {
        this.defaultOptions = options;
    }
    setQueryDefaults(queryKey, options) {
        const result = this.queryDefaults.find((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKey"])(queryKey) === (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKey"])(x.queryKey));
        if (result) {
            result.defaultOptions = options;
        } else {
            this.queryDefaults.push({
                queryKey,
                defaultOptions: options
            });
        }
    }
    getQueryDefaults(queryKey) {
        if (!queryKey) {
            return undefined;
        } // Get the first matching defaults
        const firstMatchingDefaults = this.queryDefaults.find((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(queryKey, x.queryKey)); // Additional checks and error in dev mode
        if ("TURBOPACK compile-time truthy", 1) {
            // Retrieve all matching defaults for the given key
            const matchingDefaults = this.queryDefaults.filter((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(queryKey, x.queryKey)); // It is ok not having defaults, but it is error prone to have more than 1 default for a given key
            if (matchingDefaults.length > 1) {
                this.logger.error("[QueryClient] Several query defaults match with key '" + JSON.stringify(queryKey) + "'. The first matching query defaults are used. Please check how query defaults are registered. Order does matter here. cf. https://react-query.tanstack.com/reference/QueryClient#queryclientsetquerydefaults.");
            }
        }
        return firstMatchingDefaults == null ? void 0 : firstMatchingDefaults.defaultOptions;
    }
    setMutationDefaults(mutationKey, options) {
        const result = this.mutationDefaults.find((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKey"])(mutationKey) === (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKey"])(x.mutationKey));
        if (result) {
            result.defaultOptions = options;
        } else {
            this.mutationDefaults.push({
                mutationKey,
                defaultOptions: options
            });
        }
    }
    getMutationDefaults(mutationKey) {
        if (!mutationKey) {
            return undefined;
        } // Get the first matching defaults
        const firstMatchingDefaults = this.mutationDefaults.find((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(mutationKey, x.mutationKey)); // Additional checks and error in dev mode
        if ("TURBOPACK compile-time truthy", 1) {
            // Retrieve all matching defaults for the given key
            const matchingDefaults = this.mutationDefaults.filter((x)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(mutationKey, x.mutationKey)); // It is ok not having defaults, but it is error prone to have more than 1 default for a given key
            if (matchingDefaults.length > 1) {
                this.logger.error("[QueryClient] Several mutation defaults match with key '" + JSON.stringify(mutationKey) + "'. The first matching mutation defaults are used. Please check how mutation defaults are registered. Order does matter here. cf. https://react-query.tanstack.com/reference/QueryClient#queryclientsetmutationdefaults.");
            }
        }
        return firstMatchingDefaults == null ? void 0 : firstMatchingDefaults.defaultOptions;
    }
    defaultQueryOptions(options) {
        if (options != null && options._defaulted) {
            return options;
        }
        const defaultedOptions = {
            ...this.defaultOptions.queries,
            ...this.getQueryDefaults(options == null ? void 0 : options.queryKey),
            ...options,
            _defaulted: true
        };
        if (!defaultedOptions.queryHash && defaultedOptions.queryKey) {
            defaultedOptions.queryHash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$lib$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKeyByOptions"])(defaultedOptions.queryKey, defaultedOptions);
        } // dependent default values
        if (typeof defaultedOptions.refetchOnReconnect === 'undefined') {
            defaultedOptions.refetchOnReconnect = defaultedOptions.networkMode !== 'always';
        }
        if (typeof defaultedOptions.useErrorBoundary === 'undefined') {
            defaultedOptions.useErrorBoundary = !!defaultedOptions.suspense;
        }
        return defaultedOptions;
    }
    defaultMutationOptions(options) {
        if (options != null && options._defaulted) {
            return options;
        }
        return {
            ...this.defaultOptions.mutations,
            ...this.getMutationDefaults(options == null ? void 0 : options.mutationKey),
            ...options,
            _defaulted: true
        };
    }
    clear() {
        this.queryCache.clear();
        this.mutationCache.clear();
    }
}
;
 //# sourceMappingURL=queryClient.mjs.map
}),
"[project]/node_modules/@tanstack/react-query/build/lib/QueryClientProvider.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryClientProvider",
    ()=>QueryClientProvider,
    "defaultContext",
    ()=>defaultContext,
    "useQueryClient",
    ()=>useQueryClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
'use client';
;
const defaultContext = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](undefined);
const QueryClientSharingContext = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](false); // If we are given a context, we will use it.
// Otherwise, if contextSharing is on, we share the first and at least one
// instance of the context across the window
// to ensure that if React Query is used across
// different bundles or microfrontends they will
// all use the same **instance** of context, regardless
// of module scoping.
function getQueryClientContext(context, contextSharing) {
    if (context) {
        return context;
    }
    if (contextSharing && typeof window !== 'undefined') {
        if (!window.ReactQueryClientContext) {
            window.ReactQueryClientContext = defaultContext;
        }
        return window.ReactQueryClientContext;
    }
    return defaultContext;
}
const useQueryClient = ({ context } = {})=>{
    const queryClient = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](getQueryClientContext(context, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](QueryClientSharingContext)));
    if (!queryClient) {
        throw new Error('No QueryClient set, use QueryClientProvider to set one');
    }
    return queryClient;
};
const QueryClientProvider = ({ client, children, context, contextSharing = false })=>{
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "QueryClientProvider.useEffect": ()=>{
            client.mount();
            return ({
                "QueryClientProvider.useEffect": ()=>{
                    client.unmount();
                }
            })["QueryClientProvider.useEffect"];
        }
    }["QueryClientProvider.useEffect"], [
        client
    ]);
    if (("TURBOPACK compile-time value", "development") !== 'production' && contextSharing) {
        client.getLogger().error("The contextSharing option has been deprecated and will be removed in the next major version");
    }
    const Context = getQueryClientContext(context, contextSharing);
    return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](QueryClientSharingContext.Provider, {
        value: !context && contextSharing
    }, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](Context.Provider, {
        value: client
    }, children));
};
;
 //# sourceMappingURL=QueryClientProvider.mjs.map
}),
]);

//# sourceMappingURL=_dbd62eba._.js.map