<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { sendDataMessage } from '@/communications/websocket' // Adjust path to where your functions are saved

const props = defineProps<{
  text: string
  action: string
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const triggerClick = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files.length > 0) {
    const file = target.files[0]

    // 1. Create a FileReader instance to read the file locally in the browser
    const reader = new FileReader()

    // 2. Define what happens once the file is fully read
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const textContent = e.target?.result as string

        // 3. Parse the text content into a clean JavaScript object
        const jsonContent = JSON.parse(textContent)

        // 4. Construct the message data package required by your backend
        console.log(`Preparing to send JSON payload via WS for action: ${props.action}`)
          const payload = {
            dispatch: 'loaded_json',
          action: props.action,
          json_data: jsonContent
        }


        // 5. Send it across the wire using your existing WebSocket text helper
        // (Note: We cast to 'any' because your function signature uses Record<string, undefined>)
        const success = sendDataMessage(payload as any)

        if (success) {
          console.log(`Successfully sent JSON payload via WS for action: ${props.action}`)
        }
      } catch (error) {
        console.error("Failed to parse or send uploaded JSON file:", error)
      }
    }

    // 6. Fire off the reading operation as Text
    reader.readAsText(file)

    // Reset the input so the same file can be triggered again if needed
    target.value = ''
  }
}
</script>

<template>
  <div class="load-json-button-container inline-block">
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept=".json"
      @change="handleFileChange"
    />

    <Button type="button" @click="triggerClick" variant="secondary">
      {{ text }}
    </Button>
  </div>
</template>
