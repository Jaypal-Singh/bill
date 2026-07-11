import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import logo from '../../assets/logo.jpeg';

import autoTable from "jspdf-autotable";
const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
    });
};
// Helper for standard Indian currency formatting
const formatIndianCurrency = (n) => {
    const num = Number(n ?? 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper for profit/loss sign formatting (+/- at the back)
const formatProfitLoss = (n) => {
    const num = Number(n ?? 0);
    const sign = num >= 0 ? '+' : '-';
    const absVal = Math.abs(num);
    return `${sign}₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0`;
};

// Helper to format date to DD MMM (e.g. 30 JUN)
const formatDDMMM = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${day} ${months[date.getMonth()]}`;
};

export default function Invoice() {
    const navigate = useNavigate();
    const { id: customerId } = useParams();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [margin, setMargin] = useState(''); // Margin Input State
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [invoiceData, setInvoiceData] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [summary, setSummary] = useState({ totalTurnover: 0, totalProfit: 0, totalLoss: 0, totalBrokerage: 0, netPnl: 0 });
    const [fetchStatus, setFetchStatus] = useState(''); // For UI debug
    const [filterStats, setFilterStats] = useState({ total: 0, matched: 0, range: '' });
    const [clientName, setClientName] = useState('');
    const [clientCode, setClientCode] = useState('');

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const userInfoStr = localStorage.getItem('userInfo');
                if (!userInfoStr) return;
                const userInfo = JSON.parse(userInfoStr);
                const ownerId = userInfo?._id;
                if (!ownerId) return;

                const res = await api.get(`/customers?ownerId=${ownerId}`);
                const customer = res.data.find(c => c._id === customerId);
                if (customer) {
                    setClientName(customer.name);
                    setClientCode(customer.customerId);
                }
            } catch (err) {
                console.error("Failed to fetch customer", err);
            }
        };
        fetchCustomer();
    }, [customerId]);

    // Fetch Orders (Exit records)
    const fetchOrders = async () => {
        setLoading(true);
        setFetchStatus('Fetching...');
        try {
            const res = await api.get(`/trades/weekly/${customerId}`);
            const count = res.data?.length || 0;
            setFetchStatus(`Loaded ${count} closed orders from server.`);
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('[Invoice] Fetch Failed:', err);
            setFetchStatus(`Fetch Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Set default dates (start of month to today)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);

        fetchOrders();
    }, [customerId]);

    const generateInvoice = () => {
        if (!startDate || !endDate) return;

        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);

        const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

        const filtered = orders.filter(o => {
            const fallbackDate = o.date || o.createdAt;
            if (!fallbackDate) return false;
            const date = new Date(fallbackDate);
            return date >= start && date <= end;
        });

        setFilterStats({
            total: orders.length,
            matched: filtered.length,
            range: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
        });

        // Generate Invoice ID if not already set
        if (!invoiceId) {
            const rand4 = Math.floor(1000 + Math.random() * 9000);
            setInvoiceId(`R#######${rand4}`);
        }

        // Process Data for Invoice
        let totalTurnover = 0;
        let totalBrokerageAccumulated = 0;
        let totalProfit = 0;
        let totalLoss = 0;

        const processed = filtered.map(order => {
            const qty = parseFloat(order.quantity) || 0;
            const entryPrice = parseFloat(order.price) || 0;
            const exitPrice = parseFloat(order.ltp) || 0;

            const entryValue = entryPrice * qty;
            const exitValue = exitPrice * qty;
            const netPnl = parseFloat(order.realizedPnl) || 0;
            const finalBrokerage = parseFloat(order.brokerageFee) || 0;

            totalTurnover += (entryValue + exitValue);
            totalBrokerageAccumulated += finalBrokerage;

            if (netPnl >= 0) {
                totalProfit += netPnl;
            } else {
                totalLoss += Math.abs(netPnl);
            }

            return {
                ...order,
                qty,
                entryPrice,
                exitPrice,
                netPnl,
                totalBrokerage: finalBrokerage,
                dateStr: new Date(order.date || order.createdAt).toLocaleDateString()
            };
        });

        setInvoiceData(processed);
        setSummary({
            totalTurnover,
            totalProfit,
            totalLoss,
            totalBrokerage: totalBrokerageAccumulated,
            netPnl: totalProfit - totalLoss
        });
        setGenerated(true);
    };

    // --- PDF DOWNLOAD HANDLER ---
    const handleDownloadPDF = async () => {
        const invoice = document.getElementById('invoice-content');
        if (!invoice) return;

        try {
            setLoading(true);

            // Save original styling
            const origStyle = {
                width: invoice.style.width,
                maxWidth: invoice.style.maxWidth,
                padding: invoice.style.padding,
                boxShadow: invoice.style.boxShadow,
                border: invoice.style.border,
                borderRadius: invoice.style.borderRadius
            };

            // Apply print-perfect styling temporarily
            invoice.style.width = '800px';
            invoice.style.maxWidth = 'none';
            invoice.style.padding = '40px';
            invoice.style.boxShadow = 'none';
            invoice.style.border = 'none';
            invoice.style.borderRadius = '0';

            // Wait a brief moment for styles to apply
            await new Promise(r => setTimeout(r, 50));

            // Page height calculations in pixels
            // A4 = 297mm. At 96 DPI: 297 * (96 / 25.4) = 1122px.
            // With 10mm margins on top & bottom: usable height is 277mm = 1046px.
            const pixelsPerPage = 1046;
            const insertedSpacers = [];

            // Detect and insert temporary layout spacers to align page breaks
            for (let limit = 0; limit < 50; limit++) {
                const invoiceRect = invoice.getBoundingClientRect();
                const elements = Array.from(invoice.querySelectorAll('tbody tr:not(.pdf-temp-spacer), .summary-card, .note-container'));
                
                let elementToShift = null;
                let calculatedSpacerHeight = 0;
                
                for (const el of elements) {
                    const elRect = el.getBoundingClientRect();
                    const relativeTop = elRect.top - invoiceRect.top;
                    const relativeBottom = elRect.bottom - invoiceRect.top;
                    
                    const pageNum = Math.floor(relativeTop / pixelsPerPage);
                    const boundary = (pageNum + 1) * pixelsPerPage;
                    
                    if (relativeTop < boundary && relativeBottom > boundary) {
                        const prev = el.previousSibling;
                        if (prev && (prev.className === 'pdf-temp-spacer' || prev.classList?.contains('pdf-temp-spacer'))) {
                            continue;
                        }
                        elementToShift = el;
                        calculatedSpacerHeight = boundary - relativeTop;
                        break;
                    }
                }
                
                if (!elementToShift) break;
                
                if (elementToShift.tagName === 'TR') {
                    const spacerTr = document.createElement('tr');
                    spacerTr.className = 'pdf-temp-spacer';
                    const spacerTd = document.createElement('td');
                    spacerTd.colSpan = 8;
                    spacerTd.style.height = `${calculatedSpacerHeight}px`;
                    spacerTd.style.padding = '0';
                    spacerTd.style.border = 'none';
                    spacerTd.style.backgroundColor = '#ffffff';
                    spacerTr.appendChild(spacerTd);
                    
                    elementToShift.parentNode.insertBefore(spacerTr, elementToShift);
                    insertedSpacers.push(spacerTr);
                } else {
                    const spacerDiv = document.createElement('div');
                    spacerDiv.className = 'pdf-temp-spacer';
                    spacerDiv.style.height = `${calculatedSpacerHeight}px`;
                    spacerDiv.style.backgroundColor = '#ffffff';
                    
                    elementToShift.parentNode.insertBefore(spacerDiv, elementToShift);
                    insertedSpacers.push(spacerDiv);
                }
                
                await new Promise(r => setTimeout(r, 10));
            }

            // Scroll to top to ensure complete capture
            window.scrollTo(0, 0);
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(invoice, {
                scale: 3, // Crisp resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 800,
                windowWidth: 800,
                scrollX: 0,
                scrollY: 0
            });

            // Remove temp spacers immediately
            insertedSpacers.forEach(spacer => {
                if (spacer.parentNode) {
                    spacer.parentNode.removeChild(spacer);
                }
            });

            // Restore original styling immediately
            invoice.style.width = origStyle.width;
            invoice.style.maxWidth = origStyle.maxWidth;
            invoice.style.padding = origStyle.padding;
            invoice.style.boxShadow = origStyle.boxShadow;
            invoice.style.border = origStyle.border;
            invoice.style.borderRadius = origStyle.borderRadius;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;
            const margin = 10;
            const usableWidth = pdfWidth - margin * 2; // 190
            const usableHeight = pdfHeight - margin * 2; // 277

            const imgWidth = usableWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const imgData = canvas.toDataURL('image/jpeg', 0.98);

            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= usableHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
                heightLeft -= usableHeight;
            }

            const safeClientName = (clientName || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
            const d = new Date();
            const formattedDate = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear().toString().slice(-2)}`;
            pdf.save(`${safeClientName}_${formattedDate}.pdf`);

        } catch (error) {
            console.error('PDF Error:', error);
            alert(`PDF generation failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // If not generated, show form
    if (!generated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 flex flex-col items-center pt-20">
                <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold dark:text-white">Generate Tax Invoice</h1>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Margin Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Margin Used ( ₹ )</label>
                            <input
                                type="number"
                                value={margin}
                                onChange={(e) => setMargin(e.target.value)}
                                placeholder="Enter Margin Amount"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <button
                            onClick={generateInvoice}
                            disabled={loading}
                            className="w-full bg-[#00B050] hover:bg-[#009040] text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
                        >
                            {loading ? 'Loading Data...' : 'Generate Invoice'}
                        </button>

                       
                    </div>
                </div>
            </div>
        );
    }

    // Invoice View
    return (
        <div className="min-h-screen bg-white text-black p-8 print:p-0">
            {/* Print / Download Controls - Hidden in Print */}
            <div className="max-w-5xl mx-auto mb-8 flex justify-between print:hidden">
                <button onClick={() => setGenerated(false)} className="flex items-center gap-2 text-gray-600 hover:text-black">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-2">
                    {/* Manual PDF Download Button */}
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#00B050] text-white px-4 py-2 rounded-lg hover:bg-[#009040]">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </div>
            </div>

            {/* Invoice Document - ID added for html2canvas */}
            <div id="invoice-content" className="max-w-4xl mx-auto border border-[#e5e7eb] p-8 bg-white shadow-sm print:shadow-none print:border-none">

                {/* Header */}
                <div className="flex justify-between items-center pb-6 mb-6">
                    <div>
                        <img src={logo} alt="Logo" style={{ height: '150px', maxWidth: '300px', objectFit: 'contain' }} />
                    </div>

                    <div className="text-right mt-2">
                        <h2 className="text-2xl font-black text-200">Invoice No. {invoiceId}</h2>
                        <div className="mt-3 space-y-1.5">
                            <p className="text-lg font-bold text-slate-800">{clientName}</p>
                            <p className="text-sm text-slate-500 font-semibold">Client ID : {clientCode}</p>
                        </div>
                        <p className="text-base font-semibold text-slate-700 mt-3">Date : {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                </div>

                {/* Separator */}
                <div className="border-t border-slate-200 mb-6"></div>

                {/* Spacer for spacing before table */}
                <div style={{ height: '24px', width: '100%' }}></div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[#0f172a] text-white font-bold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="px-4 py-3.5 text-center w-12">#</th>
                                <th className="px-4 py-3.5 text-left">STOCK</th>
                                <th className="px-4 py-3.5 text-center w-20">TYPE</th>
                                <th className="px-4 py-3.5 text-right">AVG. BUY PRICE</th>
                                <th className="px-4 py-3.5 text-center w-24">QTY</th>
                                <th className="px-4 py-3.5 text-right">EXIT PRICE</th>
                                <th className="px-4 py-3.5 text-right">BROKERAGE</th>
                                <th className="px-4 py-3.5 text-right">P/L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoiceData.map((item, idx) => (
                                <tr key={idx} style={{ pageBreakInside: 'avoid' }} className="even:bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-center text-slate-400 font-semibold text-xs">{idx + 1}</td>
                                    <td className="px-4 py-4 font-bold text-slate-900 text-xs">
                                        <div className="flex flex-col">
                                            <span>{item.symbol?.toUpperCase()}</span>
                                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDDMMM(item.date || item.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                                            item.action?.toUpperCase() === 'BUY' 
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                                : 'bg-red-50 text-red-600 border border-red-100'
                                        }`}>
                                            {item.action?.toUpperCase() || 'SELL'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.entryPrice)}
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-700 font-medium">
                                        {item.qty}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.exitPrice)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.totalBrokerage)}
                                    </td>
                                    <td className={`px-4 py-4 text-right font-extrabold whitespace-nowrap ${item.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                        {formatProfitLoss(item.netPnl)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Spacer for Summary Footer */}
                <div style={{ height: '40px', width: '100%' }}></div>

                {/* Summary Footer */}
                <div className="flex justify-between items-start pt-6 border-t border-slate-100">
                    {/* Display Margin if entered */}
                    <div>
                        {margin && (
                            <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-600">
                                <span className="font-semibold block text-slate-500 mb-1">MONEY MARGIN USED</span>
                                <span className="text-sm font-bold text-slate-800">{formatIndianCurrency(margin)}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    <div style={{ pageBreakInside: 'avoid' }} className="summary-card w-72 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-2.5 shadow-sm">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Profit</span>
                            <span className="text-[#00B050] font-bold">{formatIndianCurrency(summary.totalProfit)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Loss</span>
                            <span className="text-[#ef4444] font-bold">{formatIndianCurrency(summary.totalLoss)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Brokerage</span>
                            <span className="text-slate-700 font-bold">{formatIndianCurrency(summary.totalBrokerage)}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200/80 my-2"></div>
                        <div className="flex justify-between text-sm font-bold uppercase">
                            <span className={summary.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}>
                                {summary.netPnl >= 0 ? 'Net Profit' : 'Net Loss'}
                            </span>
                            <span className={`font-extrabold text-base ${summary.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                {formatProfitLoss(summary.netPnl)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Note and Footer */}
                <div className="note-container mt-8 pt-6 border-t border-slate-100">
                   
                        
                        <p className="text-ls text-red-500 font-semibold leading-relaxed">
                            Note: All your accounts, transaction ledger, and outstanding balances have been fully settled and cleared.
                        </p>
                   
                    
                    <div className="text-center text-[10px] text-slate-400 mt-2 font-bold tracking-widest uppercase">
                        RADHE BROCKRAGE PVT. LTD.
                    </div>
                </div>

            </div>

            {/* Post-Generation Debug Info (small) */}
            <div className="max-w-4xl mx-auto mt-4 text-[10px] text-gray-400 text-center opacity-70 bg-gray-50 p-2 rounded border border-gray-100">
                <div>API Status: {fetchStatus} | Client ID: {customerId}</div>
                <div>Filter Info: Total {filterStats.total} | Range: {filterStats.range} | Matched: {filterStats.matched}</div>
                {orders.length > 0 && filterStats.matched === 0 && (
                    <div className="text-red-400 font-bold mt-1">
                        TIP: Orders found on server, but skipped by Date Filter. Check dates carefully!
                    </div>
                )}
            </div>
        </div>
    );
}
