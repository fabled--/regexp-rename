import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Settings, Step, RegexDef } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    groups: [],
    ungroupedSteps: [],
    activeGroupId: 'none',
    regexLibrary: [],
    normalization: {
      space: true,
      waveDash: true,
      dash: true,
      middleDot: true,
      brackets: true,
      colon: true,
      slash: true
    }
  })

  const loadSettings = async () => {
    try {
      const data = await invoke<Settings>('load_settings')
      if (data) {
        settings.value = {
          ...data,
          regexLibrary: (data.regexLibrary ?? []).map(r => ({
            ...r,
            tags: r.tags ?? []
          })),
          normalization: {
            space: data.normalization?.space ?? true,
            waveDash: data.normalization?.waveDash ?? true,
            dash: data.normalization?.dash ?? true,
            middleDot: data.normalization?.middleDot ?? true,
            brackets: data.normalization?.brackets ?? true,
            colon: data.normalization?.colon ?? true,
            slash: data.normalization?.slash ?? true
          }
        }
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
