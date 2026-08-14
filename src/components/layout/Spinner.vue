<template>
  <Teleport to="body">
    <div v-if="spinnerState.visible" class="global-spinner-overlay theme">
      <LoaderCircle class="global-spinner-icon" :size="96" :stroke-width="1.5" />
      <p v-if="spinnerState.message" class="global-spinner-official-text">{{ spinnerState.message }}</p>
      <p v-if="funnyMessage" class="global-spinner-funny-text">{{ funnyMessage }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";

const { spinnerState } = useViewerRuntime().store;

const FUNNY_MESSAGES = [
  "Counting the wooden beams...",
  "Bribing the joints to hold still...",
  "Sanding down the JSON splinters...",
  "Asking the timber nicely to load faster...",
  "Untangling knots (the wood kind, not the code kind)...",
  "Convincing the beams they're not overreacting...",
  "Measuring twice, sending once...",
  "Waking up the sawmill...",
  "Negotiating with a very large JSON file...",
  "Stacking planks in the void...",
  "Teaching the beams to stand up straight...",
  "Looking for the missing screw...",
  "Calibrating the virtual tape measure...",
  "Checking if this beam is actually level...",
  "Arguing with gravity...",
  "Convincing the wood not to warp...",
  "Waiting for the glue to dry...",
  "Sharpening imaginary chisels...",
  "Sweeping away virtual sawdust...",
  "Assembling impossible geometry...",
  "Finding the load-bearing coffee...",
  "Making the timber grain cooperate...",
  "Polishing the pixels...",
  "Removing splinters from the algorithm...",
  "Untying a stubborn knot...",
  "Turning trees into data...",
  "Counting growth rings...",
  "Looking for that one missing bolt...",
  "Aligning the universe to the nearest millimeter...",
  "Making sure left is still left...",
  "Teaching the CNC some manners...",
  "Bringing the saw back from lunch...",
  "Straightening crooked numbers...",
  "Reassuring the timber that everything will be okay...",
  "Checking for invisible termites...",
  "Feeding the beavers...",
  "Stacking pixels like plywood...",
  "Sorting the sawdust alphabetically...",
  "Compressing an entire forest...",
  "Waiting for the carpenter to finish his coffee...",
  "Consulting the ancient woodworking spirits...",
  "Persuading trees to become architecture...",
  "Downloading more lumber...",
  "Replacing duct tape with engineering...",
  "Converting coffee into structures...",
  "Inflating the load-bearing walls...",
  "Asking the squirrels for permission...",
  "Waiting for the forest's approval...",
  "Locating the beam distribution system...",
  "Making wood remember it's a tree...",
  "Generating extra grain...",
  "Loading structural optimism...",
  "Checking if the trees signed the consent form...",
  "Teaching nails about personal space...",
  "Making sure the beams are emotionally supported...",
  "Debugging gravity...",
  "Convincing physics to be flexible today...",
  "Rotating the Earth for a better view...",
  "Asking the pixels to hold still...",
  "Waiting for the laws of mechanics to compile...",
  "Running finite coffee analysis...",
  "Meshing reality...",
  "Pretending floating-point errors don't exist...",
  "Finding the center of mass...",
  "Adding unnecessary fillets...",
  "Optimizing away impossible constraints...",
  "Removing non-manifold timber...",
  "Checking if 90° is still 90°...",
  "Resolving existential intersections...",
  "Converting sketches into regret...",
  "Making the tolerances slightly more tolerant...",
  "Regenerating parametric excuses...",
];

const funnyMessage = ref<string | null>(null);
let messageInterval: ReturnType<typeof setInterval> | null = null;

function pickFunnyMessage(): string {
  return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]!;
}

function startCycling() {
  funnyMessage.value = pickFunnyMessage();
  messageInterval = setInterval(() => {
    funnyMessage.value = pickFunnyMessage();
  }, 3600);
}

function stopCycling() {
  if (messageInterval !== null) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
  funnyMessage.value = null;
}

watch(
  () => spinnerState.visible,
  (visible) => {
    if (visible) {
      startCycling();
    } else {
      stopCycling();
    }
  },
  { immediate: true },
);

onUnmounted(stopCycling);
</script>

<style scoped>
.global-spinner-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: color-mix(in srgb, var(--background) 25%, transparent);
  backdrop-filter: blur(4px);
  pointer-events: all;
}

.global-spinner-icon {
  color: var(--foreground);
  animation: global-spinner-spin 1s linear infinite;
}

.global-spinner-official-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--foreground);
  opacity: 0.7;
  text-align: center;
  padding: 0 24px;
  margin: 0;
}

.global-spinner-funny-text {
  font-size: 2rem;
  font-weight: 700;
  color: var(--foreground);
  text-align: center;
  padding: 0 24px;
  margin: 0;
}

@keyframes global-spinner-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
