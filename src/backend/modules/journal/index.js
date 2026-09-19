import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { getDatabase } from "../dbhandler/index.js";

const postFields = { id: true, slug: true, title: true, content: true, excerpt: true, published: true, authorId: true, publishedAt: true, createdAt: true, updatedAt: true };

export function renderRichText(markdown = "") {
  return sanitizeHtml(marked.parse(markdown, { async: false }), {
    allowedTags: ["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote", "code", "pre", "br"],
    allowedAttributes: { a: ["href", "name", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

export async function createPost(data) {
  return getDatabase().post.create({ data: { ...data, publishedAt: data.published ? (data.publishedAt ?? new Date()) : null }, select: postFields });
}

export async function getPost(idOrSlug) {
  return getDatabase().post.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: postFields });
}

export async function listPosts({ page = 1, pageSize = 20, publishedOnly = false } = {}) {
  const safePage = Math.max(1, Number(page));
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize)));
  const where = publishedOnly ? { published: true } : {};
  const [items, total] = await Promise.all([
    getDatabase().post.findMany({ where, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * safePageSize, take: safePageSize, select: postFields }),
    getDatabase().post.count({ where }),
  ]);
  return { items, page: safePage, pageSize: safePageSize, total, totalPages: Math.ceil(total / safePageSize) };
}

export async function updatePost(id, data) {
  return getDatabase().post.update({ where: { id }, data: data.published === true && !data.publishedAt ? { ...data, publishedAt: new Date() } : data, select: postFields });
}

export async function deletePost(id) {
  return getDatabase().post.delete({ where: { id }, select: { id: true } });
}

export const journalManager = { createPost, getPost, listPosts, updatePost, deletePost, renderRichText };