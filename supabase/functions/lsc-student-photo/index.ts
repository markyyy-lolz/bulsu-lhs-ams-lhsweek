import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
let cachedDriveToken: { value: string; expiresAt: number } | null = null;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function toBase64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replaceAll("+", "-").replaceAll("/", "_");
}
function pemToBytes(pem: string): ArrayBuffer {
  const normalized = pem;
  const body = normalized.replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function getGoogleAccessToken() {
  if (cachedDriveToken && cachedDriveToken.expiresAt > Date.now() + 60_000) return cachedDriveToken.value;
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Google Drive is not configured");
  const credentials = JSON.parse(raw);
  if (!credentials.client_email || !credentials.private_key) throw new Error("Incomplete service account");
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = toBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const input = header + "." + claims;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBytes(credentials.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const tokenResponse = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: input + "." + toBase64Url(new Uint8Array(signature)),
    }),
  });
  if (!tokenResponse.ok) throw new Error("Google service account authorization failed");
  const tokenData = await tokenResponse.json();
  cachedDriveToken = { value: tokenData.access_token, expiresAt: Date.now() + Number(tokenData.expires_in || 3600) * 1000 };
  return cachedDriveToken.value;
}
async function findDrivePhoto(token: string, folderId: string, studentId: string) {
  const safeFolder = folderId;
  const nameQuery = EXTENSIONS.map((ext) => "name = '" + studentId + "." + ext + "'").join(" or ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.search = new URLSearchParams({
    q: "'" + safeFolder + "' in parents and trashed = false and (" + nameQuery + ")",
    pageSize: "10", orderBy: "modifiedTime desc", fields: "files(id,name,mimeType,size)",
    supportsAllDrives: "true", includeItemsFromAllDrives: "true",
  }).toString();
  const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("Google Drive search failed");
  const data = await response.json();
  const file = (data.files || []).find((item: any) => ALLOWED_MIME.has(item.mimeType));
  if (!file || Number(file.size || 0) > MAX_PHOTO_BYTES) return null;
  return file;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonError("Method not allowed", 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return jsonError("Sign in required", 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceRole) return jsonError("Photo service is not configured", 503);

  try {
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return jsonError("Sign in required", 401);
    const { data: access, error: accessError } = await caller.rpc("lsc_attendance_access");
    if (accessError || access?.authorized !== true) return jsonError("Not authorized", 403);

    let body: { student_id?: string };
    try { body = await request.json(); } catch { return jsonError("Invalid request", 400); }
    const studentId = String(body.student_id || "").trim();
    if (!/^[0-9]{7,12}$/.test(studentId)) return jsonError("Invalid Student ID", 400);

    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: student, error: studentError } = await admin
      .from("lsc_students").select("id, student_id, class_id, active")
      .eq("student_id", studentId).eq("active", true).maybeSingle();
    if (studentError || !student) return jsonError("Student photo not found", 404);
    if (access.scope !== "whole_school" &&
        (access.scope !== "assigned_class" || access.class_id !== student.class_id)) {
      return jsonError("Student is outside your authorized class", 403);
    }
    const { data: classRow, error: classError } = await admin
      .from("lsc_classes").select("photo_folder_id").eq("id", student.class_id).maybeSingle();
    const folderId = String(classRow?.photo_folder_id || "").trim();
    if (classError || !/^[A-Za-z0-9_-]{10,}$/.test(folderId)) return jsonError("Photo folder not configured", 404);

    const token = await getGoogleAccessToken();
    const file = await findDrivePhoto(token, folderId, studentId);
    if (!file) return jsonError("Student photo not found", 404);
    const download = new URL("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(file.id));
    download.searchParams.set("alt", "media");
    download.searchParams.set("supportsAllDrives", "true");
    const imageResponse = await fetch(download, { headers: { Authorization: "Bearer " + token } });
    if (!imageResponse.ok) return jsonError("Student photo could not be loaded", 404);
    const mime = imageResponse.headers.get("Content-Type")?.split(";")[0] || file.mimeType;
    if (!ALLOWED_MIME.has(mime)) return jsonError("Unsupported photo format", 415);
    const bytes = await imageResponse.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES) return jsonError("Photo exceeds 5 MB", 413);
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders, "Content-Type": mime, "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Student photo request failed:", error?.message || "Unknown error");
    return jsonError("Photo service is temporarily unavailable", 502);
  }
});
