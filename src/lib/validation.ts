/**
 * Validation utilities for School Finance OS.
 * Enforces strict boundaries, safe financial ranges, and sanitized errors.
 */

/**
 * Validates and converts a monetary input (in Rupees or Paisa) to an integer paise value.
 * Throws an Error with a safe message if invalid, NaN, Infinity, negative, or exceeds limit.
 */
export function validatePaisaAmount(
  value: unknown,
  fieldName = "Amount",
  options: { min?: number; maxPaisa?: number; isRupeesInput?: boolean } = {}
): number {
  const { min = 0, maxPaisa = 100_000_000, isRupeesInput = false } = options;

  if (value === null || value === undefined || value === "") {
    throw new Error(`${fieldName} is required.`);
  }

  const num = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw new Error(`${fieldName} must be a valid finite number.`);
  }

  if (num < min) {
    throw new Error(`${fieldName} cannot be less than ${min}.`);
  }

  const paisa = isRupeesInput ? Math.round(num * 100) : Math.round(num);

  if (paisa > maxPaisa) {
    throw new Error(`${fieldName} exceeds maximum permissible amount.`);
  }

  return paisa;
}

/**
 * Validates a numeric percentage value in range [0, 100].
 */
export function validatePercentage(value: unknown, fieldName = "Percentage"): number {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${fieldName} is required.`);
  }

  const num = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (num < 0 || num > 100) {
    throw new Error(`${fieldName} must be between 0 and 100.`);
  }

  return parseFloat(num.toFixed(2));
}

/**
 * Bounds pagination limit and offset parameters safely.
 */
export function boundPagination(
  searchParams: URLSearchParams,
  defaults: { defaultLimit?: number; maxLimit?: number } = {}
): { limit: number; offset: number } {
  const { defaultLimit = 50, maxLimit = 500 } = defaults;

  const rawLimit = searchParams.get("limit") || searchParams.get("take");
  const rawOffset = searchParams.get("offset") || searchParams.get("skip") || searchParams.get("page");

  let limit = defaultLimit;
  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, maxLimit);
    }
  }

  let offset = 0;
  if (rawOffset) {
    const parsed = parseInt(rawOffset, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      // If page number was passed (1-indexed), convert to offset
      if (searchParams.has("page") && !searchParams.has("offset") && !searchParams.has("skip")) {
        offset = Math.max(0, (parsed - 1) * limit);
      } else {
        offset = parsed;
      }
    }
  }

  return { limit, offset };
}

/**
 * Sanitizes server error messages before sending to clients (E-01).
 * Never exposes SQL, Prisma codes, stack traces, or internal file paths.
 */
export function getSafeErrorMessage(error: unknown, fallback = "An internal server error occurred."): string {
  if (!error) return fallback;

  if (typeof error === "string") {
    if (!error.includes("prisma") && !error.includes("SELECT") && !error.includes("CONSTRAINT")) {
      return error;
    }
    return fallback;
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("prisma") ||
      msg.includes("P2002") ||
      msg.includes("P2025") ||
      msg.includes("P2003") ||
      msg.includes("foreign key") ||
      msg.includes("syntax error") ||
      msg.includes("SELECT") ||
      msg.includes("INSERT") ||
      msg.includes("UPDATE") ||
      msg.includes("DELETE")
    ) {
      return fallback;
    }
    return msg;
  }

  return fallback;
}

export interface FileValidationOptions {
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

/**
 * Validates uploaded files to prevent arbitrary file upload, stored XSS,
 * and denial-of-service via large file storage (SEC-03).
 */
export function validateUploadedFile(
  file: unknown,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  if (!file || typeof file !== "object") {
    return { valid: false, error: "No file provided." };
  }

  const f = file as { name?: unknown; size?: unknown; type?: unknown };

  if (typeof f.size !== "number" || f.size <= 0) {
    return { valid: false, error: "Empty or invalid file uploaded." };
  }

  const {
    allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"],
    allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
  } = options;

  if (f.size > maxSizeBytes) {
    const mbLimit = (maxSizeBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
    return {
      valid: false,
      error: `File size exceeds permissible limit of ${mbLimit}MB.`,
    };
  }

  const rawName = typeof f.name === "string" ? f.name : "";
  const nameParts = rawName.split(".");
  const ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase().trim() : "";

  if (!ext || !allowedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension .${ext || "unknown"}. Permitted formats: ${allowedExtensions.join(", ")}.`,
    };
  }

  const rawMime = typeof f.type === "string" ? f.type.toLowerCase().trim() : "";

  // Explicitly block SVG and scriptable types even if someone tries to disguise them
  if (
    rawMime === "image/svg+xml" ||
    rawMime.includes("html") ||
    rawMime.includes("javascript") ||
    rawMime.includes("xml")
  ) {
    return {
      valid: false,
      error: "Unsupported file type. Executable or scriptable files (including SVG/HTML) are strictly forbidden.",
    };
  }

  if (
    allowedMimeTypes.length > 0 &&
    rawMime &&
    !allowedMimeTypes.some((m) => rawMime === m.toLowerCase())
  ) {
    return {
      valid: false,
      error: `Invalid file MIME type (${rawMime}). Allowed types: ${allowedMimeTypes.join(", ")}.`,
    };
  }

  return { valid: true };
}
