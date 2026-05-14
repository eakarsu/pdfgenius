// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapEsignIntegrationPage() {
  return (
    <GapFeaturePage
      title="E-Signature Integration"
      description="E-Signature Integration"
      slug="esign-integration"
      aiResultKey="request"
      fields={[
  {
    "name": "docId",
    "label": "Doc ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "signerEmail",
    "label": "Signer Email",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}
