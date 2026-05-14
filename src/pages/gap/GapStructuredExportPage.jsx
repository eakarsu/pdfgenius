// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapStructuredExportPage() {
  return (
    <GapFeaturePage
      title="Structured-Data Export Agent"
      description="Structured-Data Export Agent"
      slug="structured-export"
      aiResultKey="json"
      fields={[
  {
    "name": "schema",
    "label": "JSON Schema",
    "type": "textarea",
    "rows": 4,
    "required": false
  },
  {
    "name": "content",
    "label": "PDF Content",
    "type": "textarea",
    "rows": 4,
    "required": true
  }
]}
    />
  )
}
