import { domainService } from '../core/ai/domain.service';
import { SemanticSearchService } from './semanticSearch';
import { buildHumanAnswer } from '../core/ai/responseBuilder';
import { MemoryService } from './memory.service';

// Estructura para asegurar compatibilidad de tipos en los resultados
interface ResultadoBusqueda {
  id: any;
  text: any;
  source: any;
  similarity: number;
  metadata?: any;
}

export class RaicesConsoleService {
  private searchService: SemanticSearchService;
  private memory = new MemoryService();

  constructor() {
    this.searchService = new SemanticSearchService();
  }

  /**
   * Método principal que coordina la validación, búsqueda y respuesta.
   * Centraliza la redacción en buildHumanAnswer para evitar duplicidad.
   */
  async ask(userQuery: string, corpus: any): Promise<string> {
    // 1. Validación de Seguridad: Protocolo obligatorio para MinCiencia
    const validation = await domainService.validateQuery(userQuery);
    if (!validation.allowed) return `🌱 **RAÍCES:** ${validation.message}`;

    // 2. Registro en Memoria conversacional (Entrada del usuario)
    this.memory.addUserMessage(userQuery);

    // 3. Inicialización y Búsqueda Semántica
    await this.searchService.init();
    const contextualQuery = this.memory.buildContextualQuery(userQuery);

    const resultadosRaw = await this.searchService.search(contextualQuery, corpus);
    const resultados = (resultadosRaw as any[] || []).slice(0, 3);

    // 4. Generación de Respuesta Única
    // Pasamos los resultados al Builder, que ahora contiene tu lógica de 
    // Marco Legal, Pasos Dinámicos y Guía de Acción.
    const respuestaFinal = buildHumanAnswer(resultados, userQuery);

    // 5. Registro en Memoria (Salida del asistente)
    this.memory.addAssistantMessage(respuestaFinal);

    return respuestaFinal;
  }
}

export const raicesConsole = new RaicesConsoleService();