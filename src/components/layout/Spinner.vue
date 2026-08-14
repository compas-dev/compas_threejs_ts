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
  "Consulting the geometry gods...",
  "Asking the algorithm to calm down...",
  "Convincing the computer this is intentional...",
  "Counting things that probably don't need counting...",
  "Making the polygons behave...",
  "Untangling the spaghetti geometry...",
  "Teaching vectors where to go...",
  "Rotating things until they look right...",
  "Checking if reality is still running...",
  "Loading an unreasonable amount of geometry...",
  "Negotiating with the CPU...",
  "Blaming the mesh...",
  "Adding more RAM, spiritually...",
  "Making the triangles feel useful...",
  "Convincing the vertices to cooperate...",
  "Searching for the missing dimension...",
  "Performing computational wizardry...",
  "Sacrificing a GPU to the algorithm...",
  "Asking the mesh nicely to be manifold...",
  "Counting polygons instead of sheep...",
  "Turning mathematics into architecture...",
  "Turning architecture back into mathematics...",
  "Making the computer question its life choices...",
  "Checking whether this is actually a good idea...",
  "Running several questionable calculations...",
  "Applying advanced computational nonsense...",
  "Removing unnecessary complexity by adding complexity...",
  "Optimizing absolutely everything...",
  "Optimizing something that was already fast...",
  "Adding one more iteration...",
  "Just one more iteration...",
  "Okay, definitely the last iteration...",
  "Pretending this will converge...",
  "Waiting for convergence...",
  "Negotiating with infinity...",
  "Rounding numbers until they behave...",
  "Arguing with floating-point arithmetic...",
  "Trying to remember where we put zero...",
  "Locating the origin...",
  "Checking which way is up...",
  "Verifying that 3D is still 3D...",
  "Flattening things that should not be flattened...",
  "Unflattening things that definitely should be flattened...",
  "Making topology someone else's problem...",
  "Searching for non-manifold nonsense...",
  "Resolving existential intersections...",
  "Making surfaces understand boundaries...",
  "Asking the normals to face the right way...",
  "Flipping normals and pretending nothing happened...",
  "Meshing reality...",
  "Remeshing reality...",
  "Discretizing the universe...",
  "Approximating perfection...",
  "Generating controlled chaos...",
  "Adding a little more randomness...",
  "Removing suspicious randomness...",
  "Randomizing the deterministic process...",
  "Making deterministic randomness...",
  "Running the forbidden loop...",
  "Entering the computational abyss...",
  "Checking what broke this time...",
  "Finding the bug we introduced 20 minutes ago...",
  "Looking for a missing comma...",
  "Blaming JavaScript...",
  "Blaming Python...",
  "Blaming the GPU...",
  "Blaming the user...",
  "The computer knows what it did...",
  "Have you tried turning the geometry off and on again?",
  "Clearing the cache and our conscience...",
  "Compiling some questionable decisions...",
  "Waiting for the algorithm to have an idea...",
  "Giving the CPU a moment to think...",
  "Making the fans spin faster...",
  "Converting electricity into polygons...",
  "Converting polygons into more polygons...",
  "Generating geometry nobody asked for...",
  "Making unnecessary things parametric...",
  "Parametrizing the obvious...",
  "Overengineering a perfectly simple problem...",
  "Adding another slider...",
  "Adding sliders until it works...",
  "Searching for the optimal number of sliders...",
  "Making everything adjustable...",
  "Making nothing adjustable...",
  "Pretending the constraints are reasonable...",
  "Negotiating with the constraints...",
  "Relaxing the constraints...",
  "Tightening the constraints...",
  "Breaking the constraints...",
  "Calling it a feature...",
  "Calling it emergent behavior...",
  "Calling it computational design...",
  "Calling it architecture...",
  "Generating plausible geometry...",
  "Generating implausible geometry...",
  "Making beautiful mistakes...",
  "Turning mistakes into features...",
  "Turning features into bugs...",
  "Turning bugs into research...",
  "Turning research into more bugs...",
  "Approaching enlightenment...",
  "Approaching the solution...",
  "Approaching the deadline...",
  "Running at 99% confidence...",
  "Calculating with questionable precision...",
  "Measuring things very precisely for no reason...",
  "Checking if 90° is still 90°...",
  "Making sure left is still left...",
  "Making sure up is still up...",
  "Checking whether the dimensions agree...",
  "Synchronizing the coordinate systems...",
  "Convincing coordinate systems to get along...",
  "Finding the center of everything...",
  "Locating the important point...",
  "Calculating the least important point...",
  "Interpolating between bad decisions...",
  "Extrapolating beyond our expertise...",
  "Projecting our problems onto a surface...",
  "Solving problems in higher dimensions...",
  "Bringing everything back to 3D...",
  "Reducing dimensional existential dread...",
  "Applying unnecessary mathematics...",
  "Applying necessary mathematics reluctantly...",
  "Doing linear algebra so you don't have to...",
  "Multiplying matrices aggressively...",
  "Taking the dot product personally...",
  "Crossing our fingers and our vectors...",
  "Normalizing everything...",
  "Checking the normals...",
  "Uniting the vectors...",
  "Dividing by something suspicious...",
  "Avoiding division by zero...",
  "Negotiating with NaN...",
  "Convincing infinity to come back down...",
  "Removing NaNs from polite society...",
  "Hunting floating-point errors...",
  "Rounding things irresponsibly...",
  "Preserving numerical dignity...",
  "Running finite coffee analysis...",
  "Calculating the optimal coffee break...",
  "Optimizing caffeine throughput...",
  "Loading structural optimism...",
  "Generating computational optimism...",
  "Waiting for inspiration to compile...",
  "Compiling inspiration...",
  "Downloading more geometry...",
  "Downloading additional dimensions...",
  "Searching the internet for more RAM...",
  "Consulting the documentation we should have read earlier...",
  "Reading error messages very carefully...",
  "Ignoring the error message...",
  "Re-reading the error message...",
  "Accepting our fate...",
  "Almost there...",
  "Definitely almost there...",
  "Probably almost there...",
  "This is taking longer than expected...",
  "Doing something extremely important...",
  "Doing something extremely computational...",
  "Please remain geometrically calm...",
  "Please do not touch anything...",
  "Everything is under control...",
  "Everything was under control...",
  "Nothing to see here...",
  "This is completely normal...",
  "Trusting the process...",
  "Trusting the algorithm...",
  "Questioning the process...",
  "Questioning the algorithm...",
  "Reconsidering our life choices...",
  "Adding more computational violence...",
  "Brute-forcing elegance...",
  "Searching for elegance...",
  "Giving up on elegance...",
  "Embracing chaos...",
  "Rendering the consequences...",
  "Calculating the consequences...",
  "Preparing the consequences...",
  "Generating something probably useful...",
  "Turning pixels into problems...",
  "Turning problems into pixels...",
  "Making computers do architecture...",
  "Making architecture do mathematics...",
  "Making mathematics do the heavy lifting...",
  "Almost done. Probably.",
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
