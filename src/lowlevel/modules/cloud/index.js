const encoder = new TextEncoder();
const cloudinary = require("cloudinary").v2; 

export const cloudmanager= {

    provider,

    //get cloud provider from link
    getcloudprovier(link) {
        if (!link) throw new Error("Cloud provider is required");
        const input = String(link).toLowerCase();
        if (input.includes("cloudinary.com")) return "cloudinary";
        if (input.includes("drive.google.com")) return "gdrive";
        if (input.includes("photos.google.com")) return "gphotos";
        if (providers[input]) return providers[input];
        throw new Error(`Unsupported cloud provider: ${link}`);
    },

    async getitem(link, options = {}) {
        const provider = providerFrom(link);
        if (provider === "cloudinary") return await cloudimanager.getmedia(link, options.env ? options : {});
        else if (provider === "gdrive") return await gdrivemanager.getmedia(link);
        else if (provider === "gphotos") return await gphotosmanager.getmedia(link);
        else throw new Error("Google Photos media URLs require a media item ID and are not directly downloadable");
    },

    async uploaditem(item, host, options = {}) {

        // return away for now
        return null; 

        const provider = providerFrom(host);
        if (provider === "cloudinary") return await cloudimanager.uploadmedia(item, options.env ? options : {});
        else if (provider === "gdrive") return await gdrivemanager.uploadmedia(item, options.env ? options : {});
        else if (provider === "gphotos") return await gphotosmanager.uploadmedia(item, options.env ? options : {});
        else throw new Error(`Unsupported cloud provider: ${host}`);
    },

    async deleteitem() {

        // return away for now
        return null; 

        const provider = providerFrom(link);
        if (provider === "cloudinary") return await cloudimanager.deletemedia(link, options.env ? options : {});
        else if (provider === "gdrive") return await gdrivemanager.deletemedia(link);
        else if (provider === "gphotos") return await gphotosmanager.deletemedia(link);
        else throw new Error("Google Photos media URLs require a media item ID and are not directly downloadable");
    },

};

export const gdrivemanager = {

    async uploadmedia({ name, body, contentType, folderId }, env) {
        if (!name || !body || !contentType) throw new Error("Drive uploads require name, body, and contentType");
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify({ name, ...(folderId ? { parents: [folderId] } : {}) })], { type: "application/json" }));
        form.append("file", new Blob([body], { type: contentType }));
        return googleRequest("gdrive", `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink`, { method: "POST", body: form }, env);
    },

    async getmedia(id, env) {
        const key = fileId(id);
        return googleRequest("gdrive", `${DRIVE_API}/files/${encodeURIComponent(key)}?fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime`, {}, env);
    },

    async downloadmedia(id, env) {
        const key = fileId(id);
        const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(key)}?alt=media`, { headers: { Authorization: `Bearer ${googleToken(env, "gdrive")}` } });
        if (!response.ok) throw new Error(`Google Drive download failed [${response.status}]`);
        return response;
    },

    async listmedia({ query = "", pageSize = 25, pageToken } = {}, env) {
        const params = new URLSearchParams({ pageSize: String(Math.min(pageSize, 100)), fields: "nextPageToken,files(id,name,mimeType,size,webViewLink)" });
        if (query) params.set("q", query);
        if (pageToken) params.set("pageToken", pageToken);
        return googleRequest("gdrive", `${DRIVE_API}/files?${params}`, {}, env);
    },

    async deletemedia(id, env) {
        const key = fileId(id);
        const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(key)}`, { method: "DELETE", headers: { Authorization: `Bearer ${googleToken(env, "gdrive")}` } });
        if (!response.ok && response.status !== 404) throw new Error(`Google Drive delete failed [${response.status}]`);
        return { deleted: response.ok || response.status === 404, fileId: key, provider: "gdrive" };
    },

};

