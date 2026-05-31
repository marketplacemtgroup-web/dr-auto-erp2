export function isImageMime(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isVideoMime(mimeType: string) {
  return mimeType.startsWith("video/");
}
