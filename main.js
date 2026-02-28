// 화면 전환 (Navigation)
function showCalculator(id) {
    document.getElementById('main-hub').style.display = 'none';
    document.querySelectorAll('.container').forEach(c => {
        if(c.id !== 'main-hub') c.style.display = 'none';
    });
    document.getElementById(id).style.display = 'block';
    if(id === 'interpolation-calc') drawInterpolationGraph();
}

function showHub() {
    document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
    document.getElementById('main-hub').style.display = 'block';
}

// 숫자 포맷터 (3자리마다 공백 추가)
function fNum(num, fixed) {
    if (num === null || isNaN(num) || !isFinite(num)) return "-";
    let parts = num.toFixed(fixed).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    if (parts[1]) parts[1] = parts[1].replace(/(\d{3})(?=\d)/g, "$1 ");
    return parts.join(".");
}

// 1. dBm 계산기 로직
function initDbmCalc() {
    const dbm = document.getElementById('dbm');
    const vpp = document.getElementById('vpp');
    const vp = document.getElementById('vp');
    const vrms = document.getElementById('vrms');
    const z = document.getElementById('impedance');

    function update(d, pp, p, rms) {
        if(d !== null) dbm.value = d.toFixed(4);
        if(pp !== null) vpp.value = pp.toFixed(7);
        if(p !== null) vp.value = p.toFixed(7);
        if(rms !== null) vrms.value = rms.toFixed(7);
    }

    dbm.oninput = () => {
        const val = parseFloat(dbm.value);
        if(isNaN(val)) return;
        const w = Math.pow(10, (val-30)/10);
        const r = Math.sqrt(w * parseFloat(z.value));
        update(null, 2*r*Math.sqrt(2), r*Math.sqrt(2), r);
    };
    vrms.oninput = () => {
        const rms = parseFloat(vrms.value);
        if(isNaN(rms)) return;
        const d = 10 * Math.log10(Math.pow(rms,2)/parseFloat(z.value)) + 30;
        update(d, 2*rms*Math.sqrt(2), rms*Math.sqrt(2), null);
    };
    vpp.oninput = () => {
        const pp = parseFloat(vpp.value);
        if(isNaN(pp)) return;
        const rms = pp/(2*Math.sqrt(2));
        const d = 10 * Math.log10(Math.pow(rms,2)/parseFloat(z.value)) + 30;
        update(d, null, rms*Math.sqrt(2), rms);
    };
    vp.oninput = () => {
        const p = parseFloat(vp.value);
        if(isNaN(p)) return;
        const rms = p/Math.sqrt(2);
        const d = 10 * Math.log10(Math.pow(rms,2)/parseFloat(z.value)) + 30;
        update(d, 2*p, null, rms);
    };
    z.onchange = () => dbm.oninput();
    document.getElementById('reset-dbm').onclick = () => {
        [dbm, vpp, vp, vrms].forEach(i => i.value = "");
        z.value = "50";
    };
}

// 2. Decade Resistor 로직
let r1Range = 1000, r1Digit = 0, r2Range = 1000, r2Digit = 0;

function setR1Range(val) { r1Range = val; updateRButtons('r1-range-btn', val); calculateResistor(); }
function setR1Digit(val) { r1Digit = val; updateRButtons('r1-digit-btn', val); calculateResistor(); }
function setR2Range(val) { r2Range = val; updateRButtons('r2-range-btn', val); calculateResistor(); }
function setR2Digit(val) { r2Digit = val; updateRButtons('r2-digit-btn', val); calculateResistor(); }

function updateRButtons(cls, val) {
    document.querySelectorAll('.' + cls).forEach(btn => {
        const btnVal = btn.innerText.includes('k') ? parseFloat(btn.innerText)*1000 : 
                       btn.innerText.includes('M') ? parseFloat(btn.innerText)*1000000 : parseFloat(btn.innerText);
        btn.classList.toggle('active', btnVal === val);
    });
}

