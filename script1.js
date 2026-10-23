let state = {
  pumps: [{ id: 1, strokeMin: null, capMin: null, capMax: null }],
  gram: null,
  flaskRate: null,
  pct: null
};
let nextPumpId = 2;

const pumpsContainer = document.getElementById('pumpsContainer');
const addPumpBtn = document.getElementById('addPumpBtn');
const pumpCountOut = document.getElementById('pumpCountOut');
const gramInput = document.getElementById('gramInput');
const flaskRateInput = document.getElementById('flaskRateInput');
const pctInput = document.getElementById('pctInput');
const vazMinOut = document.getElementById('vazMinOut');
const vazMaxOut = document.getElementById('vazMaxOut');
const vazProdOut = document.getElementById('vazProdOut');
const effValue = document.getElementById('effValue');
const statusChip = document.getElementById('statusChip');
const statusText = document.getElementById('statusText');
const statusNote = document.getElementById('statusNote');
const capacityZone = document.getElementById('capacityZone');
const capacityMarker = document.getElementById('capacityMarker');
const capacityMarkerTag = document.getElementById('capacityMarkerTag');
const tickMin = document.getElementById('tickMin');
const tickMax = document.getElementById('tickMax');
const stepPill1 = document.getElementById('stepPill1');
const stepPill2 = document.getElementById('stepPill2');
const stepPill3 = document.getElementById('stepPill3');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const machineNameInput = document.getElementById('machineNameInput');

function pumpCardTemplate(pump, index) {
  return `
    <div class="pump-card" data-pump-id="${pump.id}">
      <div class="pump-card-head">
        <span class="pump-card-title">Bomba ${index + 1}</span>
        ${state.pumps.length > 1 ? '<button type="button" class="btn-remove-pump">Remover</button>' : ''}
      </div>
      <div class="field">
        <div class="field-head">
          <label>Taxa máx (strokes/minuto)</label>
          <span class="field-hint stroke-hour-hint">= ${pump.strokeMin !== null ? (pump.strokeMin * 60).toFixed(0) : '0'} strokes/h</span>
        </div>
        <div class="num-input-row">
          <input type="number" class="pump-stroke" placeholder="0" min="0" step="1" value="${pump.strokeMin ?? ''}">
          <span class="unit-tag">strokes/min</span>
        </div>
      </div>
      <div class="field-pair">
        <div class="field">
          <div class="field-head"><label>Capacidade mín. descarga</label></div>
          <div class="num-input-row">
            <input type="number" class="pump-cap-min" placeholder="0" min="0" step="0.1" value="${pump.capMin ?? ''}">
            <span class="unit-tag">ml</span>
          </div>
        </div>
        <div class="field">
          <div class="field-head"><label>Capacidade máx. descarga</label></div>
          <div class="num-input-row">
            <input type="number" class="pump-cap-max" placeholder="0" min="0" step="0.1" value="${pump.capMax ?? ''}">
            <span class="unit-tag">ml</span>
          </div>
        </div>
      </div>
      <div class="field">
        <div class="readout-mini two-line">
          <div><span>Vazão mínima desta bomba</span><b class="pump-vaz-min">— L/H</b></div>
          <div><span>Vazão máxima desta bomba</span><b class="pump-vaz-max">— L/H</b></div>
        </div>
      </div>
    </div>`;
}

function renderPumps() {
  pumpsContainer.innerHTML = state.pumps.map(pumpCardTemplate).join('');
  pumpCountOut.textContent = state.pumps.length;
  compute();
}

function parseNullable(value) {
  const v = parseFloat(value);
  return Number.isFinite(v) ? v : null;
}

addPumpBtn.addEventListener('click', () => {
  state.pumps.push({ id: nextPumpId++, strokeMin: null, capMin: null, capMax: null });
  renderPumps();
});

pumpsContainer.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.btn-remove-pump');
  if (!removeBtn) return;
  const card = e.target.closest('.pump-card');
  const id = Number(card.dataset.pumpId);
  state.pumps = state.pumps.filter(p => p.id !== id);
  renderPumps();
});

pumpsContainer.addEventListener('input', (e) => {
  const card = e.target.closest('.pump-card');
  if (!card) return;
  const pump = state.pumps.find(p => p.id === Number(card.dataset.pumpId));
  if (!pump) return;
  if (e.target.classList.contains('pump-stroke')) pump.strokeMin = parseNullable(e.target.value);
  if (e.target.classList.contains('pump-cap-min')) pump.capMin = parseNullable(e.target.value);
  if (e.target.classList.contains('pump-cap-max')) pump.capMax = parseNullable(e.target.value);
  compute();
});

gramInput.addEventListener('input', () => { state.gram = parseNullable(gramInput.value); compute(); });
flaskRateInput.addEventListener('input', () => { state.flaskRate = parseNullable(flaskRateInput.value); compute(); });
pctInput.addEventListener('input', () => { state.pct = parseNullable(pctInput.value); compute(); });

