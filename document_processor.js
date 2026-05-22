// Minimal DocumentProcessor stub — original module file was missing.
// Provides the API used by src/routes/document.routes.js.
class DocumentProcessor {
  // Drop empty/error pages. A page is "valid" when it has a `page` number
  // and `data` that is neither null nor an object with an `error` field.
  filterEmptyAndErrorDocs(jsonData) {
    if (!Array.isArray(jsonData)) return [];
    return jsonData.filter((p) => {
      if (!p || typeof p !== 'object') return false;
      if (p.page === undefined || p.page === null) return false;
      const d = p.data;
      if (d === null || d === undefined) return false;
      if (typeof d === 'object' && d.error) return false;
      if (typeof d === 'string' && d.trim() === '') return false;
      return true;
    });
  }
}

module.exports = DocumentProcessor;
