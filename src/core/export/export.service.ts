/**
 * RAÍCES - Servicio de Exportación Segura
 * Genera PDF del historial de chat para la usuaria
 * Cumple Ley 1581 - Derecho de acceso y portabilidad
 * Formato trauma-informado: sin metadatos invasivos
 */

import jsPDF from 'jspdf'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getAllMessages, getCurrentSessionId } from '@/core/db/sqlite.service'
import { sha256 } from 'js-sha256'
import { getExportParams, getPaths } from '@/core/config/config.service'
import { logEvent } from '@/core/audit/audit.service';

const EXPORT = getExportParams()
const PATHS = getPaths()

interface ExportOptions {
  includeMetadata?: boolean
  shareAfterExport?: boolean
}

// ================================================================
// GENERACIÓN DE PDF
// ================================================================

/**
 * Genera PDF con el historial completo de conversaciones
 * Diseño trauma-informado: colores suaves, sin hora exacta, sin geolocalización
 */
export async function exportHistoryToPDF(options: ExportOptions = {}): Promise<string | null> {
  const { includeMetadata = false, shareAfterExport = true } = options

  try {
    console.log('[RAÍCES EXPORT] Iniciando exportación de historial...')

    // 1. Obtiene todos los mensajes de SQLCipher
    const messages = await getAllMessages()
    if (messages.length === 0) {
      console.warn('[RAÍCES EXPORT] No hay mensajes para exportar')
      return null
    }

    // 2. Crea documento PDF - formato carta
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    })

    // Paleta RAÍCES trauma-informada
