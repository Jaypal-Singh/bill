import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AccountOpeningForm = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerId: '',
    dob: '',
    gender: 'Male',
    mobileLast4: '',
    aadhaarLast4: '',
    panLast4: '',
    refName: '',
    initialDeposit: '',
    applicationDate: new Date().toISOString().split('T')[0],
  });

  const [photo, setPhoto] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePDF = async () => {
    const wrapper = document.getElementById('pdf-wrapper');
    wrapper.style.display = 'block';
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('pdf-content');
      
      const opt = {
        margin: 10,
        filename: `Account_Opening_${formData.customerName || 'Form'}.pdf`,
        image: { type: 'png', quality: 1.0 },
        html2canvas: { 
          scale: 4, 
          useCORS: true, 
          width: 800,
          windowWidth: 800,
          scrollX: 0,
          scrollY: 0,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      wrapper.style.display = 'none';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generatePDF();
  };

  // Reusable PDF field styles
  const labelStyle = { fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' };
  const valueStyle = { fontSize: '17px', fontWeight: '600', color: '#0f172a', wordWrap: 'break-word' };
  const itemStyle = { display: 'flex', alignItems: 'baseline', gap: '8px' };
  const colItemStyle = { display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1 };
  const rowStyle = { display: 'flex', gap: '32px' };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between  mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white flex items-center gap-1">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">Account Opening Form</h1>
          <div className="w-16"></div> {/* Spacer */}
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-10 shadow-xl">
          <div className="mb-8 border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-blue-400 uppercase tracking-wider mb-1">RADHE BROCKRAGE PVT LTD</h2>
            <p className="text-slate-500 text-sm">Master Client Registry - New Account Application</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Customer ID (Auto / Custom)</label>
              <input type="text" name="customerId" value={formData.customerId} onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            {/* Masked Inputs */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mobile Number (Last 4 Digits)</label>
              <div className="flex w-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                <span className="flex items-center px-3 bg-slate-900 border-r border-slate-700 text-slate-500 font-mono tracking-widest text-lg mt-1">XXXXXX</span>
                <input type="text" name="mobileLast4" maxLength="4" value={formData.mobileLast4} onChange={handleChange} required placeholder="7890" className="w-full bg-transparent px-3 py-2 outline-none font-mono tracking-widest" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Aadhaar Number (Last 4 Digits)</label>
              <div className="flex w-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                <span className="flex items-center px-3 bg-slate-900 border-r border-slate-700 text-slate-500 font-mono tracking-widest text-lg mt-1">XXXXXXXX</span>
                <input type="text" name="aadhaarLast4" maxLength="4" value={formData.aadhaarLast4} onChange={handleChange} required placeholder="1234" className="w-full bg-transparent px-3 py-2 outline-none font-mono tracking-widest" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">PAN Card (Last 4 Chars)</label>
              <div className="flex w-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                <span className="flex items-center px-3 bg-slate-900 border-r border-slate-700 text-slate-500 font-mono tracking-widest text-lg mt-1">XXXXXX</span>
                <input type="text" name="panLast4" maxLength="4" value={formData.panLast4} onChange={handleChange} required placeholder="123A" className="w-full bg-transparent px-3 py-2 outline-none font-mono tracking-widest uppercase" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Reference Name</label>
              <input type="text" name="refName" value={formData.refName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" placeholder="Who referred this customer?" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Initial Deposit</label>
              <input type="text" name="initialDeposit" value={formData.initialDeposit} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" placeholder="₹ 0.00" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date of Application</label>
              <input type="date" name="applicationDate" value={formData.applicationDate} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 outline-none [color-scheme:dark]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Upload Photo</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900 file:text-blue-200 hover:file:bg-blue-800" />
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined">download</span> Submit & Download PDF
            </button>
          </div>
        </form>
      </div>

      {/* Hidden PDF Template */}
      <div id="pdf-wrapper" style={{ display: 'none', position: 'absolute', top: 0, left: 0, zIndex: 9999, width: '800px', backgroundColor: '#ffffff' }}>
        <div id="pdf-content" style={{ backgroundColor: '#ffffff', color: '#000000', padding: '40px', fontFamily: 'sans-serif', width: '800px', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '24px', marginBottom: '32px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '0', color: '#0f172a', letterSpacing: '-1px' }}>RADHE BROCKRAGE PVT LTD</h1>
              <p style={{ fontSize: '14px', fontWeight: 'bold',  letterSpacing: '2px', marginTop: '4px', color: '#475569', margin: '4px 0 0 0' }}>Account Opening Application Form</p>
            </div>
            {photo ? (
              <div style={{ width: '135px', height: '175px', border: '2px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={photo} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '135px', height: '175px', border: '2px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: '#94a3b8', flexShrink: 0, padding: '8px' }}>
                Passport Size<br/>Photo Here
              </div>
            )}
          </div>

          {/* Form Content - One key-value per row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Row 1: Customer Name */}
            <div style={itemStyle}>
              <span style={labelStyle}>Customer Name :</span>
              <span style={valueStyle}>{formData.customerName || '-'}</span>
            </div>

            {/* Row 2: Customer ID */}
            <div style={itemStyle}>
              <span style={labelStyle}>Customer ID :</span>
              <span style={valueStyle}>{formData.customerId || '-'}</span>
            </div>

            {/* Row 3: Date of Birth (left) & Gender (right) */}
            <div style={rowStyle}>
              <div style={colItemStyle}>
                <span style={labelStyle}>Date of Birth :</span>
                <span style={valueStyle}>{formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : '-'}</span>
              </div>
              <div style={colItemStyle}>
                <span style={labelStyle}>Gender :</span>
                <span style={valueStyle}>{formData.gender}</span>
              </div>
            </div>

            {/* Row 4: Mobile Number */}
            <div style={itemStyle}>
              <span style={labelStyle}>Mobile Number :</span>
              <span style={{ ...valueStyle, fontFamily: 'monospace', letterSpacing: '2px' }}>XXXXXX{formData.mobileLast4.padStart(4, 'X')}</span>
            </div>

            {/* Row 5: Aadhaar Number */}
            <div style={itemStyle}>
              <span style={labelStyle}>Aadhaar Number :</span>
              <span style={{ ...valueStyle, fontFamily: 'monospace', letterSpacing: '2px' }}>********{formData.aadhaarLast4.padStart(4, '*')}</span>
            </div>

            {/* Row 6: PAN Card Number */}
            <div style={itemStyle}>
              <span style={labelStyle}>PAN Card Number :</span>
              <span style={{ ...valueStyle, fontFamily: 'monospace', letterSpacing: '2px' }}>******{formData.panLast4.padStart(4, '*')}</span>
            </div>

            {/* Row 7: Reference Name (left) & Date of Application (right) */}
            <div style={rowStyle}>
              <div style={colItemStyle}>
                <span style={labelStyle}>Reference Name :</span>
                <span style={valueStyle}>{formData.refName || '-'}</span>
              </div>
              <div style={colItemStyle}>
                <span style={labelStyle}>Date of Application :</span>
                <span style={valueStyle}>{formData.applicationDate ? new Date(formData.applicationDate).toLocaleDateString('en-GB') : '-'}</span>
              </div>
            </div>

            {/* Row 8: Initial Deposit */}
            <div style={itemStyle}>
              <span style={labelStyle}>Initial Deposit :</span>
              <span style={{ ...valueStyle, fontSize: '20px', fontWeight: '700' }}>{formData.initialDeposit ? `₹ ${formData.initialDeposit}` : '-'}</span>
            </div>


          
          </div>

         {/* Footer */}

<div
  style={{
    marginTop: "80px",
    borderTop: "1px solid #d1d5db",
    paddingTop: "20px",
    textAlign: "center"
  }}
>
  <div
    style={{
      color: "#dc2626",
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "24px",
    }}
  >
    <strong>Note:</strong> We are not registered with SEBI. High-leverage trading involves significant financial risk. Please trade at your own risk. The company shall not be responsible for any profit, loss, or financial consequences arising from your trading activities.
  </div>

  <div
    style={{
      marginTop: "20px",
      color: "#64748b",
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "2px",
      textTransform: "uppercase"
    }}
  >
    RADHE BROCKRAGE PVT. LTD.
  </div>
</div>
          
        </div>
          
      </div>
    </div>
  );
};

export default AccountOpeningForm;
