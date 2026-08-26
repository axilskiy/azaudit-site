;(function () {
  var EMAILJS_PUBLIC_KEY = '42GD8pC2KE2WGTnU_'
  var EMAILJS_SERVICE_ID = 'service_xmqfy1h'
  var EMAILJS_TEMPLATE_ID = 'template_3ulo9ri'

  // ==================== Region selector ====================
  var REGIONS = [
    { id: 'almaty', label: 'Алматы', labelEn: 'Almaty' },
    { id: 'astana', label: 'Астана', labelEn: 'Astana' },
    { id: 'shymkent', label: 'Шымкент', labelEn: 'Shymkent' }
  ]
  var DEFAULT_REGION = 'almaty'
  var REGION_STORAGE_KEY = 'azRegion'
  var REGION_GEO_COOKIE = 'az_geo'
  var REGION_SOURCES = ['manual', 'detected', 'default']
  // Set by initRegionSelector once the region badge exists, so translatePage
  // can re-render its city label/options in the newly selected language —
  // the badge is built by JS and carries no data-ru/data-en of its own.
  var refreshRegionBadgeLang = null

  function isValidRegionId(id) {
    return REGIONS.some(function (r) { return r.id === id })
  }

  // lang is optional — defaults to the page's current language so existing
  // call sites that don't pass it keep working after a language switch.
  function getRegionLabel(id, lang) {
    var match = REGIONS.filter(function (r) { return r.id === id })[0]
    if (!match) return ''
    var effectiveLang = lang || (document.documentElement.lang === 'en' ? 'en' : 'ru')
    return effectiveLang === 'en' ? match.labelEn : match.label
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  }

  // Reads and validates the saved region. Corrupt or unrecognized data is
  // wiped so callers always get either a valid record or null.
  function getSavedRegion() {
    var raw = localStorage.getItem(REGION_STORAGE_KEY)
    if (!raw) return null
    var data
    try {
      data = JSON.parse(raw)
    } catch (e) {
      localStorage.removeItem(REGION_STORAGE_KEY)
      return null
    }
    if (!data || typeof data !== 'object' || !isValidRegionId(data.id) || REGION_SOURCES.indexOf(data.source) === -1) {
      localStorage.removeItem(REGION_STORAGE_KEY)
      return null
    }
    return data
  }

  function saveRegion(id, source) {
    var data = { id: id, source: source, ts: Date.now() }
    localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(data))
    return data
  }

  // Cookie is expected to hold only a plain region slug (set by an
  // edge-side geo lookup, if one is ever added) — never IP or coordinates.
  function detectRegionFromCookie() {
    var raw = readCookie(REGION_GEO_COOKIE)
    return raw && isValidRegionId(raw) ? raw : null
  }

  // One entry per service that has regional HTML variants. To add another
  // service later, push another { routes: {...} } object — nothing else
  // in this file needs to change.
  var REGIONAL_PAGE_GROUPS = [
    {
      routes: {
        almaty: 'accounting.html',
        astana: 'buhgalterskie-uslugi-astana.html',
        shymkent: 'buhgalterskie-uslugi-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'nalogovyy-audit-almaty.html',
        astana: 'nalogovyy-audit-astana.html',
        shymkent: 'nalogovyy-audit-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'obyazatelnyy-audit-almaty.html',
        astana: 'obyazatelnyy-audit-astana.html',
        shymkent: 'obyazatelnyy-audit-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'tax.html',
        astana: 'nalogovyy-konsultant-astana.html',
        shymkent: 'nalogovyy-konsultant-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'outsourcing.html',
        astana: 'outsourcing-astana.html',
        shymkent: 'outsourcing-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'recovery.html',
        astana: 'recovery-astana.html',
        shymkent: 'recovery-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'audit.html',
        astana: 'audit-astana.html',
        shymkent: 'audit-shymkent.html'
      }
    },
    {
      routes: {
        almaty: 'business-plans.html',
        astana: 'business-plans-astana.html',
        shymkent: 'business-plans-shymkent.html'
      }
    }
  ]

  // Normalizes a filename or pathname segment for comparison: strips a
  // leading slash, defaults empty to 'index.html', ensures a .html suffix
  // (covers clean-URL dev servers that drop the extension locally).
  function normalizePageName(name) {
    var clean = (name || '').replace(/^\/+/, '')
    if (!clean) return 'index.html'
    return /\.html?$/i.test(clean) ? clean : clean + '.html'
  }

  // location.pathname never includes query string or hash, but the leading
  // split guards against them anyway in case this ever runs against a raw
  // URL string. Works the same on localhost and on Vercel.
  function getCurrentPageFilename() {
    var path = window.location.pathname.split(/[?#]/)[0]
    var segments = path.split('/')
    return normalizePageName(segments[segments.length - 1])
  }

  // Returns the routes object of the REGIONAL_PAGE_GROUPS entry that filename
  // belongs to, or null if filename isn't a member of any group.
  function findGroupForFilename(filename) {
    for (var i = 0; i < REGIONAL_PAGE_GROUPS.length; i++) {
      var routes = REGIONAL_PAGE_GROUPS[i].routes
      var belongsHere = Object.keys(routes).some(function (key) {
        return normalizePageName(routes[key]) === filename
      })
      if (belongsHere) return routes
    }
    return null
  }

  // Returns targetRegionId's version of filename, or null if filename isn't
  // part of any regionalized group, or that group has no version for the
  // requested region yet.
  function findRegionalRouteForFilename(filename, targetRegionId) {
    var routes = findGroupForFilename(filename)
    return routes ? (routes[targetRegionId] || null) : null
  }

  // Returns the URL for targetRegionId's version of the current page, or
  // null if the current page isn't part of any regionalized group, or that
  // group has no version for the requested region yet.
  function findRegionalUrl(targetRegionId) {
    return findRegionalRouteForFilename(getCurrentPageFilename(), targetRegionId)
  }

  // Returns the region id the current page's filename represents within its
  // group (e.g. 'astana' for buhgalterskie-uslugi-astana.html), or null if
  // the current page isn't itself a regional variant of anything.
  function getPageRegionId() {
    var current = getCurrentPageFilename()
    var routes = findGroupForFilename(current)
    if (!routes) return null
    var match = Object.keys(routes).filter(function (key) {
      return normalizePageName(routes[key]) === current
    })
    return match[0] || null
  }

  // Rewrites same-origin internal links so they point at regionId's version
  // of their target page, wherever a mapped regional route exists. Leaves
  // everything else untouched: external links, tel:/mailto:/sms:/javascript:,
  // anchors, target="_blank", downloads, and links explicitly opted out via
  // data-no-region-rewrite (used by cross-city directory blocks that must
  // keep pointing at OTHER cities regardless of the active region).
  function rewriteRegionalLinks(regionId) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      if (a.hasAttribute('data-no-region-rewrite')) return
      if (a.target === '_blank' || a.hasAttribute('download')) return

      var href = a.getAttribute('href')
      if (!href || href.charAt(0) === '#') return
      if (/^(tel|mailto|sms|javascript):/i.test(href)) return

      var url
      try {
        url = new URL(href, window.location.href)
      } catch (e) {
        return
      }
      if (url.origin !== window.location.origin) return

      var segments = url.pathname.split('/')
      var filename = normalizePageName(segments[segments.length - 1])
      var targetFilename = findRegionalRouteForFilename(filename, regionId)
      if (!targetFilename || normalizePageName(targetFilename) === filename) return

      segments[segments.length - 1] = targetFilename
      url.pathname = segments.join('/')
      a.setAttribute('href', url.pathname + url.search + url.hash)
    })
  }

  // Navigates to the target region's version of the current page, if one
  // exists and isn't the page already open. Silently does nothing otherwise
  // (unmapped page, or the chosen region is already the current page).
  function navigateToRegionalPage(targetRegionId) {
    var targetUrl = findRegionalUrl(targetRegionId)
    if (!targetUrl) return
    if (normalizePageName(targetUrl) === getCurrentPageFilename()) return
    window.location.assign(targetUrl)
  }

  function selectRegion(id, source) {
    var region = REGIONS.filter(function (r) { return r.id === id })[0]
    if (!region) return null
    saveRegion(id, source)
    setAnalyticsUserProperties()
    window.dispatchEvent(new CustomEvent('az:regionchange', {
      detail: { id: region.id, label: region.label, source: source }
    }))
    navigateToRegionalPage(id)
    return region
  }

  function buildRegionBadge(container, initialId) {
    var wrap = document.createElement('div')
    wrap.className = 'az-region-switcher'

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'az-region-badge'
    button.setAttribute('aria-haspopup', 'listbox')
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-label', 'Выбрать регион')

    var pin = document.createElement('span')
    pin.className = 'az-region-pin'
    pin.setAttribute('aria-hidden', 'true')
    pin.textContent = '📍'

    var labelEl = document.createElement('span')
    labelEl.className = 'az-region-label'

    var arrow = document.createElement('span')
    arrow.className = 'az-region-arrow'
    arrow.setAttribute('aria-hidden', 'true')
    arrow.textContent = '▾'

    button.appendChild(pin)
    button.appendChild(labelEl)
    button.appendChild(arrow)

    var list = document.createElement('ul')
    list.className = 'az-region-list'
    list.setAttribute('role', 'listbox')
    list.hidden = true

    function updateLabel(id) {
      labelEl.textContent = getRegionLabel(id)
      button.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Select region' : 'Выбрать регион')
      list.querySelectorAll('.az-region-option').forEach(function (opt) {
        opt.textContent = getRegionLabel(opt.dataset.regionId)
        var active = opt.dataset.regionId === id
        opt.classList.toggle('active', active)
        opt.setAttribute('aria-selected', active ? 'true' : 'false')
      })
    }

    function openDropdown() {
      list.hidden = false
      button.setAttribute('aria-expanded', 'true')
      document.addEventListener('click', onDocClick)
      document.addEventListener('keydown', onKeyDown)
    }

    function closeDropdown() {
      list.hidden = true
      button.setAttribute('aria-expanded', 'false')
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) closeDropdown()
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        closeDropdown()
        button.focus()
      }
    }

    button.addEventListener('click', function () {
      if (list.hidden) openDropdown()
      else closeDropdown()
    })

    REGIONS.forEach(function (region) {
      var li = document.createElement('li')
      li.setAttribute('role', 'presentation')

      var opt = document.createElement('button')
      opt.type = 'button'
      opt.className = 'az-region-option'
      opt.setAttribute('role', 'option')
      opt.dataset.regionId = region.id
      opt.textContent = region.label
      opt.addEventListener('click', function () {
        selectRegion(region.id, 'manual')
        updateLabel(region.id)
        closeDropdown()
      })

      li.appendChild(opt)
      list.appendChild(li)
    })

    updateLabel(initialId)

    wrap.appendChild(button)
    wrap.appendChild(list)

    var locale = container.querySelector('.locale-switcher')
    if (locale) container.insertBefore(wrap, locale)
    else container.appendChild(wrap)

    return { button: button, updateLabel: updateLabel }
  }

  function buildRegionBanner(detectedId, badge) {
    if (document.querySelector('.az-region-banner')) return

    var isEn = document.documentElement.lang === 'en'

    var banner = document.createElement('div')
    banner.className = 'az-region-banner'
    banner.setAttribute('role', 'dialog')
    banner.setAttribute('aria-live', 'polite')
    banner.setAttribute('aria-label', isEn ? 'Confirm region' : 'Подтверждение региона')

    var text = document.createElement('p')
    text.className = 'az-region-banner-text'
    text.textContent = isEn
      ? 'Is ' + getRegionLabel(detectedId) + ' your city?'
      : 'Ваш город — ' + getRegionLabel(detectedId) + '?'

    var actions = document.createElement('div')
    actions.className = 'az-region-banner-actions'

    var yesBtn = document.createElement('button')
    yesBtn.type = 'button'
    yesBtn.className = 'az-region-banner-btn az-region-banner-yes'
    yesBtn.textContent = isEn ? 'Yes' : 'Да'

    var otherBtn = document.createElement('button')
    otherBtn.type = 'button'
    otherBtn.className = 'az-region-banner-btn az-region-banner-other'
    otherBtn.textContent = isEn ? 'Choose another' : 'Выбрать другой'

    actions.appendChild(yesBtn)
    actions.appendChild(otherBtn)
    banner.appendChild(text)
    banner.appendChild(actions)
    document.body.appendChild(banner)

    requestAnimationFrame(function () { banner.classList.add('active') })

    function removeBanner() {
      banner.classList.remove('active')
      setTimeout(function () { banner.remove() }, 300)
    }

    yesBtn.addEventListener('click', function () {
      selectRegion(detectedId, 'detected')
      badge.updateLabel(detectedId)
      removeBanner()
    })

    otherBtn.addEventListener('click', function () {
      removeBanner()
      badge.button.click()
      badge.button.focus()
    })
  }

  function initRegionSelector() {
    var headerRight = document.querySelector('.header-right')
    // Idempotency guard — checks live DOM state rather than a module flag,
    // so it still holds even if main.js is accidentally executed twice.
    if (!headerRight || headerRight.querySelector('.az-region-switcher')) return

    var saved = getSavedRegion()
    var pageRegionId = getPageRegionId()
    var initialId = DEFAULT_REGION
    var pendingId = null

    if (pageRegionId && (!saved || (saved.source !== 'manual' && saved.id !== pageRegionId))) {
      // Landing directly on a regional page's URL is a passive signal — sync
      // silently (no redirect), but never override a region the user picked
      // manually via the dropdown; that always wins.
      saved = saveRegion(pageRegionId, 'detected')
    }

    if (saved) {
      initialId = saved.id
    } else {
      var detected = detectRegionFromCookie()
      if (detected) {
        initialId = detected
        pendingId = detected
      } else {
        saveRegion(DEFAULT_REGION, 'default')
      }
    }

    var badge = buildRegionBadge(headerRight, initialId)
    refreshRegionBadgeLang = function () {
      var current = getSavedRegion()
      badge.updateLabel(current ? current.id : DEFAULT_REGION)
    }

    if (pendingId) {
      buildRegionBanner(pendingId, badge)
    }

    rewriteRegionalLinks(initialId)
    window.addEventListener('az:regionchange', function (e) {
      rewriteRegionalLinks(e.detail.id)
    })
  }

  // ==================== Analytics context (region + language) ====================
  // Single source of truth for region attribution: the same localStorage record
  // that drives the region badge/selector — never re-derived from the URL, so a
  // manual pick always wins even on a generic (non-regional) page.
  function getAnalyticsRegion() {
    var saved = getSavedRegion()
    return saved ? saved.id : DEFAULT_REGION
  }

  // Reflects the page's actual rendered language (set by translatePage), not
  // the URL or localStorage, so it always matches what the visitor is seeing.
  function getAnalyticsLanguage() {
    return document.documentElement.lang === 'en' ? 'en' : 'ru'
  }

  function getAnalyticsContext() {
    return { region: getAnalyticsRegion(), language: getAnalyticsLanguage() }
  }

  function setAnalyticsUserProperties() {
    if (typeof gtag !== 'function') return
    var ctx = getAnalyticsContext()
    gtag('set', 'user_properties', { region: ctx.region, language: ctx.language })
  }

  // Best-effort click-origin label for contact events. Falls back to 'content'
  // (inside the page body) or 'unknown' (no element) rather than guessing.
  function getLinkLocation(el) {
    if (!el) return 'unknown'
    if (el.closest('.modal-overlay')) return 'modal'
    if (el.closest('header')) return 'header'
    if (el.closest('footer')) return 'footer'
    if (el.closest('.wa-float')) return 'floating'
    if (el.closest('#contact')) return 'contact'
    if (el.closest('#hero')) return 'hero'
    if (el.closest('body')) return 'content'
    return 'unknown'
  }

  function loadEmailJS() {
    return new Promise(function (resolve) {
      if (window.emailjs) { resolve(); return }
      var s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
      s.onload = function () { emailjs.init(EMAILJS_PUBLIC_KEY); resolve() }
      document.head.appendChild(s)
    })
  }

  function buildModal() {
    const el = document.createElement('div')
    el.id = 'contactModal'
    el.className = 'modal-overlay'
    el.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" id="modalClose" aria-label="Закрыть">&times;</button>
        <h3 data-ru="Получить консультацию" data-en="Get a consultation">Получить консультацию</h3>
        <form id="modalForm" novalidate>
          <input type="text" name="name"
            data-ru-placeholder="Ваше имя *" data-en-placeholder="Your name *"
            placeholder="Ваше имя *" required />
          <input type="tel" name="phone"
            data-ru-placeholder="Телефон *" data-en-placeholder="Phone *"
            placeholder="Телефон *" required />
          <textarea name="message"
            data-ru-placeholder="Ваш вопрос (необязательно)" data-en-placeholder="Your question (optional)"
            placeholder="Ваш вопрос (необязательно)"></textarea>
          <button type="submit" class="btn" data-ru="Отправить заявку" data-en="Submit">Отправить заявку</button>
        </form>
        <p class="modal-success" id="modalSuccess"
          data-ru="Спасибо! Мы свяжемся с вами в ближайшее время." data-en="Thank you! We will contact you shortly.">
          Спасибо! Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    `
    document.body.appendChild(el)
  }

  function openModal() {
    const modal = document.getElementById('contactModal')
    const form = document.getElementById('modalForm')
    const success = document.getElementById('modalSuccess')
    form.reset()
    form.style.display = 'flex'
    success.style.display = 'none'
    modal.classList.add('active')
    document.body.style.overflow = 'hidden'
    setTimeout(() => form.querySelector('[name="name"]').focus(), 100)
  }

  function closeModal() {
    document.getElementById('contactModal').classList.remove('active')
    document.body.style.overflow = ''
  }

  function translatePage(lang) {
    document.documentElement.lang = lang
    document.querySelectorAll('[data-ru]').forEach((el) => {
      const text = el.dataset[lang]
      if (text !== undefined) el.textContent = text
    })
    document.querySelectorAll('[data-ru-placeholder]').forEach((el) => {
      const val = el.dataset[lang + 'Placeholder']
      if (val !== undefined) el.placeholder = val
    })
    document.querySelectorAll('[data-ru-alt]').forEach((el) => {
      const val = el.dataset[lang + 'Alt']
      if (val !== undefined) el.alt = val
    })
    document.querySelectorAll('meta[data-ru-description]').forEach((meta) => {
      const val = meta.dataset[lang + 'Description']
      if (val !== undefined) meta.content = val
    })
    document.querySelectorAll('.lang-switch').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang)
    })
    // Region badge is built by JS (buildRegionBadge) and carries no
    // data-ru/data-en of its own, so it needs an explicit refresh here.
    if (refreshRegionBadgeLang) refreshRegionBadgeLang()
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Fade-in animations
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach((el) => observer.observe(el))

    // Language switcher
    const urlLang = new URLSearchParams(window.location.search).get('lang')
    const lang = urlLang === 'en' || urlLang === 'ru' ? urlLang : localStorage.getItem('preferredLang') || 'ru'
    // A page only supports EN if it ships the .lang-switch UI (added by hand per
    // page, 1:1 with full data-en coverage today — verified, not assumed). RU-only
    // pages must render RU regardless of a saved/URL 'en' preference; the saved
    // preference itself is left untouched so a bilingual page still honors it later.
    const pageIsBilingual = !!document.querySelector('.lang-switch')
    const effectiveLang = lang === 'en' && !pageIsBilingual ? 'ru' : lang
    translatePage(effectiveLang)
    document.querySelectorAll('.lang-switch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.lang
        translatePage(selected)
        localStorage.setItem('preferredLang', selected)
        setAnalyticsUserProperties()
      })
    })

    // Burger menu
    const burger = document.querySelector('.burger')
    const menu = document.querySelector('.menu')
    if (burger && menu) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('active')
        menu.classList.toggle('active')
      })
      menu.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          if (!a.closest('.has-dropdown') || a.closest('.dropdown')) {
            burger.classList.remove('active')
            menu.classList.remove('active')
          }
        })
      })
    }

    // Region selector
    initRegionSelector()
    setAnalyticsUserProperties()

    // Dropdown — мобильный toggle
    document.querySelectorAll('.has-dropdown > a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
          e.preventDefault()
          link.parentElement.classList.toggle('open')
        }
      })
    })

    // Modal
    buildModal()
    translatePage(effectiveLang) // re-run to cover modal elements

    document.querySelectorAll('a.btn[href="contact.html"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault()
        openModal()
      })
    })

    document.getElementById('modalClose').addEventListener('click', closeModal)
    document.getElementById('contactModal').addEventListener('click', (e) => {
      if (e.target.id === 'contactModal') closeModal()
    })

    // Lightbox
    var lbOverlay = document.createElement('div')
    lbOverlay.className = 'lb-overlay'
    lbOverlay.innerHTML = '<button class="lb-close" aria-label="Закрыть">&times;</button><img src="" alt="" />'
    document.body.appendChild(lbOverlay)
    var lbImg = lbOverlay.querySelector('img')

    function openLightbox(src, alt) {
      lbImg.src = src
      lbImg.alt = alt || ''
      lbOverlay.classList.add('active')
      document.body.style.overflow = 'hidden'
    }
    function closeLightbox() {
      if (!lbOverlay.classList.contains('active')) return
      lbOverlay.classList.remove('active')
      document.body.style.overflow = ''
    }

    lbOverlay.addEventListener('click', function (e) {
      if (e.target !== lbImg) closeLightbox()
    })
    document.querySelectorAll('[data-lightbox]').forEach(function (el) {
      el.addEventListener('click', function () { openLightbox(el.dataset.lightbox, el.dataset.lightboxAlt || '') })
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(el.dataset.lightbox, el.dataset.lightboxAlt || '') }
      })
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeLightbox(); closeModal() }
    })

    function handleFormSubmit(form, method, onSuccess) {
      var name = form.querySelector('[name="name"]').value.trim()
      var phone = form.querySelector('[name="phone"]').value.trim()
      var message = (form.querySelector('[name="message"]') || {}).value || ''
      message = message.trim()
      var phoneInput = form.querySelector('[name="phone"]')
      if (!name) { form.querySelector('[name="name"]').focus(); return }
      if (!phone || phone.replace(/\D/g, '').length < 11) {
        phoneInput.style.borderColor = '#e53935'
        phoneInput.focus()
        setTimeout(function () { phoneInput.style.borderColor = '' }, 2000)
        return
      }
      phoneInput.style.borderColor = ''
      var submitBtn = form.querySelector('button[type="submit"]')
      submitBtn.disabled = true
      submitBtn.textContent = '...'
      loadEmailJS().then(function () {
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          from_name: name,
          from_phone: phone,
          message: message || 'не указано'
        })
      }).then(function () {
        if (typeof gtag === 'function') {
          var ctx = getAnalyticsContext()
          gtag('event', 'generate_lead', {
            event_category: 'lead',
            event_label: 'contact_form',
            region: ctx.region,
            // 'language' is a reserved gtag.js protocol field (silently
            // overwrites the automatic `ul` parameter instead of appearing as
            // a queryable custom parameter) — verified via network capture.
            ui_language: ctx.language,
            method: method
          })
        }
        onSuccess()
      }).catch(function (err) {
        console.error('EmailJS error:', err)
        submitBtn.disabled = false
        submitBtn.textContent = 'Отправить заявку'
        alert('Ошибка отправки. Позвоните нам: +7 (707) 220-27-04')
      })
    }

    document.getElementById('modalForm').addEventListener('submit', function (e) {
      e.preventDefault()
      handleFormSubmit(e.target, 'modal_form', function () {
        e.target.style.display = 'none'
        document.getElementById('modalSuccess').style.display = 'block'
      })
    })

    var contactForm = document.getElementById('contactForm')
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault()
        handleFormSubmit(e.target, 'page_form', function () {
          e.target.innerHTML = '<p style="text-align:center;font-size:18px;font-weight:600;color:var(--navy);padding:40px 0">✓ Спасибо! Мы свяжемся с вами в ближайшее время.</p>'
        })
      })
    }
  })

  // Scroll to top
  const btnUp = document.getElementById('btnUp')
  if (btnUp) {
    window.addEventListener('scroll', () => btnUp.classList.toggle('show', window.scrollY > 400))
    btnUp.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  // Contact-channel click tracking (phone / WhatsApp / email) — one delegated
  // listener so a single physical click can only ever produce one event.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]')
    if (!a || typeof gtag !== 'function') return
    var href = a.getAttribute('href') || ''
    var ctx = getAnalyticsContext()
    var params = {
      event_category: 'contact',
      region: ctx.region,
      // 'language' is a reserved gtag.js protocol field (it silently overwrites
      // the automatic `ul` browser-language parameter instead of appearing as
      // a queryable custom parameter) — verified via network capture, so the
      // UI language goes out under its own name here.
      ui_language: ctx.language,
      link_location: getLinkLocation(a)
    }
    if (/^tel:/i.test(href)) {
      params.event_label = a.href
      gtag('event', 'phone_call_click', params)
    } else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      params.event_label = a.href
      gtag('event', 'whatsapp_click', params)
    } else if (/^mailto:/i.test(href)) {
      params.event_label = 'company_email'
      gtag('event', 'email_click', params)
    }
  })
})()
