import os
import json
import glob
import hashlib
from pathlib import Path
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from cryptography.fernet import Fernet
import argparse

# ================================================================
# CONFIGURACIÓN - Ajustar según necesidades del Macrocaso
# ================================================================
CONFIG = {
    "INPUT_DIR": "docs/fuentes_txt", # Carpeta con los.txt curados
    "OUTPUT_DIR": "src/assets/corpus", # Carpeta destino en la app
    "MODEL_NAME": "sentence-transformers/all-MiniLM-L6-v2", # 23MB, corre en CPU
    "CHUNK_SIZE": 500, # Tokens por chunk
    "CHUNK_OVERLAP": 50, # Solapamiento entre chunks
    "INDEX_NAME": "faiss_index.bin",
    "METADATA_NAME": "metadata.json",
    "CORPUS_NAME": "jep_m10_corpus.json.enc"
}

# ================================================================
# FUNCIONES AUXILIARES
# ================================================================

def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Parte texto en chunks con solapamiento para no perder contexto."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50: # Evitar chunks vacíos
            chunks.append(chunk)
    return chunks

def get_file_metadata(filepath: str) -> dict:
    """Extrae metadata del nombre del archivo. Formato: FUENTE_ANO_TEMA.txt"""
    filename = Path(filepath).stem
    parts = filename.split("_")
    return {
        "fuente_doc": parts[0] if len(parts) > 0 else "DESCONOCIDA",
        "ano": parts[1] if len(parts) > 1 else "0000",
        "tema": "_".join(parts[2:]) if len(parts) > 2 else "general",
        "archivo_origen": filename
    }

def encrypt_corpus(data: dict, key: str) -> bytes:
    """Cifra el corpus.json con Fernet/AES-128. La clave va en.env"""
    fernet = Fernet(key.encode())
    json_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
    return fernet.encrypt(json_bytes)

# ================================================================
# PROCESO PRINCIPAL
# ================================================================

def main():
    parser = argparse.ArgumentParser(description="Indexador Corpus RAÍCES")
    parser.add_argument("--key", required=True, help="Clave de cifrado Fernet desde.env")
    args = parser.parse_args()

    print("[RAÍCES] Iniciando indexación de corpus soberano...")

    # 1. CARGAR MODELO DE EMBEDDINGS
    print(f"[1/6] Cargando modelo {CONFIG['MODEL_NAME']}...")
    model = SentenceTransformer(CONFIG['MODEL_NAME'])

    # 2. LEER Y PROCESAR TODOS LOS.TXT
    print(f"[2/6] Leyendo archivos de {CONFIG['INPUT_DIR']}...")
    txt_files = glob.glob(f"{CONFIG['INPUT_DIR']}/*.txt")
    if not txt_files:
        raise FileNotFoundError(f"No hay.txt en {CONFIG['INPUT_DIR']}. Ejecuta primero extract_corpus.py")

    all_chunks = []
    all_metadata = []

    for txt_path in txt_files:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read()

        file_meta = get_file_metadata(txt_path)
        chunks = chunk_text(text, CONFIG['CHUNK_SIZE'], CONFIG['CHUNK_OVERLAP'])

        for i, chunk in enumerate(chunks):
            chunk_id = f"{file_meta['archivo_origen']}_chunk_{i}"
            all_chunks.append(chunk)
            all_metadata.append({
                "id": chunk_id,
                "texto": chunk,
                "fuente": f"{file_meta['fuente_doc']} {file_meta['ano']} - {file_meta['tema']}",
                "macrocaso": 10,
                "tema": file_meta['tema'],
                "hash": hashlib.sha256(chunk.encode()).hexdigest()[:16] # Para auditoría
            })

    print(f"[3/6] Total chunks generados: {len(all_chunks)}")

    # 3. GENERAR EMBEDDINGS
    print("[4/6] Generando embeddings... Esto tarda 2-5 min según CPU")
    embeddings = model.encode(all_chunks, show_progress_bar=True, batch_size=32)
    embeddings = np.array(embeddings).astype('float32')

    # 4. CREAR ÍNDICE FAISS
    print("[5/6] Creando índice FAISS...")
    dimension = embeddings.shape[1] # 384 para all-MiniLM-L6-v2
    index = faiss.IndexFlatL2(dimension) # L2 = distancia euclidiana
    index.add(embeddings)

    # 5. GUARDAR ARTEFACTOS
    print("[6/6] Guardando artefactos en /src/assets/corpus/...")
    os.makedirs(CONFIG['OUTPUT_DIR'], exist_ok=True)

    # 5.1 Guardar índice FAISS
    faiss.write_index(index, f"{CONFIG['OUTPUT_DIR']}/{CONFIG['INDEX_NAME']}")

    # 5.2 Guardar metadata sin cifrar para debug
    with open(f"{CONFIG['OUTPUT_DIR']}/{CONFIG['METADATA_NAME']}", 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, ensure_ascii=False, indent=2)

    # 5.3 Cifrar y guardar corpus completo
    corpus_dict = {"chunks": all_metadata, "version": "m10-v1.0.0"}
    encrypted_corpus = encrypt_corpus(corpus_dict, args.key)
    with open(f"{CONFIG['OUTPUT_DIR']}/{CONFIG['CORPUS_NAME']}", 'wb') as f:
        f.write(encrypted_corpus)

    print("\n [RAÍCES] Indexación completada con éxito.")
    print(f" - Índice: {CONFIG['OUTPUT_DIR']}/{CONFIG['INDEX_NAME']} ({os.path.getsize(os.path.join(CONFIG['OUTPUT_DIR'], CONFIG['INDEX_NAME']))/1024/1024:.1f} MB)")
    print(f" - Corpus cifrado: {CONFIG['OUTPUT_DIR']}/{CONFIG['CORPUS_NAME']}")
    print(f" - Total vectores: {index.ntotal}")
    print("\nPróximo paso: Compilar la app. El corpus ya está empaquetado.")

if __name__ == "__main__":
    main()
