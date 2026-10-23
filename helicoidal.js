/* Bombas positivas helicoidais — múltiplas bombas independentes */

const HZ_MIN_SAFE = 20;
const HZ_MAX_SAFE = 100;

let pumpSeq = 1;
let targetSeq = 0;
const state = {
  pumps: [newPump(1)],
  targets: []
};

const machineNameInput = document.getElementById('machineNameInput');
const pumpsContainer = document.getElementById('helicoidalPumpsContainer');
const targetsContainer = document.getElementById('targetsContainer');
const resultsTableBody = document.getElementById('resultsTableBody');
const selectedPumpsOut = document.getElementById('selectedPumpsOut');
const addPumpBtn = document.getElementById('addPumpBtn');
const addRowBtn = document.getElementById('addRowBtn');
const statusChip = document.getElementById('statusChip');
const statusText = document.getElementById('statusText');
const statusNote = document.getElementById('statusNote');
const stepPill1 = document.getElementById('stepPill1');
const stepPill2 = document.getElementById('stepPill2');
const stepPill3 = document.getElementById('stepPill3');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

function newPump(id) {
  return { id, name: `Bomba ${id}`, selected: true, pct: null, hz: null, q: null, rpm: null };
}

function parseLocaleNumber(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmt(v, dec = 1) {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(dec);
}

function pumpComplete(pump) {
  return pump.pct !== null && pump.pct > 0 &&
         pump.hz !== null && pump.hz > 0;
}

function hzSafety(hz) {
  if (hz === null || hz === undefined || !Number.isFinite(hz)) return { level: 'unknown', short: '—' };
  if (hz < HZ_MIN_SAFE) return { level: 'low', short: 'Risco: sobreaquecimento' };
  if (hz > HZ_MAX_SAFE) return { level: 'high', short: 'Risco: mecânico' };
  return { level: 'safe', short: 'Dentro da faixa' };
}

function calcForPump(pump, pctTarget) {
  if (!pumpComplete(pump) || pctTarget === null || !Number.isFinite(pctTarget)) {
    return { q: null, hz: null, rpm: null };
  }
  const ratio = pctTarget / pump.pct;
  return {
    hz: pump.hz * ratio,
    q: pump.q !== null && pump.q > 0 ? pump.q * ratio : null,
    rpm: pump.rpm !== null && pump.rpm > 0 ? pump.rpm * ratio : null
  };
}

function pumpCardTemplate(pump, index) {
  const complete = pumpComplete(pump);
  return `
    <div class="helicoidal-pump-card ${pump.selected ? 'is-selected' : ''}" data-pump-id="${pump.id}">
      <div class="helicoidal-pump-head">
        <div class="pump-title-wrap">
          <span class="pump-number">${index + 1}</span>
          <div>
            <strong>${escapeHtml(pump.name || `Bomba ${index + 1}`)}</strong>
            <span class="pump-state-text">${complete ? 'Referência completa' : 'Preencha os dados de campo'}</span>
          </div>
        </div>
        <div class="pump-head-actions">
          <label class="calc-toggle">
            <input type="checkbox" class="pump-selected" ${pump.selected ? 'checked' : ''}>
            <span>Usar nos cálculos</span>
          </label>
          ${state.pumps.length > 1 ? '<button type="button" class="btn-remove-pump">Remover</button>' : ''}
        </div>
      </div>

      <div class="field">
        <div class="field-head"><label>TAG / Nome da bomba</label></div>
        <div class="num-input-row"><input type="text" class="pump-name" autocomplete="off" value="${escapeAttr(pump.name)}" placeholder="Ex.: P-101A"></div>
      </div>

      <div class="helicoidal-data-grid">
        <div class="field">
          <div class="field-head"><label>% fruta atual</label></div>
          <div class="num-input-row highlight-row"><input type="text" inputmode="decimal" class="pump-pct" value="${displayInput(pump.pct)}" placeholder="0,0"><span class="unit-tag">%</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label>Frequência atual</label><span class="field-hint">20–100 Hz</span></div>
          <div class="num-input-row highlight-row"><input type="text" inputmode="decimal" class="pump-hz" value="${displayInput(pump.hz)}" placeholder="0,0"><span class="unit-tag">Hz</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label>Vazão atual</label><span class="field-hint">Opcional · informativo</span></div>
          <div class="num-input-row highlight-row"><input type="text" inputmode="decimal" class="pump-q" value="${displayInput(pump.q)}" placeholder="0,0"><span class="unit-tag">L/h</span></div>
        </div>
        <div class="field">
          <div class="field-head"><label>RPM (Tacômetro)</label><span class="field-hint">Opcional · informativo</span></div>
          <div class="num-input-row highlight-row"><input type="text" inputmode="decimal" class="pump-rpm" value="${displayInput(pump.rpm)}" placeholder="0,0"><span class="unit-tag">rpm</span></div>
        </div>
      </div>

      <div class="readout-mini pump-reference-readout">
        <span>Referência desta bomba</span>
        <b>${complete ? `${fmt(pump.pct,1)}% · ${fmt(pump.hz,2)} Hz${pump.q !== null ? ` · ${fmt(pump.q,1)} L/h` : ' · Vazão não informada'}${pump.rpm !== null ? ` · ${fmt(pump.rpm,1)} rpm` : ' · RPM não informado'}` : '— % · — Hz'}</b>
      </div>
    </div>`;
}

function targetTemplate(target, index) {
  return `
    <div class="target-card" data-target-id="${target.id}">
      <span class="target-label">Meta ${index + 1}</span>
      <div class="num-input-row highlight-row target-input-wrap">
        <input type="text" inputmode="decimal" class="target-pct" value="${escapeAttr(target.raw ?? displayInput(target.pct))}" placeholder="0,0">
        <span class="unit-tag">%</span>
      </div>
      ${state.targets.length > 1 ? '<button type="button" class="rule3-remove-btn target-remove" aria-label="Remover meta">×</button>' : ''}
    </div>`;
}

function displayInput(value) {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

function renderPumps() {
  pumpsContainer.innerHTML = state.pumps.map(pumpCardTemplate).join('');
  const selected = state.pumps.filter(p => p.selected);
  selectedPumpsOut.textContent = `${selected.length} ${selected.length === 1 ? 'bomba selecionada' : 'bombas selecionadas'} de ${state.pumps.length}`;
}

function renderTargets() {
  targetsContainer.innerHTML = state.targets.map(targetTemplate).join('');
}

function resultRow(pump, kind, pct, hz, q, rpm, isRef = false) {
  const safety = hzSafety(hz);
  return `
    <tr class="${isRef ? 'rule3-ref-row' : 'rule3-target-row'}">
      <td class="result-pump-name">${escapeHtml(pump.name || `Bomba ${pump.id}`)}</td>
      <td><span class="result-type ${isRef ? 'is-ref' : 'is-target'}">${kind}</span></td>
      <td>${pct !== null ? fmt(pct,1) + '%' : '—'}</td>
      <td>${fmt(hz,2)}</td>
      <td>${fmt(q,1)}</td>
      <td>${fmt(rpm,1)}</td>
      <td class="hz-status-cell hz-${safety.level}">${safety.short}</td>
    </tr>`;
}

function renderResults() {
  const selected = state.pumps.filter(p => p.selected);
  let html = '';

  selected.forEach(pump => {
    html += resultRow(pump, 'Atual', pump.pct, pump.hz, pump.q, pump.rpm, true);
    state.targets.filter(t => t.pct !== null).forEach(target => {
      const result = calcForPump(pump, target.pct);
      html += resultRow(pump, 'Meta', target.pct, result.hz, result.q, result.rpm, false);
    });
  });

  if (!selected.length) {
    html = '<tr><td colspan="7" class="empty-result">Nenhuma bomba marcada para cálculo.</td></tr>';
  }
  resultsTableBody.innerHTML = html;
}

function renderStatus() {
  const selected = state.pumps.filter(p => p.selected);
  const completeSelected = selected.filter(pumpComplete);
  const validTargets = state.targets.filter(t => t.pct !== null);
  const anyPumpData = state.pumps.some(p => p.pct !== null || p.hz !== null || p.q !== null || p.rpm !== null);

  stepPill1.className = 'step-pill' + (selected.length && completeSelected.length === selected.length ? ' done' : (anyPumpData ? ' active' : ''));
  stepPill2.className = 'step-pill' + (validTargets.length ? ' done' : '');
  stepPill3.className = 'step-pill';
  statusChip.style.display = 'inline-flex';

  if (!selected.length) {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Selecione uma bomba';
    statusNote.textContent = 'Marque “Usar nos cálculos” em pelo menos uma bomba cadastrada.';
    return;
  }
  if (completeSelected.length !== selected.length) {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Dados incompletos';
    statusNote.textContent = 'Preencha apenas % atual e frequência das bombas selecionadas. Vazão e RPM são opcionais e informativos.';
    return;
  }
  if (!validTargets.length) {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Informe uma meta';
    statusNote.textContent = 'Adicione pelo menos uma % de fruta desejada.';
    return;
  }

  const checks = [];
  selected.forEach(pump => {
    checks.push({ pump, safety: hzSafety(pump.hz), kind: 'atual', hz: pump.hz });
    validTargets.forEach(target => {
      const r = calcForPump(pump, target.pct);
      checks.push({ pump, safety: hzSafety(r.hz), kind: `${fmt(target.pct,1)}%`, hz: r.hz });
    });
  });
  const unsafe = checks.filter(c => c.safety.level !== 'safe');
  stepPill3.className = 'step-pill done';

  if (unsafe.length) {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Atenção à frequência';
    statusNote.textContent = `${unsafe.length} frequência(s) fora do intervalo de referência (${HZ_MIN_SAFE}–${HZ_MAX_SAFE} Hz). Confira os valores por bomba.`;
  } else {
    statusChip.className = 'status-chip status-ok';
    statusText.textContent = 'Cálculos concluídos';
    statusNote.textContent = `Frequências calculadas dentro do intervalo de referência (${HZ_MIN_SAFE}–${HZ_MAX_SAFE} Hz).`;
  }
}

function renderAll() {
  renderPumps();
  renderTargets();
  renderResults();
  renderStatus();
}

addPumpBtn.addEventListener('click', () => {
  const id = ++pumpSeq;
  state.pumps.push(newPump(id));
  renderAll();
});

pumpsContainer.addEventListener('click', e => {
  const btn = e.target.closest('.btn-remove-pump');
  if (!btn) return;
  const card = e.target.closest('.helicoidal-pump-card');
  const id = Number(card.dataset.pumpId);
  state.pumps = state.pumps.filter(p => p.id !== id);
  renderAll();
});

pumpsContainer.addEventListener('input', e => {
  const card = e.target.closest('.helicoidal-pump-card');
  if (!card) return;
  const pump = state.pumps.find(p => p.id === Number(card.dataset.pumpId));
  if (!pump) return;

  if (e.target.classList.contains('pump-name')) pump.name = e.target.value;
  if (e.target.classList.contains('pump-pct')) pump.pct = parseLocaleNumber(e.target.value);
  if (e.target.classList.contains('pump-hz')) pump.hz = parseLocaleNumber(e.target.value);
  if (e.target.classList.contains('pump-q')) pump.q = parseLocaleNumber(e.target.value);
  if (e.target.classList.contains('pump-rpm')) pump.rpm = parseLocaleNumber(e.target.value);

  // Não reconstrói os cards enquanto digita, para preservar vírgulas e cursor.
  renderResults();
  renderStatus();
  const readout = card.querySelector('.pump-reference-readout b');
  if (readout) readout.textContent = pumpComplete(pump)
    ? `${fmt(pump.pct,1)}% · ${fmt(pump.hz,2)} Hz${pump.q !== null ? ` · ${fmt(pump.q,1)} L/h` : ' · Vazão não informada'}${pump.rpm !== null ? ` · ${fmt(pump.rpm,1)} rpm` : ' · RPM não informado'}`
    : '— % · — Hz';
  const stateText = card.querySelector('.pump-state-text');
  if (stateText) stateText.textContent = pumpComplete(pump) ? 'Referência completa' : 'Preencha os dados de campo';
});

pumpsContainer.addEventListener('change', e => {
  if (!e.target.classList.contains('pump-selected')) return;
  const card = e.target.closest('.helicoidal-pump-card');
  const pump = state.pumps.find(p => p.id === Number(card.dataset.pumpId));
  if (!pump) return;
  pump.selected = e.target.checked;
  renderAll();
});

function addTarget() {
  state.targets.push({ id: ++targetSeq, pct: null, raw: '' });
  renderAll();
}

addRowBtn.addEventListener('click', addTarget);

targetsContainer.addEventListener('input', e => {
  if (!e.target.classList.contains('target-pct')) return;
  const card = e.target.closest('.target-card');
  const target = state.targets.find(t => t.id === Number(card.dataset.targetId));
  if (!target) return;
  target.raw = e.target.value;
  target.pct = parseLocaleNumber(e.target.value);
  renderResults();
  renderStatus();
});

targetsContainer.addEventListener('click', e => {
  const btn = e.target.closest('.target-remove');
  if (!btn) return;
  const card = e.target.closest('.target-card');
  const id = Number(card.dataset.targetId);
  state.targets = state.targets.filter(t => t.id !== id);
  renderAll();
});

addTarget();
renderAll();

function pdfSafeName(value) {
  return String(value || 'maquina')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'maquina';
}

function ensurePdfPage(doc, y, needed = 24) {
  if (y + needed <= 282) return y;
  doc.addPage();
  return 20;
}

downloadPdfBtn.addEventListener('click', () => {
  const machineName = machineNameInput.value.trim();
  const selected = state.pumps.filter(p => p.selected);
  const validTargets = state.targets.filter(t => t.pct !== null);

  if (!machineName) {
    alert('Informe a Máquina / Linha antes de gerar o PDF.');
    machineNameInput.focus();
    return;
  }
  if (!selected.length) {
    alert('Selecione pelo menos uma bomba para o cálculo.');
    return;
  }
  if (selected.some(p => !pumpComplete(p))) {
    alert('Preencha % atual e frequência das bombas selecionadas antes de gerar o PDF. Vazão e RPM são opcionais.');
    return;
  }
  if (!validTargets.length) {
    alert('Adicione pelo menos uma % de fruta desejada antes de gerar o PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 16;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório - Bombas Positivas Helicoidais', marginX, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Máquina / Linha: ${machineName}`, marginX, y);
  y += 6;
  doc.text(`Bombas usadas no cálculo: ${selected.length}`, marginX, y);
  y += 9;
  doc.setDrawColor(210);
  doc.line(marginX, y, 210 - marginX, y);

  selected.forEach((pump, index) => {
    y = ensurePdfPage(doc, y, 55);
    y += 10;
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${pump.name || `Bomba ${index + 1}`}`, marginX, y);

    const refSafety = hzSafety(pump.hz);
    const info = [
      ['% fruta atual', `${fmt(pump.pct,1)} %`],
      ['Frequência atual', `${fmt(pump.hz,2)} Hz`],
      ['Vazão atual', pump.q !== null ? `${fmt(pump.q,1)} L/h` : 'Não informada'],
      ['Rotação atual', pump.rpm !== null ? `${fmt(pump.rpm,1)} rpm` : 'Não informada'],
      ['Situação atual', refSafety.short]
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    info.forEach(([label, value]) => {
      y += 6.5;
      doc.setTextColor(90); doc.text(label, marginX, y);
      doc.setTextColor(20); doc.text(String(value), 87, y);
    });

    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Metas calculadas', marginX, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text('% fruta', marginX, y);
    doc.text('Hz', marginX + 32, y);
    doc.text('Q [L/h]', marginX + 62, y);
    doc.text('rpm', marginX + 98, y);
    doc.text('Situação Hz', marginX + 130, y);
    y += 3;
    doc.setDrawColor(220);
    doc.line(marginX, y, 210 - marginX, y);

    validTargets.forEach(target => {
      y = ensurePdfPage(doc, y, 10);
      const r = calcForPump(pump, target.pct);
      const safety = hzSafety(r.hz);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(20);
      doc.text(`${fmt(target.pct,1)} %`, marginX, y);
      doc.text(fmt(r.hz,2), marginX + 32, y);
      doc.text(fmt(r.q,1), marginX + 62, y);
      doc.text(fmt(r.rpm,1), marginX + 98, y);
      doc.setFontSize(8.3);
      doc.setTextColor(safety.level === 'safe' ? 30 : 180, safety.level === 'safe' ? 120 : 60, safety.level === 'safe' ? 65 : 45);
      doc.text(safety.short, marginX + 130, y);
    });
  });

  y = ensurePdfPage(doc, y, 34);
  y += 12;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Fórmulas utilizadas (aplicadas individualmente por bomba)', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(70);
  y += 7; doc.text('Hz desejado = Hz atual x % desejada / % atual', marginX, y);
  y += 6; doc.text('Q desejado (opcional) = Q atual x % desejada / % atual', marginX, y);
  y += 6; doc.text('rpm desejado (opcional) = rpm atual x % desejada / % atual', marginX, y);

  doc.save(`bombas-helicoidais-${pdfSafeName(machineName)}.pdf`);
});
