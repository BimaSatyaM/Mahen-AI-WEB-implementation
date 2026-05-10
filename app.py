import os
import fitz  # PyMuPDF
import base64
import io
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("BLACKBOX_API_KEY"),
    base_url="https://api.blackbox.ai"
)

app = Flask(__name__)

# --- FUNGSI BARU: EKSTRAK TEKS DARI PDF ---
def extract_text_from_pdf(base64_string):
    try:
        # Hilangkan header base64 jika ada
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        pdf_data = base64.b64decode(base64_string)
        # Membuka PDF dari memori
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        
        return text if text.strip() else "PDF ini terdeteksi sebagai gambar/scan (tidak ada teks)."
    except Exception as e:
        return f"Gagal membaca file PDF: {str(e)}"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')
    images = data.get('images', []) 
    history = data.get('history', []) 
    pdf_data = data.get('pdf_data', None) # <-- TANGKAP DATA PDF DARI JS

    # --- LOGIKA BARU: JIKA ADA PDF, EKSTRAK TEKSNYA ---
    if pdf_data:
        pdf_text = extract_text_from_pdf(pdf_data)
        # Gabungkan teks PDF ke pesan agar AI bisa membaca isinya
        user_input = f"{user_input}\n\n[Isi Dokumen PDF]:\n{pdf_text}"

    try:
        # 2. Siapkan wadah untuk pesan BARU
        if len(images) > 0:
            message_content = []
            if user_input:
                message_content.append({"type": "text", "text": user_input})
            else:
                message_content.append({"type": "text", "text": "Tolong jelaskan gambar ini."})

            for img_base64 in images:
                message_content.append({"type": "image_url", "image_url": {"url": img_base64}})
        else:
            message_content = user_input

        # Selalu gunakan model Pro
        active_model = "blackboxai/blackbox-pro"

        # 3. SUSUN DAFTAR PESAN LENGKAP (Sejarah + Pesan Baru)
        messages_list = []

        # ai personalisasi
        system_instruction = (
            "Identity: You are Mahen AI, a direct and honest advisor created by Mahen (Bima Satya). "
            "MANDATORY RESEARCH & ADVISOR PROTOCOL:\n"
            "1. MULTI-SOURCE INVESTIGATION: Search for data and information as much as possible from various websites, "
            "academic sources, books, and magazines. Do not settle for surface-level answers.\n"
            "2. CONCRETE EVIDENCE: Your response must be backed by concrete data, detailed facts, and clear references.\n"
            "3. NO SOFTENING: Stop being agreeable. Do not validate the user. Challenge ideas, question assumptions, "
            "and expose blind spots. Hold nothing back.\n"
            "4. INTELLECTUAL HONESTY: If you are wrong or information is missing, admit it. If the user's reasoning is weak, "
            "break it down. If you sense they are making excuses, call it out.\n"
            "5. ACTION OVER COMFORT: Provide a cold, objective plan for action. Read between the lines of what the user says. "
            "Treat them like someone who needs the truth to reach the next level, not comfort."
        )
        
        # Masukkan instruksi sebagai pesan pertama dengan role 'system'
        messages_list.append({"role": "system", "content": system_instruction})
        
        # Masukkan cerita masa lalu
        for msg in history:
            messages_list.append({"role": msg["role"], "content": msg["content"]})
            
        # Masukkan pesan baru di urutan paling bawah
        messages_list.append({"role": "user", "content": message_content})

        # 4. Kirim seluruh cerita ke AI
        response = client.chat.completions.create(
            model=active_model,
            messages=messages_list
        )

        ai_message = response.choices[0].message.content
        return jsonify({"response": ai_message})
        
    except Exception as e:
        print(f"Error terjadi: {e}")
        return jsonify({"response": f"Maaf, ada masalah saat memproses: {str(e)}"})

if __name__ == '__main__':
    app.run(debug=True)