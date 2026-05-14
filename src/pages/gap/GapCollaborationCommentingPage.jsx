// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCollaborationCommentingPage() {
  return (
    <GapFeaturePage
      title="Collaboration & Commenting"
      description="Collaboration & Commenting"
      slug="collaboration-commenting"
      aiResultKey="comment"
      fields={[
  {
    "name": "docId",
    "label": "Doc ID",
    "required": true,
    "placeholder": ""
  },
  {
    "name": "user",
    "label": "User",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "comment",
    "label": "Comment",
    "type": "textarea",
    "rows": 4,
    "required": false
  }
]}
    />
  )
}
