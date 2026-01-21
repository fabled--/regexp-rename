<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettings } from '@/composables/useSettings'
import type { Group, Step } from '@/types'
import { ask } from '@tauri-apps/plugin-dialog'

const { settings, saveSettings } = useSettings()

const activeGroup = computed(() => {
  if (settings.value.activeGroupId === 'none') return null
  return settings.value.groups.find(g => g.id === settings.value.activeGroupId) || null
})

const addGroup = async () => {
  const name = prompt('新しいグループ名を入力してください')
  if (!name) return
  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name,
    steps: [{ normalize: true, enabled: true }]
  }
  settings.value.groups.push(newGroup)
  settings.value.activeGroupId = newGroup.id
  await saveSettings()
}

const deleteGroup = async () => {
  if (!activeGroup.value) return
  const confirmed = await ask(`グループ「${activeGroup.value.name}」を削除しますか？`, {
    title: '削除の確認',
    kind: 'warning',
    okLabel: '削除',
    cancelLabel: 'キャンセル'
  })
  if (!confirmed) return
  
  settings.value.groups = settings.value.groups.filter(g => g.id !== settings.value.activeGroupId)
  settings.value.activeGroupId = 'none'
  await saveSettings()
}

const renameGroup = async () => {
  if (!activeGroup.value) return
  const newName = prompt('新しいグループ名を入力してください', activeGroup.value.name)
  if (!newName) return
  activeGroup.value.name = newName
  await saveSettings()
}

const removeStep = async (index: number) => {
  const steps = activeGroup.value ? activeGroup.value.steps : settings.value.ungroupedSteps
  const step = steps[index]
  const stepName = getStepName(step)
  const confirmed = await ask(`ステップ「${stepName}」を削除しますか？`, {
    title: '削除の確認',
    kind: 'warning',
    okLabel: '削除',
    cancelLabel: 'キャンセル'
  })
  if (!confirmed) return
  steps.splice(index, 1)
  await saveSettings()
}

const getRegexName = (regexId?: string) => {
  if (!regexId) return 'Unknown'
  return settings.value.regexLibrary.find(r => r.id === regexId)?.name || '名称未設定'
}

const selectedRegexId = ref('')
const selectedGroupRefId = ref('')

const addRegexToCurrent = async () => {
  if (!selectedRegexId.value) return
  const steps = activeGroup.value ? activeGroup.value.steps : settings.value.ungroupedSteps
  steps.push({ regexId: selectedRegexId.value, enabled: true })
  selectedRegexId.value = ''
  await saveSettings()
}

const addGroupRefToCurrent = async () => {
  if (!selectedGroupRefId.value) return
  const steps = activeGroup.value ? activeGroup.value.steps : settings.value.ungroupedSteps
  steps.push({ groupRefId: selectedGroupRefId.value, enabled: true })
  selectedGroupRefId.value = ''
  await saveSettings()
}

const availableGroupsForRef = computed(() => {
  return settings.value.groups.filter(g => g.id !== settings.value.activeGroupId)
})

const getStepName = (step: Step) => {
  if (step.normalize) {
    return '正規化 (NFKC)'
  }
  if (step.regexId) {
    return settings.value.regexLibrary.find(r => r.id === step.regexId)?.name || '名称未設定'
  }
  if (step.groupRefId) {
    return `グループ参照: ${settings.value.groups.find(g => g.id === step.groupRefId)?.name || '不明'}`
  }
  return 'Unknown'
}
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800 min-w-0 truncate">グループ編集</h2>
      <div class="flex gap-2 shrink-0">
        <button 
          @click="addGroup"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
        >
          グループ追加
        </button>
      </div>
    </div>

    <div class="flex items-center gap-4 mb-4">
      <div class="flex-1 min-w-0">
        <select 
          v-model="settings.activeGroupId"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          <option value="none">なし (個別ステップ)</option>
          <option v-for="group in settings.groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
      <button 
        @click="renameGroup"
        :disabled="settings.activeGroupId === 'none'"
        class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
      >
        名前変更
      </button>
      <button 
        @click.stop="deleteGroup"
        :disabled="settings.activeGroupId === 'none'"
        class="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
      >
        削除
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <select 
          v-model="selectedRegexId"
          class="flex-1 min-w-0 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
        >
          <option value="" disabled>正規表現を選択...</option>
          <option v-for="rx in settings.regexLibrary" :key="rx.id" :value="rx.id">
            {{ rx.name || '(名称未設定)' }}
          </option>
        </select>
        <button 
          @click="addRegexToCurrent"
          :disabled="!selectedRegexId"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
        >
          追加
        </button>
      </div>

      <div class="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
        <select 
          v-model="selectedGroupRefId"
          class="flex-1 min-w-0 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
        >
          <option value="" disabled>グループ参照を選択...</option>
          <option v-for="g in availableGroupsForRef" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>
        <button 
          @click="addGroupRefToCurrent"
          :disabled="!selectedGroupRefId"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
        >
          参照追加
        </button>
      </div>
    </div>

    <!-- Steps List -->
    <div class="space-y-3">
      <div v-if="(activeGroup ? activeGroup.steps : settings.ungroupedSteps).length === 0" 
           class="text-center py-12 border border-dashed border-gray-200 rounded-lg text-gray-500">
        ステップを登録してください
      </div>
      
      <div 
        v-for="(step, index) in (activeGroup ? activeGroup.steps : settings.ungroupedSteps)" 
        :key="index"
        class="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
      >
        <div class="flex items-center gap-4">
          <span class="text-xs font-bold text-gray-400">#{{ index + 1 }}</span>
          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">{{ getStepName(step) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            v-model="step.enabled" 
            @change="saveSettings"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          >
          <button @click.stop="removeStep(index)" class="text-red-400 hover:text-red-600 ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
