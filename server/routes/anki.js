import { Router } from 'express'
import { generateTSV } from '../services/anki-export.js'
import { callClaude } from '../services/claude-service.js'
import { ENRICH_ANKI_SYSTEM, buildEnrichMessage } from '../prompts/enrich-anki.js'

const router = Router()

// POST /api/anki/export
// Body: { vocabulary: [...], phrases: [...], enrich: boolean }
// Returns: TSV file download
router.post('/export', async (req, res) => {
  try {
    const { vocabulary = [], phrases = [], enrich = false } = req.body

    let vocabEntries  = [...vocabulary]
    let phraseEntries = [...phrases]

    // Optionally enrich cards with German definitions via Claude
    if (enrich && vocabEntries.length + phraseEntries.length > 0) {
      const vocabTerms  = vocabEntries.map(e => e.Word  || e.word  || '').filter(Boolean)
      const phraseTerms = phraseEntries.map(e => e.Phrase || e.phrase || '').filter(Boolean)
      const allTerms    = [...vocabTerms, ...phraseTerms]

      if (allTerms.length > 0) {
        try {
          const enriched = await callClaude(ENRICH_ANKI_SYSTEM, buildEnrichMessage(allTerms))

          // Build lookup: lowercase term → definition
          const defMap = {}
          if (Array.isArray(enriched)) {
            for (const item of enriched) {
              if (item.term && item.definition) {
                defMap[item.term.toLowerCase()] = item.definition
              }
            }
          }

          vocabEntries = vocabEntries.map(e => {
            const key = (e.Word || e.word || '').toLowerCase()
            return defMap[key] ? { ...e, germanDefinition: defMap[key] } : e
          })

          phraseEntries = phraseEntries.map(e => {
            const key = (e.Phrase || e.phrase || '').toLowerCase()
            return defMap[key] ? { ...e, germanDefinition: defMap[key] } : e
          })
        } catch (enrichErr) {
          // Non-fatal: export without definitions and warn
          console.warn('[anki] Enrichment failed, exporting without definitions:', enrichErr.message)
        }
      }
    }

    const tsv      = generateTSV(vocabEntries, phraseEntries)
    const filename = `anki-export-${new Date().toISOString().slice(0, 10)}.tsv`

    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(tsv)
  } catch (err) {
    console.error('[anki] Export error:', err)
    res.status(500).json({ error: err.message || 'Export failed' })
  }
})

export default router
