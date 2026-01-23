<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import { ref, computed } from 'vue'
import type { RegexDef } from '@/types'
import { ask } from '@tauri-apps/plugin-dialog'

const { settings, saveSettings } = useSettings()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref<RegexDef>({
  id: '',
  name: '',
  pattern: '',
  replacement: '',
  sample: '',
  tags: []
})

const tagInput = ref('')
const tagSuggestionIndex = ref(0)

const selectedFilterTags = ref<string[]>([])
const filterTagInput = ref('')
const filterTagSuggestionIndex = ref(0)

const normalizeTag = (tag: string) => tag.trim()

const uniqueTags = (tags: string[]) => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of tags) {
    const tt = normalizeTag(t)
    if (!tt) continue
    const key = tt.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tt)
  }
  return out
}

const allTags = computed(() => {
  const tags = settings.value.regexLibrary.flatMap(r => r.tags ?? [])
  return uniqueTags(tags).sort((a, b) => a.localeCompare(b))
})

const tagSuggestions = computed(() => {
  const q = tagInput.value.trim().toLowerCase()
  const selected = new Set((form.value.tags ?? []).map(t => t.toLowerCase()))
  const candidates = allTags.value.filter(t => !selected.has(t.toLowerCase()))
  if (!q) return candidates
  return candidates.filter(t => t.toLowerCase().includes(q))
})

const filterTagSuggestions = computed(() => {
  const q = filterTagInput.value.trim().toLowerCase()
  const selected = new Set(selectedFilterTags.value.map(t => t.toLowerCase()))
  const candidates = allTags.value.filter(t => !selected.has(t.toLowerCase()))
  if (!q) return []
  return candidates.filter(t => t.toLowerCase().includes(q))
})

const normalizeReplacementForJs = (replacement: string) => {
  return replacement.replace(/\$\{(\d+)\}/g, (_m, n) => `$${n}`)
}

const filteredRegexLibrary = computed(() => {
  const required = selectedFilterTags.value.map(t => t.toLowerCase())
  if (required.length === 0) return settings.value.regexLibrary
  return settings.value.regexLibrary.filter(r => {
    const tags = (r.tags ?? []).map(t => t.toLowerCase())
    return required.every(req => tags.includes(req))
  })
})

const previewResult = computed(() => {
  const sample = form.value.sample || ''
  if (!form.value.pattern || !sample) return sample
  try {
    const re = new RegExp(form.value.pattern, 'g')
    return sample.replace(re, normalizeReplacementForJs(form.value.replacement))
  } catch (e) {
    return 'Invalid Regex'
  }
})

const captureGroups = computed(() => {
  const sample = form.value.sample || ''
  if (!form.value.pattern || !sample) return null

  try {
    const re = new RegExp(form.value.pattern)
    const m = re.exec(sample)
    if (!m) return []
    if (m.length <= 1) return []
    return m.slice(1).map((value, idx) => ({
      index: idx + 1,
      value: value ?? ''
    }))
  } catch (e) {
    return null
  }
})

const groupColorClass = (index: number) => {
  const colors = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-amber-50 text-amber-800 border-amber-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200'
  ]
  return colors[(index - 1) % colors.length]
}

const openModal = (regex?: RegexDef) => {
  if (regex) {
    editingId.value = regex.id
    form.value = { ...regex, sample: regex.sample || '', tags: regex.tags ?? [] }
  } else {
    editingId.value = null
    form.value = {
      id: `rx-${Date.now()}`,
      name: '',
      pattern: '',
      replacement: '',
      sample: '',
      tags: uniqueTags(selectedFilterTags.value ?? [])
    }
  }
  tagInput.value = ''
  tagSuggestionIndex.value = 0
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const addTagToForm = async (tag: string) => {
  const t = normalizeTag(tag)
  if (!t) return
  form.value.tags = uniqueTags([...(form.value.tags ?? []), t])
  tagInput.value = ''
  tagSuggestionIndex.value = 0
}

const removeTagFromForm = async (tag: string) => {
  const key = tag.toLowerCase()
  form.value.tags = (form.value.tags ?? []).filter(t => t.toLowerCase() !== key)
}

const handleTagKeydown = async (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (tagSuggestions.value.length === 0) return
    tagSuggestionIndex.value = (tagSuggestionIndex.value + 1) % tagSuggestions.value.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (tagSuggestions.value.length === 0) return
    tagSuggestionIndex.value = (tagSuggestionIndex.value - 1 + tagSuggestions.value.length) % tagSuggestions.value.length
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (tagSuggestions.value.length > 0) {
      await addTagToForm(tagSuggestions.value[tagSuggestionIndex.value] ?? '')
      return
    }
    await addTagToForm(tagInput.value)
    return
  }
  if (e.key === 'Escape') {
    tagInput.value = ''
    tagSuggestionIndex.value = 0
    return
  }
  if (e.key === 'Backspace' && tagInput.value.length === 0) {
    const tags = form.value.tags ?? []
    if (tags.length === 0) return
    await removeTagFromForm(tags[tags.length - 1])
  }
}

