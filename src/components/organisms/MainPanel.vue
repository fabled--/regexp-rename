<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import { useRename } from '@/composables/useRename'
import { listen } from '@tauri-apps/api/event'
import { onMounted } from 'vue'

const { settings } = useSettings()
const { selectedFiles, addFiles, removeFiles, executeRename, isRenaming, resolveNewName } = useRename()

// ファイルドロップのハンドリング（Tauriのイベントを使用）
onMounted(async () => {
  await listen('tauri://drag-drop', (event: any) => {
    const paths = event.payload.paths as string[]
    if (paths && paths.length > 0) {
      addFiles(paths)
    }
  })
})

const handleRename = async () => {
  const activeGroup = settings.value.groups.find(g => g.id === settings.value.activeGroupId)
  const steps = activeGroup ? activeGroup.steps : settings.value.ungroupedSteps
  await executeRename(steps, settings.value.regexLibrary, settings.value.groups)
}

const getPreviewName = (file: string) => {
  const activeGroup = settings.value.groups.find(g => g.id === settings.value.activeGroupId)
  const steps = activeGroup ? activeGroup.steps : settings.value.ungroupedSteps
  return resolveNewName(file, steps, settings.value.regexLibrary, settings.value.groups)
}
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">メイン操作</h2>
      <div class="flex items-center gap-4">
        <label class="text-sm font-semibold text-gray-700">正規表現グループ</label>
        <select 
          v-model="settings.activeGroupId"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[150px]"
        >
          <option value="none">なし</option>
          <option v-for="group in settings.groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Dropzone -->
    <div 
      class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer mb-6"
    >
      <div v-if="selectedFiles.length === 0">
        <p class="text-gray-500">ここにファイルをドロップして追加</p>
      </div>
      <div v-else class="text-left max-h-60 overflow-y-auto">
        <div v-for="(file, index) in selectedFiles" :key="file" class="flex flex-col py-2 border-b border-gray-100 last:border-0">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-400 truncate flex-1 mr-4">{{ file.split(/[/\\]/).pop() }}</span>
            <button @click.stop="removeFiles([index])" class="text-red-400 hover:text-red-600 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span class="text-sm font-semibold text-blue-600 truncate">{{ getPreviewName(file) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-500">{{ selectedFiles.length }} 個のファイルが選択されました</span>
      <button 
        @click="handleRename"
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        :disabled="selectedFiles.length === 0 || isRenaming"
      >
        <span v-if="isRenaming" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
        {{ isRenaming ? '実行中...' : 'ファイル名を変更' }}
      </button>
    </div>
  </div>
</template>
