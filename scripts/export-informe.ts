import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { logger } from '../src/core/config/config.service';
import { getAllMessages } from '../src/core/db/sqlite.service';
/**
 * PROTOCOLO DE EXPORTACIÓN SOBERANA - PROYECTO RAÍCES
 * Genera informes anónimos para trabajo de campo en Villavicencio.
 */

const CONFIG = {
  DB_PATH: path.join(process.cwd(), 'src/core/db/raices_local.db'),
  OUTPUT_DIR: path.join(process.cwd(), 'informes_campo'),
  // Lista de términos sensibles para anonimización automática
  SENSITIVE_PATTERNS: [/Diego/gi, /Martínez/gi, /Calle\s\d+/gi] 
};

async function exportarInforme() {
  try {
    logger.info('🚀 Iniciando protocolo de exportación de informes...');

    // 1. Asegurar carpeta de salida (Fuera de la raíz para evitar subidas accidentales)
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR);
    }

    // 2. Conexión a SQLite
    const db = await open({
      filename: CONFIG.DB_PATH,
      driver: sqlite3.Database
    });

    // 3. Consulta de sesiones y mensajes
    // Nota: Filtramos por el ID de sesión para el informe
    const sesiones = await db.all('SELECT id_sesion, fecha_inicio FROM sesiones');

    for (const sesion of sesiones) {
      const mensajes = await db.all(
        'SELECT role, content, timestamp FROM mensajes WHERE id_sesion = ? ORDER BY timestamp ASC',
        [sesion.id_sesion]
      );

      if (mensajes.length === 0) continue;

      // 4. Procesamiento y Anonimización
      let contenidoInforme = `--- INFORME DE CAMPO RAÍCES (HITO M10) ---\n`;
      contenidoInforme += `ID_CODIFICADO: ${sesion.id_sesion.substring(0, 8)}\n`; // Solo parte del ID
      contenidoInforme += `FECHA: ${sesion.fecha_inicio}\n`;
      contenidoInforme += `------------------------------------------\n\n`;

      mensajes.forEach(msg => {
        let textoLimpio = msg.content;
        
        // Aplicar filtros de anonimización
        CONFIG.SENSITIVE_PATTERNS.forEach(pattern => {
          textoLimpio = textoLimpio.replace(pattern, '[DATO_PROTEGIDO]');
        });

        contenidoInforme += `[${msg.role.toUpperCase()}] (${msg.timestamp}):\n${textoLimpio}\n\n`;
      });

      // 5. Escritura de archivo físico (CSV o TXT para ATLAS.ti)
      const fileName = `Informe_RAICES_${sesion.id_sesion.substring(0, 6)}.txt`;
      fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, fileName), contenidoInforme);
      
      logger.info(`✅ Generado: ${fileName}`);
    }

    await db.close();
    logger.info('--- PROCESO COMPLETADO: Informes listos para análisis ---');

  } catch (error) {
    logger.error('❌ Error en la exportación de informes:', error);
  }
}

exportarInforme();