function calculateResistor() {
    const specI1 = parseFloat(document.getElementById('res1-spec-i').value);
    const specI2 = parseFloat(document.getElementById('res2-spec-i').value);
    const vrms = parseFloat(document.getElementById('res-vrms').value);
    const totalR = (r1Range * r1Digit) + (r2Range * r2Digit);
    const limitI1 = (!isNaN(specI1)) ? r1Digit * specI1 : 0;
    const limitI2 = (!isNaN(specI2)) ? r2Digit * specI2 : 0;
    const finalLimitI = limitI1 + limitI2;
    
    document.getElementById('res-total-val').textContent = fNum(totalR, 0);
    const iLimitSpan = document.getElementById('res-i-limit');
    iLimitSpan.textContent = (isNaN(specI1) && isNaN(specI2)) ? "-" : fNum(finalLimitI, 6);

    if (totalR === 0 || isNaN(vrms)) {
        document.getElementById('res-i-actual').textContent = "-";
        document.getElementById('res-p-calc').textContent = "-";
        document.getElementById('res-status').className = "status-tag";
        document.getElementById('res-status').textContent = "상태: -";
        return;
    }

    const actualI = vrms / totalR;
    const actualP = Math.pow(actualI, 2) * totalR;
    document.getElementById('res-i-actual').textContent = fNum(actualI, 6);
    document.getElementById('res-p-calc').textContent = fNum(actualP, 4);

    const status = document.getElementById('res-status');
    if (actualI <= finalLimitI) {
        status.textContent = "상태: PASS (정상)";
        status.className = "status-tag status-pass";
    } else {
        status.textContent = "상태: FAIL (과전류)";
        status.className = "status-tag status-fail";
    }
}

// 3. 보간법 로직 + 그래프
function calculateInterpolation() {
    const f1 = parseFloat(document.getElementById('int-f1').value);
    const cf1 = parseFloat(document.getElementById('int-cf1').value);
    const f2 = parseFloat(document.getElementById('int-f2').value);
    const cf2 = parseFloat(document.getElementById('int-cf2').value);
    const fx = parseFloat(document.getElementById('int-fx').value);
    const res = document.getElementById('int-result');

    if(isNaN(f1) || isNaN(cf1) || isNaN(f2) || isNaN(cf2) || isNaN(fx)) return;
    const cfx = ((fx - f1) * (cf2 - cf1) / (f2 - f1)) + cf1;
    res.textContent = fNum(cfx, 6);
    drawInterpolationGraph(f1, cf1, f2, cf2, fx, cfx);
}

function drawInterpolationGraph(x1, y1, x2, y2, tx, ty) {
    const canvas = document.getElementById('interpolation-graph');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if ([x1, y1, x2, y2, tx, ty].some(v => isNaN(v))) return;

    const padding = 40;
    const minX = Math.min(x1, x2, tx), maxX = Math.max(x1, x2, tx);
    const minY = Math.min(y1, y2, ty), maxY = Math.max(y1, y2, ty);
    const rangeX = (maxX - minX) || 1, rangeY = (maxY - minY) || 1;

    const getX = (val) => padding + (val - minX) / rangeX * (canvas.width - 2 * padding);
    const getY = (val) => canvas.height - padding - (val - minY) / rangeY * (canvas.height - 2 * padding);

    // 축 그리기
    ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(padding, padding); ctx.lineTo(padding, canvas.height-padding); ctx.lineTo(canvas.width-padding, canvas.height-padding); ctx.stroke();

    // 연결선
    ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(getX(x1), getY(y1)); ctx.lineTo(getX(x2), getY(y2)); ctx.stroke(); ctx.setLineDash([]);

    // 점 그리기
    const drawPoint = (x, y, color, label) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(getX(x), getY(y), 5, 0, Math.PI*2); ctx.fill();
        ctx.font = '10px Arial'; ctx.fillText(label, getX(x)+8, getY(y));
    };
    drawPoint(x1, y1, '#2c3e50', `P1 (${x1}, ${y1})`);
    drawPoint(x2, y2, '#2c3e50', `P2 (${x2}, ${y2})`);
    drawPoint(tx, ty, '#e74c3c', `Target (${tx}, ${ty.toFixed(4)})`);
}

