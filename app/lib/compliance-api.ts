// ── No more hardcoded URL ──────────────────────────────
const API_BASE = "/api/business";
const DIRECT_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Internal helper for non-file requests ──────────────
async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  return res;
}

// ── Get token for direct Laravel calls (file uploads) ──
async function getAccessToken(): Promise<string> {
  const res = await fetch("/api/token");
  if (!res.ok) {
    window.location.href = "/login";
    throw new Error("Unauthenticated");
  }
  const { token } = await res.json();
  if (!token) {
    window.location.href = "/login";
    throw new Error("No token");
  }
  return token;
}

// ── Load compliance data ────────────────────────────────
export async function fetchCompliance() {
  const res = await request("compliance");
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to load compliance");
  return json.data;
}

// ── Save business info ──────────────────────────────────
export async function saveComplianceInfo(payload: Record<string, unknown>) {
  const res = await request("compliance/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  // console.log("compliance/info response:", json); // ← temporary
  if (!res.ok) throw new Error(json.message ?? "Failed to save info");
  return json;
}
// ── Upload business document — direct to Laravel ────────
// Bypasses Next.js 413 body size limit
export async function uploadBusinessDocument(
  documentType: string,
  file: File,
  onProgress?: (pct: number) => void,
) {
  const token = await getAccessToken();

  return new Promise<{ data: unknown; message: string }>((resolve, reject) => {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${DIRECT_API}/api/business/compliance/document`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.message ?? "Upload failed"));
      } catch {
        reject(new Error("Invalid response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

// ── Delete business document ────────────────────────────
export async function deleteBusinessDocument(documentType: string) {
  const res = await request(`compliance/document/${documentType}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to delete document");
  return json;
}

// ── Add director ────────────────────────────────────────
export async function addDirector(payload: Record<string, unknown>) {
  const res = await request("directors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  console.log("directors response:", json); // ← temporary
  if (!res.ok) throw new Error(json.message ?? "Failed to add director");
  return json;
}

// ── Update director ─────────────────────────────────────
export async function updateDirector(
  id: string,
  payload: Record<string, unknown>,
) {
  const res = await request(`directors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to update director");
  return json;
}

// ── Delete director ─────────────────────────────────────
export async function deleteDirector(id: string) {
  const res = await request(`directors/${id}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to delete director");
  return json;
}

// ── Upload director document — direct to Laravel ────────
// Bypasses Next.js 413 body size limit
export async function uploadDirectorDocument(
  directorId: string,
  documentType: string,
  file: File,
  onProgress?: (pct: number) => void,
) {
  const token = await getAccessToken();

  return new Promise<{ data: unknown; message: string }>((resolve, reject) => {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${DIRECT_API}/api/business/directors/${directorId}/document`,
    );
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.message ?? "Upload failed"));
      } catch {
        reject(new Error("Invalid response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

// ── Submit compliance ───────────────────────────────────
export async function submitCompliance() {
  const res = await request("compliance/submit", {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to submit");
  return json;
}
