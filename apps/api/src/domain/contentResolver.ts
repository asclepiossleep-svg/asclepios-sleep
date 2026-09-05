import { prisma } from "../db";

/**
 * Resolves a base ContentItem.code (e.g. "TONIGHT_GUIDE_PRODUCT") to its
 * `<code>_<locale>` row, falling back to the `_en` row if the requested
 * locale has none. Centralizes the fallback logic GET /tonight's step
 * guidance and GET /programmes/:code's daily content slot both need, so an
 * admin can add a text/video/audio lesson by editing a ContentItem row —
 * no schema or route change required either place.
 */
export async function resolveContentItem(code: string, locale: string) {
  let item = await prisma.contentItem.findUnique({ where: { code: `${code}_${locale}` } });
  if (!item && locale !== "en") {
    item = await prisma.contentItem.findUnique({ where: { code: `${code}_en` } });
  }
  return item;
}
