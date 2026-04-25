import { useMemo } from 'react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const useInvoiceGeneration = (purchase) => {
  return useMemo(() => {
    if (!purchase) return null;

    // 1. Generate Invoice Number
    const invoiceNumber = purchase.purchase_ref_id || `INV-${Math.floor(Math.random() * 1000000)}`;

    // 2. Format Dates
    const invoiceDate = purchase.created_at ? format(new Date(purchase.created_at), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');
    const dueDate = purchase.created_at ? format(new Date(purchase.created_at), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');

    // 3. Customer Information
    const customerName = purchase.profiles 
        ? `${purchase.profiles.first_name || ''} ${purchase.profiles.last_name || ''}`.trim() 
        : purchase.name || 'Guest Customer';

    const customerEmail = purchase.email || purchase.user_email || 'N/A';
    
    // Prioritize user contact phone, fallback to profile phone
    const customerPhone = purchase.user_phone || purchase.profiles?.phone || 'N/A';

    // Address formatting
    const addressObj = purchase.address || {};
    const customerAddress = [
        addressObj.street,
        addressObj.city,
        addressObj.zip
    ].filter(Boolean).join(', ') || 'Address not provided';

    // 4. Line Items Construction
    const lineItems = [];

    // Calculate the original amount (before discount)
    const discount = Number(purchase.discount_amount || 0);
    const paidAmount = Number(purchase.paid_amount || 0);
    
    // If there's a discount, the original amount is paid + discount
    // If original_amount is stored, use that as the source of truth
    const originalAmount = purchase.original_amount 
        ? Number(purchase.original_amount) 
        : (discount > 0 ? paidAmount + discount : paidAmount);

    // Main Service Item - use original amount (pre-discount) for unit price
    lineItems.push({
        id: 'service-main',
        description: purchase.product_name || 'Service Charge',
        quantity: 1,
        unitPrice: originalAmount,
        total: originalAmount
    });
    
    // Addons handling - primarily informational if included in base price
    if (purchase.selected_addons && Array.isArray(purchase.selected_addons) && purchase.selected_addons.length > 0) {
       // Logic for addons can be expanded here if prices are separate
    }

    // 5. Calculations
    // Subtotal is the sum of line items (pre-discount amount)
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0; 
    const taxAmount = (subtotal - discount) * taxRate;
    const total = (subtotal - discount) + taxAmount;

    // Use final_amount_due_on_arrival if available as the source of truth for Total
    const finalTotal = purchase.final_amount_due_on_arrival !== null 
        ? Number(purchase.final_amount_due_on_arrival) 
        : total;

    return {
        invoiceNumber,
        invoiceDate,
        dueDate,
        customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress
        },
        company: {
            name: "",
            address: "CR: 183715-1, Block 213, Road 51, Building 564, Flat 21, Muharraq, Bahrain",
            email: "support@readynest.co",
            phone: "+973 33215180",
            website: "www.readynest.co"
        },
        lineItems,
        financials: {
            subtotal: subtotal,
            discount: discount,
            tax: taxAmount,
            total: finalTotal,
            currency: "BHD"
        },
        notes: purchase.notes || "Thank you for your business!",
        status: purchase.status
    };
  }, [purchase]);
};

// Enhancement: PDF Generation Utility
export const generateInvoicePDF = async (element, invoiceNumber) => {
    if (!element) throw new Error("Invoice element not found");

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 5000,
            removeContainer: true,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById('invoice-export-area') || clonedDoc.getElementById('invoice-printable-area');
                if (clonedElement) {
                    clonedElement.style.overflow = 'visible';
                    clonedElement.style.height = 'auto';
                    clonedElement.style.maxHeight = 'none';
                    clonedElement.style.width = '800px';
                    clonedElement.style.color = '#000000';
                    clonedElement.style.backgroundColor = '#ffffff';
                }
            }
        });

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = pdfWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (scaledHeight <= pdfHeight) {
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
        } else {
            let heightLeft = scaledHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
                heightLeft -= pdfHeight;
            }
        }

        pdf.save(`invoice-${invoiceNumber}.pdf`);
        return true;
        
    } catch (error) {
        console.error("PDF generation failed:", error);
        throw new Error(`PDF generation failed: ${error.message}. Please try on desktop device.`);
    }
};
