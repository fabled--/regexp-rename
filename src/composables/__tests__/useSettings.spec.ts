import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettings } from '@/composables/useSettings'
import { useSettingsStore } from '@/store/settings'

describe('useSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should return settings from store', () => {
    const store = useSettingsStore()
    const { settings } = useSettings()
    
    store.settings.activeGroupId = 'test-group'
    expect(settings.value.activeGroupId).toBe('test-group')
  })

  it('should call store methods', async () => {
    const store = useSettingsStore()
    const loadSpy = vi.spyOn(store, 'loadSettings').mockResolvedValue(undefined)
    const saveSpy = vi.spyOn(store, 'saveSettings').mockResolvedValue(undefined)
    
    const { loadSettings, saveSettings } = useSettings()
    
    await loadSettings()
    expect(loadSpy).toHaveBeenCalled()
    
    await saveSettings()
    expect(saveSpy).toHaveBeenCalled()
  })
})
