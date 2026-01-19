document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        srcLang: localStorage.getItem('srcLang') || 'cat_Latn',
        tgtLang: localStorage.getItem('tgtLang') || 'eng_Latn',
        isWorking: false,
        theme: localStorage.getItem('theme') || 'light'
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
        translateBtn.textContent = working ? 'Traduciendo...' : 'Traducir';
    }

    // --- Translation Logic ---
    async function translate() {
        const text = sourceTextarea.value.trim();

        if (!text) {
            targetText.textContent = '';
            targetText.classList.add('placeholder');
            targetText.textContent = 'Translation will appear here';
            executionTime.textContent = '';
            return;
        }

        if (state.isWorking) return;

        localStorage.setItem('lastText', text);
        setWorking(true);

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    src_lang: state.srcLang,
                    tgt_lang: state.tgtLang
                })
            });

            if (!response.ok) throw new Error('Translation failed');

            const data = await response.json();

            targetText.textContent = data.translated_text;
            targetText.classList.remove('placeholder');
            executionTime.textContent = `${data.time_ms}ms`;

        } catch (error) {
            console.error(error);
            targetText.textContent = 'Error: Could not connect to the translation server. Please ensure the backend is running.';
            targetText.classList.add('placeholder');
        } finally {
            setWorking(false);
        }
    }

    // --- Event Listeners ---
    sourceTextarea.addEventListener('input', () => {
        updateCharCount();
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
    });

    clearBtn.addEventListener('click', () => {
        sourceTextarea.value = '';
        updateCharCount();
        targetText.textContent = 'Translation will appear here';
        targetText.classList.add('placeholder');
        executionTime.textContent = '';
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
