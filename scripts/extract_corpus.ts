### *CÓDIGO COMPLETO `extract_corpus.py`*
#!/usr/bin/env python3
"""
RAÍCES - Extractor de Texto para Corpus Soberano
Misión 5: Ciencia para la Paz - MinCiencias
Convierte PDFs de JEP/UARIV a.txt limpios para indexación RAG
"""

import os
import re
import glob
from pathlib import Path
import fitz  # PyMuPDF
import argparse

# ================================================================
# CONFIGURACIÓN
# ================================================================
CONFIG = {
    "INPUT_DIR": "docs/fuentes_raw",   # Aquí pones los PDFs descargados
    "OUTPUT_DIR": "docs/fuentes_txt",  # Aquí salen los.txt limpios
    "MIN_CHARS_PER_PAGE": 100,         # Descarta páginas casi vacías
}

# Patrones comunes de basura en PDFs de la JEP/UARIV para limpiar
JUNK_PATTERNS = [
    r"^\s*Página \d+ de \d+\s*$",           # "Página 1 de 15"
    r"^\s*www\.jep\.gov\.co\s*$",           # URLs en pie de página
    r"^\s*Bogotá D\.C\.,.*\d{4}\s*$",       # Fechas repetidas en header
    r"^\s*República de Colombia\s*$",       # Encabezado oficial
    r"^\s*Rama Judicial.*\s*$",             # Encabezado oficial
    r"^\s*-\s*\d+\s*-\s*$",                 # Números de página "- 1 -"
    r"^\s*$",                               # Líneas vacías
]

# ================================================================
# FUNCIONES
# ================================================================

def clean_text(text: str) -> str:
    """Limpia basura común de PDFs oficiales."""
    lines = text.split('\n')
    clean_lines = []

    for line in lines:
        line_stripped = line.strip()
        is_junk = False
        for pattern in JUNK_PATTERNS:
            if re.match(pattern, line_stripped, re.IGNORECASE):
                is_junk = True
                break
        if not is_junk and len(line_stripped) > 0:
            clean_lines.append(line_stripped)

    # Une líneas y elimina espacios múltiples
    cleaned = '\n'.join(clean_lines)
    cleaned = re.sub(r' +', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned) # Máx 2 saltos de línea
    return cleaned.strip()

def validate_filename(filename: str) -> bool:
    """Valida que el PDF siga el formato FUENTE_ANO_TEMA.pdf"""
    pattern = r"^[A-Z]+_\d{4}_[A-Za-z0-9_]+\.pdf$"
    if not re.match(pattern, filename):
        print(f"  ⚠️  AVISO: {filename} no sigue formato FUENTE_ANO_TEMA.pdf")
        print(f"      Ejemplo correcto: JEP_2018_Auto_004_Acreditacion.pdf")
        return False
    return True

def extract_pdf_to_txt(pdf_path: str, output_path: str) -> bool:
    """Extrae texto de un PDF y lo guarda como.txt limpio."""
    try:
        doc = fitz.open(pdf_path)
        full_text = []

        for page_num, page in enumerate(doc):
            text = page.get_text("text") # Extrae texto plano
            if len(text.strip()) > CONFIG['MIN_CHARS_PER_PAGE']:
                full_text.append(text)
            else:
                print(f"    - Página {page_num+1} descartada por poca info")

        if not full_text:
            print(f"  ❌ ERROR: No se extrajo texto útil de {Path(pdf_path).name}")
            return False

        # Unir todo y limpiar
        raw_text = "\n".join(full_text)
        clean = clean_text(raw_text)

        # Guardar
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(clean)

        print(f"  ✅ {Path(pdf_path).name} → {Path(output_path).name} | {len(clean)} chars")
        return True

    except Exception as e:
        print(f"  ❌ ERROR procesando {Path(pdf_path).name}: {e}")
        return False

# ================================================================
# MAIN
# ================================================================

def main():
    parser = argparse.ArgumentParser(description="Extractor Corpus RAÍCES")
    parser.add_argument("--force", action="store_true", help="Sobrescribe.txt existentes")
    args = parser.parse_args()

    print("[RAÍCES] Iniciando extracción de texto desde PDFs...")

    input_dir = Path(CONFIG['INPUT_DIR'])
    output_dir = Path(CONFIG['OUTPUT_DIR'])
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = glob.glob(str(input_dir / "*.pdf"))
    if not pdf_files:
        print(f"❌ No hay PDFs en {CONFIG['INPUT_DIR']}")
        print("   1. Descarga Autos JEP de: https://www.jep.gov.co/")
        print("   2. Renómbralos como: JEP_2018_Auto_004_Acreditacion.pdf")
        print("   3. Guárdalos en /docs/fuentes_raw/")
        return

    print(f"[1/2] Encontrados {len(pdf_files)} PDFs para procesar...")
    success = 0

    for pdf_path in pdf_files:
        pdf_name = Path(pdf_path).name
        txt_name = Path(pdf_path).stem + ".txt"
        txt_path = output_dir / txt_name

        print(f"\nProcesando: {pdf_name}")
        validate_filename(pdf_name)

        if txt_path.exists() and not args.force:
            print(f"  ⚠️  Ya existe {txt_name}. Usa --force para sobrescribir.")
            continue

        if extract_pdf_to_txt(pdf_path, str(txt_path)):
            success += 1

    print(f"\n[2/2] Extracción completada.")
    print(f"✅ Éxito: {success}/{len(pdf_files)} archivos convertidos a.txt")
    print(f"📂 Ubicación: {CONFIG['OUTPUT_DIR']}/")
    print("\nPróximo paso: docker compose run corpus python scripts/index_corpus.py --key $CORPUS_ENCRYPTION_KEY")

if __name__ == "__main__":
    main()