import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/**
 * Manages window resize events and updates camera/renderer accordingly.
 */
export class ResizeManager {
    constructor(
        private camera: THREE.PerspectiveCamera,
        private renderer: THREE.WebGLRenderer,
        private labelRenderer: CSS2DRenderer
    ) {
        this.setupResizeListener();
    }

    private setupResizeListener(): void {
        window.addEventListener("resize", () => {
            this.handleWindowResize();
        });
    }

    private handleWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }
}
