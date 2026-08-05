import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Check, Eraser, Loader2, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatPreferredBookingDateForAdmin } from '@/lib/dateTimeHelpers';
import {
  getPurchaseByRef,
  updatePurchase,
  uploadPurchaseAgreementPdf,
} from '@/lib/storage/purchaseStorage';

const COMPANY_NAME = 'ReadyNest Cleaning & Maintenance Services W.L.L.';
const COMPANY_CR = 'CR: 183715-1';
const COMPANY_ADDRESS = 'Block 213, Road 51, Building 564, Flat 21, Muharraq, Bahrain';

const PLACEHOLDER_AGREEMENT = [
  'Ready Nest Cleaning & Maintenance Agreement',
  'This Service Agreement ("Agreement") is entered into between Ready Nest Cleaning Services ("Ready Nest", "Company", "we", "our", or "us") and the customer ("Client", "you", or "your").',
  '1. Nature of the Service',
  'Ready Nest is a professional cleaning services company that provides scheduled residential and commercial cleaning services for the interior and exterior of homes and properties.',
  'The Client is purchasing a cleaning service, and not the services or employment of an individual cleaner or domestic worker. Any personnel assigned by Ready Nest remain employees or authorized representatives of the Company and are selected, managed, supervised, scheduled, and replaced solely at Ready Nest\'s discretion.',
  'Where pricing is based on the estimated time required to complete the requested cleaning, the stated hours are used solely as a pricing and scheduling metric and do not constitute the hiring, leasing, or rental of cleaning personnel.',
  'Ready Nest is solely responsible for assigning the appropriate number of cleaning staff, determining the cleaning methods, and managing the execution of the requested cleaning service in accordance with the selected package.',
  'The scope of the service includes, but is not limited to:',
  'Interior residential cleaning, Exterior residential cleaning, Apartment and villa cleaning, Vacation rental (Airbnb) turnover cleaning, Move-in and move-out cleaning',
  'Scheduled recurring cleaning services, Additional cleaning services and approved add-ons offered by Ready Nest',
];

const EXPORT_PAGE_WIDTH_PX = 794;
const EXPORT_PAGE_HEIGHT_PX = 1123;

const getTrimmedSignatureDataUrl = (canvas) => {
  if (!canvas) return '';

  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height).data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = imageData[index + 3];
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const isInkPixel = alpha > 0 && !(red > 245 && green > 245 && blue > 245);

      if (isInkPixel) {
        hasInk = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasInk) return '';

  const padding = 24;
  const cropX = Math.max(minX - padding, 0);
  const cropY = Math.max(minY - padding, 0);
  const cropWidth = Math.min(maxX - minX + (padding * 2), width - cropX);
  const cropHeight = Math.min(maxY - minY + (padding * 2), height - cropY);
  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropWidth;
  trimmedCanvas.height = cropHeight;
  const trimmedContext = trimmedCanvas.getContext('2d');

  trimmedContext.fillStyle = '#ffffff';
  trimmedContext.fillRect(0, 0, cropWidth, cropHeight);
  trimmedContext.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return trimmedCanvas.toDataURL('image/png');
};

