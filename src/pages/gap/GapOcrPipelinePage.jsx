// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapOcrPipelinePage() {
  return (
    <GapFeaturePage
      title="OCR Pipeline"
      description="OCR Pipeline"
      slug="ocr-pipeline"
      aiResultKey="extraction"
      fields={[
  {
    "name": "pdfUrl",
    "label": "PDF URL",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "imageData",
    "label": "Image Data (base64 or description)",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
