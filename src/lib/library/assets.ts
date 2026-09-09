import type { BookTextures } from "@/lib/book/page-textures";

export let bookTex: BookTextures | null = null;

function disposeTex(tex: BookTextures) {
  tex.coverFront.dispose();
  tex.coverBack.dispose();
  tex.coverInside.dispose();
  tex.spine.dispose();
  for (const p of tex.pages) p.dispose();
}

export function setBookTex(tex: BookTextures) {
  if (bookTex) disposeTex(bookTex);
  bookTex = tex;
}