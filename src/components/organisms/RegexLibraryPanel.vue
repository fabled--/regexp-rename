<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import { ref, computed } from 'vue'
import type { RegexDef } from '@/types'

const { settings, saveSettings } = useSettings()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref<RegexDef>({
  id: '',
  name: '',
  pattern: '',
  replacement: '',
  sample: ''
})

const previewResult = computed(() => {
  const sample = form.value.sample || ''
  if (!form.value.pattern || !sample) return sample
  try {
    const re = new RegExp(form.value.pattern, 'g')
    return sample.replace(re, form.value.replacement)
  } catch (e) {
    return 'Invalid Regex'
  }
})

const openModal = (regex?: RegexDef) => {
  if (regex) {
    editingId.value = regex.id
    form.value = { ...regex, sample: regex.sample || '' }
  } else {
    editingId.value = null
    form.value = { id: `rx-${Date.now()}`, name: '', pattern: '', replacement: '', sample: '' }
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveRegex = async () => {
  if (!form.value.pattern) return
  
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
  if (!confirm('この正規表現をライブラリから削除しますか？')) return
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

    <div v-if="settings.regexLibrary.length === 0" class="text-center py-12 border border-dashed border-gray-200 rounded-lg text-gray-500">
      ライブラリが空です
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="regex in settings.regexLibrary" 
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
            <button @click="deleteRegex(regex.id)" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="削除">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
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
