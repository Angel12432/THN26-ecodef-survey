'use strict';

(function () {
  const config = window.SURVEY_CONFIG;

  if (!config || !Array.isArray(config.sections)) {
    document.getElementById('surveyRoot').innerHTML = '<div class="validation-message visible">Fehler: survey-config.js konnte nicht geladen werden.</div>';
    return;
  }

  const state = {
    route: '',
    previousRoute: '',
    currentPageIndex: 0,
    lastData: null
  };

  const form = document.getElementById('surveyForm');
  const surveyRoot = document.getElementById('surveyRoot');
  const routeInput = document.getElementById('routeInput');
  const routeStatus = document.getElementById('routeStatus');
  const validationMessage = document.getElementById('validationMessage');
  const progressFill = document.getElementById('progressFill');
  const progressPct = document.getElementById('progressPct');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const submitBtn = document.getElementById('submitBtn');

  const html = String.raw;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function visibleTokens(item) {
    return Array.isArray(item.visibleFor) ? item.visibleFor : [];
  }

  function isRouteNoActive() {
    return form.querySelector('input[name="is_active_in_sector"][value="no"]')?.checked === true;
  }

  function routeAllows(item) {
    const tokens = visibleTokens(item);
    if (!tokens.length || tokens.includes('ALL')) return true;
    if (tokens.includes('ROUTE_NO_ACTIVE')) return isRouteNoActive();
    if (!state.route) return false;
    return tokens.includes(state.route);
  }

  function routeAllowsFromDataset(el) {
    const tokens = (el.dataset.visibleFor || '').split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.includes('ALL')) return true;
    if (tokens.includes('ROUTE_NO_ACTIVE')) return isRouteNoActive();
    if (!state.route) return false;
    return tokens.includes(state.route);
  }

  function renderSurvey() {
    surveyRoot.innerHTML = config.sections.map(renderSection).join('');
    bindEvents();
    applyVisibility();
  }

  function renderSection(section) {
    return html`
      <section class="section" data-section-id="${escapeHtml(section.id)}" data-visible-for="${escapeHtml(visibleTokens(section).join(' '))}">
        <div class="section-header">
          <span class="section-number">${escapeHtml(section.number || '')}</span>
          <span class="section-title">${escapeHtml(section.title)}</span>
          <span class="section-icon">${escapeHtml(section.icon || '')}</span>
        </div>
        ${section.info ? `<div class="info-box"><span class="info-icon">ℹ</span><span>${escapeHtml(section.info)}</span></div>` : ''}
        ${section.questions.map(renderQuestion).join('')}
      </section>
    `;
  }

  function renderQuestion(question) {
    if (question.type === 'info') {
      return html`<div class="info-box" data-visible-for="${escapeHtml(visibleTokens(question).join(' '))}"><span class="info-icon">ℹ</span><span>${escapeHtml(question.text)}</span></div>`;
    }

    const required = question.required === true;
    const optional = question.optional === true;
    const cardClasses = ['q-card'];
    if (question.cardClass) cardClasses.push(question.cardClass);

    return html`
      <div class="${cardClasses.join(' ')}" id="q-${escapeHtml(question.id)}" data-question-id="${escapeHtml(question.id)}" data-field="${escapeHtml(question.id)}" data-required="${required ? 'true' : 'false'}" data-visible-for="${escapeHtml(visibleTokens(question).join(' '))}">
        <div class="q-label">${escapeHtml(question.label || '')}</div>
        <div class="q-text">
          ${escapeHtml(question.text || question.textByRoute?.J || '')}
          ${required ? '<span class="q-required">*</span>' : ''}
          ${optional ? '<span class="optional-tag">optional</span>' : ''}
          ${question.hint ? `<span class="q-hint">${escapeHtml(question.hint)}</span>` : ''}
        </div>
        ${renderInput(question)}
      </div>
    `;
  }

  function renderInput(question) {
    const name = escapeHtml(question.id);
    const placeholder = escapeHtml(question.placeholder || '');

    switch (question.type) {
      case 'text':
      case 'email':
        return `<input class="q-input" type="${question.type}" name="${name}" placeholder="${placeholder}">`;

      case 'textarea':
        return `<textarea class="q-textarea" name="${name}" placeholder="${placeholder}"></textarea>`;

      case 'select':
        return html`
          <select class="q-select" name="${name}">
            <option value="" disabled selected>Bitte wählen</option>
            ${(question.options || []).map(opt => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join('')}
          </select>
        `;

      case 'radio':
      case 'checkbox':
        return html`
          <div class="option-group" data-type="${question.type}" ${question.max ? `data-max="${Number(question.max)}"` : ''}>
            ${(question.options || []).map(opt => html`
              <label class="option-row ${question.type === 'checkbox' ? 'checkbox' : ''}" data-exclusive="${opt.exclusive ? 'true' : 'false'}">
                <input type="${question.type}" name="${name}" value="${escapeHtml(opt.value)}">
                <div class="option-marker"></div>
                <span class="option-text">${escapeHtml(opt.label)}</span>
              </label>
            `).join('')}
          </div>
        `;

      case 'scale': {
        const values = ['1', '2', '3', '4', '5'];
        if (question.na) values.push('NA');
        const labels = question.scaleLabels || {};
        const lowLabel = labels.low || '1 = niedrig';
        const naLabel = labels.na || 'Keine Angabe';
        const highLabel = labels.high || '5 = hoch';
        return html`
          <div class="scale-wrap">
            <div class="scale-group ${question.na ? 'has-na' : ''}" data-scale-name="${name}">
              ${values.map(value => `<button class="scale-btn" type="button" data-value="${escapeHtml(value)}">${escapeHtml(value === 'NA' ? 'Keine Angabe' : value)}</button>`).join('')}
            </div>
            <input type="hidden" name="${name}">
            <div class="scale-labels"><span>${escapeHtml(lowLabel)}</span><span>${question.na ? escapeHtml(naLabel) : ''}</span><span>${escapeHtml(highLabel)}</span></div>
          </div>
        `;
      }

      default:
        return '';
    }
  }

  function findQuestionById(id) {
    for (const section of config.sections) {
      const q = section.questions.find(item => item.id === id);
      if (q) return q;
    }
    return null;
  }

  function elementToConfigItem(el) {
    const qid = el.dataset.questionId;
    if (qid) return findQuestionById(qid);
    const sid = el.dataset.sectionId;
    if (sid) return config.sections.find(section => section.id === sid);
    return null;
  }

  function updateTextByRoute() {
    document.querySelectorAll('.q-card').forEach(card => {
      const id = card.dataset.questionId;
      const question = findQuestionById(id);
      if (!question?.textByRoute || !state.route || !question.textByRoute[state.route]) return;
      const textEl = card.querySelector('.q-text');
      const required = card.dataset.required === 'true';
      const optional = question.optional ? '<span class="optional-tag">optional</span>' : '';
      const hint = question.hint ? `<span class="q-hint">${escapeHtml(question.hint)}</span>` : '';
      textEl.innerHTML = `${escapeHtml(question.textByRoute[state.route])}${required ? '<span class="q-required">*</span>' : ''}${optional}${hint}`;
    });
  }

  function updateLabelsByRoute() {
    document.querySelectorAll('.q-card').forEach(card => {
      const id = card.dataset.questionId;
      const question = findQuestionById(id);
      const labelEl = card.querySelector('.q-label');
      if (!question || !labelEl) return;
      if (question.labelByRoute && state.route && question.labelByRoute[state.route]) {
        labelEl.textContent = question.labelByRoute[state.route];
      } else if (question.label) {
        labelEl.textContent = question.label;
      }
    });
  }

  function bindEvents() {
    surveyRoot.querySelectorAll('.option-row').forEach(row => {
      row.addEventListener('click', event => {
        event.preventDefault();
        handleOptionClick(row);
      });
    });

    surveyRoot.querySelectorAll('.scale-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        handleScaleClick(button);
      });
    });

    surveyRoot.querySelectorAll('.q-input,.q-textarea,.q-select').forEach(field => {
      const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(eventName, () => {
        updateAnsweredStates();
        updateProgress();
      });
    });
  }

  function updateRouteFromAnswers() {
    state.previousRoute = state.route;

    const activeYes = form.querySelector('input[name="is_active_in_sector"][value="yes"]')?.checked;
    const activeNo = form.querySelector('input[name="is_active_in_sector"][value="no"]')?.checked;
    const plannedYes = form.querySelector('input[name="entry_planned"][value="yes"]')?.checked;
    const plannedNo = form.querySelector('input[name="entry_planned"][value="no"]')?.checked;

    if (activeYes) state.route = 'J';
    else if (activeNo && plannedYes) state.route = 'P';
    else if (activeNo && plannedNo) state.route = 'N';
    else state.route = '';

    routeInput.value = state.route;

    if (state.previousRoute !== state.route) {
      state.currentPageIndex = 0;
    }
  }

  function applyVisibility() {
    updateRouteFromAnswers();

    document.querySelectorAll('[data-visible-for]').forEach(el => {
      const item = elementToConfigItem(el);
      const show = item ? routeAllows(item) : routeAllowsFromDataset(el);
      el.classList.toggle('is-hidden', !show);

      if (el.classList.contains('q-card')) {
        if (show) enableCard(el);
        else clearCard(el);
      }
    });

    document.querySelectorAll('.section').forEach(section => {
      const visibleCards = [...section.querySelectorAll('.q-card')].filter(card => !card.classList.contains('is-hidden'));
      const visibleInfo = [...section.querySelectorAll('.info-box')].filter(box => !box.classList.contains('is-hidden'));
      section.classList.toggle('is-hidden', visibleCards.length === 0 && visibleInfo.length === 0);
    });

    updateTextByRoute();
    updateLabelsByRoute();
    applyPagination();
    updateRouteStatus();
    updateAnsweredStates();
    updateProgress();
  }

  function getRouteVisibleSections() {
    return [...document.querySelectorAll('.section')].filter(section => !section.classList.contains('is-hidden'));
  }

  function getCurrentSection() {
    const sections = getRouteVisibleSections();
    if (!sections.length) return null;
    state.currentPageIndex = Math.min(Math.max(state.currentPageIndex, 0), sections.length - 1);
    return sections[state.currentPageIndex];
  }

  function applyPagination() {
    const sections = getRouteVisibleSections();

    if (state.currentPageIndex >= sections.length) state.currentPageIndex = Math.max(0, sections.length - 1);
    if (state.currentPageIndex < 0) state.currentPageIndex = 0;

    sections.forEach((section, index) => {
      section.classList.toggle('page-hidden', index !== state.currentPageIndex);
      section.setAttribute('aria-hidden', index !== state.currentPageIndex ? 'true' : 'false');
    });

    updatePageControls();
  }

  function updatePageControls() {
    const sections = getRouteVisibleSections();
    const current = getCurrentSection();
    const total = sections.length;
    const currentNumber = total ? state.currentPageIndex + 1 : 0;

    if (pageIndicator) {
      const title = current?.querySelector('.section-title')?.textContent.trim() || '';
      pageIndicator.textContent = total ? `Abschnitt ${currentNumber} von ${total}: ${title}` : 'Abschnitt 0 von 0';
    }

    if (prevPageBtn) prevPageBtn.disabled = state.currentPageIndex <= 0;
    if (nextPageBtn) nextPageBtn.classList.toggle('is-hidden', total === 0 || state.currentPageIndex >= total - 1);
    if (submitBtn) submitBtn.classList.toggle('is-hidden', total === 0 || state.currentPageIndex < total - 1);
  }

  function enableCard(card) {
    card.querySelectorAll('input, select, textarea, button').forEach(field => {
      field.disabled = false;
    });
  }

  function clearCard(card) {
    card.classList.remove('answered');
    card.querySelectorAll('.option-row.selected').forEach(row => row.classList.remove('selected'));
    card.querySelectorAll('.scale-btn.selected').forEach(btn => btn.classList.remove('selected'));

    card.querySelectorAll('input, select, textarea').forEach(field => {
      field.disabled = true;
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = false;
      else if (field.tagName === 'SELECT') field.selectedIndex = 0;
      else field.value = '';
    });
  }

  function handleOptionClick(row) {
    const group = row.closest('.option-group');
    const input = row.querySelector('input');
    const type = group.dataset.type || input?.type;

    if (!input || input.disabled) return;

    if (type === 'radio') {
      group.querySelectorAll('.option-row').forEach(otherRow => {
        otherRow.classList.remove('selected');
        const otherInput = otherRow.querySelector('input');
        if (otherInput) otherInput.checked = false;
      });
      row.classList.add('selected');
      input.checked = true;
    }

    if (type === 'checkbox') {
      const max = Number(group.dataset.max || 0);
      const isSelected = row.classList.contains('selected');
      const isExclusive = row.dataset.exclusive === 'true';

      if (!isSelected && isExclusive) {
        group.querySelectorAll('.option-row').forEach(otherRow => {
          otherRow.classList.remove('selected');
          const otherInput = otherRow.querySelector('input');
          if (otherInput) otherInput.checked = false;
        });
      }

      if (!isSelected && !isExclusive) {
        group.querySelectorAll('.option-row[data-exclusive="true"]').forEach(otherRow => {
          otherRow.classList.remove('selected');
          const otherInput = otherRow.querySelector('input');
          if (otherInput) otherInput.checked = false;
        });
      }

      const selectedCount = group.querySelectorAll('.option-row.selected').length;
      if (!isSelected && max && selectedCount >= max) return;

      row.classList.toggle('selected', !isSelected);
      input.checked = !isSelected;
    }

    applyVisibility();
  }

  function handleScaleClick(button) {
    const group = button.closest('.scale-group');
    const card = button.closest('.q-card');
    const hidden = card.querySelector(`input[type="hidden"][name="${group.dataset.scaleName}"]`);

    group.querySelectorAll('.scale-btn').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    if (hidden) hidden.value = button.dataset.value || button.textContent.trim();

    updateAnsweredStates();
    updateProgress();
  }

  function hasAnswer(card) {
    const fields = [...card.querySelectorAll('input, select, textarea')].filter(field => field.name && !field.disabled);
    if (!fields.length) return false;

    return fields.some(field => {
      if (field.type === 'radio' || field.type === 'checkbox') return field.checked;
      return String(field.value || '').trim() !== '';
    });
  }

  function getRouteVisibleCards() {
    return [...document.querySelectorAll('.q-card')].filter(card => !card.classList.contains('is-hidden'));
  }

  function getCurrentPageCards() {
    const current = getCurrentSection();
    if (!current) return [];
    return [...current.querySelectorAll('.q-card')].filter(card => !card.classList.contains('is-hidden'));
  }

  function updateAnsweredStates() {
    document.querySelectorAll('.q-card').forEach(card => {
      if (card.classList.contains('is-hidden')) return;
      card.classList.toggle('answered', hasAnswer(card));
    });
  }

  function updateProgress() {
    const sections = getRouteVisibleSections();
    const total = sections.length;

    if (!total) {
      progressFill.style.width = '0%';
      progressPct.textContent = '0%';
      return;
    }

    const pct = total <= 1 ? 0 : Math.round((state.currentPageIndex / (total - 1)) * 100);
    progressFill.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
  }

  function updateRouteStatus() {
    const activeNo = form.querySelector('input[name="is_active_in_sector"][value="no"]')?.checked;
    let text = 'Bitte beantworten Sie zunächst die Einstufungsfragen. Danach werden nur die relevanten Abschnitte angezeigt.';

    if (state.route === 'J') text = '<strong>Pfad J:</strong> Bereits tätig. Sie sehen abschnittsweise Erfahrungs-, Markt-, Beschaffungs-, Technologie- und Ausblicksfragen.';
    if (state.route === 'P') text = '<strong>Pfad P:</strong> Einstieg geplant. Sie sehen abschnittsweise Fragen zu geplanter Positionierung, erwarteten Hürden und Einstiegsvoraussetzungen.';
    if (state.route === 'N') text = '<strong>Pfad N:</strong> Kein Einstieg geplant. Der Fragebogen wird auf allgemeine Angaben, Gründe, Anmerkungen und optionalen Kontakt reduziert.';
    if (!state.route && activeNo) text = 'Bitte beantworten Sie noch, ob Ihr Unternehmen einen Einstieg plant. Danach wird der passende Pfad angezeigt.';

    routeStatus.querySelector('span:last-child').innerHTML = text;
  }

  function validateCards(cards, mode = 'current') {
    const missing = [];

    cards.forEach(card => {
      if (card.dataset.required !== 'true') return;
      if (!hasAnswer(card)) {
        const label = card.querySelector('.q-label')?.textContent.trim() || card.id;
        const text = card.querySelector('.q-text')?.textContent.replace('*', '').trim() || '';
        missing.push({ card, text: `${label}: ${text}` });
      }
    });

    if (missing.length) {
      const prefix = mode === 'all'
        ? '<strong>Bitte füllen Sie die sichtbaren Pflichtfelder aus:</strong><br>'
        : '<strong>Bitte füllen Sie die Pflichtfelder dieses Abschnitts aus:</strong><br>';
      validationMessage.innerHTML = prefix + missing.map(item => `• ${escapeHtml(item.text)}`).join('<br>');
      validationMessage.classList.add('visible');
      missing[0].card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    validationMessage.classList.remove('visible');
    validationMessage.textContent = '';
    return true;
  }

  function validateCurrentPage() {
    return validateCards(getCurrentPageCards(), 'current');
  }

  function validateAllVisibleRequired() {
    return validateCards(getRouteVisibleCards(), 'all');
  }

  function goToPage(index) {
    const sections = getRouteVisibleSections();
    if (!sections.length) return;
    state.currentPageIndex = Math.min(Math.max(index, 0), sections.length - 1);
    applyPagination();
    updateProgress();
    validationMessage.classList.remove('visible');
    validationMessage.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (!validateCurrentPage()) return;
    goToPage(state.currentPageIndex + 1);
  }

  function goPrev() {
    goToPage(state.currentPageIndex - 1);
  }

  function collectVisibleData() {
    const data = {
      survey_id: config.meta.id,
      version: config.meta.version,
      submitted_at: new Date().toISOString(),
      route: state.route,
      pages: getRouteVisibleSections().map(section => section.dataset.sectionId),
      answers: {}
    };

    getRouteVisibleCards().forEach(card => {
      const fieldName = card.dataset.field;
      if (!fieldName) return;

      const fields = [...card.querySelectorAll('input, select, textarea')].filter(field => field.name && !field.disabled);
      if (!fields.length) return;

      const checkboxes = fields.filter(field => field.type === 'checkbox');
      const radios = fields.filter(field => field.type === 'radio');
      const others = fields.filter(field => field.type !== 'checkbox' && field.type !== 'radio');

      if (checkboxes.length) {
        data.answers[fieldName] = checkboxes.filter(field => field.checked).map(field => field.value);
        return;
      }

      if (radios.length) {
        data.answers[fieldName] = radios.find(field => field.checked)?.value || '';
        return;
      }

      const field = others[0];
      data.answers[fieldName] = field ? field.value : '';
    });

    return data;
  }

  function submitForm(event) {
    event.preventDefault();
    if (!validateAllVisibleRequired()) return;

    state.lastData = collectVisibleData();
    const main = document.getElementById('app');
    const success = document.getElementById('successScreen');

    document.getElementById('refNum').textContent = Math.random().toString(36).substring(2, 9).toUpperCase();
    document.getElementById('dataPreview').textContent = JSON.stringify(state.lastData, null, 2);

    main.style.transition = 'opacity .3s';
    main.style.opacity = '0';

    setTimeout(() => {
      main.style.display = 'none';
      success.style.display = 'flex';
      success.style.opacity = '0';
      success.style.transition = 'opacity .4s';
      setTimeout(() => success.style.opacity = '1', 50);
    }, 300);
  }

  function downloadJson() {
    if (!state.lastData) return;
    const blob = new Blob([JSON.stringify(state.lastData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defence-survey-${state.lastData.route || 'unknown'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    if (!state.lastData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.lastData, null, 2));
      document.getElementById('copyJsonBtn').textContent = 'Kopiert ✓';
      setTimeout(() => { document.getElementById('copyJsonBtn').textContent = 'JSON kopieren'; }, 1500);
    } catch {
      alert('Kopieren nicht möglich. Bitte den JSON-Text manuell markieren.');
    }
  }

  function restart() {
    window.location.reload();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSurvey();
    form.addEventListener('submit', submitForm);
    prevPageBtn.addEventListener('click', goPrev);
    nextPageBtn.addEventListener('click', goNext);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJson);
    document.getElementById('copyJsonBtn').addEventListener('click', copyJson);
    document.getElementById('restartBtn').addEventListener('click', restart);
  });
})();
