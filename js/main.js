/* Rincón de Humanidades — JS principal */

// ── Mobile nav toggle ─────────────────────────────────────────
const toggle = document.getElementById('nav-toggle');
const nav    = document.getElementById('main-nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? '✕' : '☰';
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', false);
      toggle.textContent = '☰';
      document.body.style.overflow = '';
    }
  });
}

// ── Rotating weekly quote ─────────────────────────────────────
const quotes = [
  {
    greek: '«ὁ ἀνεξέταστος βίος οὐ βιωτὸς ἀνθρώπῳ»',
    trans: '«Una vida sin examen no merece ser vivida.»',
    author: '— Sócrates (<cite>Apología</cite>, Platón)'
  },
  {
    greek: '«ἄνθρωπος φύσει πολιτικὸν ζῷον»',
    trans: '«El hombre es por naturaleza un animal político.»',
    author: '— Aristóteles (<cite>Política</cite>, I)'
  },
  {
    greek: '«μῆνιν ἄειδε, θεά, Πηληϊάδεω Ἀχιλῆος»',
    trans: '«Canta, oh diosa, la cólera del Pelida Aquiles.»',
    author: '— Homero (<cite>Ilíada</cite>, I.1)'
  },
  {
    greek: '«γνῶθι σεαυτόν»',
    trans: '«Conócete a ti mismo.»',
    author: '— Inscripción en el templo de Delfos'
  },
  {
    greek: '«arma virumque cano»',
    trans: '«Canto las armas y al varón.»',
    author: '— Virgilio (<cite>Eneida</cite>, I.1)'
  }
];

function setWeeklyQuote() {
  const el = document.querySelector('.quote-block');
  if (!el) return;
  const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const q = quotes[week % quotes.length];
  const gt = el.querySelector('.greek-text');
  const qt = el.querySelector('.quote-translation');
  const ft = el.querySelector('footer');
  if (gt) gt.textContent = q.greek;
  if (qt) qt.textContent = q.trans;
  if (ft) ft.innerHTML = q.author;
}

setWeeklyQuote();

// ── Rotating word of the week ─────────────────────────────────
const words = [
  {
    word: 'φιλοσοφία', trans: 'philosophía',
    meaning: '<strong>Amor a la sabiduría</strong> — de <em>philos</em> (amigo) + <em>sophía</em> (sabiduría). Término acuñado por Pitágoras para describir el impulso humano de buscar el saber no por utilidad sino por el puro amor al conocimiento.'
  },
  {
    word: 'ἀρετή', trans: 'aretḗ',
    meaning: '<strong>Virtud / excelencia</strong> — La máxima realización de las capacidades de un ser. Para Aristóteles, la <em>aretḗ</em> humana consiste en vivir conforme a la razón y desarrollar el carácter a través del hábito.'
  },
  {
    word: 'παιδεία', trans: 'paidéia',
    meaning: '<strong>Educación integral</strong> — El proceso de formación completo del ser humano: cuerpo, mente y carácter. Concepto central de la civilización griega que influyó en todo el humanismo occidental.'
  },
  {
    word: 'λόγος', trans: 'lógos',
    meaning: '<strong>Razón / palabra / discurso</strong> — Una de las palabras más ricas del griego. En Heráclito es el principio ordenador del universo; en el Evangelio de Juan, el Verbo divino; en la filosofía, la razón que nos diferencia de los animales.'
  },
  {
    word: 'κάλλος', trans: 'kállos',
    meaning: '<strong>Belleza</strong> — Para los griegos, la belleza no era sólo estética: lo bello era también bueno y verdadero. El ideal de <em>kalokagathía</em> (bello y bueno) unía la excelencia física y moral.'
  },
  {
    word: 'ἀγάπη', trans: 'agápē',
    meaning: '<strong>Amor incondicional</strong> — Distinta del <em>eros</em> (amor pasional) y la <em>philía</em> (amistad), la <em>ágape</em> designa el amor desinteresado que se da sin esperar nada a cambio.'
  },
  {
    word: 'κόσμος', trans: 'kósmos',
    meaning: '<strong>Orden / mundo</strong> — Los griegos llamaron <em>kósmos</em> al universo porque lo veían como un orden bello y racional, opuesto al caos. De esta palabra derivamos "cosmético", "cosmopolita" y "cosmos".'
  }
];

function setWeeklyWord() {
  const el = document.querySelector('.greek-word-card');
  if (!el) return;
  const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const w = words[week % words.length];
  const wd = el.querySelector('.greek-word');
  const tr = el.querySelector('.greek-transliteration');
  const mn = el.querySelector('.greek-meaning');
  if (wd) wd.textContent = w.word;
  if (tr) tr.textContent = w.trans;
  if (mn) mn.innerHTML = w.meaning;
}

setWeeklyWord();

// ── Smooth active nav on scroll ───────────────────────────────
const sections = document.querySelectorAll('section[id], main[id]');
const navLinks  = document.querySelectorAll('.main-nav a[href^="#"]');

if (sections.length && navLinks.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.main-nav a[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.35 });
  sections.forEach(s => observer.observe(s));
}

// ── Newsletter form feedback ──────────────────────────────────
document.querySelectorAll('.newsletter-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn   = form.querySelector('button');
    if (!input || !btn) return;
    btn.textContent = '¡Suscrito! ✓';
    btn.style.background = '#4a6741';
    btn.disabled = true;
    input.value = '';
    setTimeout(() => {
      btn.textContent = 'Suscribirme';
      btn.style.background = '';
      btn.disabled = false;
    }, 4000);
  });
});
