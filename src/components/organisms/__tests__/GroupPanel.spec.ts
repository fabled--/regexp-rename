import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Settings, RegexDef, Group } from '@/types'
import { ask } from '@tauri-apps/plugin-dialog'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn()
}))

describe('GroupPanel', () => {
  let settingsRef!: Ref<Settings>
  let saveSettingsSpy: ReturnType<typeof vi.fn>
  let GroupPanel: typeof import('@/components/organisms/GroupPanel.vue')['default']

  const baseSettings = (params: {
    groups: Group[]
    ungroupedSteps?: Settings['ungroupedSteps']
    activeGroupId?: string
    regexLibrary?: RegexDef[]
  }): Settings => ({
    groups: params.groups,
    ungroupedSteps: params.ungroupedSteps ?? [],
    activeGroupId: params.activeGroupId ?? 'none',
    regexLibrary: params.regexLibrary ?? [],
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
      baseSettings({
        groups: [
          {
            id: 'g1',
            name: 'Group 1',
            steps: [{ regexId: 'rx-1', enabled: true }, { regexId: 'rx-2', enabled: true }]
          }
        ],
        activeGroupId: 'g1',
        regexLibrary: [
          { id: 'rx-1', name: 'one', pattern: 'a', replacement: 'b' },
          { id: 'rx-2', name: 'two', pattern: 'c', replacement: 'd' }
        ]
      })
    )

    vi.doMock('@/composables/useSettings', () => ({
      useSettings: () => ({
        settings: settingsRef,
        saveSettings: saveSettingsSpy
      })
    }))

    vi.mocked(ask).mockReset()
  })

  it('ステップ削除: キャンセルの場合は削除されず保存もしない', async () => {
    vi.mocked(ask).mockResolvedValue(false)

    ;({ default: GroupPanel } = await import('@/components/organisms/GroupPanel.vue'))

    const wrapper = mount(GroupPanel)

    const deleteButtons = wrapper.findAll('button.text-red-400')
    expect(deleteButtons.length).toBeGreaterThan(0)

    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(settingsRef.value.groups[0].steps).toHaveLength(2)
    expect(saveSettingsSpy).not.toHaveBeenCalled()
  })

  it('ステップ削除: OKの場合は削除され保存する', async () => {
    vi.mocked(ask).mockResolvedValue(true)

    ;({ default: GroupPanel } = await import('@/components/organisms/GroupPanel.vue'))

    const wrapper = mount(GroupPanel)

    const deleteButtons = wrapper.findAll('button.text-red-400')
    expect(deleteButtons.length).toBeGreaterThan(0)

    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(settingsRef.value.groups[0].steps).toHaveLength(1)
    expect(saveSettingsSpy).toHaveBeenCalledTimes(1)
  })

  it('グループ削除: キャンセルの場合は削除されず保存もしない', async () => {
    vi.mocked(ask).mockResolvedValue(false)

    ;({ default: GroupPanel } = await import('@/components/organisms/GroupPanel.vue'))

    const wrapper = mount(GroupPanel)

    const deleteGroupButton = wrapper.find('button.bg-red-50')
    expect(deleteGroupButton.exists()).toBe(true)

    await deleteGroupButton.trigger('click')
    await flushPromises()

    expect(settingsRef.value.groups).toHaveLength(1)
    expect(settingsRef.value.activeGroupId).toBe('g1')
    expect(saveSettingsSpy).not.toHaveBeenCalled()
  })

  it('グループ削除: OKの場合は削除され保存する', async () => {
    vi.mocked(ask).mockResolvedValue(true)

    ;({ default: GroupPanel } = await import('@/components/organisms/GroupPanel.vue'))

    const wrapper = mount(GroupPanel)

    const deleteGroupButton = wrapper.find('button.bg-red-50')
    expect(deleteGroupButton.exists()).toBe(true)

    await deleteGroupButton.trigger('click')
    await flushPromises()

    expect(settingsRef.value.groups).toHaveLength(0)
    expect(settingsRef.value.activeGroupId).toBe('none')
    expect(saveSettingsSpy).toHaveBeenCalledTimes(1)
  })
})
