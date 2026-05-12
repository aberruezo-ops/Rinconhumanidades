/* Rincón de Humanidades — JS v2 */

// ── Mobile nav ────────────────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const nav = document.getElementById('main-nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.textContent = open ? '✕' : '☰';
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.textContent = '☰';
      document.body.style.overflow = '';
    }
  });
}

// ── FAQ accordion ─────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    // Open clicked if it wasn't open
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── Weekly rotating quote ─────────────────────────────────────
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
  },
  {
    greek: '«ἓν οἶδα ὅτι οὐδὲν οἶδα»',
    trans: '«Sólo sé que no sé nada.»',
    author: '— Atribuido a Sócrates'
  },
  {
    greek: '«ὁ βίος βραχύς, ἡ δὲ τέχνη μακρή»',
    trans: '«La vida es breve, el arte es largo.»',
    author: '— Hipócrates, <cite>Aforismos</cite>'
  }
];

function applyWeeklyQuote() {
  const qGreek = document.getElementById('quote-greek');
  const qTrans = document.getElementById('quote-trans');
  const qAuth  = document.getElementById('quote-author');
  if (!qGreek) return;
  const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const q = quotes[week % quotes.length];
  qGreek.textContent = q.greek;
  qTrans.textContent = q.trans;
  qAuth.innerHTML = q.author;
}

// ── Weekly rotating word ──────────────────────────────────────
const words = [
  {
    greek: 'φιλοσοφία', trans: 'philosophía',
    meaning: '<strong>Amor a la sabiduría</strong> — de <em>philos</em> (amigo) + <em>sophía</em> (sabiduría). Pitágoras acuñó este término para describir el impulso de buscar el saber por amor al conocimiento, no por utilidad.'
  },
  {
    greek: 'ἀρετή', trans: 'aretḗ',
    meaning: '<strong>Virtud / excelencia</strong> — La máxima realización de las capacidades de un ser. Para Aristóteles, la <em>aretḗ</em> humana es vivir conforme a la razón y desarrollar el carácter mediante el hábito.'
  },
  {
    greek: 'παιδεία', trans: 'paidéia',
    meaning: '<strong>Educación integral</strong> — Formación completa del ser humano: cuerpo, mente y carácter. Concepto central de la civilización griega que influyó en todo el humanismo occidental.'
  },
  {
    greek: 'λόγος', trans: 'lógos',
    meaning: '<strong>Razón / palabra / discurso</strong> — Una de las palabras más ricas del griego. En Heráclito, principio ordenador del universo; en el Evangelio de Juan, el Verbo divino; en filosofía, la razón que nos distingue.'
  },
  {
    greek: 'κάλλος', trans: 'kállos',
    meaning: '<strong>Belleza</strong> — Para los griegos, lo bello era también bueno y verdadero. El ideal de <em>kalokagathía</em> (bello y bueno) unía excelencia física y moral en una sola virtud.'
  },
  {
    greek: 'ἀγάπη', trans: 'agápē',
    meaning: '<strong>Amor incondicional</strong> — Distinta del <em>eros</em> (amor pasional) y la <em>philía</em> (amistad), la <em>ágape</em> designa el amor desinteresado que se da sin esperar nada a cambio.'
  },
  {
    greek: 'κόσμος', trans: 'kósmos',
    meaning: '<strong>Orden / mundo / universo</strong> — Los griegos llamaron <em>kósmos</em> al universo porque lo veían como un orden bello y racional. De esta palabra derivan «cosmético», «cosmopolita» y «cosmos».'
  }
];

function applyWeeklyWord() {
  const wGreek = document.getElementById('word-greek');
  const wTrans = document.getElementById('word-trans');
  const wMean  = document.getElementById('word-meaning');
  if (!wGreek) return;
  const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const w = words[week % words.length];
  wGreek.textContent = w.greek;
  wTrans.textContent = w.trans;
  wMean.innerHTML = w.meaning;
}

applyWeeklyQuote();
applyWeeklyWord();

// ── Newsletter feedback ───────────────────────────────────────
document.querySelectorAll('[data-form="newsletter"]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn   = form.querySelector('button[type="submit"]');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '¡Suscrito! ✓';
    btn.style.background = '#4a6741';
    btn.disabled = true;
    if (input) input.value = '';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      btn.disabled = false;
    }, 4500);
  });
});

// ── Animate on scroll (Intersection Observer) ─────────────────
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.post-card, .post-card-featured, .forum-card, .group-card, .hd-example, .brand-pill, .upcoming-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    io.observe(el);
  });
}