const COLORS = EXPORT.COLORS;

    // 3. ENCABEZADO - Sin datos personales
    doc.setFillColor(COLORS.TERRACOTA)
    doc.rect(0, 0, 216, 25, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RAÍCES', 15, 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Registro de Orientación en Derechos', 15, 21)

    // Fecha de exportación - solo día, no hora exacta
    const fechaExport = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Exportado: ${fechaExport}`, 150, 15)

    // 4. NOTA LEGAL Y DE SEGURIDAD
let yPos = 35
doc.setFillColor(COLORS.OCRE) // ← Antes era .ocre
doc.setDrawColor(COLORS.OCRE) // ← Antes era .ocre
doc.roundedRect(10, yPos, 196, 22, 2, 2, 'FD')

doc.setTextColor(COLORS.OSCURO)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('AVISO IMPORTANTE', 15, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const aviso = [
      'Este documento contiene información sensible. Guárdalo en lugar seguro.',
      'RAÍCES no almacena tu nombre, cédula ni ubicación. Este registro es anónimo.',
      'Esta información NO reemplaza asesoría legal o psicosocial profesional.',
    ]
    doc.text(aviso, 15, yPos + 11)

    // 5. MENSAJES - Agrupados por día
    yPos = 65
    let currentDate = ''

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const msgDate = new Date(msg.timestamp).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Separador de día
      if (msgDate !== currentDate) {
        currentDate = msgDate
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }

        doc.setFillColor(COLORS.FONDO)
        doc.roundedRect(10, yPos, 196, 8, 1, 1, 'F')
        doc.setTextColor(COLORS.MEDIO)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(msgDate, 15, yPos + 5)
        yPos += 12
      }

      // Verifica si cabe en la página
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }

      // --- DECLARACIÓN DE VARIABLES DE CONTEXTO ---
      const isUserMsg = msg.isUser
      const xPos = isUserMsg ? 110 : 15
      const bubbleWidth = 90

      // Estilo de texto para cálculo de altura
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(msg.text, bubbleWidth - 10)
      const bubbleHeight = lines.length * 4 + 10

      // --- CONFIGURACIÓN DE COLORES (Tipado seguro) ---
if (isUserMsg) {
  doc.setFillColor(COLORS.TERRACOTA) // ← Antes .terracota
  doc.setDrawColor(COLORS.TERRACOTA)
  doc.setTextColor('#FFFFFF')
} else {
  doc.setFillColor('#FFFFFF')
  doc.setDrawColor(COLORS.OCRE)      // ← Antes .ocre
  doc.setTextColor(COLORS.OSCURO)    // ← Antes .oscuro
}

      // Dibujar Burbuja
      doc.roundedRect(xPos, yPos, bubbleWidth, bubbleHeight, 3, 3, 'FD')
      
      // Dibujar Texto
      doc.text(lines, xPos + 5, yPos + 7)

      // Fuente si existe (solo para RAÍCES)
if (!isUserMsg && msg.source) {
  doc.setFontSize(7)
  doc.setTextColor(COLORS.MEDIO)     // ← Antes .medio
  doc.text(`Fuente: ${msg.source}`, xPos + 5, yPos + bubbleHeight - 2)
}

      yPos += bubbleHeight + 5
    }

    // 6. PIE DE PÁGINA EN TODAS LAS PÁGINAS
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(COLORS.MEDIO)
      doc.text(
        `RAÍCES - Orientación en Derechos | Página ${i} de ${pageCount}`,
        15,
        272
      )

      if (includeMetadata) {
        const sessionId = getCurrentSessionId()
        const hash = sha256(JSON.stringify(messages)).substring(0, 8)
        doc.text(`ID: ${sessionId} | Verificación: ${hash}`, 150, 272)
      }
    }

    // 7. GUARDA PDF EN DIRECTORIO PRIVADO
    const fileName = `RAICES_Historial_${Date.now()}.pdf`
    
    const fileRelativePath = `${PATHS.EXPORTS_DIR}/${fileName}`

    // Obtenemos Base64 limpio para Capacitor
    const pdfBase64 = doc.output('datauristring').split(',')[1]

await Filesystem.writeFile({
path: fileRelativePath, 
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
})

// LEER: Usa la MISMA variable fileRelativePath
    const fileUri = await Filesystem.getUri({
      path: fileRelativePath,
      directory: Directory.Documents,
    })

    console.log('[RAÍCES EXPORT] PDF generado:', fileUri.uri)
console.log('--- BLINDAJE DE AUDITORÍA: Registrando exportación ---');
    // --- AUDITORÍA IDÓNEA: Registro de exportación ---
    await logEvent('EXPORT_PDF', { 
      severity: 'info', 
      metadata: { 
        messageCount: messages.length,
        shared: shareAfterExport 
      } 
    });
    // 8. COMPARTE SI SE SOLICITA
    if (shareAfterExport) {
      await Share.share({
        title: 'Historial RAÍCES',
        text: 'Registro de orientación en derechos generado por RAÍCES',
        url: fileUri.uri,
        dialogTitle: 'Compartir o guardar historial',
      })
    }

    return fileUri.uri

  } catch (error) {
    console.error('[RAÍCES EXPORT] Error al exportar:', error)
    return null
  }
}

// ================================================================
// EXPORTACIÓN JSON - Para portabilidad Ley 1581
// ================================================================

export async function exportHistoryToJSON(): Promise<string | null> {
  try {
    const messages = await getAllMessages()
    if (messages.length === 0) return null

    const cleanMessages = messages.map(m => ({
      text: m.text,
      isUser: m.isUser,
      timestamp: m.timestamp,
      source: m.source,
    }))

    const exportData = {
      app: 'RAÍCES',
      version: '1.0',
      exportedAt: Date.now(),
      messageCount: cleanMessages.length,
      messages: cleanMessages,
      checksum: sha256(JSON.stringify(cleanMessages)),
    }

    const fileName = `RAICES_Backup_${Date.now()}.json`
    await Filesystem.writeFile({
      path: `exports/${fileName}`,
      data: JSON.stringify(exportData, null, 2),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })

    const fileUri = await Filesystem.getUri({
      path: `exports/${fileName}`,
      directory: Directory.Documents,
    })

    // AUDITORÍA IDÓNEA: Registro de Backup (Derecho a Portabilidad)
    await logEvent('EXPORT_JSON', { 
      severity: 'info', 
      metadata: { messageCount: cleanMessages.length } 
    });

    return fileUri.uri

} catch (error: any) { // Agrega :any
    console.error('[RAÍCES EXPORT] Error al exportar JSON:', error);
    
    // AGREGA ESTO:
    await logEvent('ERROR_CRITICAL', { 
      severity: 'error',
      metadata: { context: 'EXPORT_JSON', error: error.message } 
    });

    return null;
  }
}

// ================================================================
// UTILIDADES
// ================================================================

export async function clearExports(): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: 'exports',
      directory: Directory.Documents,
      recursive: true,
    })
  } catch (error) {
    console.warn('[RAÍCES EXPORT] Carpeta de exports no existía')
  }
}