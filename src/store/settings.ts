import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Settings, Step, RegexDef } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    groups: [],
    ungroupedSteps: [],
    activeGroupId: 'none',
    regexLibrary: []
  })

  const loadSettings = async () => {
    try {
      const data = await invoke<Settings>('load_settings')
      if (data) {
        settings.value = data
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      await invoke('save_settings', { settings: settings.value })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // 設定が変更されたら自動保存（オプション）
  // watch(settings, () => saveSettings(), { deep: true })

  return {
    settings,
    loadSettings,
    saveSettings
  }
})
