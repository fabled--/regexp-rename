import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/store/settings'
import { invoke } from '@tauri-apps/api/core'

// Tauriのinvokeをモック化
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should load settings from backend', async () => {
    const store = useSettingsStore()
    const mockData = {
      groups: [{ id: 'g1', name: 'Group 1', steps: [] }],
      ungroupedSteps: [],
      activeGroupId: 'g1',
      regexLibrary: []
    }
    
    vi.mocked(invoke).mockResolvedValue(mockData)

    await store.loadSettings()
    
    expect(invoke).toHaveBeenCalledWith('load_settings')
    expect(store.settings.groups).toHaveLength(1)
    expect(store.settings.activeGroupId).toBe('g1')
    expect(store.settings.normalization).toBeTruthy()
  })

  it('should save settings to backend', async () => {
    const store = useSettingsStore()
    store.settings.activeGroupId = 'test-id'
    
    vi.mocked(invoke).mockResolvedValue(undefined)

    await store.saveSettings()
    
    expect(invoke).toHaveBeenCalledWith('save_settings', { settings: store.settings })
  })

  it('should handle load error gracefully', async () => {
    const store = useSettingsStore()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(invoke).mockRejectedValue(new Error('Backend error'))

    try {
      await store.loadSettings()
    } finally {
      consoleErrorSpy.mockRestore()
    }
    
    // エラーでも初期値が維持されること
    expect(store.settings.groups).toHaveLength(0)
  })
})
