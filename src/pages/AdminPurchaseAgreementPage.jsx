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

const COMPANY_NAME = 'ReadyNest';
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
  'Interior residential cleaning',
  'Exterior residential cleaning',
  'Apartment and villa cleaning',
  'Vacation rental (Airbnb) turnover cleaning',
  'Move-in and move-out cleaning',
  'Scheduled recurring cleaning services',
  'Additional cleaning services and approved add-ons offered by Ready Nest',
];

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
  const documentRef = useRef(null);
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
  };

  const generateAgreementPdfBlob = async () => {
    if (!documentRef.current) {
      throw new Error('Agreement document is not ready for export.');
    }

    const canvas = await html2canvas(documentRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const ratio = usableWidth / imageWidth;
    const scaledHeight = imageHeight * ratio;
    const imageData = canvas.toDataURL('image/png', 1.0);

    if (scaledHeight <= usableHeight) {
      pdf.addImage(imageData, 'PNG', margin, margin, usableWidth, scaledHeight);
    } else {
      let remainingHeight = scaledHeight;
      let position = 0;

      pdf.addImage(imageData, 'PNG', margin, margin + position, usableWidth, scaledHeight);
      remainingHeight -= usableHeight;

      while (remainingHeight > 0) {
        position -= usableHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, margin + position, usableWidth, scaledHeight);
        remainingHeight -= usableHeight;
      }
    }

    return pdf.output('blob');
  };

  const handleSaveAgreement = async () => {
    if (!hasSignature) {
      toast({ title: 'Signature Required', description: 'Please sign the agreement before saving.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
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
    <div className="min-h-[calc(100vh-8rem)] rounded-3xl bg-slate-100 p-3 sm:p-6">
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
            <div ref={documentRef} className="bg-white p-5 sm:p-8 lg:p-12">
              <header className="border-b border-slate-200 pb-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">ReadyNest</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Service Agreement</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      This document records customer consent for the purchased service and confirms the details agreed with ReadyNest.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{COMPANY_NAME}</p>
                    <p>{COMPANY_CR}</p>
                    <p>{COMPANY_ADDRESS}</p>
                  </div>
                </div>
              </header>

              <section className="grid gap-4 border-b border-slate-200 py-6 text-sm text-slate-700 md:grid-cols-2">
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

              <section className="space-y-4 py-6 text-[15px] leading-8 text-slate-700">
                {PLACEHOLDER_AGREEMENT.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
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
              </section>
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
    </div>
  );
};

export default AdminPurchaseAgreementPage;
