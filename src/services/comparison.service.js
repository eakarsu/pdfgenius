const { diffLines, diffWords } = require('diff');
const { Document, DocumentPage, Comparison } = require('../models');

// Default model for semantic comparison — can be overridden via env
const SEMANTIC_MODEL = process.env.OPENROUTER_COMPARISON_MODEL ||
  process.env.OPENROUTER_MODEL ||
  'google/gemini-2.0-flash-001';

/**
 * Call OpenRouter for AI-powered semantic document comparison.
 * Returns a parsed object with added/removed/modified/structural sections.
 */
async function callSemanticComparisonAI(textA, textB) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const prompt = `You are an expert document analyst. Compare the following two documents and identify:
1. Added sections — content present in Document B but not in Document A
2. Removed sections — content present in Document A but not in Document B
3. Modified content — content that exists in both documents but has been changed (quote both versions)
4. Structural changes — differences in headings, numbering, layout, or document organisation

Return your analysis as valid JSON matching this schema:
{
  "summary": "<one-paragraph plain-English overview>",
  "addedSections": [{ "heading": "<section heading or description>", "excerpt": "<short quote from doc B>" }],
  "removedSections": [{ "heading": "<section heading or description>", "excerpt": "<short quote from doc A>" }],
  "modifiedContent": [{ "heading": "<section>", "original": "<text from A>", "revised": "<text from B>" }],
  "structuralChanges": ["<change description>"],
  "overallChangeLevel": "minor|moderate|significant|major"
}

--- DOCUMENT A ---
${textA.substring(0, 20000)}

--- DOCUMENT B ---
${textB.substring(0, 20000)}

Return only the JSON object, no markdown fences.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://pdfgenius.com',
      'X-Title': 'PDFGenius'
    },
    body: JSON.stringify({
      model: SEMANTIC_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter semantic comparison error: ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';

  // Try to parse as JSON; fall back to wrapping raw text
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw };
  } catch {
    return { summary: raw };
  }
}

class ComparisonService {
  /**
   * Compare two documents
   */
  async compareDocuments(userId, documentAId, documentBId, comparisonType = 'text') {
    // Get documents with their pages
    const [docA, docB] = await Promise.all([
      Document.findByPk(documentAId, { include: ['pages'] }),
      Document.findByPk(documentBId, { include: ['pages'] })
    ]);

    if (!docA || !docB) {
      throw new Error('One or both documents not found');
    }

    // Create comparison record
    const comparison = await Comparison.create({
      user_id: userId,
      document_a_id: documentAId,
      document_b_id: documentBId,
      comparison_type: comparisonType,
      status: 'processing'
    });

    try {
      let result;

      switch (comparisonType) {
        case 'text':
          result = await this.textComparison(docA, docB);
          break;
        case 'structural':
          result = await this.structuralComparison(docA, docB);
          break;
        case 'semantic':
          result = await this.semanticComparison(docA, docB);
          break;
        case 'full':
          result = await this.fullComparison(docA, docB);
          break;
        default:
          result = await this.textComparison(docA, docB);
      }

      await comparison.update({
        result,
        similarity_score: result.similarityScore,
        differences_count: result.differencesCount,
        status: 'completed'
      });

      return comparison;
    } catch (error) {
      await comparison.update({ status: 'failed' });
      throw error;
    }
  }

  /**
   * Text-based comparison using diff
   */
  async textComparison(docA, docB) {
    const textA = this.extractText(docA);
    const textB = this.extractText(docB);

    const lineDiff = diffLines(textA, textB);
    const wordDiff = diffWords(textA, textB);

    // Calculate similarity
    const totalChars = Math.max(textA.length, textB.length);
    let matchingChars = 0;

    for (const part of wordDiff) {
      if (!part.added && !part.removed) {
        matchingChars += part.value.length;
      }
    }

    const similarityScore = totalChars > 0 ? (matchingChars / totalChars) * 100 : 100;

    // Count differences
    const differencesCount = lineDiff.filter(p => p.added || p.removed).length;

    return {
      type: 'text',
      similarityScore: Math.round(similarityScore * 100) / 100,
      differencesCount,
      lineDiff: lineDiff.map(part => ({
        value: part.value,
        type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
      })),
      wordDiff: wordDiff.slice(0, 1000).map(part => ({
        value: part.value,
        type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
      })),
      documentA: {
        name: docA.original_name,
        pages: docA.total_pages,
        charCount: textA.length
      },
      documentB: {
        name: docB.original_name,
        pages: docB.total_pages,
        charCount: textB.length
      }
    };
  }

  /**
   * Structural comparison (page count, layout, etc.)
   */
  async structuralComparison(docA, docB) {
    const pagesA = docA.pages || [];
    const pagesB = docB.pages || [];

    const structureA = {
      pageCount: docA.total_pages,
      hasTable: pagesA.some(p => p.has_tables),
      hasForms: pagesA.some(p => p.has_forms),
      avgConfidence: this.calculateAvgConfidence(pagesA)
    };

    const structureB = {
      pageCount: docB.total_pages,
      hasTable: pagesB.some(p => p.has_tables),
      hasForms: pagesB.some(p => p.has_forms),
      avgConfidence: this.calculateAvgConfidence(pagesB)
    };

    // Calculate structural similarity
    let score = 100;
    if (structureA.pageCount !== structureB.pageCount) {
      score -= Math.abs(structureA.pageCount - structureB.pageCount) * 5;
    }
    if (structureA.hasTable !== structureB.hasTable) score -= 10;
    if (structureA.hasForms !== structureB.hasForms) score -= 10;

    score = Math.max(0, score);

    return {
      type: 'structural',
      similarityScore: score,
      differencesCount: score < 100 ? 1 : 0,
      structureA,
      structureB,
      differences: {
        pageCountDiff: Math.abs(structureA.pageCount - structureB.pageCount),
        tableDiff: structureA.hasTable !== structureB.hasTable,
        formsDiff: structureA.hasForms !== structureB.hasForms
      }
    };
  }

  /**
   * Semantic comparison using OpenRouter AI.
   * Extracts text from both documents, sends to the LLM, and returns
   * both the text-level visual diff and the AI semantic diff so callers
   * receive a complete picture.
   */
  async semanticComparison(docA, docB) {
    const textA = this.extractText(docA);
    const textB = this.extractText(docB);

    // Run text (visual) diff and AI semantic analysis in parallel
    const [textResult, aiSemanticResult] = await Promise.all([
      this.textComparison(docA, docB),
      callSemanticComparisonAI(textA, textB).catch(err => {
        console.error('AI semantic comparison failed, falling back to summary:', err.message);
        return { summary: this.generateComparisonSummary({ similarityScore: 0 }), error: err.message };
      })
    ]);

    return {
      type: 'semantic',
      similarityScore: textResult.similarityScore,
      differencesCount: textResult.differencesCount,
      // Visual/text diff (line-level)
      visualDiff: {
        lineDiff: textResult.lineDiff,
        wordDiff: textResult.wordDiff
      },
      // AI-powered semantic analysis
      semanticDiff: {
        summary: aiSemanticResult.summary || this.generateComparisonSummary(textResult),
        addedSections: aiSemanticResult.addedSections || [],
        removedSections: aiSemanticResult.removedSections || [],
        modifiedContent: aiSemanticResult.modifiedContent || [],
        structuralChanges: aiSemanticResult.structuralChanges || [],
        overallChangeLevel: aiSemanticResult.overallChangeLevel || 'unknown',
        aiError: aiSemanticResult.error || null
      },
      documentA: { name: docA.original_name, pages: docA.total_pages, charCount: textA.length },
      documentB: { name: docB.original_name, pages: docB.total_pages, charCount: textB.length }
    };
  }

  /**
   * Full comparison combining all methods (text, structural, semantic with AI).
   * Returns both visual diff (line/word) and AI semantic diff.
   */
  async fullComparison(docA, docB) {
    const [text, structural, semantic] = await Promise.all([
      this.textComparison(docA, docB),
      this.structuralComparison(docA, docB),
      this.semanticComparison(docA, docB)
    ]);

    const avgScore = (text.similarityScore + structural.similarityScore + semantic.similarityScore) / 3;

    return {
      type: 'full',
      similarityScore: Math.round(avgScore * 100) / 100,
      differencesCount: text.differencesCount,
      text,
      structural,
      // semantic includes both visualDiff and semanticDiff
      semantic
    };
  }

  /**
   * Extract text from document pages
   */
  extractText(doc) {
    if (!doc.pages || doc.pages.length === 0) {
      return '';
    }
    return doc.pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || '')
      .join('\n\n');
  }

  /**
   * Calculate average confidence score
   */
  calculateAvgConfidence(pages) {
    const scores = pages.filter(p => p.confidence_score).map(p => parseFloat(p.confidence_score));
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Generate comparison summary
   */
  generateComparisonSummary(textResult) {
    const score = textResult.similarityScore;
    if (score >= 95) return 'Documents are nearly identical';
    if (score >= 80) return 'Documents are very similar with minor differences';
    if (score >= 60) return 'Documents share significant content but have notable differences';
    if (score >= 40) return 'Documents have some similarities but differ substantially';
    return 'Documents are largely different';
  }

  /**
   * Extract themes (placeholder for AI analysis)
   */
  extractThemes(doc) {
    // In production, this would use NLP/AI
    return ['document', 'content', 'analysis'];
  }

  /**
   * Get comparison by ID
   */
  async getComparison(comparisonId) {
    return Comparison.findByPk(comparisonId, {
      include: ['documentA', 'documentB', 'user']
    });
  }

  /**
   * Get user's comparison history
   */
  async getUserComparisons(userId, limit = 20) {
    return Comparison.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      include: ['documentA', 'documentB']
    });
  }
}

module.exports = new ComparisonService();
