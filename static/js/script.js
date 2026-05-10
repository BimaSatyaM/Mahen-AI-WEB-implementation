const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const attachmentPreview = document.getElementById('attachmentPreview');
const universalInput = document.getElementById('universalInput');

let attachedFiles = [];

window.onload = () => {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('msg', item.sender === 'user' ? 'user-msg' : 'ai-msg');
        div.innerHTML = item.sender === 'user' ? item.text : formatAIResponse(item.text);
        chatbox.appendChild(div);

        if (item.sender === 'ai') applySyntaxHighlight(div);
    });
    chatbox.scrollTop = chatbox.scrollHeight;
};

async function sendMessage() {
    const message = userInput.value.trim();
    const hasFiles = attachedFiles.length > 0;

    const hasPastedCode = typeof pastedCodeContent !== 'undefined' && pastedCodeContent !== "";

    if (!message && !hasFiles && !hasPastedCode) return;

    let userMessageHTML = '';
    let base64Images = [];
    let extractedTexts = "";
    let pdfDataToSend = null;

    if (hasFiles) {
        userMessageHTML += '<div class="flex flex-wrap gap-2 mb-2">';
        for (let file of attachedFiles) {
            if (file.type.startsWith('image/')) {
                const fileUrl = URL.createObjectURL(file);
                userMessageHTML += `<img src="${fileUrl}" class="max-w-[200px] rounded-lg border border-white/20 shadow-sm">`;
                const base64 = await new Promise(r => {
                    const rd = new FileReader();
                    rd.onload = () => r(rd.result);
                    rd.readAsDataURL(file);
                });
                base64Images.push(base64);
            } else {
                const doc = await processDocument(file);
                const icon = getDocIcon(file.name);

                userMessageHTML += `<div class="bg-blue-700/50 px-3 py-1.5 rounded-md text-sm border border-blue-400 flex items-center gap-2">
                                        <i class="${icon}"></i> ${file.name}
                                    </div>`;

                if (file.type === "application/pdf") {
                    pdfDataToSend = doc.data;
                } else {
                    extractedTexts += `\n\n[Isi Lampiran ${file.name}]:\n${doc.data}`;
                }
            }
        }
        userMessageHTML += '</div>';
    }

    if (hasPastedCode) {
        const lang = typeof detectLanguage === 'function' ? detectLanguage(pastedCodeContent) : 'CODE';

        userMessageHTML += `
            <div class="mb-2 w-full max-w-md bg-gray-900 rounded-lg overflow-hidden border border-white/10 shadow-sm cursor-pointer hover:border-blue-500/50 transition-all code-preview-card" 
                 data-full-code="${encodeURIComponent(pastedCodeContent)}"
                 onclick="openFullCodeFromElement(this)">
                <div class="p-3 max-h-32 overflow-hidden text-[11px] text-blue-300 font-mono opacity-80">
                    <pre class="whitespace-pre-wrap">${pastedCodeContent.substring(0, 300)}${pastedCodeContent.length > 300 ? '...' : ''}</pre>
                </div>
                <div class="bg-gray-800 px-2 py-1 flex justify-between items-center">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${lang}</span>
                    <span class="text-[9px] text-gray-500 italic">Click to expand</span>
                </div>
            </div>`;

        extractedTexts += `\n\n[Pasted Content]:\n${pastedCodeContent}`;
    }

    if (message) {
        const safeText = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        userMessageHTML += `<div>${safeText}</div>`;
    }

    addMessage(userMessageHTML, 'user');
    saveChatHistory(userMessageHTML, 'user');

    userInput.value = '';
    attachedFiles = [];
    attachmentPreview.innerHTML = '';

    if (hasPastedCode) removeCodePreview();

    const loadingId = addMessage('<i class="fa-solid fa-circle-notch animate-spin"></i> Memproses...', 'ai');

    try {
        const rawHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const chatContext = rawHistory.slice(-7, -1).map(msg => {
            return {
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text.replace(/<[^>]*>?/gm, '')
            };
        });

        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message + extractedTexts,
                images: base64Images,
                history: chatContext,
                pdf_data: pdfDataToSend
            })
        });

        const data = await res.json();
        const responseText = data.response || "Maaf, server sedang sibuk.";
        const targetDiv = document.getElementById(loadingId);
        targetDiv.innerHTML = formatAIResponse(responseText);
        applySyntaxHighlight(targetDiv);
        saveChatHistory(responseText, 'ai');

    } catch (err) {
        document.getElementById(loadingId).innerHTML = "Terjadi kesalahan koneksi.";
    }
    chatbox.scrollTop = chatbox.scrollHeight;
}

