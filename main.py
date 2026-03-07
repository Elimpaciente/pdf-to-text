import io
import pypdf
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def root():
    return jsonify({
        "status_code": 200,
        "message": "PDF Extractor API",
        "endpoints": {
            "/pdf": "Extrae texto de un PDF - Enviar archivo en multipart/form-data con el campo 'pdf'"
        }
    })

@app.route("/pdf", methods=["POST"])
def extract_pdf():
    if "pdf" not in request.files:
        return jsonify({"status_code": 400, "message": "Falta el archivo en el campo 'pdf'"}), 400

    file = request.files["pdf"]

    if not file.filename.endswith(".pdf"):
        return jsonify({"status_code": 400, "message": "El archivo debe ser un PDF"}), 400

    try:
        reader = pypdf.PdfReader(io.BytesIO(file.read()))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

        return jsonify({"status_code": 200, "text": text})

    except Exception as e:
        return jsonify({"status_code": 500, "message": "Error procesando el PDF", "error": str(e)}), 500
