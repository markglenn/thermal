import type { RfidConfig, RfidMemoryBank } from '../types';
import { emitFieldData } from './escape';

const MEMORY_BANK: Record<RfidMemoryBank, number> = {
  epc: 1,
  user: 3,
};

const ERROR_CODE: Record<string, string> = {
  none: 'N',
  overstrike: 'O',
  eject: 'E',
};

/** Generate RFID ZPL commands for a label-level RFID config. */
export function generateRfidZpl(config: RfidConfig, data?: string): string[] {
  if (!config.enabled) return [];

  const lines: string[] = [];
  const err = ERROR_CODE[config.errorHandling] ?? 'N';
  lines.push(`^RS8,,N,${config.retries},${err}`);

  const writeData = data ?? config.data;
  if (!writeData) return lines;

  if (config.writeMode === 'epc') {
    const numBytes = Math.ceil(writeData.length / 2);
    lines.push(`^RFW,H,1,0,${numBytes}`);
    lines.push(emitFieldData(writeData));
  } else {
    const format = config.dataFormat === 'hex' ? 'H' : 'A';
    const bank = MEMORY_BANK[config.memoryBank];
    const numBytes = config.dataFormat === 'hex'
      ? Math.ceil(writeData.length / 2)
      : writeData.length;
    lines.push(`^RFW,${format},${bank},${config.startBlock},${numBytes}`);
    lines.push(emitFieldData(writeData));
  }

  return lines;
}
