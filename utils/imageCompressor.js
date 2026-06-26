// ========== IMAGE COMPRESSOR — Dùng chung toàn hệ thống ==========
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Compress and optimize an image file
 * - Resize nếu quá lớn (max 1200px width)
 * - Convert sang WebP (tiết kiệm 60-80% dung lượng)
 * - Quality 75% (cân bằng chất lượng/dung lượng)
 *
 * @param {Buffer} inputBuffer - Buffer ảnh gốc
 * @param {Object} options
 * @param {number} options.maxWidth - Max width (default 1200)
 * @param {number} options.quality - Quality 1-100 (default 75)
 * @param {string} options.format - 'webp'|'jpeg'|'png' (default 'webp')
 * @returns {Promise<{buffer: Buffer, format: string, originalSize: number, compressedSize: number, ratio: string}>}
 */
async function compressImage(inputBuffer, options = {}) {
    const maxWidth = options.maxWidth || 1200;
    const quality = options.quality || 75;
    const format = options.format || 'webp';
    const originalSize = inputBuffer.length;

    let pipeline = sharp(inputBuffer).rotate();
    const metadata = await pipeline.metadata();

    // Resize if too wide
    if (metadata.width && metadata.width > maxWidth) {
        pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true });
    }

    // Convert to chosen format
    let outputBuffer;
    if (format === 'webp') {
        outputBuffer = await pipeline.webp({ quality }).toBuffer();
    } else if (format === 'jpeg' || format === 'jpg') {
        outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    } else {
        outputBuffer = await pipeline.png({ quality: Math.min(quality, 100), compressionLevel: 8 }).toBuffer();
    }

    const compressedSize = outputBuffer.length;
    const ratio = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

    return { buffer: outputBuffer, format, originalSize, compressedSize, ratio: ratio + '%' };
}

/**
 * Compress and save image to disk
 * @param {Buffer} inputBuffer
 * @param {string} outputDir
 * @param {string} filenamePrefix
 * @param {Object} options
 */
async function compressAndSave(inputBuffer, outputDir, filenamePrefix, options = {}) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const result = await compressImage(inputBuffer, options);
    const ext = result.format === 'webp' ? '.webp' : result.format === 'jpeg' ? '.jpg' : '.png';
    const fileName = `${filenamePrefix}${Date.now()}${ext}`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, result.buffer);
    console.log(`[ImageCompressor] ${(result.originalSize/1024).toFixed(0)}KB -> ${(result.compressedSize/1024).toFixed(0)}KB (giam ${result.ratio})`);

    return { filePath, fileName, originalSize: result.originalSize, compressedSize: result.compressedSize, ratio: result.ratio };
}

module.exports = { compressImage, compressAndSave };
