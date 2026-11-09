(function () {
    var STORAGE_KEY = 'kcLoginBranding';
    var PENDING_CLASS = 'login-branding-pending';
    var TIMEOUT_MS = 1500;
    var COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.,%\s]+\))$/i;

    function meta(name) {
        var element = document.querySelector('meta[name="' + name + '"]');
        var value = element ? (element.getAttribute('content') || '').trim() : '';
        return value.indexOf('${') === 0 ? '' : value;
    }

    var endpoint = meta('login-branding-url');
    var origins = meta('login-branding-origins').split(',').map(function (origin) {
        return origin.trim().replace(/\/+$/, '');
    }).filter(Boolean);
    if (!endpoint || origins.length === 0) {
        return;
    }

    function readStorage() {
        try {
            return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
        } catch (error) {
            return null;
        }
    }

    function writeStorage(value) {
        try {
            if (value) {
                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
            } else {
                window.sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
        }
    }

    function brandedRedirect(redirectUri) {
        try {
            return origins.indexOf(new URL(redirectUri).origin) === -1 ? null : redirectUri;
        } catch (error) {
            return null;
        }
    }

    var params = new URLSearchParams(window.location.search);
    var clientId = params.get('client_id');
    var redirectUri = params.get('redirect_uri');
    if (redirectUri) {
        redirectUri = brandedRedirect(redirectUri);
        writeStorage(redirectUri ? {clientId: clientId, redirectUri: redirectUri} : null);
    } else {
        var stored = readStorage();
        redirectUri = stored && stored.clientId === clientId && typeof stored.redirectUri === 'string'
            ? brandedRedirect(stored.redirectUri)
            : null;
    }
    if (!redirectUri) {
        return;
    }

    var root = document.documentElement;
    var style = document.createElement('style');
    style.textContent = 'html.' + PENDING_CLASS + ' #kc-header, html.' + PENDING_CLASS + ' .card-pf { visibility: hidden; }';
    document.head.appendChild(style);
    root.classList.add(PENDING_CLASS);

    var settled = false;
    function reveal() {
        settled = true;
        root.classList.remove(PENDING_CLASS);
    }
    var timer = window.setTimeout(reveal, TIMEOUT_MS);

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    function record(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function color(value) {
        return typeof value === 'string' && COLOR.test(value.trim()) ? value.trim() : '';
    }

    function httpUrl(value) {
        if (typeof value !== 'string' || !value) {
            return '';
        }
        try {
            var url = new URL(value);
            return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
        } catch (error) {
            return '';
        }
    }

    function number(value, fallback, min, max) {
        var parsed = typeof value === 'number' && isFinite(value) ? Math.round(value) : fallback;
        return Math.min(max, Math.max(min, parsed));
    }

    function oneOf(value, allowed, fallback) {
        return allowed.indexOf(value) === -1 ? fallback : value;
    }

    function cssUrl(url) {
        return 'url("' + url.replace(/["\\\n\r]/g, encodeURIComponent) + '")';
    }

    function buildCss(branding) {
        var background = record(branding.background);
        var logo = record(branding.logo);
        var form = record(branding.form);
        var logoUrl = httpUrl(logo.url);
        var logoPosition = oneOf(logo.position, ['header-left', 'header-center', 'header-right', 'form-center'], 'header-center');
        var scale = number(logo.scale, 100, 50, 200) / 100;
        var backgroundUrl = httpUrl(background.imageUrl);
        var overlay = number(background.overlay, 0, 0, 100) / 100;
        var backgroundColor = color(background.color);
        var accent = color(branding.accentColor);
        var formPosition = oneOf(form.position, ['left', 'center', 'right'], 'center');
        var radius = typeof form.radius === 'number' ? number(form.radius, 0, 0, 64) : null;
        var opacity = number(form.opacity, 100, 0, 100) / 100;
        var theme = oneOf(form.theme, ['light', 'gray', 'dark'], 'light');
        var formRgb = theme === 'dark' ? '20, 20, 24' : theme === 'gray' ? '90, 90, 96' : '255, 255, 255';
        var textColor = theme === 'light' ? '#1a1a1a' : theme === 'dark' ? '#f5f5f5' : '#fafafa';
        var css = [];

        if (backgroundUrl) {
            var gradient = overlay > 0 ? 'linear-gradient(rgba(0, 0, 0, ' + overlay + '), rgba(0, 0, 0, ' + overlay + ')), ' : '';
            css.push('.login-pf { background: ' + gradient + cssUrl(backgroundUrl) + ' center / cover no-repeat fixed; }');
            css.push('.login-pf body { background: transparent; }');
        } else if (backgroundColor) {
            css.push('.login-pf { background: ' + backgroundColor + ' fixed; }');
            css.push('.login-pf body { background: transparent; }');
        }
        if (formPosition === 'left') {
            css.push('.card-pf { margin-left: 6%; margin-right: auto; }');
        } else if (formPosition === 'right') {
            css.push('.card-pf { margin-right: 6%; margin-left: auto; }');
        }
        if (logoUrl) {
            css.push('#kc-header-wrapper { font-size: 0; line-height: 0; }');
            css.push('#kc-header-wrapper > * { display: none; }');
            if (logoPosition === 'form-center') {
                css.push('#kc-header-wrapper { background: none; min-height: 0; padding: 24px 0 0; }');
            } else {
                var horizontal = logoPosition === 'header-left' ? 'left 5%' : logoPosition === 'header-right' ? 'right 5%' : 'center';
                css.push('#kc-header-wrapper { background: ' + cssUrl(logoUrl) + ' no-repeat ' + horizontal + ' center / contain;'
                    + ' min-height: clamp(' + (2 * scale) + 'rem, ' + (9 * scale) + 'vh, ' + (4 * scale) + 'rem); margin: 24px 0; }');
            }
            css.push('.login-branding-form-logo { display: block; margin: 0 auto 12px; object-fit: contain;'
                + ' max-height: clamp(' + (1.75 * scale) + 'rem, ' + (8 * scale) + 'vh, ' + (3.5 * scale) + 'rem);'
                + ' max-width: min(' + (60 * scale) + '%, 100%); }');
        }
        css.push('.login-pf-page .card-pf { position: relative; }');
        css.push('.login-pf-page .card-pf #kc-locale { position: absolute; top: 12px; right: 16px; margin: 0; z-index: 2; }');
        css.push('.login-pf-page .card-pf #kc-locale ul { left: auto; right: 0; }');
        if (accent) {
            css.push('.card-pf { border-bottom-color: ' + accent + '; }');
            css.push('.login-pf-page a, #kc-social-providers h4, .fa-info-circle { color: ' + accent + '; }');
            css.push('.pf-c-button.pf-m-primary { background-color: ' + accent + '; border-color: ' + accent + '; }');
        }
        if (radius !== null) {
            css.push('.card-pf, .pf-c-button.pf-m-primary { border-radius: ' + radius + 'px; }');
        }
        if (opacity < 1 || theme !== 'light') {
            css.push('.card-pf { background: rgba(' + formRgb + ', ' + opacity + '); color: ' + textColor + ';'
                + (opacity < 1 ? ' backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);' : '') + ' }');
        }
        css.push('.login-pf-page .card-pf :is(#kc-page-title, #kc-attempted-username, #kc-info, #kc-info-wrapper, #kc-current-locale-link, p, span, div, label, h1, h2, li, small):not(a *, button *, [class*="alert"] *, #kc-locale ul *, .required) { color: ' + textColor + '; }');
        css.push('.login-pf-page .card-pf #kc-locale ul li, .login-pf-page .card-pf #kc-locale ul li a { color: #1a1a1a; }');
        css.push('.login-pf-page .card-pf #rememberMe { opacity: 1; accent-color: ' + (accent || textColor) + '; }');
        css.push('.login-branding-welcome { margin: 0 0 12px; text-align: center; font-size: 16px; line-height: 25px; white-space: pre-line; }');
        css.push('.login-branding-registration { margin-top: 16px; text-align: center; font-size: 14px; }');
        css.push('.login-branding-registration a { margin-left: 4px; font-weight: 500; }');
        return {css: css.join('\n'), formLogoUrl: logoPosition === 'form-center' ? logoUrl : ''};
    }

    function applyDom(branding, formLogoUrl) {
        var header = document.querySelector('.card-pf header');
        var welcomeText = typeof branding.welcomeText === 'string' ? branding.welcomeText.trim() : '';
        if (header && welcomeText) {
            var welcome = document.createElement('p');
            welcome.className = 'login-branding-welcome';
            welcome.textContent = welcomeText;
            header.insertBefore(welcome, header.firstChild);
        }
        if (header && formLogoUrl) {
            var logo = document.createElement('img');
            logo.className = 'login-branding-form-logo';
            logo.alt = '';
            logo.src = formLogoUrl;
            header.insertBefore(logo, header.firstChild);
        }
        var registrationUrl = httpUrl(branding.registrationUrl);
        var pageId = document.body.getAttribute('data-page-id');
        var wrapper = document.getElementById('kc-content-wrapper');
        var messages = document.getElementById('login-branding-messages');
        var noAccount = messages ? messages.getAttribute('data-no-account') || '' : '';
        var register = messages ? messages.getAttribute('data-register') || '' : '';
        if (registrationUrl && wrapper && register && (pageId === 'login-login' || pageId === 'login-login-username')) {
            var registration = document.createElement('div');
            registration.id = 'login-branding-registration';
            registration.className = 'login-branding-registration';
            var label = document.createElement('span');
            label.textContent = noAccount;
            var link = document.createElement('a');
            link.href = registrationUrl;
            link.textContent = register;
            registration.appendChild(label);
            registration.appendChild(link);
            var info = document.getElementById('kc-info');
            wrapper.insertBefore(registration, info && info.parentNode === wrapper ? info : null);
        }
    }

    function apply(branding) {
        if (!branding || typeof branding !== 'object' || branding.schemaVersion !== 1) {
            return;
        }
        var built = buildCss(branding);
        var brandingStyle = document.createElement('style');
        brandingStyle.textContent = built.css;
        document.head.appendChild(brandingStyle);
        onReady(function () {
            applyDom(branding, built.formLogoUrl);
            window.clearTimeout(timer);
            reveal();
        });
    }

    var url;
    try {
        url = new URL(endpoint);
    } catch (error) {
        reveal();
        return;
    }
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('locale', root.getAttribute('lang') || '');

    window.fetch(url.href, {credentials: 'omit', mode: 'cors'})
        .then(function (response) {
            return response.ok ? response.json() : null;
        })
        .then(apply, function () {})
        .then(function () {
            if (!settled) {
                onReady(function () {
                    window.clearTimeout(timer);
                    reveal();
                });
            }
        });
})();
