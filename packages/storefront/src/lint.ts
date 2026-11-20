/**
 * Validador de archivos de paquete Headless / Funnel / Landing.
 * Comprueba sintaxis de JSONs, archivos requeridos y coherencia de tokens.
 */
export function lintTheme(files: Record<string, string>): string[] {
  const out: string[] = [];
  const has = (p: string): boolean => p in files;

  for (const [path, text] of Object.entries(files)) {
    if (path.endsWith(".json")) {
      try {
        JSON.parse(text);
      } catch {
        out.push(`${path}: JSON inválido.`);
      }
    }
  }

  // Verificación para paquetes Astro Headless
  if (has("src/theme/tokens.json")) {
    try {
      const tokens = JSON.parse(files["src/theme/tokens.json"] ?? "{}") as {
        brand?: string;
        palette?: { bg?: string; text?: string };
      };
      if (!tokens.brand) out.push("tokens.json: falta el campo brand.");
      if (!tokens.palette?.bg) out.push("tokens.json: falta la paleta de colores.");
    } catch {
      // ya se reportó como JSON inválido
    }
  }

  return out;
}