const addFilterTag = async (tag: string) => {
  const t = normalizeTag(tag)
  if (!t) return
  selectedFilterTags.value = uniqueTags([...(selectedFilterTags.value ?? []), t])
  filterTagInput.value = ''
  filterTagSuggestionIndex.value = 0
}

const removeFilterTag = async (tag: string) => {
  const key = tag.toLowerCase()
  selectedFilterTags.value = (selectedFilterTags.value ?? []).filter(t => t.toLowerCase() !== key)
}

const handleFilterTagKeydown = async (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filterTagSuggestions.value.length === 0) return
    filterTagSuggestionIndex.value = (filterTagSuggestionIndex.value + 1) % filterTagSuggestions.value.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filterTagSuggestions.value.length === 0) return
    filterTagSuggestionIndex.value = (filterTagSuggestionIndex.value - 1 + filterTagSuggestions.value.length) % filterTagSuggestions.value.length
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (filterTagSuggestions.value.length > 0) {
      await addFilterTag(filterTagSuggestions.value[filterTagSuggestionIndex.value] ?? '')
      return
    }
    await addFilterTag(filterTagInput.value)
    return
  }
  if (e.key === 'Escape') {
    filterTagInput.value = ''
    filterTagSuggestionIndex.value = 0
    return
  }
  if (e.key === 'Backspace' && filterTagInput.value.length === 0) {
    const tags = selectedFilterTags.value ?? []
    if (tags.length === 0) return
    await removeFilterTag(tags[tags.length - 1])
  }
}

const saveRegex = async () => {
  if (!form.value.pattern) return

  form.value.tags = uniqueTags(form.value.tags ?? [])
  
  if (editingId.value) {
    const idx = settings.value.regexLibrary.findIndex(r => r.id === editingId.value)
    if (idx !== -1) settings.value.regexLibrary[idx] = { ...form.value }
  } else {
    settings.value.regexLibrary.push({ ...form.value })
  }
  
  await saveSettings()
  closeModal()
}

const deleteRegex = async (id: string) => {
  const confirmed = await ask('この正規表現をライブラリから削除しますか？', {
    title: '削除の確認',
    kind: 'warning',
    okLabel: '削除',
    cancelLabel: 'キャンセル'
  })
  if (!confirmed) return
  settings.value.regexLibrary = settings.value.regexLibrary.filter(r => r.id !== id)
  await saveSettings()
}

