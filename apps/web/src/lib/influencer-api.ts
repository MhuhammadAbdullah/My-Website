import { env } from "./env";
import type {
  InfluencerApplicationInput,
  InfluencerSelfProfileInput,
  BookingSubmissionInput,
  InfluencerPayoutMethodSubmissionInput,
} from "@agency/types";
import type {
  InfluencerMeRead,
  InfluencerProfileRead,
  BookingListItemRead,
  BookingDetailRead,
  InfluencerEarningsSummary,
  InfluencerPayoutListItemRead,
  InfluencerPayoutMethodRead,
  InfluencerNotificationRead,
  InfluencerDashboardStats,
  InfluencerDiscountRead,
} from "./influencer-types";
import type { PaginatedResponse } from "./types";

const API_TIMEOUT_MS = 10_000;

// Public, unauthenticated calls (application submission, application media
// signing) -- same direct-to-API pattern as the rest of this app's public
// data fetching (see ./api.ts).
async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Something went wrong" }));
    const fieldErrors = body?.issues?.fieldErrors as Record<string, string[]> | undefined;
    const firstFieldError = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
    throw new Error(firstFieldError ?? body.error ?? `Request to ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export class InfluencerApiError extends Error {}

// Influencer-authenticated calls -- MUST use a relative path so the browser
// sends the influencer session cookie set via the /api/v1/influencer-auth/*
// (and /api/v1/influencers/*) proxy in next.config.ts, not a cross-origin
// request straight to the API.
export async function influencerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new InfluencerApiError(body.error ?? `Request to ${path} failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CloudinarySignature {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  type?: string;
}

export interface UploadedRawMedia {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
}

export function signApplicationMediaUpload(sessionId: string, isPrivate = false) {
  return publicFetch<CloudinarySignature>("/influencer-applications/media/sign", {
    method: "POST",
    body: JSON.stringify({ sessionId, private: isPrivate }),
  });
}

export function signBookingMediaUpload(sessionId: string) {
  return publicFetch<CloudinarySignature>("/bookings/media/sign", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function submitBooking(username: string, data: BookingSubmissionInput) {
  return publicFetch<{ bookingNumber: string; discountAmount: number }>(`/bookings/${username}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Called right after influencerAuthClient.signIn.email succeeds -- the
// session cookie is already set at that point (password verified), but
// requireInfluencerAuth won't treat it as fully authenticated until this
// OTP step also completes. See apps/api/src/routes/influencer-otp.routes.ts.
export function requestLoginOtp() {
  return influencerRequest<{ status: boolean }>("/influencer-otp/request", { method: "POST" });
}

export function verifyLoginOtp(code: string) {
  return influencerRequest<{ status: boolean }>("/influencer-otp/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function signProfileMediaUpload() {
  return influencerRequest<CloudinarySignature>("/influencers/me/media/sign", { method: "POST" });
}

function buildCloudinaryFormData(file: File, signed: CloudinarySignature): FormData {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);
  if (signed.type) formData.append("type", signed.type);
  return formData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape of Cloudinary's raw upload response, never exposed past this file
function toUploadedRawMedia(uploaded: any): UploadedRawMedia {
  return {
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    width: uploaded.width ?? null,
    height: uploaded.height ?? null,
    format: uploaded.format ?? null,
    bytes: uploaded.bytes ?? null,
  };
}

// Uploads directly to Cloudinary using a server-issued signature -- never
// registers a Media row itself (unlike the admin upload flow); the API
// creates that row atomically when the application/profile update is
// submitted, from exactly these returned fields.
export async function uploadRawFileToCloudinary(file: File, signed: CloudinarySignature): Promise<UploadedRawMedia> {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: "POST",
    body: buildCloudinaryFormData(file, signed),
  });
  const uploaded = await res.json();
  if (!res.ok) throw new Error(uploaded?.error?.message ?? "Upload failed. Please try again.");
  return toUploadedRawMedia(uploaded);
}

// Same upload, but via XMLHttpRequest instead of fetch() so large files
// (intro videos, up to 100MB) can report real upload progress -- fetch()
// has no upload-progress event.
export function uploadRawFileToCloudinaryWithProgress(
  file: File,
  signed: CloudinarySignature,
  onProgress: (percent: number) => void,
): Promise<UploadedRawMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let uploaded: unknown;
      try {
        uploaded = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Upload failed. Please try again."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(toUploadedRawMedia(uploaded));
      } else {
        const message = (uploaded as { error?: { message?: string } })?.error?.message;
        reject(new Error(message ?? "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
    xhr.send(buildCloudinaryFormData(file, signed));
  });
}

export function getInfluencerCategories() {
  return publicFetch<{ items: { id: string; name: string; slug: string }[] }>("/categories/influencers").then(
    (r) => r.items,
  );
}

export function submitInfluencerApplication(data: InfluencerApplicationInput) {
  return publicFetch<{ id: string }>("/influencer-applications", { method: "POST", body: JSON.stringify(data) });
}

// Admin-manageable copy for the registration form's "Video Guide" popup
// (SiteSetting key `influencer_video_guide`, see packages/types/src/settings.ts).
// `/settings` returns the full settings blob (same public, unauthenticated
// endpoint apps/web's getSettings() uses) -- fetched directly here rather
// than through that helper since this is a plain client component, not a
// server component with access to Next's fetch cache config.
export function getInfluencerVideoGuideContent() {
  return publicFetch<{ settings: { influencer_video_guide?: { content: string } } }>("/settings").then(
    (r) => r.settings.influencer_video_guide?.content ?? "",
  );
}

export function getInfluencerMe() {
  return influencerRequest<{ item: InfluencerMeRead }>("/influencers/me").then((r) => r.item);
}

export function updateInfluencerProfile(data: InfluencerSelfProfileInput) {
  return influencerRequest<{ item: InfluencerProfileRead }>("/influencers/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  }).then((r) => r.item);
}

export function getInfluencerBookings(
  params: { page?: number; status?: string; search?: string; campaignType?: string; dateFrom?: string; dateTo?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.campaignType) query.set("campaignType", params.campaignType);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  return influencerRequest<PaginatedResponse<BookingListItemRead>>(`/influencers/me/bookings?${query.toString()}`);
}

export function getInfluencerBooking(id: string) {
  return influencerRequest<{ item: BookingDetailRead }>(`/influencers/me/bookings/${id}`).then((r) => r.item);
}

export function acceptBooking(id: string) {
  return influencerRequest<{ item: BookingDetailRead }>(`/influencers/me/bookings/${id}/accept`, { method: "POST" }).then((r) => r.item);
}

export function declineBooking(id: string, reason: string) {
  return influencerRequest<{ item: BookingDetailRead }>(`/influencers/me/bookings/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }).then((r) => r.item);
}

export function deliverBooking(id: string, note?: string) {
  return influencerRequest<{ item: BookingDetailRead }>(`/influencers/me/bookings/${id}/deliver`, {
    method: "POST",
    body: JSON.stringify({ note }),
  }).then((r) => r.item);
}

export function requestBookingDetails(id: string, message: string) {
  return influencerRequest<{ item: BookingDetailRead }>(`/influencers/me/bookings/${id}/request-details`, {
    method: "POST",
    body: JSON.stringify({ message }),
  }).then((r) => r.item);
}

export function getInfluencerEarnings() {
  return influencerRequest<InfluencerEarningsSummary>("/influencers/me/earnings");
}

export function getInfluencerDashboardStats() {
  return influencerRequest<InfluencerDashboardStats>("/influencers/me/dashboard-stats");
}

export function getPricingLimits() {
  return influencerRequest<{ maxPricingCards: number }>("/influencers/me/pricing-limits");
}

export function getInfluencerPayouts(
  params: { page?: number; status?: string; method?: string; search?: string; dateFrom?: string; dateTo?: string } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.status) query.set("status", params.status);
  if (params.method) query.set("method", params.method);
  if (params.search) query.set("search", params.search);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  return influencerRequest<PaginatedResponse<InfluencerPayoutListItemRead>>(`/influencers/me/payouts?${query.toString()}`);
}

export function getInfluencerPayoutMethods() {
  return influencerRequest<{ items: InfluencerPayoutMethodRead[] }>("/influencers/me/payout-methods").then((r) => r.items);
}

export function submitInfluencerPayoutMethod(data: InfluencerPayoutMethodSubmissionInput) {
  return influencerRequest<{ item: InfluencerPayoutMethodRead }>("/influencers/me/payout-methods", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.item);
}

export function deleteInfluencerPayoutMethod(id: string) {
  return influencerRequest<void>(`/influencers/me/payout-methods/${id}`, { method: "DELETE" });
}

export function getInfluencerDiscounts(params: { page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  return influencerRequest<PaginatedResponse<InfluencerDiscountRead>>(`/influencer-discounts?${query.toString()}`);
}

export function respondToInfluencerDiscount(id: string, decision: "APPROVED" | "DECLINED") {
  return influencerRequest<{ item: InfluencerDiscountRead }>(`/influencer-discounts/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  }).then((r) => r.item);
}

export function getInfluencerNotifications() {
  return influencerRequest<{ items: InfluencerNotificationRead[]; unreadCount: number }>("/influencers/me/notifications?limit=20");
}

export function markInfluencerNotificationRead(id: string) {
  return influencerRequest<void>(`/influencers/me/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllInfluencerNotificationsRead() {
  return influencerRequest<void>("/influencers/me/notifications/read-all", { method: "POST" });
}
