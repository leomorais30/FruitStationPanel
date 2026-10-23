let state = { vol: null, rec: null, flow: null };

  const mixerRow = document.getElementById('mixerRow');
  const productRow = document.getElementById('productRow');
  const flowInput = document.getElementById('flowInput');
  const volHint = document.getElementById('volHint');
  const prodHint = document.getElementById('prodHint');
  const effValue = document.getElementById('effValue');
  const statusChip = document.getElementById('statusChip');
  const statusText = document.getElementById('statusText');
  const statusNote = document.getElementById('statusNote');
  const arcActive = document.getElementById('arcActive');
  const needle = document.getElementById('needle');
  const needleHub = document.getElementById('needleHub');

  mixerRow.addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if(!opt) return;
    [...mixerRow.children].forEach(c => c.classList.remove('active'));
    opt.classList.add('active');
    state.vol = parseFloat(opt.dataset.vol);
    volHint.textContent = 'Volume interno ' + state.vol + ' L';
    compute();
  });

  productRow.addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if(!opt) return;
    [...productRow.children].forEach(c => c.classList.remove('active'));
    opt.classList.add('active');
    state.rec = parseFloat(opt.dataset.rec);
    prodHint.textContent = 'Recomendado ' + state.rec + ' s';
    compute();
  });

  flowInput.addEventListener('input', () => {
    const v = parseFloat(flowInput.value);
    state.flow = isNaN(v) ? null : v;
    compute();
  });

  function compute(){
    const { vol, rec, flow } = state;
    if(vol === null || flow === null || flow <= 0){
      effValue.textContent = '—';
      effValue.style.color = '';
      statusChip.style.display = 'none';
      statusNote.textContent = '';
      arcActive.setAttribute('stroke-dashoffset', 283);
      arcActive.setAttribute('stroke', '#a3b0c2');
      needle.setAttribute('stroke', '#eef0f2');
      needleHub.setAttribute('fill', '#eef0f2');
      needle.setAttribute('transform', 'rotate(-90 110 110)');
      return;
    }

    const eff = (vol * 3600) / flow;
    effValue.textContent = eff.toFixed(2);

    // gauge: map 0..(2x recommended or eff, whichever bigger) onto arc
    const scaleMax = rec ? Math.max(rec * 2, eff * 1.05) : Math.max(eff * 1.3, 10);
    const ratio = Math.min(eff / scaleMax, 1);
    const offset = 283 - (283 * ratio);
    arcActive.setAttribute('stroke-dashoffset', offset);
    const angle = -90 + (ratio * 180);
    needle.setAttribute('transform', `rotate(${angle} 110 110)`);

    if(rec !== null){
      statusChip.style.display = 'inline-flex';
      const ok = eff >= rec;
      const color = ok ? '#5fd98a' : '#c4302b';
      arcActive.setAttribute('stroke', color);
      needle.setAttribute('stroke', color);
      needleHub.setAttribute('fill', color);
      effValue.style.color = color;
      if(ok){
        statusChip.className = 'status-chip status-ok';
        statusText.textContent = 'Tempo adequado';
        statusNote.textContent = `Tempo calculado: ${eff.toFixed(2)} s. Referência mínima: ${rec} s.`;
      } else {
        statusChip.className = 'status-chip status-bad';
        statusText.textContent = 'Tempo abaixo do recomendado';
        const neededFlow = (vol * 3600) / rec;
        statusNote.textContent = `Referência: ${rec} s. Para atingir esse tempo, ajuste a vazão para até ${neededFlow.toFixed(0)} L/h.`;
      }
    } else {
      arcActive.setAttribute('stroke', '#a3b0c2');
      needle.setAttribute('stroke', '#eef0f2');
      needleHub.setAttribute('fill', '#eef0f2');
      effValue.style.color = '';
      statusChip.style.display = 'inline-flex';
      statusChip.className = 'status-chip status-bad';
      statusText.textContent = 'Selecione um produto';
      statusNote.textContent = 'Selecione o produto para verificar o tempo recomendado.';
    }
  }

  // default select DM1000 + Iogurte for a live starting state
  mixerRow.children[0].click();
  productRow.children[0].click();
  flowInput.value = 6499;
  state.flow = 6499;
  compute();


// Machine information — simple and independent from the calculator.
const machineButton = document.getElementById('machineButton');
const machineMenu = document.getElementById('machineMenu');
const machineInfo = document.getElementById('machineInfo');
const machineName = document.getElementById('machineName');
const machineTableBody = document.getElementById('machineTableBody');
const machineBackButton = document.getElementById('machineBackButton');

