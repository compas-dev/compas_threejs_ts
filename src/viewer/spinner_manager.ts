import { spinnerState } from "@/store/store";

interface SpinnerUpdateData {
    visible?: boolean;
    message?: string | null;
}

/**
 * Handler for spinner show/hide messages sent from the backend, e.g. around
 * long-running work (App.start_spinner()/stop_spinner() in compas_threejs).
 */
export function spinnerManager(data: SpinnerUpdateData): void {
    spinnerState.visible = !!data.visible;
    spinnerState.message = data.visible ? (data.message ?? null) : null;
}
