document.addEventListener('DOMContentLoaded', () => {
    const dbmInput = document.getElementById('dbm');
    const vppInput = document.getElementById('vpp');
    const vpInput = document.getElementById('vp');
    const vrmsInput = document.getElementById('vrms');
    const impedanceInput = document.getElementById('impedance');
    const resetBtn = document.getElementById('reset-btn');

    function updateOutputs(dbm, vpp, vp, vrms) {
        if (dbm !== null) dbmInput.value = dbm.toFixed(4);
        if (vpp !== null) vppInput.value = vpp.toFixed(7);
        if (vp !== null) vpInput.value = vp.toFixed(7);
        if (vrms !== null) vrmsInput.value = vrms.toFixed(7);
    }

    function calculateFromDbm() {
        const dbm = parseFloat(dbmInput.value);
        const z = parseFloat(impedanceInput.value);
        if (isNaN(dbm) || isNaN(z)) return;

        const watts = Math.pow(10, (dbm - 30) / 10);
        const vrms = Math.sqrt(watts * z);
        const vp = vrms * Math.sqrt(2);
        const vpp = 2 * vp;

        updateOutputs(null, vpp, vp, vrms);
    }

    function calculateFromVrms() {
        const vrms = parseFloat(vrmsInput.value);
        const z = parseFloat(impedanceInput.value);
        if (isNaN(vrms) || isNaN(z)) return;

        if (vrms === 0) {
            updateOutputs(-Infinity, 0, 0, null);
            return;
        }

        const watts = Math.pow(vrms, 2) / z;
        const dbm = 10 * Math.log10(watts) + 30;
        const vp = vrms * Math.sqrt(2);
        const vpp = 2 * vp;

        updateOutputs(dbm, vpp, vp, null);
    }

    function calculateFromVpp() {
        const vpp = parseFloat(vppInput.value);
        const z = parseFloat(impedanceInput.value);
        if (isNaN(vpp) || isNaN(z)) return;

        if (vpp === 0) {
            updateOutputs(-Infinity, null, 0, 0);
            return;
        }

        const vp = vpp / 2;
        const vrms = vp / Math.sqrt(2);
        const watts = Math.pow(vrms, 2) / z;
        const dbm = 10 * Math.log10(watts) + 30;

        updateOutputs(dbm, null, vp, vrms);
    }

    function calculateFromVp() {
        const vp = parseFloat(vpInput.value);
        const z = parseFloat(impedanceInput.value);
        if (isNaN(vp) || isNaN(z)) return;

        if (vp === 0) {
            updateOutputs(-Infinity, 0, null, 0);
            return;
        }

        const vpp = vp * 2;
        const vrms = vp / Math.sqrt(2);
        const watts = Math.pow(vrms, 2) / z;
        const dbm = 10 * Math.log10(watts) + 30;

        updateOutputs(dbm, vpp, null, vrms);
    }

    dbmInput.addEventListener('input', calculateFromDbm);
    vrmsInput.addEventListener('input', calculateFromVrms);
    vppInput.addEventListener('input', calculateFromVpp);
    vpInput.addEventListener('input', calculateFromVp);
    
    impedanceInput.addEventListener('change', () => {
        if (dbmInput.value !== "") calculateFromDbm();
        else if (vrmsInput.value !== "") calculateFromVrms();
        else if (vppInput.value !== "") calculateFromVpp();
        else if (vpInput.value !== "") calculateFromVp();
    });

    resetBtn.addEventListener('click', () => {
        dbmInput.value = "";
        vppInput.value = "";
        vpInput.value = "";
        vrmsInput.value = "";
        impedanceInput.value = "50";
    });
});
