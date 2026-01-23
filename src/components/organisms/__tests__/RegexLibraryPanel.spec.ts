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
        { id: 'rx-1', name: 'one', pattern: 'a', replacement: 'b', tags: ['ep'] },
        { id: 'rx-2', name: 'two', pattern: 'c', replacement: 'd', tags: ['episode'] }
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

    const patternInput = wrapper.find('input[placeholder="(\\\\d{4})-(\\\\d{2})"]')
    const replacementInput = wrapper.find('input[placeholder="$1年$2月"]')
    const sampleInput = wrapper.find('input[placeholder="テスト用の文字列を入力..."]')

    expect(patternInput.exists()).toBe(true)
    expect(replacementInput.exists()).toBe(true)
    expect(sampleInput.exists()).toBe(true)

    await patternInput.setValue('(\\d{4})-(\\d{2})-(\\d{2})')
    await replacementInput.setValue('$1/$2/$3')
    await sampleInput.setValue('2025-12-25')
    await flushPromises()

    expect(wrapper.text()).toContain('$1:')
    expect(wrapper.text()).toContain('2025')
    expect(wrapper.text()).toContain('$2:')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('$3:')
    expect(wrapper.text()).toContain('25')
  })

  it('タグで絞り込みできる', async () => {
    ;({ default: RegexLibraryPanel } = await import('@/components/organisms/RegexLibraryPanel.vue'))

    const wrapper = mount(RegexLibraryPanel)

    expect(wrapper.text()).toContain('one')
    expect(wrapper.text()).toContain('two')

    const filterInput = wrapper.find('input[placeholder="タグを入力して絞り込み..."]')
    expect(filterInput.exists()).toBe(true)

    await filterInput.setValue('e')
    await filterInput.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    // 'e' 入力時は候補先頭が選択され Enter で追加される
    // ep / episode のどちらかが選択されるが、どちらの場合でも一覧は1件に絞られる
    const visible = settingsRef.value.regexLibrary.filter(r => wrapper.text().includes(r.name ?? ''))
    expect(visible.length).toBe(1)
  })
})