const AgreementDocument = ({ purchase, signatureImageUrl, exportMode = false }) => (
  <div
    style={exportMode ? { width: `${EXPORT_PAGE_WIDTH_PX}px`, height: `${EXPORT_PAGE_HEIGHT_PX}px` } : undefined}
    className={`bg-white text-slate-900 ${
      exportMode
        ? 'overflow-hidden px-10 py-8'
        : 'p-5 sm:p-8 lg:p-12'
    }`}
  >
    <header className={`border-b border-slate-200 ${exportMode ? 'pb-4' : 'pb-6'}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`font-semibold uppercase text-primary ${exportMode ? 'text-[10px] tracking-[0.24em]' : 'text-xs tracking-[0.3em]'}`}>
            ReadyNest
          </p>
          <h1 className={`mt-2 font-bold tracking-tight text-slate-950 ${exportMode ? 'text-[28px]' : 'text-3xl sm:text-4xl'}`}>
            Service Agreement
          </h1>
          <p className={`mt-3 max-w-2xl text-slate-600 ${exportMode ? 'text-[12px] leading-5' : 'text-sm leading-6'}`}>
            This document records customer consent for the purchased service and confirms the details agreed with ReadyNest.
          </p>
        </div>
        <div className={`rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 ${exportMode ? 'px-3 py-2 text-[11px] leading-4' : 'px-4 py-3 text-sm'}`}>
          <p className="font-semibold text-slate-900">{COMPANY_NAME}</p>
          <p>{COMPANY_CR}</p>
          <p>{COMPANY_ADDRESS}</p>
        </div>
      </div>
    </header>

    <section className={`grid gap-4 border-b border-slate-200 text-sm text-slate-700 md:grid-cols-2 ${exportMode ? 'py-4 text-[11px] leading-4' : 'py-6'}`}>
      <div className="space-y-1">
        <p><span className="font-semibold text-slate-900">Purchase Ref:</span> {purchase.purchase_ref_id}</p>
        <p><span className="font-semibold text-slate-900">Customer:</span> {purchase.name || 'Guest'}</p>
        <p><span className="font-semibold text-slate-900">Email:</span> {purchase.email || 'N/A'}</p>
        <p><span className="font-semibold text-slate-900">Mobile:</span> {purchase.user_phone || purchase.profiles?.phone || 'N/A'}</p>
      </div>
      <div className="space-y-1">
        <p><span className="font-semibold text-slate-900">Service:</span> {purchase.product_name || 'Custom Purchase'}</p>
        <p><span className="font-semibold text-slate-900">Preferred Date:</span> {formatPreferredBookingDateForAdmin(purchase.preferred_booking_date)}</p>
        <p><span className="font-semibold text-slate-900">Service Address:</span> {purchase.address?.city || purchase.address?.street || 'N/A'}</p>
        <p><span className="font-semibold text-slate-900">Generated:</span> {new Date().toLocaleString()}</p>
      </div>
    </section>

    <section className={`text-slate-700 ${exportMode ? 'space-y-1.5 py-4 text-[10.5px] leading-[1.35rem]' : 'space-y-4 py-6 text-[15px] leading-8'}`}>
      {PLACEHOLDER_AGREEMENT.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </section>

    {exportMode && (
      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div>
            <p className="text-[15px] font-semibold text-slate-900">I Consent</p>
            <p className="text-[11px] text-slate-500">
              Please sign below to confirm acceptance of this service agreement.
            </p>
          </div>
        </div>
        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2 shadow-inner">
          {signatureImageUrl ? (
            <img
              src={signatureImageUrl}
              alt="Signature"
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
        </div>
      </section>
    )}
  </div>
);

const getPointerPosition = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const nativeEvent = event.nativeEvent || event;

  if (nativeEvent.touches?.[0]) {
    return {
      x: nativeEvent.touches[0].clientX - rect.left,
      y: nativeEvent.touches[0].clientY - rect.top,
    };
  }

  return {
    x: nativeEvent.clientX - rect.left,
    y: nativeEvent.clientY - rect.top,
  };
};

const SignatureCanvas = ({ onSigned, canvasRef }) => {
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.clientWidth;
    const height = container.clientHeight;
    const context = canvas.getContext('2d');
    const existingImage = canvas.width > 0 ? canvas.toDataURL('image/png') : null;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    if (existingImage && existingImage !== 'data:,') {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
      };
      image.src = existingImage;
    }
  }, [canvasRef]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const point = getPointerPosition(event, canvas);

    drawingRef.current = true;
    lastPointRef.current = point;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;

    const context = canvas.getContext('2d');
    const point = getPointerPosition(event, canvas);
    const lastPoint = lastPointRef.current || point;

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    lastPointRef.current = point;
    onSigned?.(true);
  };

  const endDrawing = (event) => {
    event.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div ref={containerRef} className="h-52 w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none rounded-2xl"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerLeave={endDrawing}
      />
    </div>
  );
};

const AdminPurchaseAgreementPage = () => {
  const { purchaseRefId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureImageUrl, setSignatureImageUrl] = useState('');
  const exportDocumentRef = useRef(null);
  const signatureCanvasRef = useRef(null);

  const fetchPurchase = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchaseByRef(purchaseRefId);
      if (!data) {
        navigate('/admin-dashboard/purchases', { replace: true });
        return;
      }
      setPurchase(data);
    } catch (error) {
      console.error('Error fetching purchase agreement context:', error);
      toast({ title: 'Error', description: 'Could not load purchase agreement details.', variant: 'destructive' });
      navigate(`/admin-dashboard/purchase/${purchaseRefId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate, purchaseRefId, toast]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setHasSignature(false);
    setSignatureImageUrl('');
  };

  const generateAgreementPdfBlob = async () => {
    if (!exportDocumentRef.current) {
      throw new Error('Agreement document is not ready for export.');
    }

    const canvas = await html2canvas(exportDocumentRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight);

    return pdf.output('blob');
  };

  const handleSaveAgreement = async () => {
    if (!hasSignature) {
      toast({ title: 'Signature Required', description: 'Please sign the agreement before saving.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const trimmedSignature = getTrimmedSignatureDataUrl(signatureCanvasRef.current);
      if (!trimmedSignature) {
        throw new Error('Could not read the signature. Please sign again.');
      }
      setSignatureImageUrl(trimmedSignature);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const pdfBlob = await generateAgreementPdfBlob();
      const uploadResult = await uploadPurchaseAgreementPdf(purchaseRefId, pdfBlob);
      const signedAt = new Date().toISOString();

      await updatePurchase(purchaseRefId, {
        agreement_document_path: uploadResult.storagePath,
        agreement_signed_at: signedAt,
        agreement_file_name: uploadResult.fileName,
      });

      toast({ title: 'Agreement Saved', description: 'The signed agreement was saved successfully.' });
      navigate(`/admin-dashboard/purchase/${purchaseRefId}`);
    } catch (error) {
      console.error('Error saving purchase agreement:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save the signed agreement.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-slate-500">Loading agreement...</div>;
  }

  if (!purchase) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] rounded-3xl bg-slate-100 p-3 pb-8 sm:p-6 sm:pb-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin-dashboard/purchase/${purchaseRefId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Close
            </Link>
          </Button>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Purchase Agreement</p>
            <p className="text-sm text-slate-600">{purchase.purchase_ref_id}</p>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-xl">
          <CardContent className="p-0">
            <div className="bg-white">
              <AgreementDocument purchase={purchase} signatureImageUrl="" exportMode={false} />
              <div className="px-5 pb-8 sm:px-8 sm:pb-5 lg:px-12">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">I Consent</p>
                      <p className="text-sm text-slate-500">Please sign below to confirm acceptance of this service agreement.</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                      <Eraser className="mr-2 h-4 w-4" /> Clear
                    </Button>
                  </div>
                  <SignatureCanvas canvasRef={signatureCanvasRef} onSigned={setHasSignature} />
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Check className={`h-4 w-4 ${hasSignature ? 'text-green-600' : 'text-slate-300'}`} />
                    {hasSignature ? 'Signature captured and ready to save.' : 'Use your finger or stylus to sign.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-8 lg:px-12">
              <Button type="button" variant="outline" asChild disabled={saving}>
                <Link to={`/admin-dashboard/purchase/${purchaseRefId}`}>Close</Link>
              </Button>
              <Button type="button" onClick={handleSaveAgreement} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
        <div ref={exportDocumentRef}>
          <AgreementDocument purchase={purchase} signatureImageUrl={signatureImageUrl} exportMode={true} />
        </div>
      </div>
    </div>
  );
};

export default AdminPurchaseAgreementPage;
