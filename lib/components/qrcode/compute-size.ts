import type { QrCodeProperties, QrErrorCorrection } from '@/lib/types';

const ZPL_QR_TOP_GAP = 10;

/**
 * QR Code byte-mode capacity per version (1–40) and error correction level.
 * Values from ISO/IEC 18004 Table 7.
 */
const QR_BYTE_CAPACITY: Record<QrErrorCorrection, number[]> = {
  L: [
    17, 32, 53, 78, 106, 134, 154, 192, 230, 271,
    321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
    929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732,
    1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953,
  ],
  M: [
    14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
    711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370,
    1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
  ],
  Q: [
    11, 20, 32, 46, 60, 74, 86, 108, 130, 151,
    177, 203, 241, 258, 292, 322, 364, 394, 442, 482,
    509, 565, 611, 661, 715, 751, 805, 868, 908, 982,
    1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663,
  ],
  H: [
    7, 14, 24, 34, 44, 58, 64, 84, 98, 119,
    137, 155, 177, 194, 220, 250, 280, 310, 338, 382,
    403, 439, 461, 511, 535, 593, 625, 658, 698, 742,
    790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273,
  ],
};

const MAX_VERSION = 40;

/**
 * Determine the minimum QR version needed to encode the given content
 * at the specified error correction level (byte mode).
 */
function computeQrVersion(contentLength: number, errorCorrection: QrErrorCorrection): number {
  const capacities = QR_BYTE_CAPACITY[errorCorrection];
  for (let i = 0; i < capacities.length; i++) {
    if (capacities[i] >= contentLength) {
      return i + 1; // versions are 1-indexed
    }
  }
  return MAX_VERSION;
}

/**
 * Compute the size of a QR code component purely from its properties.
 * No DOM measurement — deterministic from props alone.
 */
export function computeQrCodeSize(props: QrCodeProperties): { width: number; height: number } {
  const { content, magnification, errorCorrection } = props;

  const contentLength = content.length || 1; // QR always encodes at least 1 byte
  const version = computeQrVersion(contentLength, errorCorrection);
  const moduleCount = 17 + 4 * version;
  const size = moduleCount * magnification;

  return {
    width: size,
    height: size + ZPL_QR_TOP_GAP,
  };
}