function getPumpFlow(pump) {
  if (pump.strokeMin === null || pump.capMin === null || pump.capMax === null) return null;
  const strokeHour = pump.strokeMin * 60;
  return {
    min: (strokeHour * pump.capMin) / 1000,
    max: (strokeHour * pump.capMax) / 1000,
    strokeHour
  };
}

function getPumpTotals() {
  const flows = state.pumps.map(getPumpFlow);
  const complete = flows.every(Boolean);
  return {
    flows,
    complete,
    min: complete ? flows.reduce((sum, f) => sum + f.min, 0) : null,
    max: complete ? flows.reduce((sum, f) => sum + f.max, 0) : null
  };
}

function setMarker(pct, color, label) {
  capacityMarker.style.left = pct + '%';
  capacityMarker.style.color = color;
  capacityMarkerTag.textContent = label;
}

function resetResult() {
  effValue.textContent = '—';
  effValue.style.color = '';
  statusChip.style.display = 'none';
  statusNote.textContent = '';
  capacityZone.style.left = '20%';
  capacityZone.style.width = '40%';
  tickMin.textContent = 'min —';
  tickMax.textContent = 'máx —';
  tickMin.style.left = '20%';
  tickMax.style.left = '60%';
  setMarker(50, '#a3b0c2', '—');
}

function compute() {
  const pumpTotals = getPumpTotals();

  document.querySelectorAll('.pump-card').forEach(card => {
    const pump = state.pumps.find(p => p.id === Number(card.dataset.pumpId));
    const flow = getPumpFlow(pump);
    const hourHint = card.querySelector('.stroke-hour-hint');
    hourHint.textContent = pump.strokeMin !== null ? `= ${(pump.strokeMin * 60).toFixed(0)} strokes/h` : '= 0 strokes/h';
    card.querySelector('.pump-vaz-min').textContent = flow ? flow.min.toFixed(2) + ' L/H' : '— L/H';
    card.querySelector('.pump-vaz-max').textContent = flow ? flow.max.toFixed(2) + ' L/H' : '— L/H';
  });

  vazMinOut.textContent = pumpTotals.min !== null ? pumpTotals.min.toFixed(2) + ' L/H' : '— L/H';
  vazMaxOut.textContent = pumpTotals.max !== null ? pumpTotals.max.toFixed(2) + ' L/H' : '— L/H';

  let vazProd = null;
  if (state.gram !== null && state.flaskRate !== null) {
    vazProd = state.flaskRate * 60 * (state.gram / 1000);
    vazProdOut.textContent = vazProd.toFixed(2) + ' L/H';
  } else {
    vazProdOut.textContent = '— L/H';
  }

  const hasAnyPumpData = state.pumps.some(p => p.strokeMin !== null || p.capMin !== null || p.capMax !== null);
  stepPill1.className = 'step-pill' + (pumpTotals.complete ? ' done' : (hasAnyPumpData ? ' active' : ''));
  stepPill2.className = 'step-pill' + (vazProd !== null ? ' done' : (state.gram !== null || state.flaskRate !== null ? ' active' : ''));

  if (vazProd === null || state.pct === null) {
    stepPill3.className = 'step-pill';
    resetResult();
    return;
  }

  const vazFruta = vazProd * (state.pct / 100);
  effValue.textContent = vazFruta.toFixed(2);
  stepPill3.className = 'step-pill active';

  if (!pumpTotals.complete) {
    statusChip.style.display = 'inline-flex';
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Preencha todas as bombas';
    statusNote.textContent = 'Informe strokes/min e capacidades mínima e máxima de cada bomba cadastrada.';
    effValue.style.color = '';
    const scaleMax = Math.max(vazFruta * 1.3, 10);
    setMarker(Math.min((vazFruta / scaleMax) * 100, 100), '#eef0f2', vazFruta.toFixed(0) + ' L/H');
    return;
  }

  const vazMin = pumpTotals.min;
  const vazMax = pumpTotals.max;
  const scaleMax = Math.max(vazMax * 1.15, vazFruta * 1.05, 1);
  const minPct = (vazMin / scaleMax) * 100;
  const maxPct = (vazMax / scaleMax) * 100;
  const markerPct = Math.min((vazFruta / scaleMax) * 100, 100);

  capacityZone.style.left = minPct + '%';
  capacityZone.style.width = Math.max(maxPct - minPct, 1) + '%';
  tickMin.textContent = 'min ' + vazMin.toFixed(0);
  tickMax.textContent = 'máx ' + vazMax.toFixed(0);
  tickMin.style.left = minPct + '%';
  tickMax.style.left = maxPct + '%';

  const withinRange = vazFruta >= vazMin && vazFruta <= vazMax;
  const color = withinRange ? '#5fd98a' : '#d9534f';
  effValue.style.color = color;
  setMarker(markerPct, color, vazFruta.toFixed(0) + ' L/H');
  statusChip.style.display = 'inline-flex';
  stepPill3.className = 'step-pill ' + (withinRange ? 'done' : 'active');

  const pctMin = vazProd > 0 ? (vazMin / vazProd) * 100 : 0;
  const pctMax = vazProd > 0 ? (vazMax / vazProd) * 100 : 0;
  const labelBombas = state.pumps.length === 1 ? '1 bomba' : `${state.pumps.length} bombas`;

  if (withinRange) {
    statusChip.className = 'status-chip status-ok';
    statusText.textContent = 'Dentro da faixa';
    statusNote.textContent = `Operação dentro da faixa calculada (${vazMin.toFixed(2)}–${vazMax.toFixed(2)} L/h) para ${labelBombas}.`;
  } else if (vazFruta < vazMin) {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Abaixo da faixa';
    statusNote.textContent = `Mínimo calculado: ${vazMin.toFixed(2)} L/h. Para ${labelBombas}, a fruta precisaria ser ao menos ${pctMin.toFixed(1)}%.`;
  } else {
    statusChip.className = 'status-chip status-bad';
    statusText.textContent = 'Acima da faixa';
    statusNote.textContent = `Máximo calculado: ${vazMax.toFixed(2)} L/h. Para ${labelBombas}, o limite de fruta é ${pctMax.toFixed(1)}%.`;
  }
}

