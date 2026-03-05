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
        addressObj.state,
        addressObj.zip
    ].filter(Boolean).join(', ') || 'Address not provided';

    // 4. Line Items Construction
    const lineItems = [];

    // Main Service Item
    lineItems.push({
        id: 'service-main',
        description: purchase.product_name || 'Service Charge',
        quantity: 1,
        unitPrice: Number(purchase.paid_amount || 0),
        total: Number(purchase.paid_amount || 0)
    });
    
    // Addons handling - primarily informational if included in base price
    if (purchase.selected_addons && Array.isArray(purchase.selected_addons) && purchase.selected_addons.length > 0) {
       // Logic for addons can be expanded here if prices are separate
    }

    // 5. Calculations
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discount = Number(purchase.discount_amount || 0);
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
            phone: "+973 1234 5678",
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
    
    // Better mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      (window.innerWidth <= 768 && 'ontouchstart' in window);
    
    console.log("PDF generation attempt - isMobile:", isMobile, "User agent:", navigator.userAgent);
    
    try {
        // For mobile, try a completely different approach
        if (isMobile) {
            console.log("Using mobile-first approach");
            const mobileSuccess = await generateMobilePDF(element, invoiceNumber);
            if (mobileSuccess) {
                return true;
            } else {
                throw new Error("Mobile PDF generation failed. Please try on desktop device for full invoice details.");
            }
        }
        
        // Desktop approach
        console.log("Using desktop approach");
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
                const clonedElement = clonedDoc.getElementById('invoice-printable-area');
                if (clonedElement) {
                    clonedElement.style.overflow = 'visible';
                    clonedElement.style.height = 'auto';
                    clonedElement.style.maxHeight = 'none';
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

// Separate mobile PDF generation function
const generateMobilePDF = async (element, invoiceNumber) => {
    try {
        console.log("Starting mobile PDF generation");
        
        // Extract invoice data from the element
        const customerName = element.querySelector('.font-bold')?.textContent || 'N/A';
        const customerAddress = element.querySelector('.whitespace-pre-line')?.textContent || 'N/A';
        const customerEmail = element.querySelector('.text-slate-500:nth-of-type(2)')?.textContent || 'N/A';
        const customerPhone = element.querySelector('.text-slate-500:nth-of-type(3)')?.textContent || 'N/A';
        const productName = element.querySelector('.font-medium')?.textContent || 'Service';
        const invoiceDate = element.querySelector('.text-slate-500:nth-of-type(2)')?.textContent || new Date().toLocaleDateString();
        const amount = element.querySelector('.text-xl')?.textContent || 'N/A';
        const status = element.querySelector('.text-xs')?.textContent || 'PAID';
        
        // Create a comprehensive invoice using native canvas
        const canvas = document.createElement('canvas');
        canvas.width = 800; // A4 width in pixels at 96 DPI
        canvas.height = 1120; // A4 height in pixels at 96 DPI (approx 297mm)
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 1120);
        
        let yPosition = 60;
        
        // Load and draw logo
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'https://raw.githubusercontent.com/Alsabbagh16/ReadyNestAssets/refs/heads/main/Asset%2017.png';
        
        await new Promise((resolve) => {
            img.onload = () => {
                // Draw logo
                ctx.drawImage(img, 50, yPosition, 200, 60);
                resolve();
            };
            img.onerror = () => {
                // Fallback to text if image fails
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 24px Arial';
                ctx.fillText('ReadyNest', 50, yPosition + 35);
                resolve();
            };
        });
        
        // Text wrapping helper function
        const wrapText = (ctx, text, maxWidth) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0];
            
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + " " + word).width;
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
            return lines;
        };
        
        // Company Info (under logo) - separate from customer section
        yPosition += 80;
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText('CR: 183715-1', 50, yPosition);
        yPosition += 20;
        ctx.fillText('Block 213, Road 51, Building 564, Flat 21, Muharraq, Bahrain', 50, yPosition);
        yPosition += 20;
        ctx.fillText('support@readynest.co', 50, yPosition);
        yPosition += 20;
        ctx.fillText('+973 1234 5678', 50, yPosition);
        yPosition += 40; // Extra space before invoice header
        
        // Invoice Header (Right side)
        yPosition = 80;
        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = '#9ca3af'; // Light gray color for "INVOICE"
        ctx.fillText('INVOICE', 500, yPosition);
        yPosition += 25;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`#${invoiceNumber}`, 500, yPosition);
        yPosition += 20;
        ctx.fillText(`Date: ${invoiceDate}`, 500, yPosition);
        yPosition += 30;
        
        // Status Badge (centered under invoice)
        ctx.fillStyle = '#f3f4f6'; // Light background for badge
        ctx.fillRect(450, yPosition - 15, 100, 25);
        ctx.strokeStyle = '#d1d5db'; // Border color
        ctx.lineWidth = 1;
        ctx.strokeRect(450, yPosition - 15, 100, 25);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(status.toUpperCase(), 500, yPosition);
        yPosition += 45;
        
        // Bill To Section
        yPosition = 240;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('BILL TO', 50, yPosition);
        yPosition += 30;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        
        // Handle long customer name with text wrapping
        const maxTextWidth = 300;
        const customerNameLines = wrapText(ctx, customerName, maxTextWidth);
        customerNameLines.forEach((line, index) => {
            ctx.fillText(line, 50, yPosition + (index * 18));
        });
        yPosition += customerNameLines.length * 18 + 20;
        
        // Handle long address with text wrapping
        const addressLines = wrapText(ctx, customerAddress, maxTextWidth);
        addressLines.forEach((line, index) => {
            ctx.fillText(line, 50, yPosition + (index * 18));
        });
        yPosition += addressLines.length * 18 + 20;
        
        ctx.fillText(customerEmail, 50, yPosition);
        yPosition += 20;
        ctx.fillText(customerPhone, 50, yPosition);
        yPosition += 40;
        
        // Service Details Section (Right side)
        yPosition = 240;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('SERVICE DETAILS', 400, yPosition);
        yPosition += 30;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Product: ${productName}`, 400, yPosition);
        yPosition += 20;
        ctx.fillText(`Ref ID: ${invoiceNumber}`, 400, yPosition);
        yPosition += 60;
        
        // Line Items Table
        yPosition = 420;
        ctx.font = '12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Description', 100, yPosition);
        ctx.fillText('Qty', 300, yPosition);
        ctx.fillText('Unit Price', 450, yPosition);
        ctx.fillText('Total', 600, yPosition);
        yPosition += 20;
        
        // Table header line
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, yPosition);
        ctx.lineTo(650, yPosition);
        ctx.stroke();
        yPosition += 30;
        
        // Table content
        ctx.fillStyle = '#000000';
        ctx.fillText(productName, 100, yPosition);
        ctx.fillText('1', 300, yPosition);
        ctx.fillText(`BHD ${amount}`, 450, yPosition);
        ctx.fillText(`BHD ${amount}`, 600, yPosition);
        yPosition += 40;
        
        // Table bottom line
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, yPosition);
        ctx.lineTo(650, yPosition);
        ctx.stroke();
        yPosition += 40;
        
        // Financial Summary (Right aligned)
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Total', 500, yPosition);
        yPosition += 25;
        
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`BHD ${amount}`, 500, yPosition);
        yPosition += 60;
        
        // Footer Section
        yPosition = 680;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Notes', 50, yPosition);
        yPosition += 25;
        
        ctx.font = 'italic 12px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText('Thank you for choosing ReadyNest.', 50, yPosition);
        yPosition += 40;
        
        // Terms & Conditions (Right side)
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Terms & Conditions', 400, yPosition);
        yPosition += 25;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText('Payment is due on invoice.', 400, yPosition);
        yPosition += 20;
        ctx.fillText('Bank IBAN: BH78ALSA00388168100100', 400, yPosition);
        yPosition += 20;
        ctx.fillText('Thank you for choosing ReadyNest.', 400, yPosition);
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
        pdf.save(`invoice-${invoiceNumber}.pdf`);
        
        console.log("Mobile PDF generation successful");
        return true;
    } catch (error) {
        console.error("Mobile PDF generation failed:", error);
        // Return false instead of throwing to avoid main catch
        return false;
    }
};