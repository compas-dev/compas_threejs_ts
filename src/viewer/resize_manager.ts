import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/**
 * Manages container resize events and updates camera/renderer accordingly.
 */
export class ResizeManager {
    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private camera: THREE.PerspectiveCamera,
        private renderer: THREE.WebGLRenderer,
        private labelRenderer: CSS2DRenderer
    ) {}

    /**
     * Start tracking the given container's box size instead of the window's.
     * The docked toolbar means the canvas area is smaller than the viewport,
     * so sizing must follow the actual container, not window.innerWidth/Height.
     */
    public observe(container: HTMLElement): void {
        this.resizeObserver?.disconnect();

        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }

            const { width, height } = entry.contentRect;
            this.applySize(width, height);
        });

        this.resizeObserver.observe(container);
    }

    private applySize(width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }
}
