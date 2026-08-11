import { ref, onMounted, onUnmounted, type Ref } from "vue";

export function useHover(target: Ref<HTMLElement | null>) {
  const isHovered = ref(false);

  function updateHoverState(_event: MouseEvent) {
    const targetElement = target.value;
    const onElement = targetElement && targetElement.matches(":hover");
    isHovered.value = onElement;
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
