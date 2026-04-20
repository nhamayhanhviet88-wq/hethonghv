// ========== IMAGE COMPRESSOR — SHARED UTILITY ==========
// Auto-resize and compress images before saving to disk
// Usage: const compressed = await compressImage(buffer, { maxWidth: 1200, quality: 80 });

const sharp = require('sharp');

/**
 * Compress an image buffer
 * @param {Buffer} inputBuffer - Raw image buffer
 * @param {Object} options
 * @param {number} [options.maxWidth=1200] - Maximum width in pixels
 * @param {number} [options.quality=80] - JPEG quality (1-100)
 * @returns {Promise<Buffer>} Compressed JPEG buffer
 */
async function compressImage(inputBuffer, options = {}) {
    const { maxWidth = 1200, quality = 80 } = options;
    try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        // Only resize if wider than maxWidth
        let pipeline = image;
        if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize(maxWidth, null, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Convert to JPEG with specified quality
        const compressed = await pipeline
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();

        return compressed;
    } catch (e) {
        console.error('[ImageCompressor] Error:', e.message);
        // If compression fails, return original buffer
        return inputBuffer;
    }
}

module.exports = { compressImage };
