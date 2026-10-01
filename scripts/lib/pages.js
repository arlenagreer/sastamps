/**
 * The root pages whose image tags the build rewrites (update-image-tags).
 * archive.html also loads the font-loading CSS and script but has no rewritten
 * image tags; scripts/check-build-idempotent.js adds it. One list, shared by
 * scripts/check-build-idempotent.js, so a page cannot be added to one of
 * them without being checked.
 */
module.exports = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];
