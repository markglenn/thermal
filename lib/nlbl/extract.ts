import SevenZip from '7z-wasm';

interface ExtractedFiles {
  solutionXml: string;
  formatXml: string;
  formatName: string;
}

/**
 * Extract the XML files from an AES-encrypted .nlbl ZIP archive.
 * Uses 7-Zip (compiled to WASM) which natively supports AES-256 ZIP decryption.
 */
export async function extractNlblArchive(
  data: Buffer,
  password: string,
): Promise<ExtractedFiles> {
  const sevenZip = await SevenZip();
  const { FS } = sevenZip;

  // Write the .nlbl file into the WASM virtual filesystem
  FS.writeFile('/input.nlbl', new Uint8Array(data));
  FS.mkdir('/out');

  // Extract with password
  sevenZip.callMain(['x', `/input.nlbl`, `-p${password}`, '-o/out', '-y']);

  // Read extracted files
  let solutionXml: string | null = null;
  let formatXml: string | null = null;
  let formatName = 'Imported Label';

  const topEntries = FS.readdir('/out').filter((e: string) => e !== '.' && e !== '..');

  for (const entry of topEntries) {
    const path = `/out/${entry}`;
    const stat = FS.stat(path);

    if (FS.isFile(stat.mode)) {
      if (entry.endsWith('.slnx')) {
        solutionXml = FS.readFile(path, { encoding: 'utf8' });
      }
    } else if (FS.isDir(stat.mode) && entry === 'Formats') {
      const formats = FS.readdir(path).filter((e: string) => e !== '.' && e !== '..');
      if (formats.length > 0) {
        formatXml = FS.readFile(`${path}/${formats[0]}`, { encoding: 'utf8' });
        formatName = formats[0];
      }
    }
  }

  if (!solutionXml) {
    throw new Error('No solution file (.slnx) found in .nlbl archive');
  }
  if (!formatXml) {
    throw new Error('No format file found in .nlbl archive');
  }

  return { solutionXml, formatXml, formatName };
}
