import { copyFileSync } from "node:fs";

copyFileSync("src/library/public.d.ts", "dist-lib/index.d.ts");
copyFileSync("src/library/ui.d.ts", "dist-lib/ui.d.ts");
