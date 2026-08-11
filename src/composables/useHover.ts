import { ref, onMounted, onUnmounted, type Ref } from "vue";

export function useHover(target: Ref<HTMLElement | null>): {
  isHovered: Ref<boolean>;
} {
  const isHovered = ref(false);

  function updateHoverState(_event: MouseEvent) {
    const targetElement = target.value;
    isHovered.value = targetElement !== null && targetElement.matches(":hover");
  }

  onMounted(() => {
    window.addEventListener("mousemove", updateHoverState);
  });

  onUnmounted(() => {
    window.removeEventListener("mousemove", updateHoverState);
  });

  return {
    isHovered,
  };
}
