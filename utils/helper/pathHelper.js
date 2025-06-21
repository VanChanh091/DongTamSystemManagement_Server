import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root path của toàn project
const ROOT_DIR = join(__dirname, "../../");

export const PLANNING_PATH = join(
  ROOT_DIR,
  "view",
  "templates",
  "templatePdf.ejs"
);
