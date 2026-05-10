marked.setOptions({
    headerIds: false,
    mangle: false,
    breaks: true,
    sanitize: false
});

Prism.manual = true;

/**
 * Fungsi pembantu untuk memproses Markdown dan Highlight sekaligus
 * @param {string} text - Teks mentah dari AI
 * @returns {string} - HTML yang sudah rapi
 */
function formatAIResponse(text) {
    return marked.parse(text);
}

/**
 * Fungsi untuk mentrigger pewarnaan kode pada elemen tertentu
 * @param {HTMLElement} element - Elemen bubble chat AI yang baru muncul
 */
function applySyntaxHighlight(element) {
    if (!window.Prism) return;

    const preElements = element.querySelectorAll('pre');

    preElements.forEach((pre) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';

        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';

        button.addEventListener('click', async () => {
            const code = pre.querySelector('code').innerText;
            try {
                await navigator.clipboard.writeText(code);
                button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                button.classList.add('copied');

                setTimeout(() => {
                    button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                    button.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Gagal menyalin:', err);
            }
        });

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(button);
    });

    Prism.highlightAllUnder(element);
}