import { ref } from 'vue'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import type { RenameResult, Step, RegexDef, Group, RenameStep, NormalizationOptions } from '../types'

const hasUnsupportedLookaround = (pattern: string) => {
  return (
    pattern.includes('(?=') ||
    pattern.includes('(?!') ||
    pattern.includes('(?<=') ||
    pattern.includes('(?<!')
  )
}

const applyNormalization = (input: string, options: NormalizationOptions): string => {
  let s = input.normalize('NFKC')

  if (options.space) {
    s = s.replace(/\u3000/g, ' ')
    s = s.replace(/ +/g, ' ')
  }
  if (options.waveDash) {
    s = s.replace(/[〜∼～]/g, '～')
  }
  if (options.dash) {
    s = s.replace(/[‐‑–—―－]/g, '-')
  }
  if (options.middleDot) {
    s = s.replace(/[･··•]/g, '・')
  }
  if (options.brackets) {
    s = s.replace(/[（]/g, '(').replace(/[）]/g, ')')
  }
  if (options.colon) {
    s = s.replace(/[:]/g, '：')
  }
  if (options.slash) {
    s = s.replace(/[\/]/g, '／')
  }

  return s
}

export function useRename() {
  const selectedFiles = ref<string[]>([])
  const isRenaming = ref(false)

  const addFiles = (files: string[]) => {
    const existing = new Set(selectedFiles.value)
    files.forEach(f => {
      if (!existing.has(f)) {
        selectedFiles.value.push(f)
      }
    })
  }

  const removeFiles = (indices: number[]) => {
    const sortedIndices = [...indices].sort((a, b) => b - a)
    sortedIndices.forEach(i => {
      selectedFiles.value.splice(i, 1)
    })
  }

  const resolveNewName = (
    oldPath: string,
    steps: Step[],
    regexLibrary: RegexDef[],
    groups: Group[],
    normalization: NormalizationOptions
  ) => {
    const fileName = oldPath.split(/[/\\]/).pop() || ''
    const lastDot = fileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? fileName.slice(lastDot) : ''
    let stem = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName

    const flattenedSteps: RenameStep[] = []
    const resolveSteps = (currentSteps: Step[], visited: Set<string>) => {
      for (const step of currentSteps) {
        if (step.enabled === false) continue
        
        if (step.normalize) {
          flattenedSteps.push({ type: 'normalize' })
        } else if (step.regexId) {
          const rx = regexLibrary.find(r => r.id === step.regexId)
          if (rx) {
            flattenedSteps.push({ type: 'regex', pattern: rx.pattern, replacement: rx.replacement })
          }
        } else if (step.groupRefId) {
          if (visited.has(step.groupRefId)) continue
          const group = groups.find(g => g.id === step.groupRefId)
          if (group) {
            visited.add(step.groupRefId)
            resolveSteps(group.steps, visited)
          }
        }
      }
    }
    
    resolveSteps(steps, new Set())

    try {
      for (const step of flattenedSteps) {
        if (step.type === 'normalize') {
          stem = applyNormalization(stem, normalization)
        } else {
          const re = new RegExp(step.pattern, 'g')
          stem = stem.replace(re, step.replacement)
        }
      }
      return stem + ext
    } catch (error) {
      return fileName
    }
  }

  const executeRename = async (
    steps: Step[],
    regexLibrary: RegexDef[],
    groups: Group[],
    normalization: NormalizationOptions
  ) => {
    if (selectedFiles.value.length === 0) {
      await message('ファイルが選択されていません。', {
        title: 'リネームを実行できません',
        kind: 'warning'
      })
      return
    }

    if (steps.length === 0) {
      await message('リネーム手順（ステップ）が設定されていません。グループを選択するか、ステップを追加してください。', {
        title: 'リネームを実行できません',
        kind: 'warning'
      })
      return
    }

    const confirmed = await ask(`選択された ${selectedFiles.value.length} 個のファイルをリネームしますか？`, {
      title: 'リネームの確認',
      kind: 'warning',
      okLabel: '実行',
      cancelLabel: 'キャンセル'
    })

    if (!confirmed) return

    // 参照を解決してフラットな RenameStep リストを作成
    const flattenedSteps: RenameStep[] = []
    const resolveSteps = (currentSteps: Step[], visited: Set<string>) => {
      for (const step of currentSteps) {
        if (step.enabled === false) continue
        
        if (step.normalize) {
          flattenedSteps.push({ type: 'normalize' })
        } else if (step.regexId) {
          const rx = regexLibrary.find(r => r.id === step.regexId)
          if (rx) {
            flattenedSteps.push({ type: 'regex', pattern: rx.pattern, replacement: rx.replacement })
          }
        } else if (step.groupRefId) {
          if (visited.has(step.groupRefId)) continue // 循環参照防止
          const group = groups.find(g => g.id === step.groupRefId)
          if (group) {
            visited.add(step.groupRefId)
            resolveSteps(group.steps, visited)
          }
        }
      }
    }
    
    resolveSteps(steps, new Set())

    if (flattenedSteps.length === 0) {
      await message('有効なリネーム手順（ステップ）がありません。ステップが無効化されていないか確認してください。', {
        title: 'リネームを実行できません',
        kind: 'warning'
      })
      return
    }

    const unsupportedPatterns = flattenedSteps
      .filter((s): s is Extract<RenameStep, { type: 'regex' }> => s.type === 'regex')
      .map(s => s.pattern)
      .filter(p => hasUnsupportedLookaround(p))

    if (unsupportedPatterns.length > 0) {
      const lines = unsupportedPatterns
        .slice(0, 5)
        .map(p => p)
        .join('\n')
      const suffix = unsupportedPatterns.length > 5 ? `\n...and ${unsupportedPatterns.length - 5} more` : ''

      await message(
        `バックエンドの正規表現エンジンは look-around（先読み/後読み）に対応していません。\n\n対象パターン:\n${lines}${suffix}`,
        {
          title: 'リネームを実行できません',
          kind: 'warning'
        }
      )
      return
    }

    isRenaming.value = true
    try {
      const results = await invoke<RenameResult[]>('execute_rename_files', {
        files: selectedFiles.value,
        steps: flattenedSteps,
        normalization
      })

      const failed = results.filter(r => !r.success)
      if (failed.length > 0) {
        const lines = failed
          .slice(0, 10)
          .map(r => `${r.oldName}: ${r.error ?? 'unknown error'}`)
          .join('\n')
        const suffix = failed.length > 10 ? `\n...and ${failed.length - 10} more` : ''
        await message(`${failed.length} 件のリネームに失敗しました。\n\n${lines}${suffix}`, {
          title: 'リネーム結果',
          kind: 'warning'
        })
      }
      
      results.forEach((res: RenameResult) => {
        if (res.success && res.newName) {
          const idx = selectedFiles.value.findIndex((f: string) => f.endsWith(res.oldName))
          if (idx !== -1) {
            const oldPath = selectedFiles.value[idx]
            const lastSlash = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
            const dir = lastSlash !== -1 ? oldPath.substring(0, lastSlash + 1) : ''
            selectedFiles.value[idx] = dir + res.newName
          }
        }
      })
      
      return results
    } catch (error) {
      console.error('Rename failed:', error)
      await message(String(error), {
        title: 'リネームに失敗しました',
        kind: 'error'
      })
      throw error
    } finally {
      isRenaming.value = false
    }
  }

  return {
    selectedFiles,
    isRenaming,
    addFiles,
    removeFiles,
    resolveNewName,
    executeRename
  }
}
