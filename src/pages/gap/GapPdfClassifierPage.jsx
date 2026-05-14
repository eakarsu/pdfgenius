// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapPdfClassifierPage() {
  return (
    <GapFeaturePage
      title="PDF Classifier"
      description="PDF Classifier"
      slug="pdf-classifier"
      aiResultKey="classification"
      fields={[
  {
    "name": "content",
    "label": "PDF Content / Summary",
    "type": "textarea",
    "rows": 4,
    "required": true
  }
]}
    />
  )
}
