import path from "node:path";
import { promises as fs } from "node:fs";

export type AgentFrontmatter = {
  name?: string;
  description?: string;
  color?: string;
  emoji?: string;
  vibe?: string;
  tools?: string;
};

export type ParsedAgentFile = {
  frontmatter: AgentFrontmatter;
  body: string;
  sourcePath: string;
  category: string;
  slug: string;
};

export const AGENT_DIRS = [
  "academic",
  "design",
  "engineering",
  "finance",
  "game-development",
  "marketing",
  "paid-media",
  "product",
  "project-management",
  "sales",
  "spatial-computing",
  "specialized",
  "strategy",
  "support",
  "testing",
] as const;

const FRONTMATTER_BOUNDARY = "---";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeColor(input?: string) {
  const value = input?.trim().toLowerCase();
  if (!value) return "#6B7280";

  const known: Record<string, string> = {
    cyan: "#00FFFF",
    blue: "#3498DB",
    green: "#2ECC71",
    red: "#E74C3C",
    purple: "#9B59B6",
    orange: "#F39C12",
    teal: "#008080",
    indigo: "#6366F1",
    pink: "#E84393",
    gold: "#EAB308",
    amber: "#F59E0B",
    yellow: "#EAB308",
    violet: "#8B5CF6",
    rose: "#F43F5E",
    lime: "#84CC16",
    gray: "#6B7280",
    fuchsia: "#D946EF",
  };

  const mapped = known[value] ?? value;

  if (/^#[0-9a-f]{6}$/i.test(mapped)) return mapped.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(mapped)) return `#${mapped.toUpperCase()}`;
  return "#6B7280";
}

export function parseAgentMarkdown(content: string, sourcePath: string): ParsedAgentFile {
  const lines = content.split(/\r?\n/);
  let frontmatter: AgentFrontmatter = {};
  let bodyStart = 0;

  if (lines[0] === FRONTMATTER_BOUNDARY) {
    const end = lines.indexOf(FRONTMATTER_BOUNDARY, 1);
    if (end > 0) {
      frontmatter = Object.fromEntries(
        lines
          .slice(1, end)
          .map((line) => {
            const split = line.indexOf(":");
            if (split === -1) return [line.trim(), ""];
            return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
          })
          .filter(([key]) => key.length > 0),
      );
      bodyStart = end + 1;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  const category = path.relative(process.cwd(), sourcePath).split(path.sep)[0] || "unknown";
  const slug = slugify(frontmatter.name || path.basename(sourcePath, ".md"));

  return { frontmatter, body, sourcePath, category, slug };
}

export async function parseAgentFile(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  return parseAgentMarkdown(content, filePath);
}