downloadPdfBtn.addEventListener('click', () => {
  const machineName = machineNameInput.value.trim();
  const pumpTotals = getPumpTotals();
  if (!pumpTotals.complete || state.gram === null || state.flaskRate === null || state.pct === null) {
    alert('Preencha os dados de todas as bombas, da máquina e o % de fruta antes de baixar o PDF.');
    return;
  }
  if (!machineName) {
    alert('Informe o nome da máquina antes de gerar o PDF.');
    machineNameInput.focus();
    return;
  }

  const vazProd = state.flaskRate * 60 * (state.gram / 1000);
  const vazFruta = vazProd * (state.pct / 100);
  const withinRange = vazFruta >= pumpTotals.min && vazFruta <= pumpTotals.max;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 16;
  let y = 20;

  const ensureSpace = (needed = 18) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };
  const addRow = (label, value) => {
    ensureSpace(9);
    y += 8;
    doc.setTextColor(90);
    doc.text(label, marginX, y);
    doc.setTextColor(20);
    doc.text(String(value), 120, y);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Capacidade de Dosagem', marginX, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('Engineering Danone · Process Panel', marginX, y);
  y += 6;
  doc.setDrawColor(210);
  doc.line(marginX, y, 210 - marginX, y);

  y += 10;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`1. Bombas de fruta (${state.pumps.length})`, marginX, y);

  state.pumps.forEach((pump, index) => {
    const flow = pumpTotals.flows[index];
    ensureSpace(48);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(`Bomba ${index + 1}`, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    addRow('Taxa máxima de strokes', `${pump.strokeMin} strokes/min (${flow.strokeHour.toFixed(0)} strokes/h)`);
    addRow('Capacidade mínima de descarga', `${pump.capMin} ml`);
    addRow('Capacidade máxima de descarga', `${pump.capMax} ml`);
    addRow('Faixa de vazão', `${flow.min.toFixed(2)} a ${flow.max.toFixed(2)} L/H`);
  });

  ensureSpace(35);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Capacidade combinada', marginX, y);
  doc.setFont('helvetica', 'normal');
  addRow('Vazão mínima total', pumpTotals.min.toFixed(2) + ' L/H');
  addRow('Vazão máxima total', pumpTotals.max.toFixed(2) + ' L/H');

  ensureSpace(65);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Máquina de envase', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  addRow('Nome da máquina', machineName);
  addRow('Gramatura do frasco/pote', state.gram + ' g');
  addRow('Frascos por minuto', state.flaskRate + ' frascos/min');
  addRow('% de fruta desejado', state.pct + ' %');
  addRow('Vazão de produto', vazProd.toFixed(2) + ' L/H');

  ensureSpace(55);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resultado', marginX, y);
  y += 9;
  doc.setFontSize(15);
  doc.text(`Vazão de fruta necessária: ${vazFruta.toFixed(2)} L/H`, marginX, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`Faixa total das bombas: ${pumpTotals.min.toFixed(2)} a ${pumpTotals.max.toFixed(2)} L/H`, marginX, y);
  y += 10;
  doc.setFont('helvetica', 'bold');
  if (withinRange) doc.setTextColor(46, 138, 87); else doc.setTextColor(196, 48, 43);
  doc.text(withinRange ? 'STATUS: DENTRO DA CAPACIDADE TOTAL' : 'STATUS: FORA DA CAPACIDADE TOTAL', marginX, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(doc.splitTextToSize(statusNote.textContent, 178), marginX, y);

  const safeMachineName = machineName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'maquina';
  doc.save(`capacidade-dosagem-${safeMachineName}.pdf`);
});

renderPumps();
