/**
 * The root pages whose <head>/<body> the build rewrites (critical CSS, image
 * tags, font loading). One list, shared by those build steps and by
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
