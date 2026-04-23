import path from "node:path";
import { promises as fs } from "node:fs";
import { AGENT_DIRS, normalizeColor, parseAgentFile } from "@/lib/agents/parser";

export type AgentDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  color: string;
  emoji: string;
  vibe: string;
  sourcePath: string;
  promptBody: string;
  updatedAt: string;
};

let cachedAgents: AgentDefinition[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15_000;

async function scanCategory(dir: string) {
  const absoluteDir = path.join(process.cwd(), dir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  return Promise.all(
    files.map(async (entry) => {
      const fullPath = path.join(absoluteDir, entry.name);
      const parsed = await parseAgentFile(fullPath);
      const stat = await fs.stat(fullPath);
      return {
        id: parsed.slug,
        slug: parsed.slug,
        name: parsed.frontmatter.name || parsed.slug,
        description: parsed.frontmatter.description || "No description provided.",
        category: parsed.category,
        color: normalizeColor(parsed.frontmatter.color),
        emoji: parsed.frontmatter.emoji || "✦",
        vibe: parsed.frontmatter.vibe || "Focused specialist",
        sourcePath: path.relative(process.cwd(), parsed.sourcePath),
        promptBody: parsed.body,
        updatedAt: stat.mtime.toISOString(),
      } satisfies AgentDefinition;
    }),
  );
}

export async function loadAgents(force = false) {
  const now = Date.now();
  if (!force && cachedAgents && now - cachedAt < CACHE_TTL_MS) {
    return cachedAgents;
  }

  const nested = await Promise.all(AGENT_DIRS.map((dir) => scanCategory(dir)));
  cachedAgents = nested.flat().sort((a, b) => a.name.localeCompare(b.name));
  cachedAt = now;
  return cachedAgents;
}

export async function getAgentById(id: string) {
  const agents = await loadAgents();
  return agents.find((agent) => agent.id === id || agent.slug === id) ?? null;
}
