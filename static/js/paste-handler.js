let pastedCodeContent = "";

function isCode(text) {
    const codePatterns = [
        /\{[\s\S]*\}/,
        /<\/?[a-z][\s\S]*>/i,
        /import\s+[\s\S]+from/,
        /function\s+\w+\s*\(|const\s+\w+\s*=/,
        /public\s+class\s+\w+/,
        /\w+\s*\(.*\)\s*\{/
    ];

    const lineCount = (text.match(/\n/g) || []).length;

    return codePatterns.some(pattern => pattern.test(text)) || lineCount > 3;
}

function showCodePreview(content) {
    pastedCodeContent = content;
    const previewArea = document.getElementById('codePreviewArea');
    const previewText = document.getElementById('codePreviewText');

    if (previewArea && previewText) {
        previewText.textContent = content.substring(0, 500) + (content.length > 500 ? "..." : "");
        previewArea.classList.remove('hidden');
        previewArea.classList.add('animate-fadeIn');
    }
}

function removeCodePreview() {
    pastedCodeContent = "";
    const previewArea = document.getElementById('codePreviewArea');
    if (previewArea) {
        previewArea.classList.add('hidden');
    }
}

document.getElementById('userInput').addEventListener('paste', (e) => {
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');

    if (isCode(pasteData)) {
        e.preventDefault();
        showCodePreview(pasteData);
    }
});

/**
 * Membuka Modal Full Code.
 * @param {string} content - Konten kode yang ingin ditampilkan
 */
function openFullCode(content = null) {
    const modal = document.getElementById('fullCodeModal');
    const fullText = document.getElementById('fullCodeContent');

    const codeToDisplay = content || pastedCodeContent;

    if (codeToDisplay && modal && fullText) {
        fullText.textContent = codeToDisplay;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modal.style.opacity = "1";
    } else {
        alert("Konten kode tidak ditemukan atau sudah terhapus.");
    }
}

function openFullCodeFromElement(element) {
    const encodedCode = element.getAttribute('data-full-code');
    if (encodedCode) {
        const decodedCode = decodeURIComponent(encodedCode);
        openFullCode(decodedCode);
    } else {
        console.error("Atribut data-full-code tidak ditemukan pada elemen.");
    }
}

function closeFullCode() {
    const modal = document.getElementById('fullCodeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const previewContainer = document.querySelector('#codePreviewArea .cursor-pointer');

    if (previewContainer) {
        previewContainer.onclick = () => {
            openFullCode(pastedCodeContent);
        };
    }

    const modalOverlay = document.getElementById('fullCodeModal');
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeFullCode();
        };
    }
});