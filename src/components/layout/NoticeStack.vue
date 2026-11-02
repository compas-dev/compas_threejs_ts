<template>
  <TransitionGroup tag="div" name="notice" class="notices" aria-live="polite">
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="notice theme"
      :data-kind="notice.kind"
      role="status"
    >
      {{ notice.message }}
      <div
        v-if="notice.progress !== null"
        class="notice-progress"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(notice.progress * 100)"
      >
        <div
          class="notice-progress-bar"
          :style="{ width: `${notice.progress * 100}%` }"
        />
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useViewerRuntime } from "@/viewer/viewer_context";

// Messages for the user (`notify`), stacked at the bottom of the view.
const { notices } = useViewerRuntime().store;
</script>

<style scoped>
.notices {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: min(480px, calc(100% - 32px));
  pointer-events: none;
}

.notice {
  max-width: 100%;
  padding: 8px 14px;
  border-radius: 10px;
  border-left: 4px solid var(--notice-accent, #2a78d6);
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.4;
  pointer-events: auto;
}

.notice-progress {
  width: min(280px, 60vw);
  height: 4px;
  margin-top: 6px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--foreground) 15%, transparent);
  overflow: hidden;
}

.notice-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: var(--notice-accent, #2a78d6);
  transition: width 0.2s ease-out;
}

.notice[data-kind="success"] {
  --notice-accent: #1baf7a;
}

.notice[data-kind="warning"] {
  --notice-accent: #eda100;
}

.notice[data-kind="error"] {
  --notice-accent: #d83a34;
}

.notice-enter-active,
.notice-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.notice-leave-active {
  position: absolute;
}
</style>