const addToActiveGroup = async (regexId: string) => {
  const activeGroup = settings.value.groups.find(g => g.id === settings.value.activeGroupId)
  const targetName = activeGroup ? activeGroup.name : '個別ステップ'
  const steps = activeGroup ? activeGroup.steps : settings.value.ungroupedSteps
  steps.push({ regexId, enabled: true })
  await saveSettings()
  alert(`「${targetName}」に正規表現を追加しました`)
}
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">正規表現ライブラリ</h2>
      <button 
        @click="openModal()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        新規作成
      </button>
    </div>

    <div v-if="settings.regexLibrary.length > 0" class="mb-4">
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">タグで絞り込み</div>
        <div class="relative">
          <div class="flex flex-wrap items-center gap-2 p-2 bg-white border border-gray-300 rounded-lg">
            <button
              v-for="t in selectedFilterTags"
              :key="t"
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs bg-blue-50 text-blue-700 border-blue-200"
              @click="removeFilterTag(t)"
              title="クリックで解除"
            >
              <span class="font-semibold">{{ t }}</span>
              <span class="text-blue-500">×</span>
            </button>
            <input
              v-model="filterTagInput"
              type="text"
              placeholder="タグを入力して絞り込み..."
              class="flex-1 min-w-0 text-sm outline-none"
              @keydown="handleFilterTagKeydown"
            >
          </div>

          <div
            v-if="filterTagInput.trim().length > 0 && filterTagSuggestions.length > 0"
            class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto"
          >
            <button
              v-for="(t, idx) in filterTagSuggestions"
              :key="t"
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
              :class="idx === filterTagSuggestionIndex ? 'bg-blue-50' : ''"
              @click="addFilterTag(t)"
            >
              {{ t }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="settings.regexLibrary.length === 0" class="text-center py-12 border border-dashed border-gray-200 rounded-lg text-gray-500">
      ライブラリが空です
    </div>

    <div v-else-if="filteredRegexLibrary.length === 0" class="text-center py-12 border border-dashed border-gray-200 rounded-lg text-gray-500">
      条件に一致する正規表現がありません
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="regex in filteredRegexLibrary" 
        :key="regex.id" 
        class="relative p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all group overflow-hidden"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="font-semibold text-gray-800 break-all pr-20">{{ regex.name || '(名称未設定)' }}</div>
          <div class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm pl-2 py-1 rounded-l-lg shadow-[-10px_0_15px_-5px_rgba(255,255,255,0.9)]">
            <button @click="addToActiveGroup(regex.id)" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="グループに追加">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
            </button>
            <button @click="openModal(regex)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="編集">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button @click.stop="deleteRegex(regex.id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="削除">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div v-if="(regex.tags ?? []).length > 0" class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="t in (regex.tags ?? [])"
            :key="t"
            class="inline-flex items-center px-2 py-1 rounded-md border text-xs bg-gray-50 text-gray-700 border-gray-200"
          >
            {{ t }}
          </span>
        </div>
        <div class="space-y-1">
          <div class="text-xs font-mono text-gray-500 break-all leading-relaxed"><span class="font-bold text-gray-400 mr-1">Pattern:</span>{{ regex.pattern }}</div>
          <div class="text-xs font-mono text-gray-500 break-all leading-relaxed"><span class="font-bold text-gray-400 mr-1">Replace:</span>{{ regex.replacement }}</div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-lg font-bold mb-4">{{ editingId ? '正規表現を編集' : '新規正規表現' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">名前 (任意)</label>
            <input v-model="form.name" type="text" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">検索パターン (正規表現)</label>
            <input v-model="form.pattern" type="text" class="w-full border rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(\d{4})-(\d{2})">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">置換文字列</label>
            <input v-model="form.replacement" type="text" class="w-full border rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="$1年$2月">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">タグ</label>
            <div class="relative">
              <div class="flex flex-wrap items-center gap-2 p-2 bg-white border border-gray-300 rounded-lg">
                <button
                  v-for="t in (form.tags ?? [])"
                  :key="t"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs bg-blue-50 text-blue-700 border-blue-200"
                  @click="removeTagFromForm(t)"
                  title="クリックで削除"
                >
                  <span class="font-semibold">{{ t }}</span>
                  <span class="text-blue-500">×</span>
                </button>
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="タグを追加..."
                  class="flex-1 min-w-0 text-sm outline-none"
                  @keydown="handleTagKeydown"
                >
              </div>

              <div
                v-if="tagSuggestions.length > 0 && tagInput.trim().length > 0"
                class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto"
              >
                <button
                  v-for="(t, idx) in tagSuggestions"
                  :key="t"
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                  :class="idx === tagSuggestionIndex ? 'bg-blue-50' : ''"
                  @click="addTagToForm(t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div class="mt-1 text-xs text-gray-400">Enterで追加、↑↓で候補選択、クリックで削除</div>
          </div>

          <!-- Sample Preview (Always shown) -->
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-4">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">サンプルプレビュー</label>
            <div class="flex flex-col gap-2">
              <input 
                v-model="form.sample" 
                type="text" 
                placeholder="テスト用の文字列を入力..."
                class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
              <div class="flex items-center gap-2 text-sm mt-1">
                <span class="text-gray-500">結果:</span>
                <span class="font-mono font-bold text-blue-600">{{ previewResult }}</span>
              </div>

              <div v-if="captureGroups && captureGroups.length > 0" class="mt-2">
                <div class="text-xs text-gray-500 mb-1">マッチグループ:</div>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="g in captureGroups"
                    :key="g.index"
                    class="inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-mono"
                    :class="groupColorClass(g.index)"
                  >
                    <span class="font-bold">${{ g.index }}:</span>
                    <span class="break-all">{{ g.value }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="captureGroups && captureGroups.length === 0" class="mt-2 text-xs text-gray-400">
                マッチグループはありません
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-8">
          <button @click="closeModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            キャンセル
          </button>
          <button @click="saveRegex" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
