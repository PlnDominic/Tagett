import sharp from 'sharp'

// Shared image-compression policy for anything Tagett stores or commits — this
// is what stops a project screenshot from ever again bloating projects.json
// past GitHub's 1MB inline-content limit (see the "Thrive Edu Website"
// incident: a single unresized PNG embedded as a data: URI hit 2.1MB).
//
// WebP at these settings comfortably beats JPEG/PNG on size for real project
// screenshots while keeping transparency support, and is supported by every
// browser this website needs to run in.
const MAX_WIDTH = 1600
const WEBP_QUALITY = 80

export interface CompressedImage {
  buffer: Buffer
  contentType: string
  ext: string
}

// Re-encodes any input image (png/jpg/gif/webp/etc.) into a size-capped WebP.
// withoutEnlargement means a small image is only re-compressed, never upscaled.
export async function compressImage(input: Buffer): Promise<CompressedImage> {
  const buffer = await sharp(input)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
  return { buffer, contentType: 'image/webp', ext: 'webp' }
}
