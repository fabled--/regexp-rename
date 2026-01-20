import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/store/settings'

export function useSettings() {
  const store = useSettingsStore()
  const { settings } = storeToRefs(store)
  const { loadSettings, saveSettings } = store

  return {
    settings,
    loadSettings,
    saveSettings
  }
}
