import { env } from "@/lib/env";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1/contact`;

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_EXTENSIONS = ["pdf", "doc", "docx"];

export interface CareerApplication {
  position: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  linkedin?: string;
  portfolio?: string;
  experience?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  coverNote?: string;
  cvUrl: string;
  cvName: string;
  consent: true;
  website?: string;
}

async function parseError(res: Response) {
  const body = await res.json().catch(() => ({ error: "Something went wrong" }));
  const fieldErrors = body?.issues?.fieldErrors as Record<string, string[]> | undefined;
  const first = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
  return new Error(first ?? body.error ?? "Something went wrong");
}

// The CV goes straight to Cloudinary with a one-off signature from our API (raw upload: PDFs and Word files).
export async function uploadCv(file: File): Promise<{ url: string; name: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!CV_EXTENSIONS.includes(ext)) throw new Error("Please upload your CV as a PDF, DOC or DOCX file.");
  if (file.size > CV_MAX_BYTES) throw new Error("The file is too large. The limit is 5 MB.");

  let signRes: Response;
  try {
    signRes = await fetch(`${API}/career/sign`, { method: "POST" });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }
  if (!signRes.ok) throw await parseError(signRes);
  const signed = (await signRes.json()) as { timestamp: number; folder: string; signature: string; apiKey: string; cloudName: string };

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method: "POST", body: form });
  const uploaded = await res.json().catch(() => null);
  if (!res.ok || !uploaded?.secure_url) throw new Error(uploaded?.error?.message ?? "Upload failed. Please try again.");
  return { url: uploaded.secure_url as string, name: file.name };
}

export async function submitCareerApplication(data: CareerApplication) {
  let res: Response;
  try {
    res = await fetch(`${API}/career`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }
  if (!res.ok) throw await parseError(res);
  return res.json();
}
