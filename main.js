document.addEventListener('DOMContentLoaded', () => {
    const dbmInput = document.getElementById('dbm');
    const vppInput = document.getElementById('vpp');
    const vrmsInput = document.getElementById('vrms');
    const impedanceInput = document.getElementById('impedance');
    const resetBtn = document.getElementById('reset-btn');

    function calculateFromDbm() {
        const dbm = parseFloat(dbmInput.value);
        const z = parseFloat(impedanceInput.value);
        
        if (isNaN(dbm) || isNaN(z)) return;

        // P (Watts) = 10^((dBm - 30) / 10)
        const watts = Math.pow(10, (dbm - 30) / 10);
        
        // Vrms = sqrt(P * Z)
        const vrms = Math.sqrt(watts * z);
        
        // Vpp = 2 * sqrt(2) * Vrms
        const vpp = 2 * Math.sqrt(2) * vrms;

        vrmsInput.value = vrms.toFixed(4);
        vppInput.value = vpp.toFixed(4);
    }

    function calculateFromVrms() {
        const vrms = parseFloat(vrmsInput.value);
        const z = parseFloat(impedanceInput.value);
        
        if (isNaN(vrms) || isNaN(z) || vrms === 0) {
            if (vrms === 0) {
                dbmInput.value = "-Infinity";
                vppInput.value = "0";
            }
            return;
        }

        // P (Watts) = Vrms^2 / Z
        const watts = Math.pow(vrms, 2) / z;
        
        // dBm = 10 * log10(P) + 30
        const dbm = 10 * Math.log10(watts) + 30;
        
        // Vpp = 2 * sqrt(2) * Vrms
        const vpp = 2 * Math.sqrt(2) * vrms;

        dbmInput.value = dbm.toFixed(2);
        vppInput.value = vpp.toFixed(4);
    }

    function calculateFromVpp() {
        const vpp = parseFloat(vppInput.value);
        const z = parseFloat(impedanceInput.value);
        
        if (isNaN(vpp) || isNaN(z) || vpp === 0) {
            if (vpp === 0) {
                dbmInput.value = "-Infinity";
                vrmsInput.value = "0";
            }
            return;
        }

        // Vrms = Vpp / (2 * sqrt(2))
        const vrms = vpp / (2 * Math.sqrt(2));
        
        // P (Watts) = Vrms^2 / Z
        const watts = Math.pow(vrms, 2) / z;
        
        // dBm = 10 * log10(P) + 30
        const dbm = 10 * Math.log10(watts) + 30;

        dbmInput.value = dbm.toFixed(2);
        vrmsInput.value = vrms.toFixed(4);
    }

    dbmInput.addEventListener('input', calculateFromDbm);
    vrmsInput.addEventListener('input', calculateFromVrms);
    vppInput.addEventListener('input', calculateFromVpp);
    impedanceInput.addEventListener('input', () => {
        // If impedance changes, recalculate based on the last modified field.
        // For simplicity, we'll just recalculate from dBm if it has a value.
        if (dbmInput.value !== "") {
            calculateFromDbm();
        } else if (vrmsInput.value !== "") {
            calculateFromVrms();
        } else if (vppInput.value !== "") {
            calculateFromVpp();
        }
    });

    resetBtn.addEventListener('click', () => {
        dbmInput.value = "";
        vppInput.value = "";
        vrmsInput.value = "";
        impedanceInput.value = "50";
    });
});
