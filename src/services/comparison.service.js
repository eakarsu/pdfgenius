const { diffLines, diffWords } = require('diff');
const { Document, DocumentPage, Comparison } = require('../models');

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
   * Semantic comparison (would use AI in production)
   */
  async semanticComparison(docA, docB) {
    // In production, this would use AI embeddings
    // For now, use enhanced text comparison
    const textResult = await this.textComparison(docA, docB);

    return {
      type: 'semantic',
      similarityScore: textResult.similarityScore,
      differencesCount: textResult.differencesCount,
      summary: this.generateComparisonSummary(textResult),
      themes: {
        documentA: this.extractThemes(docA),
        documentB: this.extractThemes(docB)
      }
    };
  }

  /**
   * Full comparison combining all methods
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
