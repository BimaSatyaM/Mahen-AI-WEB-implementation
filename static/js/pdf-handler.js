/**
 * Fungsi untuk mengekstrak isi file (PDF atau Teks)
 * @param {File} file 
 * @returns {Promise<{name: string, data: string}>}
 */
async function processDocument(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (file.type === "application/pdf") {
            reader.onload = () => resolve({
                name: file.name,
                data: reader.result
            });
            reader.readAsDataURL(file);
        }

        else {
            reader.onload = () => resolve({
                name: file.name,
                data: reader.result
            });
            reader.readAsText(file);
        }

        reader.onerror = (err) => reject(err);
    });
}

function getDocIcon(fileName) {
    if (fileName.endsWith('.pdf')) return 'fa-solid fa-file-pdf text-red-500';
    if (fileName.match(/\.(cpp|py|js|html|css)$/i)) return 'fa-solid fa-code text-green-500';
    return 'fa-solid fa-file-lines text-blue-500';
}