export const gphotosmanager = {

    var PHOTOS_API = "https://photoslibrary.googleapis.com/v1",

    async googleRequest(provider, url, options = {}, env = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
            Authorization: `Bearer ${googleToken(env, provider)}`,
            ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
            ...options.headers,
            },
        });
        if (!response.ok) throw new Error(`Google ${provider} request failed [${response.status}]`);
        return response.json();
    }, 

    async uploadmedia({ body, contentType, filename, description = "" }, env) {
        if (!body || !contentType) throw new Error("Google Photos uploads require body and contentType");
        const upload = await fetch(`${PHOTOS_API.replace("/v1", "")}/v1/uploads`, {
            method: "POST",
            headers: { Authorization: `Bearer ${googleToken(env, "gphotos")}`, "Content-Type": contentType, "X-Goog-Upload-File-Name": filename || "upload", "X-Goog-Upload-Protocol": "raw" },
            body,
        });
        if (!upload.ok) throw new Error(`Google Photos upload failed [${upload.status}]`);
        return googleRequest("gphotos", `${PHOTOS_API}/mediaItems:batchCreate`, { method: "POST", body: JSON.stringify({ newMediaItems: [{ description, simpleMediaItem: { uploadToken: await upload.text() } }] }) }, env);
    },

    async listalbums(env) {
        return googleRequest("gphotos", `${PHOTOS_API}/albums?pageSize=50`, {}, env);
    },

    async listmedia({ pageSize = 25, pageToken } = {}, env) {
        return googleRequest("gphotos", `${PHOTOS_API}/mediaItems:search`, { method: "POST", body: JSON.stringify({ pageSize: Math.min(pageSize, 100), ...(pageToken ? { pageToken } : {}) }) }, env);
    },

    async deletemedia() {
        throw new Error("Google Photos does not support deleting media through this manager");
    },

    // get media function to get a media item by its ID from Google Photos
    async getmedia(id, env) {
        if (!id) throw new Error("Google Photos media item ID is required");
        return googleRequest("gphotos", `${PHOTOS_API}/mediaItems/${encodeURIComponent(id)}`, {}, env);
    }

};

export const cloudimanager = {

    async sha1(value) {
        const digest = await crypto.subtle.digest("SHA-1", encoder.encode(value));
        return [...new Uint8Array(digest)]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    },

    async cloudinarySignature(params, secret) {
        const value = Object.entries(params)
            .filter(([, item]) => item !== undefined && item !== null && item !== "")
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${key}=${item}`)
            .join("&");
        return sha1(`${value}${secret}`);
    }, 

    async uploadmedia({ body, filename, folder, publicId, resourceType = "auto" }) {
        if (!body) throw new Error("Cloudinary upload requires body");

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = env.CLOUDINARY_API_KEY;
        const apiSecret = env.CLOUDINARY_API_SECRET;
        const params = {
            timestamp: Math.floor(Date.now() / 1000),
            ...(folder ? { folder } : {}),
            ...(publicId ? { public_id: publicId } : {}),
        };
        
        const form = new FormData();
        for (const [key, value] of Object.entries(params)) form.append(key, String(value));
        form.append("api_key", apiKey);
        form.append("signature", await cloudinarySignature(params, apiSecret));
        form.append("file", body instanceof Blob ? body : new Blob([body]), filename || "upload"+Date.now());

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
            { method: "POST", body: form },
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Cloudinary upload failed [${response.status}]: ${data.error?.message || JSON.stringify(data)}`);
        }
        return data;
    },

    async getmedia(url, options = {}) {
        if (!url) throw new Error("Cloudinary media URL is required");
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Cloudinary media fetch failed [${response.status}]`);
        return response;
    },

    async deletemedia(publicId, env, resourceType = "image") {

        //return null for now
        return null;

        if (!publicId) throw new Error("Cloudinary publicId is required");
        const cloudName = required(env, "CLOUDINARY_CLOUD_NAME");
        const apiKey = required(env, "CLOUDINARY_API_KEY");
        const apiSecret = required(env, "CLOUDINARY_API_SECRET");
        const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
        const form = new URLSearchParams({
            ...params,
            api_key: apiKey,
            signature: await cloudinarySignature(params, apiSecret),
        });
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/destroy`,
            { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form },
        );
        const data = await response.json();
        if (!response.ok || data.result === "error") {
            throw new Error(`Cloudinary delete failed [${response.status}]`);
        }
        return { deleted: data.result === "ok", publicId, provider: "cloudinary" };
    },

};

function required(env = {}, key) {
  const value = env[key] || env[key.toLowerCase()];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function fileId(value) {
  if (!value) throw new Error("Drive fileId is required");
  const input = String(value);
  if (!input.includes("://")) return input;
  const url = new URL(input);
  const match = url.pathname.match(/\/d\/([^/]+)/);
  return match?.[1] || url.searchParams.get("id") || input;
}