// 4. dB 계산 로직
function calculateDB() {
    const v1 = parseFloat(document.getElementById('db-v1').value), v2 = parseFloat(document.getElementById('db-v2').value);
    if(!v1 || !v2) return;
    document.getElementById('db-result').textContent = fNum(20 * Math.log10(v1 / v2), 4);
}

// 5. 오차율 로직
function calculateError() {
    const t = parseFloat(document.getElementById('err-t').value), m = parseFloat(document.getElementById('err-m').value);
    if(!t || isNaN(m)) return;
    document.getElementById('err-result').textContent = fNum(((m - t) / t) * 100, 6);
}

// 6. TSL 로직 (단위 선택 포함)
function calculateTSL() {
    const pVal = parseFloat(document.getElementById('tsl-p').value), pUnit = parseFloat(document.getElementById('tsl-p-unit').value);
    const wVal = parseFloat(document.getElementById('tsl-w').value), wUnit = parseFloat(document.getElementById('tsl-w-unit').value);
    if(isNaN(pVal) || isNaN(wVal)) return;

    // 예시용 수식: TS = (P/2) - W (단위 적용)
    const P = pVal * pUnit, W = wVal * wUnit;
    const b2 = 0.99999998e-6, b3 = 0.499418e-6; // 엑셀 상수
    const ts = (b2 / 2) - b3;
    const limit = (0.0002 * b2) + 3e-9;

    document.getElementById('tsl-ts').textContent = ts.toExponential(4).replace('e', ' e');
    document.getElementById('tsl-limit').textContent = limit.toExponential(4).replace('e', ' e');
    const status = document.getElementById('tsl-status');
    if(ts <= limit) { status.textContent = "결과: PASS"; status.className = "status-tag status-pass"; }
    else { status.textContent = "결과: FAIL"; status.className = "status-tag status-fail"; }
}

document.addEventListener('DOMContentLoaded', () => {
    initDbmCalc();
    setR1Range(1000); setR1Digit(0); setR2Range(1000); setR2Digit(0);

    document.getElementById('res1-spec-i').oninput = calculateResistor;
    document.getElementById('res2-spec-i').oninput = calculateResistor;
    document.getElementById('res-vrms').oninput = calculateResistor;

    ['int-f1','int-cf1','int-f2','int-cf2','int-fx'].forEach(id => document.getElementById(id).oninput = calculateInterpolation);
    ['db-v1','db-v2'].forEach(id => document.getElementById(id).oninput = calculateDB);
    ['err-t','err-m'].forEach(id => document.getElementById(id).oninput = calculateError);
    ['tsl-p','tsl-w','tsl-p-unit','tsl-w-unit'].forEach(id => document.getElementById(id).oninput = calculateTSL);

    document.getElementById('reset-res').onclick = () => {
        ['res1-spec-i','res2-spec-i','res-vrms'].forEach(id => document.getElementById(id).value = "");
        setR1Range(1000); setR1Digit(0); setR2Range(1000); setR2Digit(0); calculateResistor();
    };
    document.getElementById('reset-int').onclick = () => {
        ['int-f1','int-cf1','int-f2','int-cf2','int-fx'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('int-result').textContent = "-";
        const c = document.getElementById('interpolation-graph'); c.getContext('2d').clearRect(0,0,c.width,c.height);
    };
    document.getElementById('reset-db').onclick = () => { ['db-v1','db-v2'].forEach(id => document.getElementById(id).value = ""); document.getElementById('db-result').textContent = "-"; };
    document.getElementById('reset-err').onclick = () => { ['err-t','err-m'].forEach(id => document.getElementById(id).value = ""); document.getElementById('err-result').textContent = "-"; };
    document.getElementById('reset-tsl').onclick = () => { ['tsl-p','tsl-w'].forEach(id => document.getElementById(id).value = ""); calculateTSL(); };
});
