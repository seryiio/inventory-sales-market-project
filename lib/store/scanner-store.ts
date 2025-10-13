import { create } from "zustand";

interface ScannerStore {
  showScanner: boolean;
  scannedBarcode: string | null;
  openScanner: () => void;
  closeScanner: () => void;
  setScannedBarcode: (barcode: string) => void;
}

export const useScannerStore = create<ScannerStore>((set) => ({
  showScanner: false,
  scannedBarcode: null,
  openScanner: () => set({ showScanner: true }),
  closeScanner: () => set({ showScanner: false }),
  setScannedBarcode: (barcode) => set({ scannedBarcode: barcode, showScanner: false }),
}));
