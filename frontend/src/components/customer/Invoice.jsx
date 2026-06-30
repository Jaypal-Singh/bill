import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../../services/api';

// Helper for currency formatting
const money = (n) => `₹${Number(n ?? 0).toFixed(2)} `;

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
    const [summary, setSummary] = useState({ totalTurnover: 0, totalPnl: 0, totalBrokerage: 0, netPnl: 0 });
    const [fetchStatus, setFetchStatus] = useState(''); // For UI debug
    const [filterStats, setFilterStats] = useState({ total: 0, matched: 0, range: '' });
    const [clientName, setClientName] = useState('');

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const res = await api.get(`/customers`);
                const customer = res.data.find(c => c._id === customerId);
                if (customer) {
                    setClientName(customer.name);
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

        // Process Data for Invoice
        let totalTurnover = 0;
        let totalPnl = 0;
        let totalBrokerageAccumulated = 0;

        const processed = filtered.map(order => {
            const qty = parseFloat(order.quantity) || 0;
            const entryPrice = parseFloat(order.price) || 0;
            const exitPrice = parseFloat(order.ltp) || 0;

            const entryValue = entryPrice * qty;
            const exitValue = exitPrice * qty;
            const netPnl = parseFloat(order.realizedPnl) || 0;
            const finalBrokerage = parseFloat(order.brokerageFee) || 0;

            totalTurnover += (entryValue + exitValue);
            totalPnl += netPnl;
            totalBrokerageAccumulated += finalBrokerage;

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
            totalPnl,
            totalBrokerage: totalBrokerageAccumulated,
            netPnl: totalPnl 
        });
        setGenerated(true);
    };

    // --- PDF DOWNLOAD HANDLER (High Fidelity Multi-page) ---
    const handleDownloadPDF = async () => {
        const originalElement = document.getElementById('invoice-content');
        if (!originalElement) return;

        try {
            setLoading(true);

            // 1. Isolation: Create a hidden A4-width container
            const captureContainer = document.createElement('div');
            captureContainer.style.position = 'fixed';
            captureContainer.style.top = '-10000px';
            captureContainer.style.left = '-10000px';
            captureContainer.style.width = '210mm'; // Fixed A4 width
            captureContainer.style.backgroundColor = '#ffffff';
            captureContainer.style.zIndex = '-9999';

            // 2. Clone and Force Styles
            const clonedContent = originalElement.cloneNode(true);
            clonedContent.style.width = '210mm'; // Force exact A4 width
            clonedContent.style.boxSizing = 'border-box'; // Ensure padding is included in width
            clonedContent.style.maxWidth = 'none';
            clonedContent.style.margin = '0';
            clonedContent.style.padding = '10mm'; // Slightly smaller padding for more content room
            clonedContent.style.backgroundColor = '#ffffff';
            clonedContent.style.color = '#000000';

            const allElements = clonedContent.querySelectorAll('*');
            allElements.forEach(el => {
                el.style.boxShadow = 'none';
                el.style.boxSizing = 'border-box';
            });

            captureContainer.appendChild(clonedContent);
            document.body.appendChild(captureContainer);

            // 3. High-Res Capture
            const canvas = await html2canvas(captureContainer, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: captureContainer.offsetWidth, // Ensure full container width capture
                scrollX: 0,
                scrollY: 0
            });

            // 4. Cleanup
            document.body.removeChild(captureContainer);

            // 5. Generate Multi-page PDF by slicing
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Image dimensions in PDF units (mm)
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;
            const imgData = canvas.toDataURL('image/jpeg', 0.98);

            // Add first page
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Loop for additional pages
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const today = new Date();
            const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear().toString().slice(-2)}`;
            const safeClientName = (clientName || customerId || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`${safeClientName}_${formattedDate}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(`Failed: ${error.message}`);
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

                        <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-700/50 rounded text-xs text-slate-500 dark:text-slate-400 text-center border border-dashed border-slate-300 dark:border-slate-600">
                            Debug Info: {fetchStatus}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Invoice View
    return (
        <div className="min-h-screen bg-white text-black p-8 print:p-0">
            {/* Print / Download Controls - Hidden in Print */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between print:hidden">
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
                <div className="flex justify-between items-start border-b border-[#e5e7eb] pb-6 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#111827] mb-2 tax-invoice">TAX INVOICE</h1>
                        <p className="text-[#6b7280]">Statement of Accounts</p>
                        <div className="mt-4 text-xs text-[#4b5563]">
                            <p><strong>Period:</strong> {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</p>
                            <p><strong>Generated On:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Bill To : {clientName}</h3>
                        <p className="text-[#4b5563]">Client ID: {customerId}</p>
                    </div>
                </div>

                {/* Spacer for spacing before table */}
                <div style={{ height: '24px', width: '100%' }}></div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f3f4f6] text-[#4b5563] font-semibold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Date</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3 text-right">Qty (Lot)</th>
                                <th className="px-4 py-3 text-right">Entry Price</th>
                                <th className="px-4 py-3 text-right">Exit Price</th>
                                <th className="px-4 py-3 text-right">Brockerage</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">Net P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f3f4f6]">
                            {invoiceData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-[#f9fafb]">
                                    <td className="px-4 py-3 text-[#6b7280]">{item.dateStr}</td>
                                    <td className="px-4 py-3 font-medium text-[#111827] break-words whitespace-normal max-w-[150px]">
                                        {item.symbol}
                                        <span className={`ml-1.5 text-[10px] font-bold ${item.action?.toUpperCase() === 'BUY' ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                            ({item.action?.toUpperCase() || 'SELL'})
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-right text-[#374151]">{item.qty} {item.lot ? `(${item.lot})` : ''}</td>
                                    <td className="px-4 py-3 text-right text-[#374151]">{item.entryPrice.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-[#374151]">{item.exitPrice.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-[#374151]">{money(item.totalBrokerage)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${item.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                        {money(item.netPnl)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Spacer for Summary Footer */}
                <div style={{ height: '40px', width: '100%' }}></div>

                {/* Summary Footer */}
                <div className="pt-4 border-t border-[#e5e7eb] flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between text-[#4b5563]">
                            <span>Total Turnover</span>
                            <span>{money(summary.totalTurnover)}</span>
                        </div>
                        <div className="flex justify-between text-[#4b5563]">
                            <span>Brockerage & Charges</span>
                            <span>{money(summary.totalBrokerage)}</span>
                        </div>
                        {/* Display Margin if entered */}
                        {margin && (
                            <div className="flex justify-between text-[#4b5563]">
                                <span>Money Margin Used</span>
                                <span>{money(margin)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-[#111827] pt-2 border-t border-[#e5e7eb]">
                            <span>Net Profit / Loss</span>
                            <span className={summary.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#dc2626]'}>
                                {money(summary.netPnl)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-8 text-center text-[10px] text-[#9ca3af] footer-line">
                    <p className="mt-1">J D BROCKERAGE PVT. LTD.</p>
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
