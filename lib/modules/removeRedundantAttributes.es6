// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#JavaScript_types
export const redundantScriptTypes = new Set([
    'application/javascript',
    'application/ecmascript',
    'application/x-ecmascript',
    'application/x-javascript',
    'text/javascript',
    'text/ecmascript',
    'text/javascript1.0',
    'text/javascript1.1',
    'text/javascript1.2',
    'text/javascript1.3',
    'text/javascript1.4',
    'text/javascript1.5',
    'text/jscript',
    'text/livescript',
    'text/x-ecmascript',
    'text/x-javascript'
]);

const redundantAttributes = {
    'form': {
        'method': 'get'
    },

    'input': {
        'type': 'text'
    },

    'button': {
        'type': 'submit'
    },

    'script': {
        'language': 'javascript',
        'type': node => {
            for (const [attrName, attrValue] of Object.entries(node.attrs)) {
                if (attrName.toLowerCase() !== 'type') {
                    continue;
                }

                return redundantScriptTypes.has(attrValue);
            }

            return false;
        },
        // Remove attribute if the function returns false
        'charset': node => {
            // The charset attribute only really makes sense on “external” SCRIPT elements:
            // http://perfectionkills.com/optimizing-html/#8_script_charset
            return node.attrs && !node.attrs.src;
        }
    },

    'style': {
        'media': 'all',
        'type': 'text/css'
    },

    'link': {
        'media': 'all',
        'type': node => {
            // https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet
            let isRelStyleSheet = false;
            let isTypeTextCSS = false;

            if (node.attrs) {
                for (const [attrName, attrValue] of Object.entries(node.attrs)) {
                    if (attrName.toLowerCase() === 'rel' && attrValue === 'stylesheet') {
                        isRelStyleSheet = true;
                    }
                    if (attrName.toLowerCase() === 'type' && attrValue === 'text/css') {
                        isTypeTextCSS = true;
                    }
                }
            }

            // Only "text/css" is redudant for link[rel=stylesheet]. Otherwise "type" shouldn't be removed
            return isRelStyleSheet && isTypeTextCSS;
        }
    },

    // See: https://html.spec.whatwg.org/#lazy-loading-attributes
    'img': {
        'loading': 'eager'
    },
    'iframe': {
        'loading': 'eager'
    }
};

// See: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#missing-value-default
const canBeReplacedWithEmptyStringAttributes = {
    audio: {
        // https://html.spec.whatwg.org/#attr-media-preload
        preload: 'auto'
    },
    video: {
        preload: 'auto'
    },

    form: {
        // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute
        autocomplete: 'on'
    },

    img: {
        // https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-decoding
        decoding: 'auto'
    },

    track: {
        // https://html.spec.whatwg.org/multipage/media.html#htmltrackelement
        kind: 'subtitles'
    },

    textarea: {
        // https://html.spec.whatwg.org/multipage/form-elements.html#dom-textarea-wrap
        wrap: 'soft'
    },

    area: {
        // https://html.spec.whatwg.org/multipage/image-maps.html#attr-area-shape
        shape: 'rect'
    },

    button: {
        // https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-type
        type: 'submit'
    },

    input: {
        // https://html.spec.whatwg.org/multipage/input.html#states-of-the-type-attribute
        type: 'text'
    }
};

const tagsHaveRedundantAttributes = new Set(Object.keys(redundantAttributes));
const tagsHaveMissingValueDefaultAttributes = new Set(Object.keys(canBeReplacedWithEmptyStringAttributes));

/** Removes redundant attributes */
export default function removeRedundantAttributes(tree) {
    tree.walk(node => {
        if (!node.tag) {
            return node;
        }

        node.attrs = node.attrs || {};

        if (tagsHaveRedundantAttributes.has(node.tag)) {
            const tagRedundantAttributes = redundantAttributes[node.tag];

            for (const redundantAttributeName of Object.keys(tagRedundantAttributes)) {
                let tagRedundantAttributeValue = tagRedundantAttributes[redundantAttributeName];
                let isRemove = false;

                if (typeof tagRedundantAttributeValue === 'function') {
                    isRemove = tagRedundantAttributeValue(node);
                } else if (node.attrs[redundantAttributeName] === tagRedundantAttributeValue) {
                    isRemove = true;
                }

                if (isRemove) {
                    delete node.attrs[redundantAttributeName];
                }
            }
        }

        if (tagsHaveMissingValueDefaultAttributes.has(node.tag)) {
            const tagMissingValueDefaultAttributes = canBeReplacedWithEmptyStringAttributes[node.tag];

            for (const canBeReplacedWithEmptyStringAttributeName of Object.keys(tagMissingValueDefaultAttributes)) {
                let tagMissingValueDefaultAttribute = tagMissingValueDefaultAttributes[canBeReplacedWithEmptyStringAttributeName];
                let isReplace = false;

                if (node.attrs[canBeReplacedWithEmptyStringAttributeName] === tagMissingValueDefaultAttribute) {
                    isReplace = true;
                }

                if (isReplace) {
                    node.attrs[canBeReplacedWithEmptyStringAttributeName] = '';
                }
            }
        }

        return node;
    });

    return tree;
}
