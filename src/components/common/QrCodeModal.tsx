import React from 'react';
import { Modal } from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ShieldCheck, Download, Copy, Check } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noSertifikat: string;
  personilName: string;
  jenisSertifikasi: string;
  tanggalExpired: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  noSertifikat,
  personilName,
  jenisSertifikasi,
  tanggalExpired,
}) => {
  const [copied, setCopied] = React.useState(false);
  const verifyUrl = `https://sim-sertifikasi.mining.co.id/verify?cert=${encodeURIComponent(
    noSertifikat
  )}&name=${encodeURIComponent(personilName)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>QR Code Verifikasi Sertifikat</span>
        </div>
      }
    >
      <div className="space-y-6 text-center py-2">
        <div className="p-6 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-blue-600/30 inline-block shadow-lg relative">
          <QRCodeSVG value={verifyUrl} size={180} includeMargin level="H" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-900 text-amber-400 rounded-full text-[9px] font-extrabold flex items-center gap-1 shadow">
            <ShieldCheck className="w-3 h-3" /> OFFICIAL QR STAMP
          </div>
        </div>

        <div className="space-y-1 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-200 dark:border-slate-800 text-left text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Pegawai:</span>
            <span className="font-bold text-gray-900 dark:text-white">{personilName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">No. Sertifikat:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{noSertifikat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Jenis Sertifikasi:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{jenisSertifikasi}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Masa Berlaku s/d:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{tanggalExpired}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Tersalin!' : 'Salin URL Verifikasi'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
