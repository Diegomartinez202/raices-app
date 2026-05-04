import { getRaicesDomains } from '@/core/config/config.service'
import { logEvent } from '@/core/audit/audit.service'

const DOMAINS = getRaicesDomains()

/**
 * Filtro de Seguridad Manual para RAÍCES
 * Controla que las preguntas del usuario estén dentro del marco de MinCiencia 2026-2.
 */
export class DomainService {
  
  private forbiddenKeywords = [
    'futbol', 'politica', 'presidente', 'elecciones', 'novela', 'farandula',
    'receta', 'cocina', 'bitcoin', 'cripto', 'precio', 'dolar',
    'mi caso', 'mi proceso', 'mi expediente', 'estado de mi solicitud',
  ]

  private allowedKeywords = [
    'jep', 'jurisprudencia', 'auto 004', 'acreditacion', 'victima', 'reparacion',
    'proyecto productivo', 'emprendimiento', 'pyme', 'microcredito', 'negocio',
    'resiliencia', 'apoyo', 'tejido humano', 'sanar', 'duelo', 'afrontamiento',
  ]

  /**
   * Valida si una consulta es apta para ser procesada.
   */
  async validateQuery(query: string): Promise<{ allowed: boolean; message?: string }> {
    const lowerQuery = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Quita tildes para comparar mejor

    // 1. Verificar palabras prohibidas (Bloqueo inmediato)
    if (this.forbiddenKeywords.some(kw => lowerQuery.includes(kw))) {
      await this.reportViolation(query, 'FORBIDDEN_KEYWORD');
      return { allowed: false, message: DOMAINS.REJECT_MESSAGE };
    }

    // 2. Verificar si pertenece a los dominios permitidos
    const hasAllowedKeyword = this.allowedKeywords.some(kw => lowerQuery.includes(kw));
    
    if (!hasAllowedKeyword) {
      await this.reportViolation(query, 'OUT_OF_DOMAIN');
      return { allowed: false, message: "Lo siento, como acompañante de RAÍCES solo puedo ayudarte con temas de la JEP, proyectos productivos o apoyo psicosocial." };
    }

    return { allowed: true };
  }

  private async reportViolation(query: string, reason: string) {
    await logEvent('QUERY_REJECTED_DOMAIN', {
      severity: 'info',
      metadata: { 
        query: query.substring(0, 100),
        reason: reason
      },
    });
  }
}

export const domainService = new DomainService();