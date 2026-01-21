<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'

const { settings, saveSettings } = useSettings()
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">設定</h2>
    </div>

    <div class="space-y-4">
      <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="text-sm font-bold text-gray-700 mb-2">正規化（ファイル名）</div>
        <div class="text-sm text-gray-500 mb-4">
          「正規化 (NFKC)」ステップが有効なときに適用される、記号・空白の統一ルールを設定します。
        </div>

        <div class="space-y-3">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">スペース（全角→半角 / 連続を1つに）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.space"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">波ダッシュ（～ に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.waveDash"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">ダッシュ（- に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.dash"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">中点（・ に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.middleDot"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">括弧（() に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.brackets"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">コロン（：に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.colon"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>

          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-gray-700">スラッシュ（／に統一）</span>
            <input
              type="checkbox"
              v-model="settings.normalization.slash"
              @change="saveSettings"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            >
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
