import { useId, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import type { Project, Requirement } from '../types'
import { reinService } from '../services/reinService'
import { Action } from './shared'

export interface EntityEditor {
  kind: 'project' | 'requirement'
  project?: Project
  requirement?: Requirement
  projectId?: string
}
export function EntityDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: EntityEditor
  onClose: () => void
  onSaved: (result: {
    kind: 'project' | 'requirement'
    id: string
    projectId: string
    name: string
  }) => void
}) {
  const [name, setName] = useState(editor.project?.name ?? editor.requirement?.title ?? '')
  const [description, setDescription] = useState(
    editor.project?.description ?? editor.requirement?.description ?? '',
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fieldId = useId()
  const project = editor.kind === 'project'
  const editing = !!(editor.project || editor.requirement)
  const title = `${editing ? '编辑' : '新建'}${project ? '项目' : '需求'}`
  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      className="entity-dialog"
      aria-labelledby={`${fieldId}-title`}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          setError('')
          try {
            if (project) {
              const result = await reinService.saveProject({
                id: editor.project?.id,
                name,
                description,
              })
              onSaved({ kind: 'project', id: result.id, projectId: result.id, name: result.name })
            } else {
              const result = await reinService.saveRequirement(editor.projectId!, {
                id: editor.requirement?.id,
                name,
                description,
              })
              onSaved({
                kind: 'requirement',
                id: result.id,
                projectId: result.projectId,
                name: result.title,
              })
            }
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setSaving(false)
          }
        }}
      >
        <DialogTitle className="dialog-title" id={`${fieldId}-title`}>
          {title}
          <Action label={`关闭${title}`} icon="close" onClick={onClose} />
        </DialogTitle>
        <DialogContent className="entity-fields">
          <div className="entity-field">
            <label htmlFor={`${fieldId}-name`}>{project ? '项目名称' : '需求名称'}</label>
            <TextField
              id={`${fieldId}-name`}
              placeholder={project ? '输入项目名称' : '输入需求名称'}
              autoFocus
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
          </div>
          <div className="entity-field">
            <label htmlFor={`${fieldId}-description`}>描述</label>
            <TextField
              id={`${fieldId}-description`}
              placeholder={project ? '简要描述项目目标…' : '简要描述需求目标…'}
              multiline
              minRows={3}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </div>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions className="entity-actions">
          <Button variant="outlined" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>
            {saving ? '正在保存…' : editing ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
