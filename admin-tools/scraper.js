/**
 * RAÍCES Updater - Scraper
 * Busca documentos nuevos en portales oficiales
 * REQUIERE VALIDACIÓN HUMANA - NO PUBLICAR DIRECTO
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
import { subDays, parse, isAfter } from 'date-fns'

dotenv.config()

const SOURCES = JSON.parse(readFileSync('./sources.json', 'utf-8'))
const DAYS_LOOKBACK = parseInt(process.env.DAYS_LOOKBACK || '35')
const CUTOFF_DATE = subDays(new Date(), DAYS_LOOKBACK)

const KEYWORDS = {
  JURIDICO_JEP: process.env.KEYWORDS_JURIDICO.split(','),
  FINANZAS_PYMES: process.env.KEYWORDS_FINANZAS.split(','),
  PSICOSOCIAL: process.env.KEYWORDS_PSICOSOCIAL.split(','),
}

// Crea carpetas si no existen
if (!existsSync('./output')) mkdirSync('./output')
if (!existsSync('./output/pendientes_validacion')) mkdirSync('./output/pendientes_validacion')

/**
 * Descarga HTML y extrae links
 */
async function scrapeSource(source) {
  console.log(`\n🔍 Buscando en ${source.nombre}...`)
  const hallazgos = []

  try {
    const { data } = await axios.get(source.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'RAICES-Updater/1.0 (Investigación Académica; contacto: raices@app.com)'
      }
    })

    const $ = cheerio.load(data)
    const links = $(source.selector_links)

    links.each((i, el) => {
      const titulo = $(el).text().trim()
      const href = $(el).attr('href')
      const url = href.startsWith('http')? href : `${source.base_url}${href}`

      // Busca fecha si existe
      let fechaDoc = new Date()
      const fechaEl = $(el).closest('div').find(source.selector_fecha).first()
      if (fechaEl.length > 0) {
        try {
          fechaDoc = parse(fechaEl.text().trim(), source.formato_fecha, new Date())
        } catch (e) {
          // Si falla parse, asume reciente
        }
      }

      // Filtro 1: Fecha reciente
      if (!isAfter(fechaDoc, CUTOFF_DATE)) return

      // Filtro 2: Keywords relevantes
      const tituloLower = titulo.toLowerCase()
      const keywordsRelevantes = KEYWORDS[source.tipo]
      const esRelevante = keywordsRelevantes.some(kw => tituloLower.includes(kw))

      if (!esRelevante) return

      hallazgos.push({
        id: `${source.id}_${Date.now()}_${i}`,
        fuente: source.nombre,
        tipo: source.tipo,
        titulo,
        url,
        fecha_publicacion: fechaDoc.toISOString(),
        fecha_hallazgo: new Date().toISOString(),
        estado: 'PENDIENTE_VALIDACION',
        validado_por: null,
        aprobado: false,
        notas_legal: '',
        notas_psicosocial: '',
      })
    })

    console.log(` ✓ Encontrados ${hallazgos.length} documentos relevantes`)
    return hallazgos

  } catch (error) {
    console.error(` ✗ Error en ${source.nombre}:`, error.message)
    return []
  }
}

/**
 * Descarga PDF para revisión humana
 */
async function descargarPDF(hallazgo) {
  if (!hallazgo.url.endsWith('.pdf')) return null

  try {
    const response = await axios.get(hallazgo.url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const filename = `${hallazgo.id}.pdf`
    const filepath = join('./output/pendientes_validacion', filename)
    writeFileSync(filepath, response.data)

    return filename
  } catch (e) {
    console.error(` ✗ No se pudo descargar PDF: ${hallazgo.titulo}`)
    return null
  }
}

/**
 * Main
 */
async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('RAÍCES UPDATER - Búsqueda de Actualizaciones')
  console.log(`Buscando documentos desde: ${CUTOFF_DATE.toLocaleDateString('es-CO')}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  const todosHallazgos = []

  for (const source of SOURCES) {
    const hallazgos = await scrapeSource(source)

    // Descarga PDFs para revisión
    for (const h of hallazgos) {
      const pdfFile = await descargarPDF(h)
      if (pdfFile) h.archivo_local = pdfFile
      todosHallazgos.push(h)
    }
  }

  // Guarda reporte
  const timestamp = new Date().toISOString().split('T')[0]
  const reporteFile = `./output/reporte_${timestamp}.json`
  writeFileSync(reporteFile, JSON.stringify(todosHallazgos, null, 2))

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`✓ REPORTE GENERADO: ${reporteFile}`)
  console.log(`✓ Total documentos: ${todosHallazgos.length}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('⚠️ PASOS SIGUIENTES OBLIGATORIOS:')
  console.log('1. Abre el JSON y revisa cada documento')
  console.log('2. Descarga y lee los PDFs en./output/pendientes_validacion/')
  console.log('3. Llena checklist de validación humana (abajo)')
  console.log('4. SOLO después de aprobación legal + psicosocial, indexa')
  console.log('5. NUNCA publiques sin validación - es tu responsabilidad legal\n')
}

main()