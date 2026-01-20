import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Settings, RegexDef } from '@/types'
import { ask } from '@tauri-apps/plugin-dialog'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn()
}))

describe('RegexLibraryPanel', () => {
  let settingsRef: Ref<Settings>
  let saveSettingsSpy: ReturnType<typeof vi.fn>
  let RegexLibraryPanel: typeof import('@/components/organisms/RegexLibraryPanel.vue')['default']

  const baseSettings = (regexLibrary: RegexDef[]): Settings => ({
    groups: [],
    ungroupedSteps: [],
    activeGroupId: 'none',
    regexLibrary
  })

  beforeEach(() => {
    vi.resetModules()

    saveSettingsSpy = vi.fn().mockResolvedValue(undefined)
    settingsRef = ref(
      baseSettings([
        { id: 'rx-1', name: 'one', pattern: 'a', replacement: 'b' },
        { id: 'rx-2', name: 'two', pattern: 'c', replacement: 'd' }
      ])
    )

    vi.doMock('@/composables/useSettings', () => ({
      useSettings: () => ({
        settings: settingsRef,
        saveSettings: saveSettingsSpy
      })
    }))

    vi.mocked(ask).mockReset()
  })

  it('キャンセルの場合は削除されず保存もしない', async () => {
    vi.mocked(ask).mockResolvedValue(false)

    ;({ default: RegexLibraryPanel } = await import('@/components/organisms/RegexLibraryPanel.vue'))

    const wrapper = mount(RegexLibraryPanel)

    const deleteButtons = wrapper.findAll('button[title="削除"]')
    expect(deleteButtons.length).toBe(2)

    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(settingsRef.value.regexLibrary.map(r => r.id)).toEqual(['rx-1', 'rx-2'])
    expect(saveSettingsSpy).not.toHaveBeenCalled()
  })

  it('OKの場合は削除され保存する', async () => {
    vi.mocked(ask).mockResolvedValue(true)

    ;({ default: RegexLibraryPanel } = await import('@/components/organisms/RegexLibraryPanel.vue'))

    const wrapper = mount(RegexLibraryPanel)

    const deleteButtons = wrapper.findAll('button[title="削除"]')
    expect(deleteButtons.length).toBe(2)

    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(settingsRef.value.regexLibrary.map(r => r.id)).toEqual(['rx-2'])
    expect(saveSettingsSpy).toHaveBeenCalledTimes(1)
  })
})
