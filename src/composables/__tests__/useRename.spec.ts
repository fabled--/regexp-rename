import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRename } from '@/composables/useRename'
import type { Step, RegexDef, Group, NormalizationOptions } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { ask, message } from '@tauri-apps/plugin-dialog'

// Tauriのinvokeをモック化
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

// Tauriのaskをモック化
vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn()
  ,message: vi.fn()
}))

describe('useRename', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ask).mockResolvedValue(true) // デフォルトで確認OKとする
    vi.mocked(message).mockResolvedValue(null as any)
  })

  const { resolveNewName, executeRename, addFiles, selectedFiles } = useRename()

  const mockRegexLibrary: RegexDef[] = [
    { id: 'rx1', name: 'Date to Japanese', pattern: '(\\d{4})-(\\d{2})-(\\d{2})', replacement: '$1年$2月$3日' },
    { id: 'rx2', name: 'Prefix', pattern: '^', replacement: '[重要]_' }
  ]

  const mockNormalization: NormalizationOptions = {
    space: true,
    waveDash: true,
    dash: true,
    middleDot: true,
    brackets: true,
    colon: true,
    slash: true
  }

  const mockGroups: Group[] = [
    {
      id: 'g1',
      name: 'Combined',
      steps: [
        { regexId: 'rx1', enabled: true },
        { regexId: 'rx2', enabled: true }
      ]
    }
  ]

  it('should resolve new name correctly with simple regex', () => {
    const oldPath = 'C:/test/2023-12-25.txt'
    const steps: Step[] = [{ regexId: 'rx1', enabled: true }]
    
    const result = resolveNewName(oldPath, steps, mockRegexLibrary, mockGroups, mockNormalization)
    expect(result).toBe('2023年12月25日.txt')
  })

  it('should handle multiple steps', () => {
    const oldPath = '2023-12-25.txt'
    const steps: Step[] = [
      { regexId: 'rx1', enabled: true },
      { regexId: 'rx2', enabled: true }
    ]
    
    const result = resolveNewName(oldPath, steps, mockRegexLibrary, mockGroups, mockNormalization)
    expect(result).toBe('[重要]_2023年12月25日.txt')
  })

  it('should ignore disabled steps', () => {
    const oldPath = '2023-12-25.txt'
    const steps: Step[] = [
      { regexId: 'rx1', enabled: false },
      { regexId: 'rx2', enabled: true }
    ]
    
    const result = resolveNewName(oldPath, steps, mockRegexLibrary, mockGroups, mockNormalization)
    expect(result).toBe('[重要]_2023-12-25.txt')
  })

  it('should resolve nested group references', () => {
    const oldPath = '2023-12-25.txt'
    const nestedGroups: Group[] = [
      {
        id: 'g_parent',
        name: 'Parent Group',
        steps: [
          { groupRefId: 'g_child', enabled: true },
          { regexId: 'rx2', enabled: true }
        ]
      },
      {
        id: 'g_child',
        name: 'Child Group',
        steps: [
          { regexId: 'rx1', enabled: true }
        ]
      }
    ]
    const steps: Step[] = [{ groupRefId: 'g_parent', enabled: true }]
    
    const result = resolveNewName(oldPath, steps, mockRegexLibrary, nestedGroups, mockNormalization)
    expect(result).toBe('[重要]_2023年12月25日.txt')
  })

  it('should prevent infinite loops in group references', () => {
    const oldPath = 'file.txt'
    const circularGroups: Group[] = [
      {
        id: 'g1',
        name: 'Group 1',
        steps: [{ groupRefId: 'g2', enabled: true }]
      },
      {
        id: 'g2',
        name: 'Group 2',
        steps: [{ groupRefId: 'g1', enabled: true }]
      }
    ]
    const steps: Step[] = [{ groupRefId: 'g1', enabled: true }]
    
    const result = resolveNewName(oldPath, steps, mockRegexLibrary, circularGroups, mockNormalization)
    expect(result).toBe('file.txt')
  })

  it('should apply normalization step (NFKC + symbol rules)', () => {
    const oldPath = 'ＮＨＫ　2025:12-25.txt'
    const steps: Step[] = [{ normalize: true, enabled: true }]

    const result = resolveNewName(oldPath, steps, [], [], mockNormalization)
    expect(result).toBe('NHK 2025：12-25.txt')
  })

  it('should support ${n} replacement syntax in preview (resolveNewName)', () => {
    const oldPath = '20260116_ドラマ (ep:2) (station:MX).mkv'
    const regexLibrary: RegexDef[] = [
      {
        id: 'rx_ep_pad',
        name: 'ep pad',
        pattern: '(\\(ep[:：])(\\d)\\)([^0-9]|$)',
        replacement: '${1}0$2)$3'
      },
      {
        id: 'rx_ep_to_title',
        name: 'ep to title',
        pattern: '\\(ep[:：](\\d+)\\)',
        replacement: '第$1話'
      }
    ]
    const steps: Step[] = [
      { regexId: 'rx_ep_pad', enabled: true },
      { regexId: 'rx_ep_to_title', enabled: true }
    ]

    const result = resolveNewName(oldPath, steps, regexLibrary, [], mockNormalization)
    expect(result).toBe('20260116_ドラマ 第02話 (station:MX).mkv')
  })

  describe('file management', () => {
    it('should add unique files', () => {
      const { selectedFiles, addFiles } = useRename()
      addFiles(['file1.txt', 'file2.txt'])
      expect(selectedFiles.value).toHaveLength(2)
      
      addFiles(['file2.txt', 'file3.txt'])
      expect(selectedFiles.value).toHaveLength(3)
      expect(selectedFiles.value).toContain('file3.txt')
    })

    it('should remove files by indices', () => {
      const { selectedFiles, addFiles, removeFiles } = useRename()
      addFiles(['file1.txt', 'file2.txt', 'file3.txt'])
      
      removeFiles([0, 2]) // remove file1 and file3
      expect(selectedFiles.value).toHaveLength(1)
      expect(selectedFiles.value[0]).toBe('file2.txt')
    })
  })

  describe('executeRename', () => {
    it('should call backend and update selected files on success', async () => {
      const { selectedFiles, addFiles, executeRename } = useRename()
      addFiles(['C:/old/2023-01-01.txt'])
      
      const mockResults = [
        { success: true, oldName: '2023-01-01.txt', newName: '2023年01月01日.txt' }
      ]
      vi.mocked(invoke).mockResolvedValue(mockResults)

      const steps: Step[] = [{ regexId: 'rx1', enabled: true }]
      await executeRename(steps, mockRegexLibrary, mockGroups, mockNormalization)

      expect(invoke).toHaveBeenCalledWith('execute_rename_files', expect.anything())
      expect(selectedFiles.value[0]).toBe('C:/old/2023年01月01日.txt')
    })

    it('should not call backend when look-around is used', async () => {
      const { addFiles, executeRename } = useRename()
      addFiles(['C:/old/file.txt'])

      const lookaroundRegexLibrary: RegexDef[] = [
        {
          id: 'rx_la',
          name: 'lookaround',
          pattern: '(?=a)b',
          replacement: 'x'
        }
      ]
      const steps: Step[] = [{ regexId: 'rx_la', enabled: true }]

      await executeRename(steps, lookaroundRegexLibrary, [], mockNormalization)

      expect(invoke).not.toHaveBeenCalled()
      expect(message).toHaveBeenCalled()
    })

    it('should handle backend error', async () => {
      const { addFiles, executeRename } = useRename()
      addFiles(['file.txt'])

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(invoke).mockRejectedValue(new Error('Rename failed'))

      const steps: Step[] = [{ regexId: 'rx1', enabled: true }]

      try {
        await expect(executeRename(steps, mockRegexLibrary, mockGroups, mockNormalization)).rejects.toThrow('Rename failed')
      } finally {
        consoleErrorSpy.mockRestore()
      }
    })
  })
})