const machineData = {
  Bisignano: [
    { mixer:'DM8000', manufacturer:'PCM', pumpTag:'SK572.1F-112MP/4TF', pumpSerial:'36544424', mixerTag:'—', rpm:'156', capacity:'23' },
    { mixer:'DM8000', manufacturer:'PCM', pumpTag:'-', pumpSerial:'-', mixerTag:'—', rpm:'156', capacity:'23' }
  ],
  Sidel: [
    { mixer:'DM10000', manufacturer:'PCM', pumpTag:'—', pumpSerial:'—', mixerTag:'HOUP00000438', rpm:'156', capacity:'—' },
    { mixer:'DM8000', manufacturer:'PCM', pumpTag:'—', pumpSerial:'—', mixerTag:'27824874', rpm:'142', capacity:'—' },
    { mixer:'DM8000', manufacturer:'PCM', pumpTag:'SK22F-M2MH/4', pumpSerial:'14997623', mixerTag:'278248/2', rpm:'142', capacity:'—' },
    { mixer:'DM8000', manufacturer:'PCM', pumpTag:'SK22F-M2MH/4', pumpSerial:'14997623', mixerTag:'278248/3', rpm:'142', capacity:'—' }
  ],
  Bossar:[
    { mixer:'DM4000', manufacturer:'-', pumpTag:'SK20F-100LH/4', pumpSerial:'23504474', mixerTag:'291573', rpm:'144', capacity:'17' }
  ],
  Erca6:[
    { mixer:'DM4000', manufacturer:'-', pumpTag:'SK20F-100LH/4', pumpSerial:'23504474', mixerTag:'291573', rpm:'144', capacity:'17' }
  ],
  Gualapack:[
    { mixer:'DM2000', manufacturer:'-', pumpTag:'SK172.1F-80LP/4 TF', pumpSerial:'33748519', mixerTag:'070P129933152', rpm:'144', capacity:'8' }
  ],
  Hamba:[
    { mixer:'DM10000', manufacturer:'-', pumpTag:'-', pumpSerial:'-', mixerTag:'285750', rpm:'142', capacity:'-' }
  ],
};

machineButton.addEventListener('click', () => {
  machineMenu.hidden = !machineMenu.hidden;
});

machineMenu.addEventListener('click', (e) => {
  const button = e.target.closest('[data-machine]');
  if (!button) return;
  const name = button.dataset.machine;
  const rows = machineData[name] || [];
  machineName.textContent = name;

  if (!rows.length) {
    machineTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;color:var(--text-mid);padding:18px;">
          Dados do misturador desta máquina ainda não cadastrados.
        </td>
      </tr>
    `;
  } else {
    machineTableBody.innerHTML = rows.map(item => `
      <tr>
        <td>${item.mixer}</td>
        <td>${item.manufacturer}</td>
        <td>${item.pumpTag}</td>
        <td>${item.pumpSerial}</td>
        <td>${item.mixerTag}</td>
        <td>${item.rpm}</td>
        <td>${item.capacity}</td>
      </tr>
    `).join('');
  }
  machineInfo.hidden = false;
  machineMenu.hidden = true;
});

machineBackButton.addEventListener('click', () => {
  machineInfo.hidden = true;
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.botao')) machineMenu.hidden = true;
});

// PDF export — records the parameters, formula and result used in this calculation.
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const machineNameInput = document.getElementById('machineNameInput');

downloadPdfBtn.addEventListener('click', () => {
  const machineName = machineNameInput.value.trim();
  const { vol, rec, flow } = state;
  if (vol === null || flow === null || flow <= 0) {
    alert('Preencha o misturador e a vazão de linha antes de baixar o PDF.');
    return;
  }

  if (!machineName) {
    alert('Informe o nome da máquina antes de gerar o PDF.');
    machineNameInput.focus();
    return;
  }

  const eff = (vol * 3600) / flow;
  const mixerName = mixerRow.querySelector('.opt.active')?.textContent.trim() || '—';
  const productName = productRow.querySelector('.opt.active')?.textContent.trim() || '—';
  const ok = rec !== null ? eff >= rec : null;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 16;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Tempo de Residência', marginX, y);

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
  doc.text('Parâmetros preenchidos', marginX, y);

  const rows = [
    ['Nome da máquina', machineName],
    ['Misturador selecionado', mixerName],
    ['Volume interno', vol + ' L'],
    ['Produto', productName],
    ['Tempo de residência recomendado', rec !== null ? rec + ' s' : '—'],
    ['Vazão de linha informada', flow + ' L/h'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    y += 8;
    doc.setTextColor(90);
    doc.text(label, marginX, y);
    doc.setTextColor(20);
    doc.text(String(value), 120, y);
  });

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text('Fórmula utilizada', marginX, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(70);
  doc.text('Tempo de residência efetivo = Volume interno (L) x 3600 (segundos) / Vazão de linha (L/h)', marginX, y);
  y += 6;
  doc.text(`= ${vol} x 3600 / ${flow} = ${eff.toFixed(2)} s`, marginX, y);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text('Resultado', marginX, y);

  y += 9;
  doc.setFontSize(15);
  doc.text(`Tempo de residência efetivo: ${eff.toFixed(2)} s`, marginX, y);

  if (ok !== null) {
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (ok) { doc.setTextColor(46, 138, 87); } else { doc.setTextColor(196, 48, 43); }
    doc.text(ok ? 'STATUS: DENTRO DO RECOMENDADO' : 'STATUS: ABAIXO DO RECOMENDADO', marginX, y);

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90);
    const lines = doc.splitTextToSize(statusNote.textContent, 178);
    doc.text(lines, marginX, y);
  }

  const safeMachineName = machineName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'maquina';
  doc.save(`tempo-residencia-${safeMachineName}.pdf`);
});
