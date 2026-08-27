import React from 'react';
import { Modal } from './Modal';
import { AntamLogo } from './AntamLogo';
import { FileText, Download, Printer, ShieldCheck, CheckCircle2, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentName: string;
  noSertifikat?: string;
  personilName?: string;
  jenisSertifikasi?: string;
  tanggalMulai?: string;
  tanggalExpired?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  documentName,
  noSertifikat = 'POP-2026-0001',
  personilName = 'FIANDRI',
  jenisSertifikasi = 'Pengawas Operasional Pertama (POP)',
  tanggalMulai = '31/07/2026',
  tanggalExpired = '31/07/2031',
}) => {
  const handleDownload = () => {
    // Trigger download simulation
    const dummyContent = `DOKUMEN SERTIFIKAT PERTAMBANGAN\nNomor: ${noSertifikat}\nNama: ${personilName}\nJenis: ${jenisSertifikasi}\nMasa Berlaku: ${tanggalMulai} - ${tanggalExpired}`;
    const blob = new Blob([dummyContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentName || `${noSertifikat}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{title} - {documentName}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-gray-100 dark:bg-slate-800 p-3 rounded-xl">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Document Viewer: <span className="font-mono text-blue-600 dark:text-blue-400">{documentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" /> Download PDF
            </button>
          </div>
        </div>

        {/* Certificate PDF Document Simulated Render */}
        <div className="border-4 border-blue-900/40 p-8 rounded-2xl bg-gradient-to-b from-slate-50 via-white to-blue-50/20 text-gray-900 shadow-inner relative overflow-hidden my-4 min-h-[480px] flex flex-col justify-between">
          {/* Certificate Header Stamp */}
          <div className="text-center space-y-2 border-b-2 border-blue-950/20 pb-6">
            <div className="flex items-center justify-center gap-3">
              <AntamLogo size="sm" showText={false} className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm" />
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-900 text-amber-400 font-extrabold text-xs tracking-wider shadow">
                <ShieldCheck className="w-4 h-4" /> KEMENTERIAN ESDM & PT ANTAM TBK
              </div>
            </div>
            <h2 className="text-2xl font-black text-blue-950 uppercase tracking-widest mt-2">
              SERTIFIKAT KOMPETENSI PERTAMBANGAN
            </h2>
            <p className="text-xs font-semibold text-gray-600 tracking-wide">
              NOMOR REGISTRASI: <span className="font-mono text-blue-900 font-bold">{noSertifikat}</span>
            </p>
          </div>

          {/* Certificate Body */}
          <div className="py-6 text-center space-y-4">
            <p className="text-xs text-gray-600 font-medium italic">Dengan ini menyatakan bahwa:</p>
            <h3 className="text-3xl font-extrabold text-blue-950 tracking-wider font-serif uppercase text-decoration underline decoration-amber-500 decoration-2 underline-offset-8">
              {personilName}
            </h3>
            <p className="text-xs text-gray-600 max-w-lg mx-auto leading-relaxed pt-2">
              Telah secara resmi memenuhi kriteria standar kualifikasi & lulus uji kompetensi operasional pertambangan untuk bidang:
            </p>

            <div className="py-3 px-6 bg-blue-900 text-white rounded-xl inline-block shadow-md">
              <div className="flex items-center gap-2 justify-center text-amber-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <span>{jenisSertifikasi}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 max-w-md mx-auto gap-4 pt-4 text-xs font-semibold">
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-400 block text-[10px]">Tanggal Terbit</span>
                <span className="text-blue-900 font-bold">{tanggalMulai}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-400 block text-[10px]">Masa Berlaku s/d</span>
                <span className="text-blue-900 font-bold">{tanggalExpired}</span>
              </div>
            </div>
          </div>

          {/* Certificate Footer Seal & QR Code */}
          <div className="pt-6 border-t-2 border-blue-950/20 flex justify-between items-end">
            <div className="text-center">
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm inline-block">
                <QRCodeSVG
                  value={`VERIFIED-CERT:${noSertifikat}|${personilName}|${jenisSertifikasi}`}
                  size={64}
                />
              </div>
              <p className="text-[9px] font-mono text-gray-500 mt-1">Scan to Verify Authenticity</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-600 text-emerald-700 flex items-center justify-center font-bold text-[9px] mx-auto bg-emerald-50 shadow-sm">
                OFFICIAL SEAL
              </div>
              <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 justify-center">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED VALID
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-gray-500">Direktur K3LH & Operasional PT ANTAM Tbk</p>
              <div className="h-12 border-b border-gray-400 w-36 my-1 flex items-end justify-center font-serif text-xs font-bold text-blue-950 italic">
                Ir. H. Antam Mining, M.T.
              </div>
              <p className="text-[10px] font-semibold text-gray-700">NIP. 19780512 200212 1 001</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