function addMessage(text, sender) {
    const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const div = document.createElement('div');
    div.id = id;
    div.classList.add('msg');

    if (sender === 'user') {
        div.classList.add('user-msg');
        div.innerHTML = text;
    } else {
        div.classList.add('ai-msg');
        div.innerHTML = text.includes('fa-spin') ? text : formatAIResponse(text);
    }

    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
    return id;
}

function saveChatHistory(text, sender) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ text, sender });
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function clearChat() {
    if (confirm("Apakah kamu ingin menghapus seluruh riwayat percakapan?")) {
        localStorage.removeItem('chatHistory');
        location.reload();
    }
}

function toggleMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('uploadMenu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
}

document.addEventListener('click', function (event) {
    const menu = document.getElementById('uploadMenu');
    if (menu && !menu.contains(event.target)) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }
});

function triggerUpload(filter) {
    universalInput.accept = filter;
    universalInput.click();

    const menu = document.getElementById('uploadMenu');
    menu.classList.add('hidden');
    menu.classList.remove('flex');
}

universalInput.addEventListener('change', function (e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (!attachedFiles.some(f => f.name === file.name)) {
            attachedFiles.push(file);
            renderAttachmentChip(file);
        }
    });
    this.value = '';
});

function renderAttachmentChip(file) {
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm border border-gray-200 shadow-sm animate-fadeIn';
    chip.id = `file-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let iconClass = 'fa-solid fa-file';
    if (file.type.startsWith('image/')) {
        iconClass = 'fa-solid fa-image text-blue-500';
    } else if (file.name.match(/\.(cpp|py|js|html|css|json)$/i)) {
        iconClass = 'fa-solid fa-code text-green-500';
    }

    chip.innerHTML = `
        <i class="${iconClass}"></i>
        <span class="max-w-[120px] truncate font-medium" title="${file.name}">${file.name}</span>
        <button onclick="removeAttachment('${file.name}')" class="text-gray-400 hover:text-red-500 ml-1">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    attachmentPreview.appendChild(chip);
}

window.removeAttachment = function (fileName) {
    attachedFiles = attachedFiles.filter(f => f.name !== fileName);
    const safeId = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const chip = document.getElementById(`file-${safeId}`);
    if (chip) chip.remove();
};

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function detectLanguage(text) {
    if (text.includes('include <') || text.includes('std::')) return 'CPP';
    if (text.includes('import ') || text.includes('def ')) return 'PY';
    if (text.includes('function') || text.includes('const ')) return 'JS';
    if (text.includes('<html>') || text.includes('</div>')) return 'HTML';
    if (text.includes('{') && text.includes(':')) return 'JSON';
    return 'TXT';
}

function showCodePreview(content) {
    pastedCodeContent = content;
    const previewArea = document.getElementById('codePreviewArea');
    const previewText = document.getElementById('codePreviewText');
    const typeLabel = document.getElementById('fileTypeCode');

    if (previewArea && previewText) {
        previewText.textContent = content.substring(0, 500) + (content.length > 500 ? "..." : "");
        if (typeLabel) {
            typeLabel.textContent = detectLanguage(content);
        }

        previewArea.classList.remove('hidden');
    }
}