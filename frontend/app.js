document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        srcLang: localStorage.getItem('srcLang') || 'cat_Latn',
        tgtLang: localStorage.getItem('tgtLang') || 'eng_Latn',
        isWorking: false,
        theme: localStorage.getItem('theme') || 'light',
        verifiedMode: localStorage.getItem('verifiedMode') === 'true',
        lastVerification: null
    };

    // --- DOM Elements ---
    const sourceTextarea = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const charCount = document.getElementById('char-count');
    const executionTime = document.getElementById('execution-time');
    const statusIndicator = document.getElementById('translation-status');
    const srcLangBtns = document.querySelectorAll('#src-langs .lang-btn');
    const tgtLangBtns = document.querySelectorAll('#tgt-langs .lang-btn');
    const swapBtn = document.getElementById('swap-languages');
    const clearBtn = document.getElementById('clear-text');
    const copyBtn = document.getElementById('copy-text');
    const themeToggle = document.getElementById('theme-toggle');
    const translateBtn = document.getElementById('translate-btn');

    // Zisk Elements
    const verifiedToggle = document.getElementById('verified-mode');
    const trustSealContainer = document.getElementById('trust-seal-container');
    const verifyModal = document.getElementById('verify-modal');
    const closeModal = document.querySelector('.close-modal');
    const verifySrc = document.getElementById('verify-src');
    const verifyTgt = document.getElementById('verify-tgt');
    const verifyProof = document.getElementById('verify-proof');
    const verifySubmitBtn = document.getElementById('verify-submit-btn');
    const verifyResult = document.getElementById('verify-result');
    const proofFileInput = document.getElementById('proof-file-input');

    // --- Initialization ---
    initApp();

    function initApp() {
        document.documentElement.setAttribute('data-theme', state.theme);
        updateActiveLangButtons();

        // Restore last text
        const lastText = localStorage.getItem('lastText');
        if (lastText) {
            sourceTextarea.value = lastText;
            updateCharCount();
        }

        // Restore verified mode state
        verifiedToggle.checked = state.verifiedMode;
    }

    // --- UI Updates ---
    function updateActiveLangButtons() {
        srcLangBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === state.srcLang);
        });
        tgtLangBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === state.tgtLang);
        });
    }

    function updateCharCount() {
        const len = sourceTextarea.value.length;
        charCount.textContent = `${len} / 5000`;
    }

    function setWorking(working) {
        state.isWorking = working;
        statusIndicator.textContent = working ? 'Translating...' : 'Ready';
        statusIndicator.classList.toggle('working', working);
        translateBtn.disabled = working;
        translateBtn.textContent = working ? (state.verifiedMode ? 'Certificando...' : 'Traduciendo...') : 'Traduir';
    }

    function setTrustSeal(isValid, certificateId = null) {
        console.log("setTrustSeal called:", { stateVerifiedMode: state.verifiedMode, hasLastVerification: !!state.lastVerification, isValid, certificateId });

        if (!state.verifiedMode || (!state.lastVerification && isValid !== 'loading')) {
            trustSealContainer.style.display = 'none';
            trustSealContainer.innerHTML = '';
            return;
        }

        trustSealContainer.style.display = 'block';

        if (isValid === 'loading') {
            trustSealContainer.innerHTML = `
                <div class="trust-seal" style="background: rgba(0,0,0,0.05); border: 1px dashed var(--border-color);">
                    <div class="seal-content">
                        <div class="status-indicator working"></div>
                        <span style="color: var(--text-secondary)">Generando certificado Zisk...</span>
                    </div>
                </div>
            `;
            return;
        }

        const sealClass = isValid ? 'valid' : 'invalid';
        const sealText = isValid ? 'Traducción verificada' : 'Texto modificado — Certificado inválido';
        const icon = isValid ?
            '<svg class="seal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
            '<svg class="seal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        trustSealContainer.innerHTML = `
            <div class="trust-seal ${sealClass}">
                <div class="seal-content">
                    ${icon}
                    <span>${sealText} ${certificateId ? `(ID: ${certificateId})` : ''}</span>
                </div>
                ${isValid ? `
                <div class="seal-actions">
                    <span class="seal-link" id="download-proof">Descargar</span>
                    <span class="seal-link" id="verify-now">Verificar</span>
                </div>` : ''}
            </div>
        `;

        // Add listeners to new elements
        if (isValid) {
            const dlBtn = document.getElementById('download-proof');
            const vBtn = document.getElementById('verify-now');
            if (dlBtn) dlBtn.addEventListener('click', downloadProof);
            if (vBtn) vBtn.addEventListener('click', () => {
                console.log("Opening verification portal with data:", state.lastVerification);
                verifySrc.value = sourceTextarea.value;
                verifyTgt.value = targetText.textContent;
                verifyProof.value = JSON.stringify(state.lastVerification, null, 2);
                verifyResult.style.display = 'none';
                verifyModal.style.display = 'flex';
            });
        }
    }

    function downloadProof() {
        if (!state.lastVerification) return;
        const data = {
            source: sourceTextarea.value,
            translation: targetText.textContent,
            certificate: state.lastVerification
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-certificate-${state.lastVerification.certificate_id}.json`;
        a.click();
    }

    // --- Translation Logic ---
    async function translate() {
        const text = sourceTextarea.value.trim();

        if (!text) {
            targetText.textContent = '';
            targetText.classList.add('placeholder');
            targetText.textContent = 'Translation will appear here';
            executionTime.textContent = '';
            state.lastVerification = null;
            setTrustSeal(false);
            return;
        }

        if (state.isWorking) return;

        localStorage.setItem('lastText', text);
        setWorking(true);

        // Show initial feedback in seal if verified mode is active
        if (state.verifiedMode) {
            trustSealContainer.style.display = 'block';
            trustSealContainer.innerHTML = `
                <div class="trust-seal" style="background: rgba(0,0,0,0.05);">
                    <div class="seal-content">
                        <div class="status-indicator working"></div>
                        <span>Generando certificado Zisk...</span>
                    </div>
                </div>
            `;
        } else {
            setTrustSeal(false);
        }

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    src_lang: state.srcLang,
                    tgt_lang: state.tgtLang,
                    verified_mode: state.verifiedMode
                })
            });

            if (!response.ok) throw new Error('Translation failed');

            const data = await response.json();

            targetText.innerText = data.translated_text; // use innerText to allow manual edits to be detected easily
            targetText.classList.remove('placeholder');
            executionTime.textContent = `${data.time_ms}ms`;

            if (data.verification) {
                console.log("Verification proof received:", data.verification);
                state.lastVerification = data.verification;
                setTrustSeal(true, data.verification.certificate_id);
            } else {
                console.log("No verification data received");
                state.lastVerification = null;
                setTrustSeal(false);
            }

        } catch (error) {
            console.error(error);
            targetText.textContent = 'Error: Could not connect to the translation server.';
            targetText.classList.add('placeholder');
        } finally {
            setWorking(false);
        }
    }

    // --- Verification Logic ---
    async function verifyProofSubmit() {
        const src = verifySrc.value;
        const tgt = verifyTgt.value;
        let proof;
        try {
            proof = JSON.parse(verifyProof.value);
        } catch (e) {
            showVerifyResult(false, 'Certificado JSON inválido');
            return;
        }

        try {
            const response = await fetch('/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    src_text: src,
                    tgt_text: tgt,
                    src_lang: state.srcLang, // simplified, in real app we'd get this from proof
                    tgt_lang: state.tgtLang,
                    proof_data: proof
                })
            });
            const data = await response.json();
            showVerifyResult(data.success, data.message);
        } catch (e) {
            showVerifyResult(false, 'Error de conexión');
        }
    }

    function showVerifyResult(success, message) {
        verifyResult.textContent = success ? `✅ ${message}` : `❌ ${message}`;
        verifyResult.style.display = 'block';
        verifyResult.style.backgroundColor = success ? '#d4edda' : '#f8d7da';
        verifyResult.style.color = success ? '#155724' : '#721c24';
    }

    // --- Event Listeners ---
    sourceTextarea.addEventListener('input', () => {
        updateCharCount();
        if (state.lastVerification) {
            setTrustSeal(false); // Invalidate if source changes after translation
        }
    });

    // Make target text editable for testing manipulation
    targetText.addEventListener('input', () => {
        if (state.lastVerification) {
            setTrustSeal(false);
        }
    });
    // For non-input elements, we can use an observer or just handle contenteditable if we had one.
    // Let's make it contenteditable to allow the user to "manipulate" it.
    targetText.setAttribute('contenteditable', 'true');

    verifiedToggle.addEventListener('change', (e) => {
        state.verifiedMode = e.target.checked;
        localStorage.setItem('verifiedMode', state.verifiedMode);
        console.log("Verified Mode toggled:", state.verifiedMode);

        if (!state.verifiedMode) {
            state.lastVerification = null;
            setTrustSeal(false);
        } else if (sourceTextarea.value.trim()) {
            translate(); // Trigger translation auto when toggled ON
        }
    });

    translateBtn.addEventListener('click', translate);

    srcLangBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.srcLang = btn.dataset.value;
            localStorage.setItem('srcLang', state.srcLang);
            updateActiveLangButtons();
        });
    });

    tgtLangBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.tgtLang = btn.dataset.value;
            localStorage.setItem('tgtLang', state.tgtLang);
            updateActiveLangButtons();
        });
    });

    swapBtn.addEventListener('click', () => {
        const temp = state.srcLang;
        state.srcLang = state.tgtLang;
        state.tgtLang = temp;

        const tempText = sourceTextarea.value;
        sourceTextarea.value = (targetText.textContent === 'Translation will appear here' || targetText.textContent === '') ? '' : targetText.textContent;
        targetText.textContent = tempText || 'Translation will appear here';

        localStorage.setItem('srcLang', state.srcLang);
        localStorage.setItem('tgtLang', state.tgtLang);

        updateActiveLangButtons();
        updateCharCount();
        state.lastVerification = null;
        setTrustSeal(false);
    });

    clearBtn.addEventListener('click', () => {
        sourceTextarea.value = '';
        updateCharCount();
        targetText.textContent = 'Translation will appear here';
        targetText.classList.add('placeholder');
        executionTime.textContent = '';
        state.lastVerification = null;
        setTrustSeal(false);
        sourceTextarea.focus();
    });

    copyBtn.addEventListener('click', () => {
        if (targetText.textContent && targetText.textContent !== 'Translation will appear here') {
            navigator.clipboard.writeText(targetText.textContent);
            copyBtn.style.color = 'var(--status-ready)';
            setTimeout(() => copyBtn.style.color = '', 1000);
        }
    });

    themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
        document.documentElement.setAttribute('data-theme', state.theme);
    });

    // Modal listeners
    closeModal.onclick = () => verifyModal.style.display = 'none';
    window.onclick = (e) => { if (e.target == verifyModal) verifyModal.style.display = 'none'; }
    verifySubmitBtn.addEventListener('click', verifyProofSubmit);

    // File Upload Handler
    proofFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target.result);
                // If it's a "package" (source + target + proof)
                if (content.source && content.translation && content.certificate) {
                    verifySrc.value = content.source;
                    verifyTgt.value = content.translation;
                    verifyProof.value = JSON.stringify(content.certificate, null, 2);
                } else {
                    // Just the proof
                    verifyProof.value = JSON.stringify(content, null, 2);
                }
                verifyResult.style.display = 'none';
            } catch (err) {
                alert('Error al carregar el fitxer JSON');
            }
        };
        reader.readAsText(file);
    });

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier && e.key === 'Enter') {
            e.preventDefault();
            translate();
        }
        if (modifier && e.key === 'l') {
            e.preventDefault();
            sourceTextarea.focus();
        }
        if (modifier && e.key === 'c' && document.activeElement !== sourceTextarea) {
            if (window.getSelection().toString() === '') {
                e.preventDefault();
                copyBtn.click();
            }
        }
    });
});
