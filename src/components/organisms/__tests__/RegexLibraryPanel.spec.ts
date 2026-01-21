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
    regexLibrary,
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

  it('サンプルプレビューでマッチグループを表示する', async () => {
    ;({ default: RegexLibraryPanel } = await import('@/components/organisms/RegexLibraryPanel.vue'))

    const wrapper = mount(RegexLibraryPanel)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(4)

    await inputs[1].setValue('(\\d{4})-(\\d{2})-(\\d{2})')
    await inputs[2].setValue('$1/$2/$3')
    await inputs[3].setValue('2025-12-25')
    await flushPromises()

    expect(wrapper.text()).toContain('$1:')
    expect(wrapper.text()).toContain('2025')
    expect(wrapper.text()).toContain('$2:')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('$3:')
    expect(wrapper.text()).toContain('25')
  })
})
