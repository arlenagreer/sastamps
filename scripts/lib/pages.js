/**
 * The root pages whose image tags the build rewrites (update-image-tags) and
 * that load the font-loading CSS and script. One list, shared by those and by
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
