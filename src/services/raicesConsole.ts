import { domainService } from '../core/ai/domain.service';
import { SemanticSearchService } from './semanticSearch';

export class RaicesConsoleService {
  private searchService: SemanticSearchService;

  constructor() {
    this.searchService = new SemanticSearchService();
  }

  /**
   * Limpieza de texto para eliminar ruidos de procesamiento de documentos.
   */
  private cleanText(text: string): string {
    return text ? text.replace(/\s+/g, ' ').trim() : "";
  }

  /**
   * Extracción técnica de referencias legales (Artículos/Parágrafos).
   */
  private extractLegalReference(text: string): string {
    if (!text) return "";
    const artMatch = text.match(/Artículo\s+\d+/i);
    const parMatch = text.match(/Parágrafo\s+\d+|Único/i);
    let ref = "";
    if (artMatch) ref += `${artMatch[0]} `;
    if (parMatch) ref += `en su ${parMatch[0]}`;
    return ref.trim();
  }

  /**
   * Genera el Marco de Referencia con enfoque de consultoría.
   */
  private sintetizarNormativa(contexto: string): string {
    const leyEncontrada = contexto.match(/Ley\s+\d+|Auto\s+\d+|Decreto\s+\d+|Sentencia\s+[A-Z]-\d+/i);
    const baseLegal = leyEncontrada ? leyEncontrada[0] : "la Normativa Nacional de Reparación";
    const detalleTecnico = this.extractLegalReference(contexto);

    return `*   **Garantizar** tu reconocimiento bajo el marco de la ${baseLegal} ${detalleTecnico ? `(${detalleTecnico})` : ''}.
*   **Asegurar** que tu condición de víctima en el exterior sea el eje central de tu proceso de reparación integral.
*   **Validar** tu historia a través de los mecanismos oficiales del Estado Colombiano.`;
  }

  /**
   * Hoja de ruta proactiva alineada a la gestión de víctimas.
   */
  private extraerPasosLogicos(): string {
    return `1.  **Localizar** tu consulado más cercano para iniciar o actualizar tu declaración ante el Registro Único de Víctimas (RUV).
2.  **Gestionar** la actualización de tus datos de contacto; esto es crítico para recibir notificaciones sobre tus medidas de indemnización.
3.  **Acceder** a las estrategias de acompañamiento psicosocial que el Estado dispone para la población en el exilio.`;
  }

  /**
   * Método principal que ensambla la respuesta de experto.
   */
  async ask(userQuery: string, corpus: any): Promise<string> {
    const validation = await domainService.validateQuery(userQuery);
    if (!validation.allowed) return `🌱 **RAÍCES:** ${validation.message}`;

    await this.searchService.init();
    const resultados = await this.searchService.search(userQuery, corpus, 5);

    if (!resultados || resultados.length === 0) {
      return "No he localizado el protocolo exacto en la base de conocimientos actual. Por favor, intenta reformular tu consulta.";
    }

    // --- MANEJO ROBUSTO DE DATOS ---
    let contextoBruto = "";
    let fuenteFinal = "Documento de Referencia RAÍCES";

    // Mapeo seguro de los resultados para evitar el SyntaxError
    const procesados = resultados.map(res => {
      let texto = "";
      let fuente = "";

      // Intentar extraer de metadata si existe y es string
      if (res.metadata) {
        try {
          const meta = typeof res.metadata === 'string' ? JSON.parse(res.metadata) : res.metadata;
          texto = meta.texto || meta.text || res.text || "";
          fuente = meta.fuente || meta.source || "Fuente Oficial";
        } catch (e) {
          // Si falla el parseo, usamos el texto directo del resultado
          texto = res.text || "";
          fuente = res.source || "Fuente Oficial";
        }
      } else {
        texto = res.text || "";
        fuente = res.source || "Fuente Oficial";
      }

      return { texto, fuente };
    });

    contextoBruto = procesados.map(p => p.texto).join(" ");
    fuenteFinal = procesados[0].fuente;

    return `
### 🏛️ MARCO DE REFERENCIA LEGAL Y TÉCNICO
${this.sintetizarNormativa(contextoBruto)}

### 🛠️ ACCIONES Y PROCEDIMIENTOS (HOJA DE RUTA)
${this.extraerPasosLogicos()}

### 🤝 PERSPECTIVA DE RESILIENCIA Y TEJIDO SOCIAL
Tu resiliencia es el motor de este instrumento. Según la **Metodología RAÍCES**, tu proceso de sanación y el reclamo de tus derechos son pasos fundamentales para reconstruir lo que el conflicto intentó fragmentar. Esta información es una herramienta para tu empoderamiento.

---
📍 *Documento de referencia: ${fuenteFinal}*
    `.trim();
  }
}

export const raicesConsole = new RaicesConsoleService();