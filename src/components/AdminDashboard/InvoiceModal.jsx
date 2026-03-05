import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInvoiceGeneration, generateInvoicePDF } from '@/hooks/useInvoiceGeneration';
import { Download, X, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const InvoiceModal = ({ isOpen, onClose, purchase }) => {
  const invoiceData = useInvoiceGeneration(purchase);
  const printRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  if (!isOpen || !purchase || !invoiceData) return null;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Small timeout to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      await generateInvoicePDF(printRef.current, invoiceData.invoiceNumber);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 bg-white sm:rounded-lg flex flex-col">
        {/* Modal Header - Fixed at top */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white z-10 shrink-0">
          <DialogTitle className="text-lg font-semibold">Invoice Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Content - Scrollable Area */}
        <div className="overflow-y-auto flex-1 bg-slate-100/50 p-4 md:p-8">
          {/* The printable area wrapper with white bg and shadow for paper effect */}
          <div
            id="invoice-printable-area"
            ref={printRef}
            className="mx-auto max-w-[800px] p-8 md:p-12 text-slate-900 bg-white shadow-sm border border-slate-200 min-h-[800px] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b border-slate-200 pb-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="https://raw.githubusercontent.com/Alsabbagh16/ReadyNestAssets/refs/heads/main/Asset%2017.png"
                    alt="ReadyNest"
                    className="h-16 w-auto max-w-[260px] object-contain"
                    loading="lazy"
                  />

                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{invoiceData.company.name}</h1>
                </div>
                <div className="text-sm text-slate-500 space-y-1">
                  <p>{invoiceData.company.address}</p>
                  <p>{invoiceData.company.email}</p>
                  <p>{invoiceData.company.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-light text-slate-400 mb-2 uppercase tracking-widest">Invoice</h2>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-700">#{invoiceData.invoiceNumber}</p>
                  <p className="text-slate-500">Date: {invoiceData.invoiceDate}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="uppercase text-xs font-semibold tracking-wider border-slate-300 text-slate-800">
                      {invoiceData.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-12 grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">{invoiceData.customer.name}</p>
                  <p className="whitespace-pre-line">{invoiceData.customer.address}</p>
                  <p>{invoiceData.customer.email}</p>
                  <p>{invoiceData.customer.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Service Details</h3>
                <div className="text-sm text-slate-700 space-y-1">
                  <p>Product: <span className="font-medium">{purchase.product_name}</span></p>
                  <p>Ref ID: {purchase.purchase_ref_id}</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="text-left py-3 font-semibold text-slate-600">Description</th>
                    <th className="text-center py-3 font-semibold text-slate-600 w-24">Qty</th>
                    <th className="text-right py-3 font-semibold text-slate-600 w-32">Unit Price</th>
                    <th className="text-right py-3 font-semibold text-slate-600 w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map((item, index) => (
                    <tr key={item.id || index} className="border-b border-slate-50">
                      <td className="py-4 text-slate-700">
                        <p className="font-medium">{item.description}</p>
                        {index === 0 && purchase.selected_addons?.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            Includes: {purchase.selected_addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-4 text-right text-slate-600">
                        {invoiceData.financials.currency} {item.unitPrice.toFixed(3)}
                      </td>
                      <td className="py-4 text-right font-medium text-slate-900">
                        {invoiceData.financials.currency} {item.total.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financials */}
            <div className="flex justify-end mb-12">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{invoiceData.financials.currency} {invoiceData.financials.subtotal.toFixed(3)}</span>
                </div>

                {invoiceData.financials.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>- {invoiceData.financials.currency} {invoiceData.financials.discount.toFixed(3)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-xl text-slate-900">
                    {invoiceData.financials.currency} {invoiceData.financials.total.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-slate-200 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-500">
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Notes</h4>
                  <p className="italic">{invoiceData.notes}</p>
                </div>
                <div className="md:text-right">
                  <h4 className="font-bold text-slate-700 mb-2">Terms & Conditions</h4>
                  <p>Payment is due on invoice.</p>
                  <p>Bank IBAN: BH78ALSA00388168100100</p>
                  <p>Thank you for choosing {invoiceData.company.name}.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;