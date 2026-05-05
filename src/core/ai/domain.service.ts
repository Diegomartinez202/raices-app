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
    'invertir', 'bolsa de valores', 'trading', 'acciones', 'criptomonedas'
  ];

  private allowedKeywords = [
    // Eje Jurídico y Víctimas
    'jep', 'jurisprudencia', 'auto 004', 'acreditacion', 'victima', 'reparacion', 
    'ley 1448', 'articulo', 'indemnizacion', 'ruv', 'registro unico', 'derecho',
    
    // Eje Proyectos Productivos
    'proyecto productivo', 'emprendimiento', 'pyme', 'microcredito', 'negocio', 
    'fortalecimiento', 'sostenibilidad', 'economico', 'taller',
    
    // Eje Psicosocial (Ampliación técnica para evitar bloqueos)
    'resiliencia', 'apoyo', 'tejido humano', 'sanar', 'duelo', 'afrontamiento',
    'emocional', 'psicosocial', 'salud mental', 'recuperacion', 'acompañamiento',
    'estigmatizacion', 'redignificacion', 'estrategia', 'atencion', 'emociones'
  ];

/**
   * Valida si una consulta es apta para ser procesada.
   */
  async validateQuery(query: string): Promise<{ allowed: boolean; message?: string }> {
    const lowerQuery = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Quita tildes para comparar mejor

    // 1. Verificar palabras prohibidas (Bloqueo inmediato por seguridad)
    if (this.forbiddenKeywords.some(kw => lowerQuery.includes(kw))) {
      await this.reportViolation(query, 'FORBIDDEN_KEYWORD');
      
      return { 
        allowed: false, 
        message: `🛡️ **Consulta bloqueada por seguridad.** 

Has ingresado un término no permitido en este sistema. Para garantizar la precisión de la información, **RAÍCES** se especializa exclusivamente en:
• **Apoyo Psicosocial:** (Duelo, resiliencia, salud mental, acompañamiento emocional).
• **Temas Jurídicos:** (JEP, Ley 1448, reparación integral, derechos).
• **Proyectos Productivos:** (Emprendimiento, sostenibilidad, microcréditos).

*Por favor, evita términos financieros o ajenos a estos ejes para continuar.*`
      };
    }

    // 2. Verificar si pertenece a los dominios permitidos (Validación de alcance)
    const hasAllowedKeyword = this.allowedKeywords.some(kw => lowerQuery.includes(kw));
    
    if (!hasAllowedKeyword) {
      await this.reportViolation(query, 'OUT_OF_DOMAIN');
      
      return { 
        allowed: false, 
        message: `🛡️ **Consulta fuera de alcance técnico.** 

Para garantizar la precisión de la información, el sistema **RAÍCES** se especializa exclusivamente en:
• **Apoyo Psicosocial:** (Duelo, resiliencia, salud mental, acompañamiento emocional).
• **Temas Jurídicos:** (JEP, Ley 1448, reparación integral, derechos de las víctimas).
• **Proyectos Productivos:** (Emprendimiento, sostenibilidad, microcréditos).

*Por favor, replantea tu duda usando términos relacionados con estos ejes para poder ayudarte.*`
      };
    }

    // Si pasa ambas validaciones, se permite la consulta
    return { allowed: true };
  }

private async reportViolation(query: string, reason: string) {
  // 1. Esto guarda el evento en tu base de datos de auditoría/logs
  await logEvent('QUERY_REJECTED_DOMAIN', {
    severity: 'info',
    metadata: { 
      query: query.substring(0, 100),
      reason: reason
    },
  });

  // 2. 💡 AGREGA ESTO para ver el mensaje de auditoría en la terminal durante el test:
  console.log(`\n[AUDIT] QUERY_REJECTED_DOMAIN {
  query: '${query.substring(0, 100)}',
  reason: '${reason}'
}\n`);
}
}
export const domainService = new DomainService();