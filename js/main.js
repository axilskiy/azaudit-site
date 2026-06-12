;(function () {
  var EMAILJS_PUBLIC_KEY = '42GD8pC2KE2WGTnU_'
  var EMAILJS_SERVICE_ID = 'service_xmqfy1h'
  var EMAILJS_TEMPLATE_ID = 'template_3ulo9ri'

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
    const canonical = document.querySelector('link[rel="canonical"]')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (canonical || ogUrl) {
      const url = new URL(window.location)
      if (lang === 'ru') url.searchParams.delete('lang')
      else url.searchParams.set('lang', lang)
      if (canonical) canonical.href = url.toString()
      if (ogUrl) ogUrl.content = url.toString()
    }
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
    translatePage(lang)
    document.querySelectorAll('.lang-switch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.lang
        translatePage(selected)
        localStorage.setItem('preferredLang', selected)
        const url = new URL(window.location)
        if (selected === 'ru') url.searchParams.delete('lang')
        else url.searchParams.set('lang', selected)
        history.replaceState(null, '', url)
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
    translatePage(lang) // re-run to cover modal elements

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

    function handleFormSubmit(form, onSuccess) {
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
          gtag('event', 'close_convert_lead', {
            event_category: 'lead',
            event_label: 'contact_form'
          })
          gtag('event', 'generate_lead', {
            event_category: 'lead',
            event_label: 'contact_form'
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
      handleFormSubmit(e.target, function () {
        e.target.style.display = 'none'
        document.getElementById('modalSuccess').style.display = 'block'
      })
    })

    var contactForm = document.getElementById('contactForm')
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault()
        handleFormSubmit(e.target, function () {
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

  // Phone call tracking
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="tel:"]')
    if (link && typeof gtag === 'function') {
      gtag('event', 'phone_call_click', {
        event_category: 'contact',
        event_label: link.href
      })
    }
  })
})()
