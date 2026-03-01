// 화면 전환 (Navigation)
function showCalculator(id) {
    document.getElementById('main-hub').style.display = 'none';
    document.querySelectorAll('.container').forEach(c => {
        if(c.id !== 'main-hub') c.style.display = 'none';
    });
    document.getElementById(id).style.display = 'block';
    if (window.renderMathInElement) renderMathInElement(document.getElementById(id));
    if(id === 'interpolation-calc') drawInterpolationGraph();
}

function showHub() {
    document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
    document.getElementById('main-hub').style.display = 'block';
}

// 숫자 포맷터 (정수 및 소수점 이하 3자리마다 공백 추가)
function fNum(num, fixed) {
    if (num === null || isNaN(num) || !isFinite(num)) return "-";
    let parts = num.toFixed(fixed).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    if (parts[1]) parts[1] = parts[1].replace(/(\d{3})(?=\d)/g, "$1 ");
    return parts.join(".");
}

// 통합 dBm/전력/전압 계산 로직
function initCombinedCalc() {
    const dbm = document.getElementById('c-dbm');
    const watt = document.getElementById('c-watt');
    const mwatt = document.getElementById('c-mwatt');
    const vpp = document.getElementById('c-vpp');
    const vp = document.getElementById('c-vp');
    const vrms = document.getElementById('c-vrms');
    const z = document.getElementById('c-impedance');

    function updateAll(sourceType, value) {
        if (isNaN(value)) return;
        const impedance = parseFloat(z.value);
        let p_mw;

        // 1단계: 모든 입력을 Milliwatts (mW)로 통일
        switch(sourceType) {
            case 'dbm': p_mw = Math.pow(10, value/10); break;
            case 'watt': p_mw = value * 1000; break;
            case 'mwatt': p_mw = value; break;
            case 'vrms': p_mw = (Math.pow(value, 2) / impedance) * 1000; break;
            case 'vp': p_mw = (Math.pow(value / Math.sqrt(2), 2) / impedance) * 1000; break;
            case 'vpp': p_mw = (Math.pow(value / (2 * Math.sqrt(2)), 2) / impedance) * 1000; break;
        }

        // 2단계: 통일된 p_mw를 기반으로 모든 필드 업데이트 (단, 현재 입력중인 필드는 제외)
        if (sourceType !== 'dbm') dbm.value = (10 * Math.log10(p_mw)).toFixed(4);
        if (sourceType !== 'watt') watt.value = (p_mw / 1000).toFixed(6);
        if (sourceType !== 'mwatt') mwatt.value = p_mw.toFixed(4);
        
        const rms = Math.sqrt((p_mw / 1000) * impedance);
        if (sourceType !== 'vrms') vrms.value = rms.toFixed(7);
        if (sourceType !== 'vp') vp.value = (rms * Math.sqrt(2)).toFixed(7);
        if (sourceType !== 'vpp') vpp.value = (rms * 2 * Math.sqrt(2)).toFixed(7);
    }

    dbm.oninput = () => updateAll('dbm', parseFloat(dbm.value));
    watt.oninput = () => updateAll('watt', parseFloat(watt.value));
    mwatt.oninput = () => updateAll('mwatt', parseFloat(mwatt.value));
    vrms.oninput = () => updateAll('vrms', parseFloat(vrms.value));
    vp.oninput = () => updateAll('vp', parseFloat(vp.value));
    vpp.oninput = () => updateAll('vpp', parseFloat(vpp.value));
    z.onchange = () => updateAll('dbm', parseFloat(dbm.value));

    document.getElementById('reset-combined').onclick = () => {
        [dbm, watt, mwatt, vpp, vp, vrms].forEach(i => i.value = "");
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
    const specI1_mA = parseFloat(document.getElementById('res1-spec-i').value);
    const specI2_mA = parseFloat(document.getElementById('res2-spec-i').value);
    const vrms = parseFloat(document.getElementById('res-vrms').value);
    const totalR = (r1Range * r1Digit) + (r2Range * r2Digit);

    // 허용 한계: Digit가 0인 경우 해당 저항의 Max 전류는 무시하고, 0보다 큰 것 중 최솟값을 사용
    let finalLimitI_mA = null;
    let limits = [];
    if (r1Digit > 0 && !isNaN(specI1_mA)) limits.push(specI1_mA);
    if (r2Digit > 0 && !isNaN(specI2_mA)) limits.push(specI2_mA);
    
    if (limits.length > 0) {
        finalLimitI_mA = Math.min(...limits);
    }

    document.getElementById('res-total-val').textContent = fNum(totalR, 0);
    document.getElementById('res-i-limit').textContent = (finalLimitI_mA === null) ? "-" : fNum(finalLimitI_mA, 3);

    if (totalR === 0 || isNaN(vrms)) {
        document.getElementById('res-i-actual').textContent = "-";
        document.getElementById('res-p-calc').textContent = "-";
        document.getElementById('res-status').className = "status-tag";
        document.getElementById('res-status').textContent = "상태: -";
        return;
    }

    // 현재 전류 (mA) = (사용 전압 / 합계 저항값) * 1000
    const actualI_A = vrms / totalR;
    const actualI_mA = actualI_A * 1000;
    const actualP = Math.pow(actualI_A, 2) * totalR;

    document.getElementById('res-i-actual').textContent = fNum(actualI_mA, 3);
    document.getElementById('res-p-calc').textContent = fNum(actualP, 4);

    const status = document.getElementById('res-status');
    if (finalLimitI_mA !== null) {
        if (actualI_mA <= finalLimitI_mA) {
            status.textContent = "상태: PASS (사용가능)";
            status.className = "status-tag status-pass";
        } else {
            status.textContent = "상태: FAIL (과전류)";
            status.className = "status-tag status-fail";
        }
    } else {
        status.textContent = "상태: -";
        status.className = "status-tag";
    }
}

// 3. 보간법 로직 + 그래프
function calculateInterpolation() {
    const f1 = parseFloat(document.getElementById('int-f1').value), cf1 = parseFloat(document.getElementById('int-cf1').value);
    const f2 = parseFloat(document.getElementById('int-f2').value), cf2 = parseFloat(document.getElementById('int-cf2').value);
    const fx = parseFloat(document.getElementById('int-fx').value);
    if(isNaN(f1) || isNaN(cf1) || isNaN(f2) || isNaN(cf2) || isNaN(fx)) return;
    const cfx = ((fx - f1) * (cf2 - cf1) / (f2 - f1)) + cf1;
    document.getElementById('int-result').textContent = fNum(cfx, 6);
    drawInterpolationGraph(f1, cf1, f2, cf2, fx, cfx);
}

function drawInterpolationGraph(x1, y1, x2, y2, tx, ty) {
    const canvas = document.getElementById('interpolation-graph'), ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if ([x1, y1, x2, y2, tx, ty].some(v => isNaN(v))) return;
    const padding = 60;
    const minX = Math.min(x1, x2, tx), maxX = Math.max(x1, x2, tx);
    const minY = Math.min(y1, y2, ty), maxY = Math.max(y1, y2, ty);
    const rangeX = (maxX - minX) || 1, rangeY = (maxY - minY) || 1;
    const getX = (val) => padding + (val - minX) / rangeX * (canvas.width - 2 * padding);
    const getY = (val) => canvas.height - padding - (val - minY) / rangeY * (canvas.height - 2 * padding);
    ctx.strokeStyle = '#cbd5e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(padding, padding/2); ctx.lineTo(padding, canvas.height-padding); ctx.lineTo(canvas.width-padding/2, canvas.height-padding); ctx.stroke();
    ctx.strokeStyle = '#3498db'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(getX(x1), getY(y1)); ctx.lineTo(getX(x2), getY(y2)); ctx.stroke(); ctx.setLineDash([]);
    const drawPoint = (x, y, color, label, align) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(getX(x), getY(y), 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4a5568'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = align;
        ctx.fillText(label, getX(x) + (align === 'right' ? -10 : 10), getY(y) - 10);
    };
    drawPoint(x1, y1, '#2c3e50', `P1(${x1}, ${y1})`, 'left');
    drawPoint(x2, y2, '#2c3e50', `P2(${x2}, ${y2})`, getX(x2) > canvas.width - 100 ? 'right' : 'left');
    drawPoint(tx, ty, '#e74c3c', `Result(${tx}, ${ty.toFixed(4)})`, getX(tx) > canvas.width - 100 ? 'right' : 'left');
}

// 4. dB 계산 로직
function calculateDB() {
    const vout = parseFloat(document.getElementById('db-vout').value), vin = parseFloat(document.getElementById('db-vin').value);
    if(vout && vin) document.getElementById('db-v-result').textContent = fNum(20 * Math.log10(vout / vin), 4);
    const pout = parseFloat(document.getElementById('db-pout').value), pin = parseFloat(document.getElementById('db-pin').value);
    if(pout && pin) document.getElementById('db-p-result').textContent = fNum(10 * Math.log10(pout / pin), 4);
}

// 5. 오차율 로직
function calculateError() {
    const t = parseFloat(document.getElementById('err-t').value), m = parseFloat(document.getElementById('err-m').value);
    if(t && !isNaN(m)) document.getElementById('err-result').textContent = fNum(((m - t) / t) * 100, 6);
}

// 6. TSL 로직
function calculateTSL() {
    const p = parseFloat(document.getElementById('tsl-p').value) * (parseFloat(document.getElementById('tsl-p-unit').value) || 1);
    const w = parseFloat(document.getElementById('tsl-w').value) * (parseFloat(document.getElementById('tsl-w-unit').value) || 1);
    if(isNaN(p) || isNaN(w)) return;
    const b2 = 0.99999998e-6, b3 = 0.499418e-6; 
    const ts = (b2 / 2) - b3, limit = (0.0002 * b2) + 3e-9;
    document.getElementById('tsl-ts').textContent = ts.toExponential(4).replace('e', ' e');
    document.getElementById('tsl-limit').textContent = limit.toExponential(4).replace('e', ' e');
    const status = document.getElementById('tsl-status');
    if(ts <= limit) { status.textContent = "결과: PASS"; status.className = "status-tag status-pass"; }
    else { status.textContent = "결과: FAIL"; status.className = "status-tag status-fail"; }
}

document.addEventListener('DOMContentLoaded', () => {
    initCombinedCalc();
    setR1Range(1000); setR1Digit(0); setR2Range(1000); setR2Digit(0);
    document.getElementById('res1-spec-i').oninput = calculateResistor;
    document.getElementById('res2-spec-i').oninput = calculateResistor;
    document.getElementById('res-vrms').oninput = calculateResistor;
    ['int-f1','int-cf1','int-f2','int-cf2','int-fx'].forEach(id => document.getElementById(id).oninput = calculateInterpolation);
    ['db-vout','db-vin','db-pout','db-pin'].forEach(id => document.getElementById(id).oninput = calculateDB);
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
    document.getElementById('reset-db').onclick = () => { ['db-vout','db-vin','db-pout','db-pin'].forEach(id => document.getElementById(id).value = ""); document.getElementById('db-v-result').textContent = "-"; document.getElementById('db-p-result').textContent = "-"; };
    document.getElementById('reset-err').onclick = () => { ['err-t','err-m'].forEach(id => document.getElementById(id).value = ""); document.getElementById('err-result').textContent = "-"; };
    document.getElementById('reset-tsl').onclick = () => { ['tsl-p','tsl-w'].forEach(id => document.getElementById(id).value = ""); calculateTSL(); };
});
