<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '@/composables/useSettings'
import TabButton from '@/components/atoms/TabButton.vue'
import MainPanel from '@/components/organisms/MainPanel.vue'
import GroupPanel from '@/components/organisms/GroupPanel.vue'
import RegexLibraryPanel from '@/components/organisms/RegexLibraryPanel.vue'
import SettingsPanel from '@/components/organisms/SettingsPanel.vue'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const { loadSettings } = useSettings()

const activeTab = ref('main')

const tabs = [
  { id: 'main', label: 'メイン' },
  { id: 'group', label: 'グループ' },
  { id: 'regex', label: '正規表現' },
  { id: 'settings', label: '設定' }
]

onMounted(async () => {
  await loadSettings()
})
</script>

<template>
  <div class="min-h-screen p-6 max-w-6xl mx-auto">
    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-300 mb-8">
      <TabButton
        v-for="tab in tabs"
        :key="tab.id"
        :label="tab.label"
        :active="activeTab === tab.id"
        @click="activeTab = tab.id"
      />
    </div>

    <!-- Tab Contents -->
    <main>
      <MainPanel v-show="activeTab === 'main'" />
      <GroupPanel v-show="activeTab === 'group'" />
      <RegexLibraryPanel v-show="activeTab === 'regex'" />
      <SettingsPanel v-show="activeTab === 'settings'" />
    </main>
  </div>
</template>

<style>
@import "@/assets/main.css";
</style>
