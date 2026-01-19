import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { RenameResult, Step, RegexDef, Group } from '../types'

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

  const resolveNewName = (oldPath: string, steps: Step[], regexLibrary: RegexDef[], groups: Group[]) => {
    const fileName = oldPath.split(/[/\\]/).pop() || ''
    const lastDot = fileName.lastIndexOf('.')
    const ext = lastDot !== -1 ? fileName.slice(lastDot) : ''
    let stem = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName

    const flattenedSteps: { pattern: string; replacement: string }[] = []
    const resolveSteps = (currentSteps: Step[], visited: Set<string>) => {
      for (const step of currentSteps) {
        if (step.enabled === false) continue
        
        if (step.regexId) {
          const rx = regexLibrary.find(r => r.id === step.regexId)
          if (rx) {
            flattenedSteps.push({ pattern: rx.pattern, replacement: rx.replacement })
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
        const re = new RegExp(step.pattern, 'g')
        stem = stem.replace(re, step.replacement)
      }
      return stem + ext
    } catch (error) {
      return fileName
    }
  }

  const executeRename = async (steps: Step[], regexLibrary: RegexDef[], groups: Group[]) => {
    if (selectedFiles.value.length === 0 || steps.length === 0) return

    // 参照を解決してフラットな RenameStep リストを作成
    const flattenedSteps: { pattern: string; replacement: string }[] = []
    const resolveSteps = (currentSteps: Step[], visited: Set<string>) => {
      for (const step of currentSteps) {
        if (step.enabled === false) continue
        
        if (step.regexId) {
          const rx = regexLibrary.find(r => r.id === step.regexId)
          if (rx) {
            flattenedSteps.push({ pattern: rx.pattern, replacement: rx.replacement })
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

    if (flattenedSteps.length === 0) return

    isRenaming.value = true
    try {
      const results = await invoke<RenameResult[]>('execute_rename_files', {
        files: selectedFiles.value,
        steps: flattenedSteps
      })
      
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
